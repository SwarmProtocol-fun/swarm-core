"use client";

import { useState, useCallback } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { useActiveAccount } from "thirdweb/react";
import { getExplorerUrl } from "@/lib/solana-cluster";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { useCluster } from "./SolanaClusterContext";
import type { Agent } from "@/lib/firestore";
import type { WalletInfo } from "@/hooks/useSolanaData";
import {
  Wallet, ExternalLink, Copy, Loader2,
  ChevronDown, ChevronRight, Sparkles, CheckCircle, Coins,
} from "lucide-react";

interface WalletDetails {
  solBalance: number;
  tokenAccounts: Array<{ mint: string; balance: string; decimals: number; uiAmount: number }>;
  tokenAccountCount: number;
  stakedSol: number;
  loading: boolean;
  error?: string;
}

interface Props {
  walletInfo: WalletInfo | null;
  walletLoading: boolean;
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  orgId: string | undefined;
}

export default function SolanaWalletPanel({ walletInfo, walletLoading, agents, setAgents, orgId }: Props) {
  const { cluster } = useCluster();
  const { address } = useSession();
  const account = useActiveAccount();
  const authHeaders = { "Content-Type": "application/json", "x-wallet-address": account?.address || address || "" };

  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set());
  const [walletDetails, setWalletDetails] = useState<Record<string, WalletDetails>>({});
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");

  const toggleWalletExpansion = useCallback(async (agentId: string, solanaAddress: string) => {
    if (expandedWallets.has(agentId)) {
      setExpandedWallets(prev => { const n = new Set(prev); n.delete(agentId); return n; });
      return;
    }
    setExpandedWallets(prev => new Set(prev).add(agentId));
    if (walletDetails[agentId]) return;

    setWalletDetails(prev => ({ ...prev, [agentId]: { solBalance: 0, tokenAccounts: [], tokenAccountCount: 0, stakedSol: 0, loading: true } }));
    try {
      const res = await fetch(`/api/v1/solana/wallet/${solanaAddress}?cluster=${cluster}`);
      if (res.ok) {
        const data = await res.json();
        setWalletDetails(prev => ({ ...prev, [agentId]: { ...data, loading: false } }));
      } else {
        setWalletDetails(prev => ({ ...prev, [agentId]: { solBalance: 0, tokenAccounts: [], tokenAccountCount: 0, stakedSol: 0, loading: false, error: "Failed to load" } }));
      }
    } catch (err) {
      setWalletDetails(prev => ({ ...prev, [agentId]: { solBalance: 0, tokenAccounts: [], tokenAccountCount: 0, stakedSol: 0, loading: false, error: err instanceof Error ? err.message : "Unknown error" } }));
    }
  }, [expandedWallets, walletDetails, cluster]);

  async function handleBulkGenerateWallets() {
    if (!orgId) return;
    setBulkGenerating(true);
    const pending = agents.filter(a => !a.solanaAddress);
    for (let i = 0; i < pending.length; i++) {
      setBulkProgress(`Generating wallet ${i + 1}/${pending.length}...`);
      try {
        const res = await fetch("/api/v1/solana/wallet/generate", { method: "POST", headers: authHeaders, body: JSON.stringify({ agentId: pending[i].id, orgId }) });
        if (res.ok) {
          const data = await res.json();
          setAgents(prev => prev.map(a => a.id === pending[i].id ? { ...a, solanaAddress: data.solanaAddress } : a));
        }
      } catch { /* continue */ }
    }
    setBulkProgress("");
    setBulkGenerating(false);
  }

  return (
    <div className="space-y-6">
      {/* Platform Wallet */}
      <SpotlightCard className="p-0 glass-card-enhanced">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4 text-purple-400" />
            Platform Wallet (Solana)
            <Badge variant="outline" className="ml-auto text-[9px] px-1.5 bg-purple-500/10 border-purple-500/20 text-purple-400">
              {walletInfo?.cluster || cluster}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {walletInfo ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Address:</span>
                <code className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded truncate flex-1">{walletInfo.publicKey}</code>
                <button onClick={() => navigator.clipboard.writeText(walletInfo.publicKey)} className="text-purple-400 hover:text-purple-300 shrink-0"><Copy className="h-3 w-3" /></button>
                <a href={getExplorerUrl("account", walletInfo.publicKey, cluster)} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 shrink-0"><ExternalLink className="h-3 w-3" /></a>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div><span className="text-muted-foreground">Balance:</span> <span className="font-mono">{walletInfo.solBalance} SOL</span></div>
                <div><span className="text-muted-foreground">Token Accounts:</span> <span className="font-mono">{walletInfo.tokenAccountCount}</span></div>
                <div><span className="text-muted-foreground">Staked:</span> <span className="font-mono">{walletInfo.stakedSol} SOL</span></div>
              </div>
            </>
          ) : walletLoading ? (
            <div className="flex items-center gap-2 py-2"><Loader2 className="h-4 w-4 animate-spin text-purple-400" /><p className="text-sm text-muted-foreground">Loading...</p></div>
          ) : (
            <p className="text-sm text-muted-foreground">Failed to load platform wallet info.</p>
          )}
        </CardContent>
      </SpotlightCard>

      {/* User Session Wallet */}
      <SpotlightCard className="p-0 glass-card-enhanced">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4 text-purple-400" />
            Your Wallet (EVM)
            <Badge variant="outline" className="ml-auto text-[9px] px-1.5">thirdweb</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {address ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Address:</span>
              <code className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded truncate flex-1">{address}</code>
              <button onClick={() => navigator.clipboard.writeText(address)} className="text-purple-400 hover:text-purple-300 shrink-0"><Copy className="h-3 w-3" /></button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No wallet connected.</p>
          )}
        </CardContent>
      </SpotlightCard>

      {/* Agent Wallets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Agent Wallets</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{agents.filter(a => a.solanaAddress).length}/{agents.length} wallets generated</span>
            {agents.some(a => !a.solanaAddress) && (
              <Button onClick={handleBulkGenerateWallets} disabled={bulkGenerating} variant="outline" size="sm" className="text-[10px] h-6 px-2">
                {bulkGenerating ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Generating...</> : <>Generate All</>}
              </Button>
            )}
          </div>
        </div>
        {bulkProgress && <p className="text-[10px] text-muted-foreground mb-2">{bulkProgress}</p>}
        {agents.length > 0 ? (
          <div className="space-y-2">
            {agents.map(agent => {
              const isExpanded = expandedWallets.has(agent.id);
              const details = walletDetails[agent.id];
              return (
                <SpotlightCard key={agent.id} className="p-0 glass-card-enhanced">
                  <CardContent className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-3">
                      {agent.solanaAddress && (
                        <button onClick={() => toggleWalletExpansion(agent.id, agent.solanaAddress!)} className="text-purple-400 hover:text-purple-300 shrink-0 transition-transform">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      )}
                      <img src={agent.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`} alt={agent.name} className="w-9 h-9 rounded-full border-2 border-purple-500/30" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        <p className="text-[10px] text-muted-foreground">{agent.type}</p>
                      </div>
                      {agent.nftMintAddress ? (
                        <Badge variant="outline" className="text-[9px] px-1.5 bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shrink-0"><CheckCircle className="h-2.5 w-2.5 mr-0.5" /> NFT Minted</Badge>
                      ) : agent.solanaAddress ? (
                        <Badge variant="outline" className="text-[9px] px-1.5 bg-purple-500/10 border-purple-500/20 text-purple-400 shrink-0">Wallet Ready</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1.5 text-muted-foreground shrink-0">No Wallet</Badge>
                      )}
                    </div>

                    {agent.solanaAddress && (
                      <div className="space-y-1.5 pl-12">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-3 w-3 text-purple-400 shrink-0" />
                          <span className="text-[10px] text-muted-foreground shrink-0">Wallet:</span>
                          <code className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded truncate flex-1">{agent.solanaAddress}</code>
                          <button onClick={() => navigator.clipboard.writeText(agent.solanaAddress!)} className="text-purple-400 hover:text-purple-300 shrink-0"><Copy className="h-3 w-3" /></button>
                          <a href={getExplorerUrl("account", agent.solanaAddress, cluster)} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 shrink-0"><ExternalLink className="h-3 w-3" /></a>
                        </div>
                        {agent.nftMintAddress && (
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-pink-400 shrink-0" />
                            <span className="text-[10px] text-muted-foreground shrink-0">NFT:</span>
                            <code className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded truncate flex-1">{agent.nftMintAddress}</code>
                            <a href={getExplorerUrl("token", agent.nftMintAddress, cluster)} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 shrink-0"><ExternalLink className="h-3 w-3" /></a>
                          </div>
                        )}

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-border space-y-2">
                            {details?.loading ? (
                              <div className="flex items-center gap-2 py-2"><Loader2 className="h-4 w-4 animate-spin text-purple-400" /><p className="text-xs text-muted-foreground">Loading wallet contents...</p></div>
                            ) : details?.error ? (
                              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2"><p className="text-xs text-red-400">{details.error}</p></div>
                            ) : details ? (
                              <>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-2">
                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">SOL Balance</p>
                                    <p className="text-sm font-mono text-purple-400">{details.solBalance}</p>
                                  </div>
                                  <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-2">
                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Tokens</p>
                                    <p className="text-sm font-mono text-purple-400">{details.tokenAccountCount}</p>
                                  </div>
                                  <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-2">
                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Staked</p>
                                    <p className="text-sm font-mono text-purple-400">{details.stakedSol}</p>
                                  </div>
                                </div>
                                {details.tokenAccounts.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Token Accounts</p>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {details.tokenAccounts.map((token, idx) => (
                                        <div key={idx} className="flex items-center gap-2 rounded bg-muted/30 px-2 py-1">
                                          <Coins className="h-3 w-3 text-purple-400 shrink-0" />
                                          <code className="text-[9px] font-mono text-muted-foreground truncate flex-1">{token.mint}</code>
                                          <span className="text-[10px] font-mono text-purple-400 shrink-0">{token.balance}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {details.solBalance === 0 && details.tokenAccountCount === 0 && details.stakedSol === 0 && (
                                  <div className="rounded-lg bg-muted/20 p-3 text-center"><p className="text-[10px] text-muted-foreground">Wallet is empty.</p></div>
                                )}
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}

                    {!agent.solanaAddress && (
                      <div className="pl-12">
                        <Button
                          onClick={async () => {
                            if (!orgId) return;
                            try {
                              const res = await fetch("/api/v1/solana/wallet/generate", { method: "POST", headers: authHeaders, body: JSON.stringify({ agentId: agent.id, orgId }) });
                              if (res.ok) {
                                const data = await res.json();
                                setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, solanaAddress: data.solanaAddress } : a));
                              }
                            } catch { /* silently fail */ }
                          }}
                          variant="outline"
                          size="sm"
                          className="text-[10px] h-6 px-2"
                        >
                          <Wallet className="h-3 w-3 mr-1" /> Generate Wallet
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </SpotlightCard>
              );
            })}
          </div>
        ) : (
          <SpotlightCard className="p-0 glass-card-enhanced">
            <CardContent className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No agents registered yet.</p>
            </CardContent>
          </SpotlightCard>
        )}
      </div>
    </div>
  );
}
