/** Solana — Full-featured Solana dashboard with swaps, transfers, staking, and NFTs. */
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSolanaData } from "@/hooks/useSolanaData";
import { SolanaClusterProvider, useCluster } from "@/components/mods/solana/SolanaClusterContext";
import DecryptedText from "@/components/reactbits/DecryptedText";
import type { SolanaCluster } from "@/lib/solana-cluster";
import {
  Zap, LayoutDashboard, Wallet, ArrowLeftRight, Send,
  History, Lock, TrendingUp, Palette,
} from "lucide-react";

import SolanaOverviewPanel from "@/components/mods/solana/SolanaOverviewPanel";
import SolanaWalletPanel from "@/components/mods/solana/SolanaWalletPanel";
import SolanaSwapPanel from "@/components/mods/solana/SolanaSwapPanel";
import SolanaTransferPanel from "@/components/mods/solana/SolanaTransferPanel";
import SolanaHistoryPanel from "@/components/mods/solana/SolanaHistoryPanel";
import SolanaStakingPanel from "@/components/mods/solana/SolanaStakingPanel";
import SolanaPortfolioPanel from "@/components/mods/solana/SolanaPortfolioPanel";
import MetaplexPanel from "@/components/mods/solana/MetaplexPanel";

type SolanaTab = "overview" | "wallet" | "swap" | "transfer" | "history" | "staking" | "portfolio" | "metaplex";

const CLUSTER_OPTIONS: { id: SolanaCluster; label: string }[] = [
  { id: "mainnet-beta", label: "Mainnet" },
  { id: "devnet", label: "Devnet" },
  { id: "testnet", label: "Testnet" },
];

function SolanaPageInner() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as SolanaTab) || "overview";
  const [tab, setTab] = useState<SolanaTab>(initialTab);
  const { cluster, setCluster } = useCluster();
  const data = useSolanaData(cluster);

  const hasMetaplex = useMemo(
    () => data.inventory.some(i => i.skillId === "metaplex-nft" && i.enabled),
    [data.inventory],
  );

  useEffect(() => {
    const urlTab = searchParams.get("tab") as SolanaTab;
    if (urlTab && urlTab !== tab) setTab(urlTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const tabs: { id: SolanaTab; label: string; icon: typeof Zap }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "wallet", label: "Wallet", icon: Wallet },
    { id: "swap", label: "Swap", icon: ArrowLeftRight },
    { id: "transfer", label: "Transfer", icon: Send },
    { id: "history", label: "History", icon: History },
    { id: "staking", label: "Staking", icon: Lock },
    { id: "portfolio", label: "Portfolio", icon: TrendingUp },
    ...(hasMetaplex ? [{ id: "metaplex" as const, label: "Metaplex", icon: Palette }] : []),
  ];

  const clusterLabel = CLUSTER_OPTIONS.find(c => c.id === cluster)?.label || "Devnet";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Zap className="h-6 w-6 text-purple-400" />
            </div>
            <DecryptedText text="Solana" speed={30} maxIterations={6} animateOn="view" sequential className="text-3xl font-bold" />
          </h1>
          <p className="text-muted-foreground mt-1">Swap, transfer, stake, and manage agent wallets on Solana</p>
        </div>
        <div className="flex items-center gap-2">
          {CLUSTER_OPTIONS.map(c => (
            <button
              key={c.id}
              onClick={() => setCluster(c.id)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg border transition-all font-medium",
                cluster === c.id
                  ? "border-purple-500/50 bg-purple-500/10 text-purple-400"
                  : "border-border text-muted-foreground hover:border-purple-500/30 hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 rounded-lg bg-muted/50 p-1 w-fit border border-border overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap",
              tab === t.id
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <SolanaOverviewPanel
          agents={data.agents}
          inventory={data.inventory}
          walletInfo={data.walletInfo}
          walletLoading={data.walletLoading}
          hasMetaplex={hasMetaplex}
        />
      )}
      {tab === "wallet" && (
        <SolanaWalletPanel
          walletInfo={data.walletInfo}
          walletLoading={data.walletLoading}
          agents={data.agents}
          setAgents={data.setAgents}
          orgId={data.orgId}
        />
      )}
      {tab === "swap" && (
        <SolanaSwapPanel agents={data.agents} orgId={data.orgId} />
      )}
      {tab === "transfer" && (
        <SolanaTransferPanel agents={data.agents} orgId={data.orgId} />
      )}
      {tab === "history" && (
        <SolanaHistoryPanel agents={data.agents} />
      )}
      {tab === "staking" && (
        <SolanaStakingPanel agents={data.agents} orgId={data.orgId} />
      )}
      {tab === "portfolio" && (
        <SolanaPortfolioPanel agents={data.agents} />
      )}
      {tab === "metaplex" && hasMetaplex && (
        <MetaplexPanel
          agents={data.agents}
          setAgents={data.setAgents}
          orgId={data.orgId}
          collectionMint={data.collectionMint}
          setCollectionMint={data.setCollectionMint}
          walletInfo={data.walletInfo}
          walletLoading={data.walletLoading}
          fetchWalletInfo={data.fetchWalletInfo}
        />
      )}
    </div>
  );
}

export default function SolanaPage() {
  return (
    <SolanaClusterProvider>
      <SolanaPageInner />
    </SolanaClusterProvider>
  );
}
