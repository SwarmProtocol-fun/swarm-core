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
  Lock, Loader2, CheckCircle, ExternalLink,
  AlertTriangle, Info, RefreshCw, Shield, Unlock,
} from "lucide-react";

interface ValidatorInfo {
  votePubkey: string;
  identity: string;
  name?: string;
  commission: number;
  activatedStake: number;
  lastVote: number;
}

interface StakeAccountInfo {
  address: string;
  lamports: number;
  state: "inactive" | "activating" | "active" | "deactivating";
  voter?: string;
}

interface Props {
  agents: Agent[];
  orgId: string | undefined;
}

export default function SolanaStakingPanel({ agents, orgId }: Props) {
  const { cluster } = useCluster();
  const { address } = useSession();
  const account = useActiveAccount();
  const authHeaders = { "Content-Type": "application/json", "x-wallet-address": account?.address || address || "" };

  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [validatorsLoading, setValidatorsLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedValidator, setSelectedValidator] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [delegating, setDelegating] = useState(false);
  const [delegateResult, setDelegateResult] = useState<{ signature: string; stakeAccount: string } | null>(null);
  const [delegateError, setDelegateError] = useState<string | null>(null);
  const [stakeAccounts, setStakeAccounts] = useState<StakeAccountInfo[]>([]);
  const [stakeAccountsLoading, setStakeAccountsLoading] = useState(false);

  const agentsWithWallets = agents.filter(a => a.solanaAddress);
  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const fetchValidators = useCallback(async () => {
    setValidatorsLoading(true);
    try {
      const res = await fetch(`/api/v1/solana/validators?cluster=${cluster}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setValidators(data.validators || []);
      }
    } catch { /* silently fail */ } finally {
      setValidatorsLoading(false);
    }
  }, [cluster]);

  async function handleDelegate() {
    if (!selectedAgentId || !selectedValidator || !stakeAmount || !orgId) return;
    setDelegating(true);
    setDelegateError(null);
    setDelegateResult(null);
    try {
      const res = await fetch("/api/v1/solana/stake/delegate", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ orgId, agentId: selectedAgentId, validatorVotePubkey: selectedValidator, amount: stakeAmount, cluster }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delegation failed");
      setDelegateResult(data);
      setStakeAmount("");
    } catch (err) {
      setDelegateError(err instanceof Error ? err.message : "Delegation failed");
    } finally {
      setDelegating(false);
    }
  }

  async function handleUndelegate(stakeAccountAddress: string) {
    if (!selectedAgentId || !orgId) return;
    try {
      const res = await fetch("/api/v1/solana/stake/undelegate", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ orgId, agentId: selectedAgentId, stakeAccountAddress, cluster }),
      });
      if (res.ok) {
        setStakeAccounts(prev => prev.map(sa => sa.address === stakeAccountAddress ? { ...sa, state: "deactivating" as const } : sa));
      }
    } catch { /* silently fail */ }
  }

  const stateColors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    activating: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    deactivating: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    inactive: "bg-muted/50 text-muted-foreground border-border",
  };

  return (
    <div className="space-y-6">
      {/* Validator List */}
      <SpotlightCard className="p-0 glass-card-enhanced">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-400" />
            Validators
            <Badge variant="outline" className="ml-auto text-[9px] px-1.5 bg-purple-500/10 border-purple-500/20 text-purple-400">{validators.length}</Badge>
            <Button onClick={fetchValidators} disabled={validatorsLoading} variant="ghost" size="sm" className="h-6 w-6 p-0">
              {validatorsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {validators.length > 0 ? (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {validators.slice(0, 20).map(v => (
                <button
                  key={v.votePubkey}
                  onClick={() => setSelectedValidator(v.votePubkey)}
                  className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${
                    selectedValidator === v.votePubkey
                      ? "border-purple-500/50 bg-purple-500/10"
                      : "border-border hover:border-purple-500/30 hover:bg-muted/20"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{v.name || v.identity.slice(0, 12) + "..."}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{v.votePubkey.slice(0, 8)}...{v.votePubkey.slice(-6)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">Commission: <span className="text-purple-400">{v.commission}%</span></p>
                    <p className="text-[10px] text-muted-foreground">Stake: <span className="font-mono">{(v.activatedStake / 1e9).toFixed(0)} SOL</span></p>
                  </div>
                </button>
              ))}
            </div>
          ) : !validatorsLoading ? (
            <div className="text-center py-6">
              <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Click refresh to load validators</p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-purple-400" /></div>
          )}
        </CardContent>
      </SpotlightCard>

      {/* Delegate Form */}
      <SpotlightCard className="p-0 glass-card-enhanced">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4 text-purple-400" />
            Delegate SOL
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Agent Wallet</p>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="bg-card text-foreground"><SelectValue placeholder="Select agent..." /></SelectTrigger>
              <SelectContent className="bg-card text-foreground border-border">
                {agentsWithWallets.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedValidator && (
            <div className="flex items-center gap-2 rounded-md border border-purple-500/20 bg-purple-500/5 px-3 py-2">
              <Shield className="h-4 w-4 text-purple-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">Selected Validator</p>
                <code className="text-[10px] font-mono text-muted-foreground">{selectedValidator.slice(0, 12)}...{selectedValidator.slice(-8)}</code>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Amount (SOL)</p>
            <Input type="number" placeholder="0.00" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} className="font-mono bg-card text-foreground" />
          </div>

          <Button
            onClick={handleDelegate}
            disabled={delegating || !selectedAgentId || !selectedValidator || !stakeAmount}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {delegating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Delegating...</> : <><Lock className="h-4 w-4 mr-2" /> Delegate SOL</>}
          </Button>

          {delegateResult && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-400" /><p className="text-sm font-medium text-emerald-400">Delegation Successful!</p></div>
              <p className="text-[10px] text-muted-foreground">Stake Account: <code className="font-mono">{delegateResult.stakeAccount}</code></p>
              <a href={getExplorerUrl("tx", delegateResult.signature, cluster)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-purple-400 hover:underline">View on Solscan <ExternalLink className="h-3 w-3" /></a>
            </div>
          )}

          {delegateError && <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"><p className="text-xs text-red-400">{delegateError}</p></div>}
        </CardContent>
      </SpotlightCard>

      {/* My Stakes */}
      {stakeAccounts.length > 0 && (
        <SpotlightCard className="p-0 glass-card-enhanced">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4 text-purple-400" />My Stake Accounts</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {stakeAccounts.map(sa => (
                <div key={sa.address} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <code className="text-[10px] font-mono text-muted-foreground">{sa.address.slice(0, 8)}...{sa.address.slice(-6)}</code>
                    <p className="text-xs font-mono text-purple-400">{(sa.lamports / 1e9).toFixed(4)} SOL</p>
                  </div>
                  <Badge variant="outline" className={`text-[8px] px-1 ${stateColors[sa.state]}`}>{sa.state}</Badge>
                  {sa.state === "active" && (
                    <Button onClick={() => handleUndelegate(sa.address)} variant="outline" size="sm" className="text-[10px] h-6 px-2">
                      <Unlock className="h-3 w-3 mr-1" /> Undelegate
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </SpotlightCard>
      )}

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Staking activation takes effect at the next epoch boundary (~2 days on mainnet). Undelegation also requires a cooldown period before SOL can be withdrawn.</p>
      </div>
    </div>
  );
}
