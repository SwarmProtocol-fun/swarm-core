/**
 * TON Deploy — Smart Contract, Jetton, NFT, SBT, and DEX deployment management.
 *
 * Tracks deployment requests initiated by Swarm agents or admins.
 * All deployments are policy-checked and audit-logged.
 *
 * Deployment types:
 *   - smart_contract  — Custom FunC/Tact contracts compiled to BOC
 *   - jetton          — TEP-74 fungible token (Jetton master + wallet)
 *   - nft_collection  — TEP-62 NFT collection + item minting
 *   - nft_item        — Mint single NFT into existing collection
 *   - sbt             — TEP-85 Soulbound Token (non-transferable NFT)
 *   - dex_pool        — Liquidity pool on DeDust / STON.fi
 */

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    startAfter,
    limit as firestoreLimit,
    serverTimestamp,
    Timestamp,
    type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type TonDeployType =
    | "smart_contract"
    | "jetton"
    | "nft_collection"
    | "nft_item"
    | "sbt"
    | "dex_pool";

export type TonDeployStatus =
    | "pending"
    | "pending_approval"
    | "compiling"
    | "deploying"
    | "deployed"
    | "failed"
    | "rejected";

export interface TonDeployment {
    id: string;
    orgId: string;
    type: TonDeployType;
    status: TonDeployStatus;
    name: string;
    description: string;
    /** Deployer wallet address */
    deployerAddress: string;
    /** Network: mainnet or testnet */
    network: "mainnet" | "testnet";

    /** On-chain contract address once deployed */
    contractAddress: string | null;
    /** Deployment tx hash */
    txHash: string | null;
    /** BOC (Bag of Cells) hex — compiled contract code */
    bocHex: string | null;

    /** Type-specific configuration */
    config: TonDeployConfig;

    /** Estimated deployment cost in nanoTON */
    estimatedCostNano: string;
    /** Actual cost in nanoTON (post-deploy) */
    actualCostNano: string | null;

    /** Who initiated the deployment */
    createdBy: string;
    /** Agent ID if initiated by an agent */
    agentId: string | null;
    createdAt: Date | null;
    deployedAt: Date | null;
    /** Error message on failure */
    errorMessage: string | null;
}

export type TonDeployConfig =
    | JettonDeployConfig
    | NftCollectionDeployConfig
    | NftItemDeployConfig
    | SbtDeployConfig
    | DexPoolDeployConfig
    | SmartContractDeployConfig;

export interface JettonDeployConfig {
    type: "jetton";
    /** Token name (e.g. "Swarm Token") */
    tokenName: string;
    /** Token symbol (e.g. "SWARM") */
    tokenSymbol: string;
    /** Decimal places (default 9 for TON ecosystem) */
    decimals: number;
    /** Total supply in smallest unit as string */
    totalSupply: string;
    /** Off-chain metadata URI (JSON with name, symbol, image, description) */
    metadataUri: string;
    /** Whether the admin can mint more tokens */
    mintable: boolean;
    /** Admin address that can mint/burn */
    adminAddress: string;
}

export interface NftCollectionDeployConfig {
    type: "nft_collection";
    /** Collection name */
    collectionName: string;
    /** Off-chain collection metadata URI */
    metadataUri: string;
    /** Max supply (0 = unlimited) */
    maxSupply: number;
    /** Royalty percentage (0-100, supports decimals) */
    royaltyPercent: number;
    /** Royalty recipient address */
    royaltyAddress: string;
    /** Owner/admin address */
    ownerAddress: string;
}

export interface NftItemDeployConfig {
    type: "nft_item";
    /** Parent collection contract address */
    collectionAddress: string;
    /** Item index in the collection */
    itemIndex: number;
    /** Off-chain item metadata URI */
    metadataUri: string;
    /** Initial owner address */
    ownerAddress: string;
}

export interface SbtDeployConfig {
    type: "sbt";
    /** SBT collection name */
    collectionName: string;
    /** Off-chain metadata URI */
    metadataUri: string;
    /** Authority address (can revoke) */
    authorityAddress: string;
    /** Initial recipient */
    ownerAddress: string;
    /** Whether the SBT can be revoked by authority */
    revocable: boolean;
}

export interface DexPoolDeployConfig {
    type: "dex_pool";
    /** DEX platform */
    platform: "dedust" | "stonfi";
    /** First token address (use "native" for TON) */
    tokenAAddress: string;
    /** Second token address */
    tokenBAddress: string;
    /** Initial liquidity amount for token A in nanoTON/smallest unit */
    tokenAAmount: string;
    /** Initial liquidity amount for token B */
    tokenBAmount: string;
    /** Pool type */
    poolType: "volatile" | "stable";
}

