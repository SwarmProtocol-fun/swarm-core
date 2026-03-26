/**
 * POST /api/v1/solana/stake/undelegate
 *
 * Deactivate a stake account (begin undelegation).
 * Auth: requireOrgMember.
 */
import { NextRequest } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { deriveAgentKeypair, createConnection } from "@/lib/solana-keys";
import { getExplorerUrl } from "@/lib/solana-cluster";
import { undelegateStake } from "@/lib/solana-staking";
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

    const { orgId, agentId, stakeAccountAddress, cluster: clusterParam } = body;
    if (!orgId || !agentId || !stakeAccountAddress) {
      return Response.json({ error: "orgId, agentId, and stakeAccountAddress are required" }, { status: 400 });
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

    let stakeAccountPubkey: PublicKey;
    try {
      stakeAccountPubkey = new PublicKey(stakeAccountAddress);
    } catch {
      return Response.json({ error: "Invalid stake account address" }, { status: 400 });
    }

    const signature = await undelegateStake(connection, keypair, stakeAccountPubkey);

    return Response.json({
      signature,
      stakeAccount: stakeAccountAddress,
      cluster,
      explorerUrl: getExplorerUrl("tx", signature, cluster),
    });
  } catch (err) {
    console.error("Undelegate error:", err);
    const message = err instanceof Error ? err.message : "Undelegation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
