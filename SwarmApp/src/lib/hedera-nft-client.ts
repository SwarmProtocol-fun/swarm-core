/**
 * Hedera NFT Client — Query agent reputation from SwarmAgentIdentityNFT
 *
 * Provides helper functions to:
 * - Check if agent has NFT
 * - Get credit score + trust score from NFT
 * - Get reputation tier
 */

import { ethers } from "ethers";
import { CONTRACTS, AGENT_IDENTITY_NFT_ABI } from "./swarm-contracts";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface AgentNFTIdentity {
    hasNFT: boolean;
    tokenId?: string;
    asn?: string;
    creditScore?: number;
    trustScore?: number;
    registeredAt?: Date;
    lastUpdated?: Date;
    tier?: "Bronze" | "Silver" | "Gold" | "Platinum";
}

// ═══════════════════════════════════════════════════════════════
// Client Setup
// ═══════════════════════════════════════════════════════════════

/** Get Hedera testnet JSON-RPC provider */
function getHederaProvider(): ethers.JsonRpcProvider {
    const rpcUrl = process.env.NEXT_PUBLIC_HEDERA_RPC_URL || "https://testnet.hashio.io/api";
    return new ethers.JsonRpcProvider(rpcUrl);
}

/** Get read-only NFT contract instance */
function getNFTContract(): ethers.Contract {
    const provider = getHederaProvider();
    return new ethers.Contract(
        CONTRACTS.AGENT_IDENTITY_NFT,
        AGENT_IDENTITY_NFT_ABI,
        provider
    );
}

// ═══════════════════════════════════════════════════════════════
// Query Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Check if agent has an identity NFT
 */
export async function hasAgentNFT(agentAddress: string): Promise<boolean> {
    try {
        const contract = getNFTContract();
        const hasNFT = await contract.hasNFT(agentAddress);
        return hasNFT;
    } catch (error) {
        console.error("Error checking agent NFT:", error);
        return false;
    }
}

/**
 * Get full agent identity from NFT
 */
export async function getAgentNFTIdentity(agentAddress: string): Promise<AgentNFTIdentity> {
    try {
        const contract = getNFTContract();

        // Check if agent has NFT
        const hasNFT = await contract.hasNFT(agentAddress);
        if (!hasNFT) {
            return { hasNFT: false };
        }

        // Get token ID
        const tokenId = await contract.getTokenId(agentAddress);

        // Get identity data
        const identity = await contract.getAgentIdentity(tokenId);
        const [asn, creditScore, trustScore, registeredAt, lastUpdated] = identity;

        // Get reputation tier
        const tier = await contract.getReputationTier(tokenId);

        return {
            hasNFT: true,
            tokenId: tokenId.toString(),
            asn,
            creditScore: Number(creditScore),
            trustScore: Number(trustScore),
            registeredAt: new Date(Number(registeredAt) * 1000),
            lastUpdated: new Date(Number(lastUpdated) * 1000),
            tier: tier as "Bronze" | "Silver" | "Gold" | "Platinum",
        };
    } catch (error) {
        console.error("Error getting agent NFT identity:", error);
        return { hasNFT: false };
    }
}

/**
 * Get agent credit score by ASN.
 * Looks up agent wallet address from Firestore by ASN, then queries the on-chain NFT.
 * Falls back to Firestore-stored scores if NFT lookup fails.
 */
export async function getCreditScoreByASN(asn: string): Promise<{ creditScore: number; trustScore: number } | null> {
    try {
        // Look up agent by ASN in Firestore
        const q = query(
            collection(db, "agents"),
            where("asn", "==", asn),
            limit(1),
        );
        const snap = await getDocs(q);

        if (snap.empty) {
            console.warn(`No agent found for ASN ${asn}`);
            return null;
        }

        const agentData = snap.docs[0].data();
        const agentAddress = agentData.walletAddress || agentData.agentAddress;

        // If we have Firestore-stored scores, use those as fallback
        const firestoreScores = (typeof agentData.creditScore === "number" && typeof agentData.trustScore === "number")
            ? { creditScore: agentData.creditScore, trustScore: agentData.trustScore }
            : null;

        // Try on-chain NFT lookup
        if (agentAddress) {
            try {
                const identity = await getAgentNFTIdentity(agentAddress);
                if (identity.hasNFT && identity.creditScore !== undefined && identity.trustScore !== undefined) {
                    return { creditScore: identity.creditScore, trustScore: identity.trustScore };
                }
            } catch (nftError) {
                console.warn(`NFT lookup failed for ASN ${asn}, using Firestore scores:`, nftError);
            }
        }

        // Fall back to Firestore scores
        return firestoreScores;
    } catch (error) {
        console.error("Error getting credit score by ASN:", error);
        return null;
    }
}

/**
 * Calculate reputation tier from credit score
 */
export function getReputationTier(creditScore: number): "Bronze" | "Silver" | "Gold" | "Platinum" {
    if (creditScore >= 850) return "Platinum";
    if (creditScore >= 700) return "Gold";
    if (creditScore >= 550) return "Silver";
    return "Bronze";
}
