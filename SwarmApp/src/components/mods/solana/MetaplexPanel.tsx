"use client";

import { useState } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/analytics/stat-card";
import { useSession } from "@/contexts/SessionContext";
import { useActiveAccount } from "thirdweb/react";
import { METAPLEX_MANIFEST } from "@/lib/metaplex";
import { getExplorerUrl } from "@/lib/solana-cluster";
import { cn } from "@/lib/utils";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { useCluster } from "./SolanaClusterContext";
import type { Agent } from "@/lib/firestore";
import type { WalletInfo } from "@/hooks/useSolanaData";
import {
  Palette, Layers, ExternalLink, Loader2, Sparkles,
  CheckCircle, Copy, Wallet, Send, Play, Code, Wrench,
  Landmark, GitBranch, FileEdit, Image,
} from "lucide-react";

const TOOL_ICONS: Record<string, typeof Wrench> = {
  Wallet, Coins: Landmark, Lock: GitBranch, Code, ExternalLink,
  Sparkles, Layers, FileEdit, Image,
};

interface Props {
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  orgId: string | undefined;
  collectionMint: string | null;
  setCollectionMint: (v: string | null) => void;
  walletInfo: WalletInfo | null;
  walletLoading: boolean;
  fetchWalletInfo: () => void;
}

