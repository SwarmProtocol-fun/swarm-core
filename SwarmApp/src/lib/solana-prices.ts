/**
 * Price feed utilities using Jupiter Price API v2.
 * Free, no API key required. Mainnet only.
 */

export interface TokenPrice {
  id: string;
  symbol: string;
  price: number;
  change24h?: number;
}

const JUPITER_PRICE_API = "https://price.jup.ag/v6/price";

/** In-memory cache: mintAddress → { data, ts } */
const priceCache = new Map<string, { data: TokenPrice; ts: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

/** Well-known token symbols for display */
const KNOWN_SYMBOLS: Record<string, string> = {
  So11111111111111111111111111111111111111112: "SOL",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: "BONK",
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: "JUP",
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs": "RAY",
};

/** Fetch prices for a list of mint addresses. */
export async function getTokenPrices(mints: string[]): Promise<TokenPrice[]> {
  const now = Date.now();
  const cached: TokenPrice[] = [];
  const uncached: string[] = [];

  for (const mint of mints) {
    const entry = priceCache.get(mint);
    if (entry && now - entry.ts < CACHE_TTL_MS) {
      cached.push(entry.data);
    } else {
      uncached.push(mint);
    }
  }

  if (uncached.length === 0) return cached;

  try {
    const ids = uncached.join(",");
    const res = await fetch(`${JUPITER_PRICE_API}?ids=${ids}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return cached;

    const json = await res.json();
    const data = json.data || {};

    for (const mint of uncached) {
      const entry = data[mint];
      if (entry) {
        const tokenPrice: TokenPrice = {
          id: mint,
          symbol: KNOWN_SYMBOLS[mint] || entry.mintSymbol || mint.slice(0, 6),
          price: entry.price || 0,
        };
        priceCache.set(mint, { data: tokenPrice, ts: now });
        cached.push(tokenPrice);
      }
    }
  } catch {
    // Return whatever we have from cache
  }

  return cached;
}

/** Shorthand: get SOL price in USD. */
export async function getSolPrice(): Promise<number> {
  const prices = await getTokenPrices(["So11111111111111111111111111111111111111112"]);
  return prices[0]?.price || 0;
}
