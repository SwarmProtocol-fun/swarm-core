"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { getOwnedItems, type OwnedItem } from "@/lib/skills";
import { getAgentsByOrg, getOrganization, type Agent } from "@/lib/firestore";
import type { SolanaCluster } from "@/lib/solana-cluster";

export interface WalletInfo {
  publicKey: string;
  solBalance: number;
  tokenAccountCount: number;
  stakedSol: number;
  cluster: string;
}

export function useSolanaData(cluster: SolanaCluster) {
  const { currentOrg } = useOrg();
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [inventory, setInventory] = useState<OwnedItem[]>([]);
  const [collectionMint, setCollectionMint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const orgId = currentOrg?.id;

  const fetchWalletInfo = useCallback(async () => {
    setWalletLoading(true);
    try {
      const res = await fetch(`/api/v1/solana/wallet?cluster=${cluster}`);
      if (res.ok) setWalletInfo(await res.json());
    } catch {
      // Silently fail — stats will show loading state
    } finally {
      setWalletLoading(false);
    }
  }, [cluster]);

  const refresh = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [inv, ags, org] = await Promise.all([
        getOwnedItems(orgId).catch(() => [] as OwnedItem[]),
        getAgentsByOrg(orgId).catch(() => [] as Agent[]),
        getOrganization(orgId).catch(() => null),
      ]);
      setInventory(inv);
      setAgents(ags);
      if (org?.metaplexCollectionMint) setCollectionMint(org.metaplexCollectionMint);
    } finally {
      setIsLoading(false);
    }
    fetchWalletInfo();
  }, [orgId, fetchWalletInfo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    walletInfo,
    walletLoading,
    agents,
    setAgents,
    inventory,
    collectionMint,
    setCollectionMint,
    isLoading,
    refresh,
    fetchWalletInfo,
    orgId,
  };
}
