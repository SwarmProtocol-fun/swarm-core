/**
 * POST /api/v1/solana/jupiter/quote
 *
 * Proxy Jupiter V6 quote request. No auth required (read-only).
 * Only works on mainnet.
 */
import { getQuote } from "@/lib/solana-jupiter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { inputMint, outputMint, amount, slippageBps } = body;
    if (!inputMint || !outputMint || !amount) {
      return Response.json({ error: "inputMint, outputMint, and amount are required" }, { status: 400 });
    }

    const quote = await getQuote({
      inputMint,
      outputMint,
      amount: String(amount),
      slippageBps: slippageBps || 50,
    });

    return Response.json(quote);
  } catch (err) {
    console.error("Jupiter quote error:", err);
    const message = err instanceof Error ? err.message : "Quote failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
