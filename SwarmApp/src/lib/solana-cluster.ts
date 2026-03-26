/**
 * Cluster configuration for Solana RPC connections.
 * Resolves the correct RPC URL, explorer base, and feature availability
 * based on the selected cluster (mainnet-beta, devnet, testnet).
 */

export type SolanaCluster = "mainnet-beta" | "devnet" | "testnet";

export interface ClusterConfig {
  id: SolanaCluster;
  label: string;
  rpcUrl: string;
  explorerBase: string;
  /** Jupiter swap API — only available on mainnet */
  jupiterApiBase: string | null;
  /** Whether price feeds are available (mainnet only) */
  hasPrices: boolean;
}

const DEFAULT_RPCS: Record<SolanaCluster, string> = {
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
};

/** Resolve the RPC URL for a given cluster, preferring env vars. */
export function resolveRpcUrl(cluster: SolanaCluster = "devnet"): string {
  if (cluster === "mainnet-beta") {
    return process.env.SOLANA_MAINNET_RPC_URL || process.env.SOLANA_RPC_URL || DEFAULT_RPCS["mainnet-beta"];
  }
  if (cluster === "devnet") {
    return process.env.SOLANA_RPC_URL || DEFAULT_RPCS.devnet;
  }
  return DEFAULT_RPCS[cluster];
}

/** Get full cluster configuration. */
export function getClusterConfig(cluster: SolanaCluster = "devnet"): ClusterConfig {
  const isMainnet = cluster === "mainnet-beta";
  return {
    id: cluster,
    label: cluster === "mainnet-beta" ? "Mainnet Beta" : cluster === "devnet" ? "Devnet" : "Testnet",
    rpcUrl: resolveRpcUrl(cluster),
    explorerBase: `https://solscan.io`,
    jupiterApiBase: isMainnet ? "https://quote-api.jup.ag/v6" : null,
    hasPrices: isMainnet,
  };
}

/** Build a Solscan explorer URL. */
export function getExplorerUrl(
  type: "tx" | "account" | "token",
  id: string,
  cluster: SolanaCluster = "devnet",
): string {
  const base = "https://solscan.io";
  const path = type === "tx" ? "tx" : type === "token" ? "token" : "account";
  const suffix = cluster !== "mainnet-beta" ? `?cluster=${cluster}` : "";
  return `${base}/${path}/${id}${suffix}`;
}

/** Detect cluster from an RPC URL string (best effort). */
export function detectCluster(rpcUrl: string): SolanaCluster {
  if (rpcUrl.includes("devnet")) return "devnet";
  if (rpcUrl.includes("testnet")) return "testnet";
  return "mainnet-beta";
}

/** Parse cluster from a request's query string, defaulting to devnet. */
export function clusterFromRequest(request: Request): SolanaCluster {
  const url = new URL(request.url);
  const raw = url.searchParams.get("cluster");
  if (raw === "mainnet-beta" || raw === "devnet" || raw === "testnet") return raw;
  return "devnet";
}
