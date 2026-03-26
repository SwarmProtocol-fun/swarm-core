/**
 * GET /api/v1/solana/transactions/[address]?cluster=devnet&limit=20&before=<sig>
 *
 * Returns transaction history for a Solana address.
 * Uses Helius Enhanced API on mainnet (if HELIUS_API_KEY set), raw RPC otherwise.
 */
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createConnection } from "@/lib/solana-keys";
import { clusterFromRequest } from "@/lib/solana-cluster";

export const dynamic = "force-dynamic";

interface ParsedTx {
  signature: string;
  blockTime: number | null;
  type: string;
  description: string;
  fee: number;
  status: "success" | "failed";
  nativeTransfers?: Array<{ fromAddress: string; toAddress: string; amount: number }>;
  tokenTransfers?: Array<{ fromAddress: string; toAddress: string; amount: number; mint: string; symbol?: string }>;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params;
    if (!address) return Response.json({ error: "Address required" }, { status: 400 });

    const cluster = clusterFromRequest(request);
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
    const before = url.searchParams.get("before") || undefined;
    const heliusKey = process.env.HELIUS_API_KEY;
    const isMainnet = cluster === "mainnet-beta";

    let pubkey: PublicKey;
    try {
      pubkey = new PublicKey(address);
    } catch {
      return Response.json({ error: "Invalid Solana address" }, { status: 400 });
    }

    // Try Helius Enhanced API on mainnet
    if (isMainnet && heliusKey) {
      try {
        const heliusUrl = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${heliusKey}&limit=${limit}${before ? `&before=${before}` : ""}`;
        const res = await fetch(heliusUrl);
        if (res.ok) {
          const raw = await res.json();
          const transactions: ParsedTx[] = (raw || []).map((tx: any) => ({
            signature: tx.signature,
            blockTime: tx.timestamp || null,
            type: (tx.type || "UNKNOWN").toLowerCase(),
            description: tx.description || tx.type || "Transaction",
            fee: (tx.fee || 0) / LAMPORTS_PER_SOL,
            status: tx.transactionError ? "failed" : "success",
            nativeTransfers: (tx.nativeTransfers || []).map((nt: any) => ({
              fromAddress: nt.fromUserAccount,
              toAddress: nt.toUserAccount,
              amount: (nt.amount || 0) / LAMPORTS_PER_SOL,
            })),
            tokenTransfers: (tx.tokenTransfers || []).map((tt: any) => ({
              fromAddress: tt.fromUserAccount,
              toAddress: tt.toUserAccount,
              amount: tt.tokenAmount || 0,
              mint: tt.mint,
              symbol: tt.tokenStandard,
            })),
          }));
          return Response.json({ transactions, hasMore: transactions.length >= limit });
        }
      } catch {
        // Fall through to RPC
      }
    }

    // Fallback: raw Solana RPC
    const connection = createConnection(cluster);
    const sigs = await connection.getSignaturesForAddress(pubkey, { limit, before });

    const transactions: ParsedTx[] = [];
    // Batch parse (up to 20 at a time)
    const sigStrings = sigs.map(s => s.signature);
    if (sigStrings.length > 0) {
      const parsedTxs = await connection.getParsedTransactions(sigStrings, { maxSupportedTransactionVersion: 0 });

      for (let i = 0; i < sigs.length; i++) {
        const sig = sigs[i];
        const parsed = parsedTxs[i];

        let type = "unknown";
        let description = "Transaction";

        // Basic type detection from instructions
        if (parsed?.transaction?.message?.instructions) {
          const programs = parsed.transaction.message.instructions.map(
            (ix: any) => ix.programId?.toBase58?.() || ix.programId || "",
          );
          if (programs.includes("11111111111111111111111111111111")) {
            type = "transfer";
            description = "SOL Transfer";
          } else if (programs.includes("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")) {
            type = "transfer";
            description = "Token Transfer";
          } else if (programs.includes("Stake11111111111111111111111111111111111111")) {
            type = "stake";
            description = "Staking Operation";
          }
        }

        // Extract native transfers from pre/post balances
        const nativeTransfers: ParsedTx["nativeTransfers"] = [];
        if (parsed?.meta) {
          const accounts = parsed.transaction.message.accountKeys.map((k: any) => k.pubkey?.toBase58?.() || k.pubkey || "");
          const pre = parsed.meta.preBalances || [];
          const post = parsed.meta.postBalances || [];
          for (let j = 0; j < accounts.length; j++) {
            const diff = ((post[j] || 0) - (pre[j] || 0)) / LAMPORTS_PER_SOL;
            if (Math.abs(diff) > 0.000001 && accounts[j] !== address) {
              nativeTransfers.push({
                fromAddress: diff < 0 ? accounts[j] : address,
                toAddress: diff > 0 ? accounts[j] : address,
                amount: Math.abs(diff),
              });
            }
          }
        }

        transactions.push({
          signature: sig.signature,
          blockTime: sig.blockTime || null,
          type,
          description,
          fee: (parsed?.meta?.fee || 0) / LAMPORTS_PER_SOL,
          status: sig.err ? "failed" : "success",
          nativeTransfers,
        });
      }
    }

    return Response.json({ transactions, hasMore: sigs.length >= limit });
  } catch (err) {
    console.error("Transaction history error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch transactions";
    return Response.json({ error: message }, { status: 500 });
  }
}
