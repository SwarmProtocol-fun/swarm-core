/**
 * GET /api/v1/solana/portfolio/[address]?cluster=mainnet-beta
 *
 * Returns portfolio valuation: wallet balances + USD prices.
 * Prices only available on mainnet.
 */
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createConnection } from "@/lib/solana-keys";
import { clusterFromRequest } from "@/lib/solana-cluster";
import { getTokenPrices, getSolPrice } from "@/lib/solana-prices";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params;
    if (!address) return Response.json({ error: "Address required" }, { status: 400 });

    const cluster = clusterFromRequest(request);
    const connection = createConnection(cluster);
    const isMainnet = cluster === "mainnet-beta";

    let pubkey: PublicKey;
    try {
      pubkey = new PublicKey(address);
    } catch {
      return Response.json({ error: "Invalid Solana address" }, { status: 400 });
    }

    // Fetch balances
    const [lamports, tokenAccountsResponse, stakeAccounts] = await Promise.all([
      connection.getBalance(pubkey),
      connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      }),
      connection.getParsedProgramAccounts(
        new PublicKey("Stake11111111111111111111111111111111111111"),
        { filters: [{ dataSize: 200 }, { memcmp: { offset: 12, bytes: address } }] },
      ),
    ]);

    const solBalance = lamports / LAMPORTS_PER_SOL;
    const stakedLamports = stakeAccounts.reduce((sum, acc) => sum + (acc.account.lamports || 0), 0);
    const stakedSol = stakedLamports / LAMPORTS_PER_SOL;

    // Parse token accounts
    const tokenAccounts = tokenAccountsResponse.value.map(acc => {
      const parsed = acc.account.data.parsed?.info;
      return {
        mint: parsed?.mint || "unknown",
        balance: parsed?.tokenAmount?.uiAmount || 0,
        decimals: parsed?.tokenAmount?.decimals || 0,
      };
    }).filter(t => t.balance > 0);

    // Fetch prices (mainnet only)
    let solPrice = 0;
    let tokenPrices: Record<string, number> = {};

    if (isMainnet) {
      const allMints = ["So11111111111111111111111111111111111111112", ...tokenAccounts.map(t => t.mint)];
      const prices = await getTokenPrices(allMints);
      for (const p of prices) {
        if (p.id === "So11111111111111111111111111111111111111112") {
          solPrice = p.price;
        } else {
          tokenPrices[p.id] = p.price;
        }
      }
    }

    const solValueUsd = solBalance * solPrice;
    const stakedValueUsd = stakedSol * solPrice;

    const tokens = tokenAccounts.map(t => ({
      mint: t.mint,
      symbol: "", // populated from price data
      balance: t.balance,
      priceUsd: tokenPrices[t.mint] || 0,
      valueUsd: t.balance * (tokenPrices[t.mint] || 0),
    }));

    // Enrich symbols from price API
    if (isMainnet) {
      const prices = await getTokenPrices(tokenAccounts.map(t => t.mint));
      for (const p of prices) {
        const token = tokens.find(t => t.mint === p.id);
        if (token) token.symbol = p.symbol;
      }
    }

    const totalValueUsd = solValueUsd + stakedValueUsd + tokens.reduce((s, t) => s + t.valueUsd, 0);

    return Response.json({
      address,
      totalValueUsd: Number(totalValueUsd.toFixed(2)),
      solBalance: Number(solBalance.toFixed(4)),
      solValueUsd: Number(solValueUsd.toFixed(2)),
      stakedSol: Number(stakedSol.toFixed(4)),
      stakedValueUsd: Number(stakedValueUsd.toFixed(2)),
      tokens,
      cluster,
    });
  } catch (err) {
    console.error("Portfolio error:", err);
    const message = err instanceof Error ? err.message : "Failed to build portfolio";
    return Response.json({ error: message }, { status: 500 });
  }
}
