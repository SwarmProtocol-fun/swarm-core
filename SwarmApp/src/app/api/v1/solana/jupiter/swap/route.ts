/**
 * POST /api/v1/solana/jupiter/swap
 *
 * Execute a Jupiter swap: get serialized tx → sign with agent keypair → submit.
 * Mainnet only. Auth: requireOrgMember.
 */
import { NextRequest } from "next/server";
import { VersionedTransaction, sendAndConfirmRawTransaction } from "@solana/web3.js";
import { deriveAgentKeypair, createConnection } from "@/lib/solana-keys";
import { getExplorerUrl } from "@/lib/solana-cluster";
import { getSwapTransaction } from "@/lib/solana-jupiter";
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

    const { orgId, agentId, quoteResponse } = body;
    if (!orgId || !agentId || !quoteResponse) {
      return Response.json({ error: "orgId, agentId, and quoteResponse are required" }, { status: 400 });
    }

    const auth = await requireOrgMember(request, orgId);
    if (!auth.ok) {
      return Response.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const agent = await getAgent(agentId);
    if (!agent) return Response.json({ error: "Agent not found" }, { status: 404 });
    if (agent.orgId !== orgId) return Response.json({ error: "Agent does not belong to this org" }, { status: 403 });

    const cluster = "mainnet-beta"; // Jupiter only works on mainnet
    const connection = createConnection(cluster);
    const keypair = deriveAgentKeypair(agentId);

    // Get serialized swap transaction from Jupiter
    const { swapTransaction } = await getSwapTransaction({
      quoteResponse,
      userPublicKey: keypair.publicKey.toBase58(),
    });

    // Deserialize as versioned transaction
    const txBuf = Buffer.from(swapTransaction, "base64");
    const versionedTx = VersionedTransaction.deserialize(txBuf);

    // Sign
    versionedTx.sign([keypair]);

    // Submit
    const rawTx = versionedTx.serialize();
    const signature = await sendAndConfirmRawTransaction(connection, Buffer.from(rawTx), {
      skipPreflight: true,
      maxRetries: 3,
    });

    return Response.json({
      signature,
      inputAmount: quoteResponse.inAmount,
      outputAmount: quoteResponse.outAmount,
      inputMint: quoteResponse.inputMint,
      outputMint: quoteResponse.outputMint,
      explorerUrl: getExplorerUrl("tx", signature, cluster),
    });
  } catch (err) {
    console.error("Jupiter swap error:", err);
    const message = err instanceof Error ? err.message : "Swap failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
