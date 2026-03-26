"use client";

import { createContext, useContext, useState, type PropsWithChildren } from "react";
import type { SolanaCluster } from "@/lib/solana-cluster";

interface ClusterContextValue {
  cluster: SolanaCluster;
  setCluster: (c: SolanaCluster) => void;
}

const ClusterContext = createContext<ClusterContextValue>({
  cluster: "devnet",
  setCluster: () => {},
});

export function SolanaClusterProvider({ children }: PropsWithChildren) {
  const [cluster, setCluster] = useState<SolanaCluster>("devnet");
  return (
    <ClusterContext.Provider value={{ cluster, setCluster }}>
      {children}
    </ClusterContext.Provider>
  );
}

export function useCluster() {
  return useContext(ClusterContext);
}
