/**
 * GET /api/v1/solana/prices?mints=So11...,EPjF...
 *
 * Returns token prices via Jupiter Price API.
 * Mainnet only — devnet/testnet tokens have no market price.
 */
import { getTokenPrices } from "@/lib/solana-prices";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mintsParam = url.searchParams.get("mints");

    if (!mintsParam) {
      return Response.json({ error: "mints query param required (comma-separated)" }, { status: 400 });
    }

    const mints = mintsParam.split(",").map(s => s.trim()).filter(Boolean);
    if (mints.length === 0) {
      return Response.json({ prices: [], timestamp: Date.now() });
    }

    const prices = await getTokenPrices(mints);

    return Response.json({ prices, timestamp: Date.now() });
  } catch (err) {
    console.error("Price fetch error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch prices";
    return Response.json({ error: message }, { status: 500 });
  }
}
