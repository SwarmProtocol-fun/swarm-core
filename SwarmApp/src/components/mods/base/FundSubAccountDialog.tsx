"use client";

import { useState } from "react";
import { Wallet, XCircle, RefreshCw, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BaseSubAccount } from "@/lib/base-accounts";

interface Props {
    open: boolean;
    onClose: () => void;
    orgId: string;
    walletAddress: string | null;
    subAccounts: BaseSubAccount[];
    preselectedAccountId?: string | null;
    onFund: (data: {
        toAddress: string;
        amount: number;
        memo: string;
        subAccountId: string;
    }) => Promise<{ txHash?: string; error?: string }>;
}

export default function FundSubAccountDialog({ open, onClose, walletAddress, subAccounts, preselectedAccountId, onFund }: Props) {
    const activeAccounts = subAccounts.filter((a) => a.status === "active");
    const [selectedId, setSelectedId] = useState(preselectedAccountId || activeAccounts[0]?.id || "");
    const [amount, setAmount] = useState("");
    const [memo, setMemo] = useState("");
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ txHash?: string; error?: string } | null>(null);

    const selectedAccount = activeAccounts.find((a) => a.id === selectedId);

    const handleFund = async () => {
        if (!selectedAccount || !amount) return;
        setSending(true);
        try {
            const res = await onFund({
                toAddress: selectedAccount.address,
                amount: parseFloat(amount),
                memo: memo || `Fund: ${selectedAccount.label}`,
                subAccountId: selectedAccount.id,
            });
            setResult(res);
        } catch {
            setResult({ error: "Transfer failed" });
        } finally {
            setSending(false);
        }
    };

    const reset = () => {
        setSelectedId(preselectedAccountId || activeAccounts[0]?.id || "");
        setAmount("");
        setMemo("");
        setResult(null);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-green-400" />
                        <h2 className="text-lg font-semibold">Fund Sub-Account</h2>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground" onClick={() => { reset(); onClose(); }}>
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>

                {!result ? (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">From</label>
                            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
                                Org Wallet ({walletAddress?.slice(0, 8)}...{walletAddress?.slice(-4)})
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">To Sub-Account</label>
                            <select
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                            >
                                {activeAccounts.length === 0 && (
                                    <option value="">No active sub-accounts</option>
                                )}
                                {activeAccounts.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.label} &mdash; {a.balance.toFixed(2)} USDC
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedAccount && (
                            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Current Balance</span>
                                    <span className="font-mono font-medium">{selectedAccount.balance.toFixed(2)} USDC</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Daily Limit</span>
                                    <span>{selectedAccount.dailyLimit > 0 ? `${selectedAccount.dailyLimit} USDC` : "None"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Monthly Limit</span>
                                    <span>{selectedAccount.monthlyLimit > 0 ? `${selectedAccount.monthlyLimit} USDC` : "None"}</span>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium mb-1 block">Amount (USDC)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Memo (optional)</label>
                            <input
                                type="text"
                                placeholder="e.g. Monthly top-up"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <Button
                                className="flex-1"
                                onClick={handleFund}
                                disabled={sending || !selectedId || !amount || parseFloat(amount) <= 0}
                            >
                                {sending ? (
                                    <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                                ) : (
                                    <Wallet className="h-4 w-4 mr-1.5" />
                                )}
                                {sending ? "Sending..." : `Fund ${amount || "0"} USDC`}
                            </Button>
                            <Button variant="outline" onClick={() => { reset(); onClose(); }}>
                                Cancel
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Transfers USDC from org wallet to the sub-account on Base Mainnet.
                        </p>
                    </div>
                ) : result.txHash ? (
                    <div className="flex flex-col items-center py-8">
                        <CheckCircle2 className="h-10 w-10 text-green-400 mb-3" />
                        <h3 className="text-lg font-medium mb-1">Sub-Account Funded</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                            {amount} USDC sent to {selectedAccount?.label || "sub-account"}
                        </p>
                        {result.txHash.startsWith("0x") && (
                            <a
                                href={`https://basescan.org/tx/${result.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 mb-4"
                            >
                                View on BaseScan <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        )}
                        <Button variant="outline" onClick={() => { reset(); onClose(); }}>Close</Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-8">
                        <XCircle className="h-10 w-10 text-red-400 mb-3" />
                        <h3 className="text-lg font-medium mb-1">Funding Failed</h3>
                        <p className="text-sm text-muted-foreground mb-4">{result.error}</p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => setResult(null)}>Try Again</Button>
                            <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
