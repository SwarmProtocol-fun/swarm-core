"use client";

import { useState, useCallback } from "react";
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
  Send, Loader2, CheckCircle, ExternalLink,
  AlertTriangle, Info, Wallet,
} from "lucide-react";

interface Props {
  agents: Agent[];
  orgId: string | undefined;
}

export default function SolanaTransferPanel({ agents, orgId }: Props) {
  const { cluster } = useCluster();
  const { address } = useSession();
  const account = useActiveAccount();

  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [mint, setMint] = useState("native"); // "native" for SOL
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ signature: string; explorerUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const agentsWithWallets = agents.filter(a => a.solanaAddress);
  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  async function handleTransfer() {
    if (!selectedAgentId || !toAddress || !amount || !orgId) return;
    setSending(true);
    setError(null);
    setResult(null);
    setShowConfirm(false);
    try {
      const res = await fetch("/api/v1/solana/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": account?.address || address || "",
        },
        body: JSON.stringify({
          orgId,
          fromAgentId: selectedAgentId,
          toAddress,
          amount,
          mint: mint === "native" ? undefined : mint,
          cluster,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Transfer failed (${res.status})`);
      setResult({ signature: data.signature, explorerUrl: data.explorerUrl });
      setAmount("");
      setToAddress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <SpotlightCard className="p-0 glass-card-enhanced">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="h-4 w-4 text-purple-400" />
            Transfer SOL / SPL Tokens
            <Badge variant="outline" className="ml-auto text-[9px] px-1.5 bg-purple-500/10 border-purple-500/20 text-purple-400">
              {cluster === "mainnet-beta" ? "Mainnet" : cluster === "devnet" ? "Devnet" : "Testnet"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {/* From Agent */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">From Agent Wallet</p>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="bg-card text-foreground"><SelectValue placeholder="Select sender..." /></SelectTrigger>
              <SelectContent className="bg-card text-foreground border-border">
                {agentsWithWallets.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} <span className="text-muted-foreground ml-1 font-mono text-[10px]">({a.solanaAddress?.slice(0, 6)}...{a.solanaAddress?.slice(-4)})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAgent?.solanaAddress && (
              <div className="flex items-center gap-2">
                <Wallet className="h-3 w-3 text-purple-400" />
                <code className="text-[10px] font-mono text-muted-foreground">{selectedAgent.solanaAddress}</code>
              </div>
            )}
          </div>

          {/* Recipient */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Recipient Address</p>
            <Input
              placeholder="Enter Solana address (base58)..."
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              className="font-mono text-xs bg-card text-foreground"
            />
          </div>

          {/* Token Selector */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Token</p>
            <Select value={mint} onValueChange={setMint}>
              <SelectTrigger className="bg-card text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card text-foreground border-border">
                <SelectItem value="native">SOL (Native)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Amount</p>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono bg-card text-foreground"
            />
          </div>

          {/* Confirmation */}
          {showConfirm && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <p className="text-xs font-medium text-amber-400">Confirm Transfer</p>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>From: <code className="font-mono">{selectedAgent?.solanaAddress?.slice(0, 8)}...{selectedAgent?.solanaAddress?.slice(-6)}</code></p>
                <p>To: <code className="font-mono">{toAddress.slice(0, 8)}...{toAddress.slice(-6)}</code></p>
                <p>Amount: <span className="font-mono text-purple-400">{amount} {mint === "native" ? "SOL" : "SPL"}</span></p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button onClick={handleTransfer} disabled={sending} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                  {sending ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Sending...</> : "Confirm & Send"}
                </Button>
                <Button onClick={() => setShowConfirm(false)} variant="outline" size="sm">Cancel</Button>
              </div>
            </div>
          )}

          {/* Send Button */}
          {!showConfirm && (
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={!selectedAgentId || !toAddress || !amount || parseFloat(amount) <= 0}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" /> Send {mint === "native" ? "SOL" : "Tokens"}
            </Button>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-400" /><p className="text-sm font-medium text-emerald-400">Transfer Successful!</p></div>
              <code className="text-[10px] font-mono text-muted-foreground break-all block">{result.signature}</code>
              <a href={getExplorerUrl("tx", result.signature, cluster)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-purple-400 hover:underline">
                View on Solscan <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {error && <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"><p className="text-xs text-red-400">{error}</p></div>}
        </CardContent>
      </SpotlightCard>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Transfers are signed by the agent&apos;s derived keypair on the server. For SPL tokens, associated token accounts are created automatically if needed.</p>
      </div>
    </div>
  );
}
