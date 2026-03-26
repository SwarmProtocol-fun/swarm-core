"use client";

import { useState, useEffect, useCallback } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/contexts/SessionContext";
import { useActiveAccount } from "thirdweb/react";
import { getExplorerUrl } from "@/lib/solana-cluster";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { useCluster } from "./SolanaClusterContext";
import type { Agent } from "@/lib/firestore";
import {
  ArrowLeftRight, AlertTriangle, Loader2, RefreshCw,
  CheckCircle, ExternalLink, ArrowDown, Info,
} from "lucide-react";

interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{ swapInfo: { label: string }; percent: number }>;
}

const POPULAR_TOKENS = [
  { mint: "So11111111111111111111111111111111111111112", symbol: "SOL", name: "Solana", decimals: 9 },
  { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "USDC", name: "USD Coin", decimals: 6 },
  { mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", symbol: "USDT", name: "Tether", decimals: 6 },
  { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", name: "Bonk", decimals: 5 },
  { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", symbol: "JUP", name: "Jupiter", decimals: 6 },
  { mint: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", symbol: "RAY", name: "Raydium", decimals: 6 },
];

interface Props {
  agents: Agent[];
  orgId: string | undefined;
}

export default function SolanaSwapPanel({ agents, orgId }: Props) {
  const { cluster } = useCluster();
  const { address } = useSession();
  const account = useActiveAccount();
  const isMainnet = cluster === "mainnet-beta";

  const [inputMint, setInputMint] = useState(POPULAR_TOKENS[0].mint);
  const [outputMint, setOutputMint] = useState(POPULAR_TOKENS[1].mint);
  const [amount, setAmount] = useState("");
  const [slippageBps, setSlippageBps] = useState(50);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [quote, setQuote] = useState<JupiterQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [swapResult, setSwapResult] = useState<{ signature: string } | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  const inputToken = POPULAR_TOKENS.find(t => t.mint === inputMint);
  const outputToken = POPULAR_TOKENS.find(t => t.mint === outputMint);
  const agentsWithWallets = agents.filter(a => a.solanaAddress);

  // Debounced quote fetching
  useEffect(() => {
    if (!isMainnet || !amount || !inputMint || !outputMint || inputMint === outputMint) {
      setQuote(null);
      return;
    }
    const decimals = inputToken?.decimals || 9;
    const lamports = String(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
    if (isNaN(parseInt(lamports)) || parseInt(lamports) <= 0) return;

    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const res = await fetch("/api/v1/solana/jupiter/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inputMint, outputMint, amount: lamports, slippageBps }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to get quote");
        }
        setQuote(await res.json());
      } catch (err) {
        setQuoteError(err instanceof Error ? err.message : "Quote failed");
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [amount, inputMint, outputMint, slippageBps, isMainnet, inputToken?.decimals]);

  async function handleSwap() {
    if (!quote || !selectedAgentId || !orgId) return;
    setSwapping(true);
    setSwapError(null);
    setSwapResult(null);
    try {
      const res = await fetch("/api/v1/solana/jupiter/swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": account?.address || address || "",
        },
        body: JSON.stringify({ orgId, agentId: selectedAgentId, quoteResponse: quote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Swap failed");
      setSwapResult(data);
      setQuote(null);
      setAmount("");
    } catch (err) {
      setSwapError(err instanceof Error ? err.message : "Swap failed");
    } finally {
      setSwapping(false);
    }
  }

  function flipTokens() {
    setInputMint(outputMint);
    setOutputMint(inputMint);
    setQuote(null);
  }

  if (!isMainnet) {
    return (
      <div className="space-y-6">
        <SpotlightCard className="p-0 glass-card-enhanced">
          <CardContent className="px-6 py-12 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto" />
            <h3 className="text-lg font-semibold">Jupiter Swap Requires Mainnet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Jupiter DEX aggregation is only available on Solana mainnet-beta.
              Switch your cluster to Mainnet Beta to access token swaps.
            </p>
            <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/20 text-amber-400">
              Current: {cluster === "devnet" ? "Devnet" : "Testnet"}
            </Badge>
          </CardContent>
        </SpotlightCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SpotlightCard className="p-0 glass-card-enhanced">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-purple-400" />
            Jupiter Swap
            <Badge variant="outline" className="ml-auto text-[9px] px-1.5 bg-emerald-500/10 border-emerald-500/20 text-emerald-400">Mainnet</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Agent Wallet Selector */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">From Agent Wallet</p>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="bg-card text-foreground"><SelectValue placeholder="Select agent wallet..." /></SelectTrigger>
              <SelectContent className="bg-card text-foreground border-border">
                {agentsWithWallets.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name} <span className="text-muted-foreground ml-1 font-mono text-[10px]">({a.solanaAddress?.slice(0, 6)}...)</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Input Token */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">You Pay</p>
            <div className="flex gap-2">
              <Select value={inputMint} onValueChange={(v) => { setInputMint(v); setQuote(null); }}>
                <SelectTrigger className="bg-card text-foreground w-32"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card text-foreground border-border">
                  {POPULAR_TOKENS.filter(t => t.mint !== outputMint).map(t => (
                    <SelectItem key={t.mint} value={t.mint}>{t.symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="font-mono bg-card text-foreground flex-1" />
            </div>
          </div>

          {/* Flip */}
          <div className="flex justify-center">
            <button onClick={flipTokens} className="p-2 rounded-full bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
              <ArrowDown className="h-4 w-4 text-purple-400" />
            </button>
          </div>

          {/* Output Token */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">You Receive</p>
            <div className="flex gap-2">
              <Select value={outputMint} onValueChange={(v) => { setOutputMint(v); setQuote(null); }}>
                <SelectTrigger className="bg-card text-foreground w-32"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card text-foreground border-border">
                  {POPULAR_TOKENS.filter(t => t.mint !== inputMint).map(t => (
                    <SelectItem key={t.mint} value={t.mint}>{t.symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1 flex items-center px-3 rounded-md border border-border bg-muted/30 font-mono text-sm">
                {quoteLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                ) : quote ? (
                  <span className="text-purple-400">
                    {(parseInt(quote.outAmount) / Math.pow(10, outputToken?.decimals || 6)).toFixed(6)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Slippage */}
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Slippage:</p>
            {[25, 50, 100, 300].map(bps => (
              <button
                key={bps}
                onClick={() => setSlippageBps(bps)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                  slippageBps === bps
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    : "text-muted-foreground border-border hover:border-purple-500/20"
                }`}
              >
                {(bps / 100).toFixed(2)}%
              </button>
            ))}
          </div>

          {/* Quote Details */}
          {quote && (
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price Impact</span>
                <span className={parseFloat(quote.priceImpactPct) > 1 ? "text-amber-400" : "text-emerald-400"}>
                  {parseFloat(quote.priceImpactPct).toFixed(4)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Min Received</span>
                <span className="font-mono text-purple-400">
                  {(parseInt(quote.otherAmountThreshold) / Math.pow(10, outputToken?.decimals || 6)).toFixed(6)} {outputToken?.symbol}
                </span>
              </div>
              {quote.routePlan.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Route</span>
                  <span className="text-purple-400">
                    {quote.routePlan.map(r => r.swapInfo.label).join(" → ")}
                  </span>
                </div>
              )}
              {parseFloat(quote.priceImpactPct) > 3 && (
                <div className="flex items-center gap-1 text-amber-400 mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-[10px]">High price impact! Consider reducing your trade size.</span>
                </div>
              )}
            </div>
          )}

          {quoteError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2">
              <p className="text-xs text-red-400">{quoteError}</p>
            </div>
          )}

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={swapping || !quote || !selectedAgentId}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {swapping ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Swapping...</>
            ) : (
              <><ArrowLeftRight className="h-4 w-4 mr-2" /> Swap {inputToken?.symbol} → {outputToken?.symbol}</>
            )}
          </Button>

          {/* Swap Result */}
          {swapResult && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-400" /><p className="text-sm font-medium text-emerald-400">Swap Successful!</p></div>
              <a href={getExplorerUrl("tx", swapResult.signature, cluster)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-purple-400 hover:underline">
                View on Solscan <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {swapError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"><p className="text-xs text-red-400">{swapError}</p></div>
          )}
        </CardContent>
      </SpotlightCard>

      {/* Info */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Swaps are executed via Jupiter V6 DEX aggregator. Transactions are signed by the agent&apos;s derived keypair on the server. All swaps are on Solana mainnet.</p>
      </div>
    </div>
  );
}
