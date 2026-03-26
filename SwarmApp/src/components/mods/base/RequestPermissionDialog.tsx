"use client";

import { useState } from "react";
import { KeyRound, XCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BaseSubAccount, PermissionPeriod } from "@/lib/base-accounts";

interface Props {
    open: boolean;
    onClose: () => void;
    orgId: string;
    subAccounts: BaseSubAccount[];
    onRequest: (data: {
        agentId: string;
        agentName: string;
        subAccountId: string | null;
        amount: number;
        period: PermissionPeriod;
        reason: string;
    }) => Promise<{ id?: string; error?: string }>;
}

const PERIOD_OPTIONS: { value: PermissionPeriod; label: string }[] = [
    { value: "one-time", label: "One-Time" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "unlimited", label: "Unlimited" },
];

export default function RequestPermissionDialog({ open, onClose, subAccounts, onRequest }: Props) {
    const [agentName, setAgentName] = useState("");
    const [agentId, setAgentId] = useState("");
    const [subAccountId, setSubAccountId] = useState<string | null>(null);
    const [amount, setAmount] = useState("");
    const [period, setPeriod] = useState<PermissionPeriod>("monthly");
    const [reason, setReason] = useState("");
    const [creating, setCreating] = useState(false);
    const [result, setResult] = useState<{ id?: string; error?: string } | null>(null);

    const handleRequest = async () => {
        if (!agentName || !agentId || !amount || !reason) return;
        setCreating(true);
        try {
            const res = await onRequest({
                agentId,
                agentName,
                subAccountId,
                amount: parseFloat(amount),
                period,
                reason,
            });
            setResult(res);
        } catch {
            setResult({ error: "Failed to create permission request" });
        } finally {
            setCreating(false);
        }
    };

    const reset = () => {
        setAgentName("");
        setAgentId("");
        setSubAccountId(null);
        setAmount("");
        setPeriod("monthly");
        setReason("");
        setResult(null);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-purple-400" />
                        <h2 className="text-lg font-semibold">Request Spend Permission</h2>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground" onClick={() => { reset(); onClose(); }}>
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>

                {!result ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Agent Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Research Agent"
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    value={agentName}
                                    onChange={(e) => setAgentName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Agent ID</label>
                                <input
                                    type="text"
                                    placeholder="agent-123"
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                                    value={agentId}
                                    onChange={(e) => setAgentId(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Sub-Account (optional)</label>
                            <select
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                value={subAccountId || ""}
                                onChange={(e) => setSubAccountId(e.target.value || null)}
                            >
                                <option value="">None (org-level)</option>
                                {subAccounts.filter((a) => a.status === "active").map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.label} ({a.balance.toFixed(2)} USDC)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
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
                                <label className="text-sm font-medium mb-1 block">Period</label>
                                <select
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value as PermissionPeriod)}
                                >
                                    {PERIOD_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Reason</label>
                            <textarea
                                placeholder="e.g. API calls for market analysis tasks"
                                rows={2}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <Button
                                className="flex-1"
                                onClick={handleRequest}
                                disabled={creating || !agentName || !agentId || !amount || !reason || parseFloat(amount) <= 0}
                            >
                                {creating ? (
                                    <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                                ) : (
                                    <KeyRound className="h-4 w-4 mr-1.5" />
                                )}
                                {creating ? "Requesting..." : "Request Permission"}
                            </Button>
                            <Button variant="outline" onClick={() => { reset(); onClose(); }}>
                                Cancel
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Creates a pending spend permission that must be approved by the org owner.
                        </p>
                    </div>
                ) : result.id ? (
                    <div className="flex flex-col items-center py-8">
                        <CheckCircle2 className="h-10 w-10 text-green-400 mb-3" />
                        <h3 className="text-lg font-medium mb-1">Permission Requested</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {agentName}&apos;s request for {amount} USDC ({period}) is pending approval.
                        </p>
                        <Button variant="outline" onClick={() => { reset(); onClose(); }}>Close</Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-8">
                        <XCircle className="h-10 w-10 text-red-400 mb-3" />
                        <h3 className="text-lg font-medium mb-1">Request Failed</h3>
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
