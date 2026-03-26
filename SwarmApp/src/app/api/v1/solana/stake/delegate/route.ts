/**
 * POST /api/v1/solana/stake/delegate
 *
 * Create a stake account and delegate SOL to a validator.
 * Auth: requireOrgMember.
 */
import { NextRequest } from "next/server";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { deriveAgentKeypair, createConnection } from "@/lib/solana-keys";
import { getExplorerUrl } from "@/lib/solana-cluster";
import { delegateStake } from "@/lib/solana-staking";
import { requireOrgMember } from "@/lib/auth-guard";
import { getAgent } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { orgId, agentId, validatorVotePubkey, amount, cluster: clusterParam } = body;
    if (!orgId || !agentId || !validatorVotePubkey || !amount) {
      return Response.json({ error: "orgId, agentId, validatorVotePubkey, and amount are required" }, { status: 400 });
    }

    const auth = await requireOrgMember(request, orgId);
    if (!auth.ok) {
      return Response.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const agent = await getAgent(agentId);
    if (!agent) return Response.json({ error: "Agent not found" }, { status: 404 });
    if (agent.orgId !== orgId) return Response.json({ error: "Agent does not belong to this org" }, { status: 403 });

    const cluster = clusterParam || "devnet";
    const connection = createConnection(cluster);
    const keypair = deriveAgentKeypair(agentId);

    let validatorPubkey: PublicKey;
    try {
      validatorPubkey = new PublicKey(validatorVotePubkey);
    } catch {
      return Response.json({ error: "Invalid validator vote pubkey" }, { status: 400 });
    }

    const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
    if (isNaN(lamports) || lamports <= 0) {
      return Response.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Minimum stake is rent-exempt minimum + 1 SOL for safety
    const rentExempt = await connection.getMinimumBalanceForRentExemption(200);
    const totalLamports = lamports + rentExempt;

    const result = await delegateStake(connection, keypair, validatorPubkey, totalLamports);

    return Response.json({
      signature: result.signature,
      stakeAccount: result.stakeAccount,
      validatorVotePubkey,
      amount,
      cluster,
      explorerUrl: getExplorerUrl("tx", result.signature, cluster),
    });
  } catch (err) {
    console.error("Delegate error:", err);
    const message = err instanceof Error ? err.message : "Delegation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
