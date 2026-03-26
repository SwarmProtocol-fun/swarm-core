"use client";

import { useState, useCallback } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getExplorerUrl } from "@/lib/solana-cluster";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { useCluster } from "./SolanaClusterContext";
import type { Agent } from "@/lib/firestore";
import {
  History, Loader2, ExternalLink, ArrowUpRight, ArrowDownLeft,
  ArrowLeftRight, Lock, Sparkles, HelpCircle, RefreshCw,
} from "lucide-react";

interface Transaction {
  signature: string;
  blockTime: number | null;
  type: string;
  description: string;
  fee: number;
  status: "success" | "failed";
  nativeTransfers?: Array<{ fromAddress: string; toAddress: string; amount: number }>;
  tokenTransfers?: Array<{ fromAddress: string; toAddress: string; amount: number; mint: string; symbol?: string }>;
}

const TYPE_ICONS: Record<string, typeof ArrowUpRight> = {
  transfer: ArrowUpRight,
  receive: ArrowDownLeft,
  swap: ArrowLeftRight,
  stake: Lock,
  nft: Sparkles,
};

const TYPE_COLORS: Record<string, string> = {
  transfer: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  receive: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  swap: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  stake: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  nft: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  unknown: "bg-muted/50 text-muted-foreground border-border",
};

type FilterType = "all" | "transfer" | "swap" | "stake" | "nft";

interface Props {
  agents: Agent[];
}

export default function SolanaHistoryPanel({ agents }: Props) {
  const { cluster } = useCluster();

  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const agentsWithWallets = agents.filter(a => a.solanaAddress);
  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const fetchHistory = useCallback(async (before?: string) => {
    if (!selectedAgent?.solanaAddress) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ cluster, limit: "20" });
      if (before) params.set("before", before);
      const res = await fetch(`/api/v1/solana/transactions/${selectedAgent.solanaAddress}?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch transactions");
      }
      const data = await res.json();
      if (before) {
        setTransactions(prev => [...prev, ...data.transactions]);
      } else {
        setTransactions(data.transactions);
      }
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [selectedAgent?.solanaAddress, cluster]);

  function handleAgentChange(agentId: string) {
    setSelectedAgentId(agentId);
    setTransactions([]);
    setHasMore(false);
    setError(null);
  }

  const filteredTx = filter === "all" ? transactions : transactions.filter(t => t.type === filter);

  function formatTime(blockTime: number | null) {
    if (!blockTime) return "—";
    const date = new Date(blockTime * 1000);
    const now = Date.now();
    const diff = now - date.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  return (
    <div className="space-y-6">
      <SpotlightCard className="p-0 glass-card-enhanced">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-purple-400" />
            Transaction History
            <Badge variant="outline" className="ml-auto text-[9px] px-1.5 bg-purple-500/10 border-purple-500/20 text-purple-400">
              {cluster === "mainnet-beta" ? "Mainnet" : cluster === "devnet" ? "Devnet" : "Testnet"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
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
            <Button onClick={() => fetchHistory()} disabled={loading || !selectedAgentId} variant="outline" size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-1">
            {(["all", "transfer", "swap", "stake", "nft"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all capitalize ${
                  filter === f ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "text-muted-foreground border-border hover:border-purple-500/20"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Transactions */}
          {error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"><p className="text-xs text-red-400">{error}</p></div>
          ) : filteredTx.length > 0 ? (
            <div className="space-y-2">
              {filteredTx.map(tx => {
                const Icon = TYPE_ICONS[tx.type] || HelpCircle;
                const colorClass = TYPE_COLORS[tx.type] || TYPE_COLORS.unknown;
                return (
                  <div key={tx.signature} className="flex items-center gap-3 rounded-lg border border-border bg-muted/10 px-3 py-2.5 hover:bg-muted/20 transition-colors">
                    <div className={`p-1.5 rounded-lg border ${colorClass}`}><Icon className="h-3.5 w-3.5" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{tx.description || tx.type}</p>
                      <p className="text-[10px] text-muted-foreground">{formatTime(tx.blockTime)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {tx.nativeTransfers && tx.nativeTransfers.length > 0 && (
                        <p className="text-xs font-mono text-purple-400">{tx.nativeTransfers[0].amount.toFixed(4)} SOL</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{tx.fee.toFixed(6)} SOL fee</p>
                    </div>
                    <Badge variant="outline" className={`text-[8px] px-1 shrink-0 ${tx.status === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                      {tx.status}
                    </Badge>
                    <a href={getExplorerUrl("tx", tx.signature, cluster)} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 shrink-0"><ExternalLink className="h-3.5 w-3.5" /></a>
                  </div>
                );
              })}
              {hasMore && (
                <Button onClick={() => fetchHistory(transactions[transactions.length - 1]?.signature)} disabled={loading} variant="outline" size="sm" className="w-full text-xs">
                  {loading ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading...</> : "Load More"}
                </Button>
              )}
            </div>
          ) : selectedAgentId && !loading ? (
            <div className="text-center py-8">
              <History className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No transactions found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Select an agent and click refresh to load history</p>
            </div>
          ) : !selectedAgentId ? (
            <div className="text-center py-8">
              <History className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Select an agent to view transaction history</p>
            </div>
          ) : null}

          {loading && transactions.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          )}
        </CardContent>
      </SpotlightCard>
    </div>
  );
}
