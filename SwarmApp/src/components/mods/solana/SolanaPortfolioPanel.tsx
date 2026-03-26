"use client";

import { useState, useCallback } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/analytics/stat-card";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { useCluster } from "./SolanaClusterContext";
import type { Agent } from "@/lib/firestore";
import {
  TrendingUp, Loader2, RefreshCw, Coins,
  DollarSign, AlertTriangle,
} from "lucide-react";

interface PortfolioToken {
  mint: string;
  symbol: string;
  name?: string;
  balance: number;
  valueUsd: number;
  priceUsd: number;
  logoURI?: string;
}

interface Portfolio {
  address: string;
  totalValueUsd: number;
  solBalance: number;
  solValueUsd: number;
  stakedSol: number;
  stakedValueUsd: number;
  tokens: PortfolioToken[];
  cluster: string;
}

interface Props {
  agents: Agent[];
}

export default function SolanaPortfolioPanel({ agents }: Props) {
  const { cluster } = useCluster();
  const isMainnet = cluster === "mainnet-beta";

  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  const agentsWithWallets = agents.filter(a => a.solanaAddress);
  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const fetchPortfolio = useCallback(async () => {
    if (!selectedAgent?.solanaAddress) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/solana/portfolio/${selectedAgent.solanaAddress}?cluster=${cluster}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load portfolio");
      }
      const data = await res.json();
      setPortfolio(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, [selectedAgent?.solanaAddress, cluster]);

  // Fetch SOL price
  const fetchSolPrice = useCallback(async () => {
    if (!isMainnet) return;
    try {
      const res = await fetch("/api/v1/solana/prices?mints=So11111111111111111111111111111111111111112");
      if (res.ok) {
        const data = await res.json();
        if (data.prices?.[0]) setSolPrice(data.prices[0].price);
      }
    } catch { /* silently fail */ }
  }, [isMainnet]);

  function handleAgentChange(agentId: string) {
    setSelectedAgentId(agentId);
    setPortfolio(null);
    setError(null);
  }

  if (!isMainnet) {
    return (
      <div className="space-y-6">
        <SpotlightCard className="p-0 glass-card-enhanced">
          <CardContent className="px-6 py-12 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto" />
            <h3 className="text-lg font-semibold">Portfolio Requires Mainnet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Token price data and portfolio valuation are only available on mainnet-beta.
              Switch your cluster to see USD values for your holdings.
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
      {/* Agent Selector */}
      <div className="flex gap-2">
        <Select value={selectedAgentId} onValueChange={handleAgentChange}>
          <SelectTrigger className="bg-card text-foreground flex-1"><SelectValue placeholder="Select agent..." /></SelectTrigger>
          <SelectContent className="bg-card text-foreground border-border">
            {agentsWithWallets.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={fetchPortfolio} disabled={loading || !selectedAgentId} variant="outline" size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {/* Portfolio Stats */}
      {portfolio && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="Total Value" value={`$${portfolio.totalValueUsd.toFixed(2)}`} icon="💰" />
            <StatCard title="SOL Balance" value={`${portfolio.solBalance.toFixed(4)}`} icon="◎" />
            <StatCard title="SOL Value" value={`$${portfolio.solValueUsd.toFixed(2)}`} icon="💵" />
            <StatCard title="Staked SOL" value={`${portfolio.stakedSol.toFixed(4)}`} icon="🔒" />
          </div>

          {/* Token Holdings */}
          <SpotlightCard className="p-0 glass-card-enhanced">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Coins className="h-4 w-4 text-purple-400" />
                Token Holdings
                <Badge variant="outline" className="ml-auto text-[9px] px-1.5">{portfolio.tokens.length} tokens</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {portfolio.tokens.length > 0 ? (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-5 gap-2 text-[10px] text-muted-foreground uppercase tracking-wider px-2">
                    <span>Token</span>
                    <span className="text-right">Balance</span>
                    <span className="text-right">Price</span>
                    <span className="text-right">Value</span>
                    <span className="text-right">% of Portfolio</span>
                  </div>
                  {/* Rows */}
                  {portfolio.tokens.map(token => (
                    <div key={token.mint} className="grid grid-cols-5 gap-2 items-center rounded-lg bg-muted/10 px-2 py-2 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-400 shrink-0">
                          {token.symbol?.charAt(0) || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{token.symbol || "Unknown"}</p>
                          <p className="text-[9px] text-muted-foreground font-mono truncate">{token.mint.slice(0, 6)}...</p>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-right">{token.balance.toFixed(4)}</p>
                      <p className="text-xs font-mono text-right text-muted-foreground">${token.priceUsd.toFixed(4)}</p>
                      <p className="text-xs font-mono text-right text-purple-400">${token.valueUsd.toFixed(2)}</p>
                      <p className="text-xs font-mono text-right text-muted-foreground">
                        {portfolio.totalValueUsd > 0 ? ((token.valueUsd / portfolio.totalValueUsd) * 100).toFixed(1) : "0"}%
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Coins className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No token holdings found</p>
                </div>
              )}
            </CardContent>
          </SpotlightCard>
        </>
      )}

      {error && <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"><p className="text-xs text-red-400">{error}</p></div>}

      {!portfolio && !loading && !error && selectedAgentId && (
        <div className="text-center py-12">
          <TrendingUp className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Click refresh to load portfolio data</p>
        </div>
      )}

      {!selectedAgentId && (
        <div className="text-center py-12">
          <DollarSign className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Select an agent to view portfolio valuation</p>
        </div>
      )}
    </div>
  );
}
