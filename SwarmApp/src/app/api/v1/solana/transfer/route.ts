/**
 * POST /api/v1/solana/transfer
 *
 * Transfer SOL or SPL tokens from an agent's derived wallet.
 */
import { NextRequest } from "next/server";
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from "@solana/web3.js";
import { deriveAgentKeypair, createConnection } from "@/lib/solana-keys";
import { getExplorerUrl } from "@/lib/solana-cluster";
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

    const { orgId, fromAgentId, toAddress, amount, mint, cluster: clusterParam } = body;
    if (!orgId || !fromAgentId || !toAddress || !amount) {
      return Response.json({ error: "orgId, fromAgentId, toAddress, and amount are required" }, { status: 400 });
    }

    const auth = await requireOrgMember(request, orgId);
    if (!auth.ok) {
      return Response.json({ error: auth.error }, { status: auth.status || 403 });
    }

    // Validate agent
    const agent = await getAgent(fromAgentId);
    if (!agent) return Response.json({ error: "Agent not found" }, { status: 404 });
    if (agent.orgId !== orgId) return Response.json({ error: "Agent does not belong to this org" }, { status: 403 });

    const cluster = clusterParam || "devnet";
    const connection = createConnection(cluster);
    const keypair = deriveAgentKeypair(fromAgentId);

    // Validate recipient
    let toPubkey: PublicKey;
    try {
      toPubkey = new PublicKey(toAddress);
    } catch {
      return Response.json({ error: "Invalid recipient address" }, { status: 400 });
    }

    const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
    if (isNaN(lamports) || lamports <= 0) {
      return Response.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (!mint || mint === "native") {
      // Native SOL transfer
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey,
          lamports,
        }),
      );
      const signature = await sendAndConfirmTransaction(connection, tx, [keypair]);
      return Response.json({
        signature,
        fromAddress: keypair.publicKey.toBase58(),
        toAddress,
        amount,
        mint: null,
        cluster,
        explorerUrl: getExplorerUrl("tx", signature, cluster),
      });
    }

    // SPL token transfer — dynamic import to avoid requiring the package when not used
    const { getOrCreateAssociatedTokenAccount, transfer } = await import("@solana/spl-token");
    const mintPubkey = new PublicKey(mint);

    const fromAta = await getOrCreateAssociatedTokenAccount(connection, keypair, mintPubkey, keypair.publicKey);
    const toAta = await getOrCreateAssociatedTokenAccount(connection, keypair, mintPubkey, toPubkey);

    // SPL amount needs to account for decimals — get from token account
    const tokenInfo = await connection.getParsedAccountInfo(fromAta.address);
    const decimals = (tokenInfo.value?.data as any)?.parsed?.info?.tokenAmount?.decimals || 0;
    const tokenAmount = Math.floor(parseFloat(amount) * Math.pow(10, decimals));

    const sig = await transfer(connection, keypair, fromAta.address, toAta.address, keypair.publicKey, tokenAmount);

    return Response.json({
      signature: sig,
      fromAddress: keypair.publicKey.toBase58(),
      toAddress,
      amount,
      mint,
      cluster,
      explorerUrl: getExplorerUrl("tx", sig, cluster),
    });
  } catch (err) {
    console.error("Transfer error:", err);
    const message = err instanceof Error ? err.message : "Transfer failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