export default function MetaplexPanel({
  agents, setAgents, orgId, collectionMint, setCollectionMint,
  walletInfo, walletLoading, fetchWalletInfo,
}: Props) {
  const { cluster } = useCluster();
  const { address } = useSession();
  const account = useActiveAccount();
  const authHeaders = { "Content-Type": "application/json", "x-wallet-address": account?.address || address || "" };

  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [useCustomWallet, setUseCustomWallet] = useState(false);
  const [customWallet, setCustomWallet] = useState("");
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintCustodial, setMintCustodial] = useState(false);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkMinting, setBulkMinting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;
  const recipientAddress = useCustomWallet ? customWallet : (account?.address || address || "");

  async function handleMintNft() {
    if (!selectedAgent || !recipientAddress || !orgId) return;
    setMinting(true); setMintError(null); setMintSuccess(null); setMintCustodial(false);
    try {
      const res = await fetch("/api/v1/metaplex/mint", {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ agentId: selectedAgent.id, orgId, recipientAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Mint failed (${res.status})`);
      setAgents(prev => prev.map(a => a.id === selectedAgent.id ? { ...a, nftMintAddress: data.mintAddress, nftMintedAt: new Date() } : a));
      setMintSuccess(data.mintAddress);
      setMintCustodial(data.custodial || false);
    } catch (err) {
      setMintError(err instanceof Error ? err.message : "Mint failed");
    } finally {
      setMinting(false);
    }
  }

  async function handleCreateCollection() {
    if (!orgId) return;
    setCreatingCollection(true);
    try {
      const res = await fetch("/api/v1/metaplex/collection", { method: "POST", headers: authHeaders, body: JSON.stringify({ orgId }) });
      const data = await res.json();
      if (res.ok) setCollectionMint(data.collectionMint);
    } catch (err) {
      console.error("Collection creation failed:", err);
    } finally {
      setCreatingCollection(false);
    }
  }

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
    setBulkProgress(""); setBulkGenerating(false);
  }

  async function handleBulkMint() {
    if (!orgId) return;
    setBulkMinting(true);
    const pending = agents.filter(a => a.solanaAddress && !a.nftMintAddress);
    for (let i = 0; i < pending.length; i++) {
      setBulkProgress(`Minting NFT ${i + 1}/${pending.length}...`);
      try {
        const res = await fetch("/api/v1/metaplex/mint", {
          method: "POST", headers: authHeaders,
          body: JSON.stringify({ agentId: pending[i].id, orgId, recipientAddress: pending[i].solanaAddress }),
        });
        if (res.ok) {
          const data = await res.json();
          setAgents(prev => prev.map(a => a.id === pending[i].id ? { ...a, nftMintAddress: data.mintAddress, nftMintedAt: new Date() } : a));
        }
      } catch { /* continue */ }
      if (i < pending.length - 1) await new Promise(r => setTimeout(r, 500));
    }
    setBulkProgress(""); setBulkMinting(false);
    fetchWalletInfo();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20"><Palette className="h-5 w-5 text-pink-400" /></div>
        <div>
          <h2 className="text-lg font-semibold">Metaplex</h2>
          <p className="text-xs text-muted-foreground">NFT minting, collections, metadata, and agent identity on Solana</p>
        </div>
        <a href="https://www.metaplex.com/docs" target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-pink-400 hover:underline flex items-center gap-1">Docs <ExternalLink className="h-3 w-3" /></a>
      </div>

      {/* Organization Collection */}
      <SpotlightCard className="p-0 glass-card-enhanced" spotlightColor="rgba(236,72,153,0.06)">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-pink-400" />
            Organization Collection
            {collectionMint && <Badge variant="outline" className="ml-auto text-[9px] px-1.5 bg-emerald-500/10 border-emerald-500/20 text-emerald-400">Active</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {collectionMint ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-emerald-400">Collection Active</p>
                <code className="text-[10px] font-mono text-muted-foreground break-all">{collectionMint}</code>
              </div>
              <a href={getExplorerUrl("token", collectionMint, cluster)} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-400 hover:underline flex items-center gap-1 shrink-0">Solscan <ExternalLink className="h-3 w-3" /></a>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Create a collection to group all your agent identity NFTs together.</p>
              <Button onClick={handleCreateCollection} disabled={creatingCollection} size="sm" className="bg-pink-600 hover:bg-pink-700 text-white text-xs">
                {creatingCollection ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Creating...</> : <><Layers className="h-3 w-3 mr-1" /> Create Collection</>}
              </Button>
            </div>
          )}
        </CardContent>
      </SpotlightCard>

      {/* Bulk Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleBulkGenerateWallets} disabled={bulkGenerating || agents.every(a => a.solanaAddress)} variant="outline" size="sm" className="text-xs">
          {bulkGenerating ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Generating...</> : <>Generate All Wallets ({agents.filter(a => !a.solanaAddress).length} remaining)</>}
        </Button>
        <Button onClick={handleBulkMint} disabled={bulkMinting || agents.filter(a => a.solanaAddress && !a.nftMintAddress).length === 0} variant="outline" size="sm" className="text-xs">
          {bulkMinting ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Minting...</> : <>Mint All NFTs ({agents.filter(a => a.solanaAddress && !a.nftMintAddress).length} remaining)</>}
        </Button>
        {bulkProgress && <span className="text-[10px] text-muted-foreground">{bulkProgress}</span>}
      </div>

      {/* NFT Gallery */}
      {agents.filter(a => a.nftMintAddress).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Agent NFT Gallery</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.filter(a => a.nftMintAddress).map(agent => (
              <SpotlightCard key={agent.id} className="p-0 glass-card-enhanced" spotlightColor="rgba(236,72,153,0.06)">
                <CardContent className="px-4 py-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <img src={agent.avatarUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=${agent.name}-${agent.type || "agent"}`} alt={agent.name} className="w-12 h-12 rounded-lg border-2 border-pink-500/30 bg-zinc-900" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{agent.name}</p>
                      <p className="text-[10px] text-muted-foreground">{agent.type} · {agent.asn?.split("-").slice(0, 4).join("-") || "—"}</p>
                    </div>
                    <Badge variant="outline" className="text-[8px] px-1 bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shrink-0">NFT</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-[9px] font-mono text-muted-foreground truncate flex-1">{agent.nftMintAddress}</code>
                    <a href={getExplorerUrl("token", agent.nftMintAddress!, cluster)} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 shrink-0"><ExternalLink className="h-3 w-3" /></a>
                  </div>
                </CardContent>
              </SpotlightCard>
            ))}
          </div>
        </div>
      )}

      {/* Mint Agent Identity NFT */}
      <SpotlightCard className="p-0 glass-card-enhanced" spotlightColor="rgba(236,72,153,0.06)">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-pink-400" />
            Mint Agent Identity NFT
            <Badge variant="outline" className="ml-auto text-[9px] px-1.5 bg-pink-500/10 border-pink-500/20 text-pink-400">{cluster === "mainnet-beta" ? "Mainnet" : "Devnet"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Select Agent</p>
            <Select value={selectedAgentId} onValueChange={(v) => { setSelectedAgentId(v); setMintSuccess(null); setMintError(null); }}>
              <SelectTrigger className="bg-card text-foreground"><SelectValue placeholder="Choose an agent to mint..." /></SelectTrigger>
              <SelectContent className="bg-card text-foreground border-border">
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <span className="flex items-center gap-2">
                      {agent.name} <span className="text-muted-foreground">({agent.type})</span>
                      {agent.nftMintAddress && <Badge className="text-[9px] px-1 bg-pink-500/10 text-pink-400 border-pink-500/20 ml-1">Minted</Badge>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* NFT Preview */}
          {selectedAgent && (
            <div className="rounded-lg border border-pink-500/20 bg-pink-500/5 p-4 space-y-3">
              <p className="text-xs font-medium text-pink-400 uppercase tracking-wider">NFT Preview</p>
              <div className="flex items-start gap-4">
                <img src={selectedAgent.avatarUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=${selectedAgent.name}-${selectedAgent.type || "agent"}`} alt={selectedAgent.name} className="w-20 h-20 rounded-lg border-2 border-pink-500/30 bg-zinc-900" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold">{selectedAgent.name}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div><span className="text-muted-foreground">Type:</span> {selectedAgent.type}</div>
                    <div><span className="text-muted-foreground">ASN:</span> {selectedAgent.asn || "N/A"}</div>
                    <div><span className="text-muted-foreground">Status:</span> {selectedAgent.status}</div>
                    <div><span className="text-muted-foreground">Trust:</span> {selectedAgent.trustScore ?? "—"}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Already minted */}
          {selectedAgent?.nftMintAddress && !mintSuccess && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-emerald-400">Already Minted</p>
                <code className="text-[10px] text-muted-foreground font-mono break-all">{selectedAgent.nftMintAddress}</code>
              </div>
              <a href={getExplorerUrl("token", selectedAgent.nftMintAddress, cluster)} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-400 hover:underline flex items-center gap-1 shrink-0">Solscan <ExternalLink className="h-3 w-3" /></a>
            </div>
          )}

          {/* Recipient wallet */}
          {selectedAgent && !selectedAgent.nftMintAddress && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">Recipient Wallet</p>
                <button onClick={() => setUseCustomWallet(!useCustomWallet)} className={cn("text-[10px] px-2 py-0.5 rounded-full border transition-all", useCustomWallet ? "bg-pink-500/10 text-pink-400 border-pink-500/20" : "text-muted-foreground border-border hover:border-pink-500/20")}>
                  {useCustomWallet ? "Using custom wallet" : "Custom wallet"}
                </button>
              </div>
              {useCustomWallet ? (
                <Input placeholder="Enter Solana (base58) or EVM (0x) wallet address..." value={customWallet} onChange={(e) => setCustomWallet(e.target.value)} className="font-mono text-xs bg-card text-foreground" />
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                  <Wallet className="h-4 w-4 text-pink-400" />
                  <code className="text-xs font-mono truncate flex-1">{recipientAddress || "No wallet connected"}</code>
                  <Badge variant="outline" className="text-[9px] px-1.5">thirdweb</Badge>
                </div>
              )}
              {recipientAddress && /^0x[0-9a-fA-F]{40}$/.test(recipientAddress) && (
                <p className="text-[10px] text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded px-2 py-1.5">
                  EVM address detected. NFT will be held by the Swarm platform wallet on Solana with your EVM address recorded in the metadata.
                </p>
              )}
              <div className="flex items-center gap-3">
                <Button onClick={handleMintNft} disabled={minting || !recipientAddress} className="bg-pink-600 hover:bg-pink-700 text-white">
                  {minting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Minting...</> : <><Sparkles className="h-4 w-4 mr-2" /> Mint Agent Identity NFT</>}
                </Button>
              </div>
            </div>
          )}

          {/* Success */}
          {mintSuccess && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-400" /><p className="text-sm font-medium text-emerald-400">NFT Minted Successfully!</p></div>
              <div className="flex items-center gap-2">
                <code className="text-[10px] font-mono text-muted-foreground break-all flex-1">{mintSuccess}</code>
                <button onClick={() => navigator.clipboard.writeText(mintSuccess)} className="text-pink-400 hover:text-pink-300"><Copy className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex items-center gap-2">
                <Send className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {mintCustodial
                    ? <>Held by platform wallet · Owner: <code className="font-mono">{recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}</code></>
                    : <>Sent to: <code className="font-mono">{recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}</code></>}
                </span>
              </div>
              <a href={getExplorerUrl("token", mintSuccess, cluster)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-pink-400 hover:underline">View on Solscan <ExternalLink className="h-3 w-3" /></a>
            </div>
          )}

          {/* Error */}
          {mintError && <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"><p className="text-xs text-red-400">{mintError}</p></div>}
        </CardContent>
      </SpotlightCard>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Programs" value="Core, Token Metadata, Bubblegum" icon="📜" />
        <StatCard title="Agent Registry" value="Available" icon="🤖" />
        <StatCard title="Platform Balance" value={walletLoading ? "..." : walletInfo ? `${walletInfo.solBalance} SOL` : "Error"} icon="◎" />
        <StatCard title="NFTs Minted" value={String(agents.filter(a => a.nftMintAddress).length)} icon="🎨" />
      </div>

      {/* Tools */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {METAPLEX_MANIFEST.tools.map(tool => {
            const Icon = TOOL_ICONS[tool.icon] || Wrench;
            return (
              <SpotlightCard key={tool.id} className="p-0 glass-card-enhanced">
                <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4 text-pink-400" />{tool.name}<Badge variant="outline" className="ml-auto text-[9px] px-1.5">{tool.category}</Badge></CardTitle></CardHeader>
                <CardContent className="px-4 pb-4"><p className="text-xs text-muted-foreground">{tool.description}</p></CardContent>
              </SpotlightCard>
            );
          })}
        </div>
      </div>

      {/* Workflows */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Workflows</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {METAPLEX_MANIFEST.workflows.map(wf => (
            <SpotlightCard key={wf.id} className="p-0 glass-card-enhanced">
              <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-sm flex items-center gap-2"><span>{wf.icon}</span>{wf.name}</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-xs text-muted-foreground mb-2">{wf.description}</p>
                <ol className="space-y-1">{wf.steps.map((step, i) => <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground"><span className="text-pink-400 font-mono text-[10px] mt-0.5">{i + 1}.</span>{step}</li>)}</ol>
              </CardContent>
            </SpotlightCard>
          ))}
        </div>
      </div>

      {/* Agent Skills */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Agent Skills</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {METAPLEX_MANIFEST.agentSkills.map(skill => (
            <SpotlightCard key={skill.id} className="p-0 glass-card-enhanced">
              <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-sm flex items-center gap-2"><Play className="h-3.5 w-3.5 text-pink-400" />{skill.name}</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <p className="text-xs text-muted-foreground">{skill.description}</p>
                <div className="text-[10px] font-mono bg-muted/50 px-2 py-1 rounded text-pink-400">{skill.invocation}</div>
              </CardContent>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </div>
  );
}