export interface SmartContractDeployConfig {
    type: "smart_contract";
    /** Source language */
    language: "func" | "tact" | "fift";
    /** Contract source code or compiled BOC hex */
    sourceCode: string;
    /** Constructor/init parameters as JSON string */
    initParams: string;
    /** Whether source code is already compiled to BOC */
    precompiled: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Deployment CRUD
// ═══════════════════════════════════════════════════════════════

export async function createTonDeployment(
    input: Omit<TonDeployment, "id" | "createdAt" | "deployedAt">,
): Promise<TonDeployment> {
    const ref = await addDoc(collection(db, "tonDeployments"), {
        ...input,
        createdAt: serverTimestamp(),
        deployedAt: null,
    });
    return { ...input, id: ref.id, createdAt: new Date(), deployedAt: null };
}

export async function updateTonDeployment(
    id: string,
    patch: Partial<Pick<TonDeployment, "status" | "contractAddress" | "txHash" | "bocHex" | "actualCostNano" | "deployedAt" | "errorMessage">>,
): Promise<void> {
    await updateDoc(doc(db, "tonDeployments", id), patch);
}

export async function getTonDeployment(id: string): Promise<TonDeployment | null> {
    const snap = await getDoc(doc(db, "tonDeployments", id));
    if (!snap.exists()) return null;
    return docToDeployment(snap.id, snap.data() as Record<string, unknown>);
}

export async function getTonDeployments(
    orgId: string,
    limit = 50,
    cursor?: string,
    typeFilter?: TonDeployType,
): Promise<{ deployments: TonDeployment[]; nextCursor: string | null }> {
    const constraints: QueryConstraint[] = [
        where("orgId", "==", orgId),
        orderBy("createdAt", "desc"),
        firestoreLimit(limit + 1),
    ];

    if (typeFilter) {
        constraints.splice(1, 0, where("type", "==", typeFilter));
    }

    if (cursor) {
        const cursorSnap = await getDoc(doc(db, "tonDeployments", cursor));
        if (cursorSnap.exists()) constraints.push(startAfter(cursorSnap));
    }

    const snap = await getDocs(query(collection(db, "tonDeployments"), ...constraints));
    const hasMore = snap.docs.length > limit;
    const docs = snap.docs.slice(0, limit);
    return {
        deployments: docs.map((d) => docToDeployment(d.id, d.data() as Record<string, unknown>)),
        nextCursor: hasMore ? docs[docs.length - 1].id : null,
    };
}

export async function getDeploymentStats(orgId: string): Promise<{
    total: number;
    deployed: number;
    failed: number;
    pending: number;
    byType: Record<TonDeployType, number>;
}> {
    const q = query(collection(db, "tonDeployments"), where("orgId", "==", orgId));
    const snap = await getDocs(q);
    const stats = {
        total: 0, deployed: 0, failed: 0, pending: 0,
        byType: { smart_contract: 0, jetton: 0, nft_collection: 0, nft_item: 0, sbt: 0, dex_pool: 0 } as Record<TonDeployType, number>,
    };
    for (const d of snap.docs) {
        const data = d.data();
        stats.total++;
        if (data.status === "deployed") stats.deployed++;
        else if (data.status === "failed") stats.failed++;
        else stats.pending++;
        if (data.type in stats.byType) stats.byType[data.type as TonDeployType]++;
    }
    return stats;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/** Estimate deployment cost based on type (rough estimates in nanoTON) */
export function estimateDeployCost(type: TonDeployType): string {
    const estimates: Record<TonDeployType, string> = {
        smart_contract: "100000000",    // ~0.1 TON
        jetton: "200000000",            // ~0.2 TON
        nft_collection: "150000000",    // ~0.15 TON
        nft_item: "50000000",           // ~0.05 TON
        sbt: "100000000",              // ~0.1 TON
        dex_pool: "500000000",          // ~0.5 TON (+ initial liquidity)
    };
    return estimates[type] || "100000000";
}

export const DEPLOY_TYPE_LABELS: Record<TonDeployType, string> = {
    smart_contract: "Smart Contract",
    jetton: "Jetton Token",
    nft_collection: "NFT Collection",
    nft_item: "NFT Item",
    sbt: "Soulbound Token",
    dex_pool: "DEX Pool",
};

export const DEPLOY_STATUS_META: Record<TonDeployStatus, { label: string; color: string }> = {
    pending: { label: "Pending", color: "text-muted-foreground" },
    pending_approval: { label: "Awaiting Approval", color: "text-yellow-400" },
    compiling: { label: "Compiling", color: "text-blue-400" },
    deploying: { label: "Deploying", color: "text-purple-400" },
    deployed: { label: "Deployed", color: "text-green-400" },
    failed: { label: "Failed", color: "text-red-400" },
    rejected: { label: "Rejected", color: "text-red-500" },
};

function docToDeployment(id: string, d: Record<string, unknown>): TonDeployment {
    return {
        id,
        orgId: (d.orgId as string) || "",
        type: (d.type as TonDeployType) || "smart_contract",
        status: (d.status as TonDeployStatus) || "pending",
        name: (d.name as string) || "",
        description: (d.description as string) || "",
        deployerAddress: (d.deployerAddress as string) || "",
        network: (d.network as "mainnet" | "testnet") || "mainnet",
        contractAddress: (d.contractAddress as string) || null,
        txHash: (d.txHash as string) || null,
        bocHex: (d.bocHex as string) || null,
        config: (d.config as TonDeployConfig) || { type: "smart_contract", language: "tact", sourceCode: "", initParams: "{}", precompiled: false },
        estimatedCostNano: (d.estimatedCostNano as string) || "0",
        actualCostNano: (d.actualCostNano as string) || null,
        createdBy: (d.createdBy as string) || "",
        agentId: (d.agentId as string) || null,
        createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
        deployedAt: d.deployedAt instanceof Timestamp ? d.deployedAt.toDate() : null,
        errorMessage: (d.errorMessage as string) || null,
    };
}
