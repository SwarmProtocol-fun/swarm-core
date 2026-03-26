"use client";

import { useState } from "react";
import { Clock, XCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BaseSubAccount, RecurringType, RecurringFrequency } from "@/lib/base-accounts";

interface Props {
    open: boolean;
    onClose: () => void;
    orgId: string;
    walletAddress: string | null;
    subAccounts: BaseSubAccount[];
    onCreate: (data: {
        label: string;
        type: RecurringType;
        recipientAddress: string;
        amount: number;
        frequency: RecurringFrequency;
        subAccountId: string | null;
        maxTotalAmount: number | null;
    }) => Promise<{ id?: string; error?: string }>;
}

const TYPE_OPTIONS: { value: RecurringType; label: string }[] = [
    { value: "mod_subscription", label: "Mod Subscription" },
    { value: "plan", label: "Plan" },
    { value: "agent_budget", label: "Agent Budget" },
    { value: "custom", label: "Custom" },
];

const FREQ_OPTIONS: { value: RecurringFrequency; label: string }[] = [
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
];

export default function CreateRecurringDialog({ open, onClose, walletAddress, subAccounts, onCreate }: Props) {
    const [label, setLabel] = useState("");
    const [type, setType] = useState<RecurringType>("agent_budget");
    const [recipientAddress, setRecipientAddress] = useState("");
    const [amount, setAmount] = useState("");
    const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
    const [subAccountId, setSubAccountId] = useState<string | null>(null);
    const [maxTotal, setMaxTotal] = useState("");
    const [creating, setCreating] = useState(false);
    const [result, setResult] = useState<{ id?: string; error?: string } | null>(null);

    const handleCreate = async () => {
        if (!label || !recipientAddress || !amount) return;
        setCreating(true);
        try {
            const res = await onCreate({
                label,
                type,
                recipientAddress,
                amount: parseFloat(amount),
                frequency,
                subAccountId,
                maxTotalAmount: maxTotal ? parseFloat(maxTotal) : null,
            });
            setResult(res);
        } catch {
            setResult({ error: "Failed to create recurring payment" });
        } finally {
            setCreating(false);
        }
    };

    const reset = () => {
        setLabel("");
        setType("agent_budget");
        setRecipientAddress("");
        setAmount("");
        setFrequency("monthly");
        setSubAccountId(null);
        setMaxTotal("");
        setResult(null);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-indigo-400" />
                        <h2 className="text-lg font-semibold">New Recurring Payment</h2>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground" onClick={() => { reset(); onClose(); }}>
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>

                {!result ? (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Label</label>
                            <input
                                type="text"
                                placeholder="e.g. Monthly Agent Budget"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Type</label>
                                <select
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    value={type}
                                    onChange={(e) => setType(e.target.value as RecurringType)}
                                >
                                    {TYPE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Frequency</label>
                                <select
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                                >
                                    {FREQ_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Recipient Address</label>
                            <input
                                type="text"
                                placeholder="0x..."
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                                value={recipientAddress}
                                onChange={(e) => setRecipientAddress(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">From</label>
                            <select
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                value={subAccountId || ""}
                                onChange={(e) => setSubAccountId(e.target.value || null)}
                            >
                                <option value="">Org Wallet ({walletAddress?.slice(0, 8)}...)</option>
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
                                <label className="text-sm font-medium mb-1 block">Lifetime Cap (optional)</label>
                                <input
                                    type="number"
                                    placeholder="No limit"
                                    min="0"
                                    step="1"
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                                    value={maxTotal}
                                    onChange={(e) => setMaxTotal(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <Button
                                className="flex-1"
                                onClick={handleCreate}
                                disabled={creating || !label || !recipientAddress || !amount || parseFloat(amount) <= 0}
                            >
                                {creating ? (
                                    <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                                ) : (
                                    <Clock className="h-4 w-4 mr-1.5" />
                                )}
                                {creating ? "Creating..." : "Create Recurring Payment"}
                            </Button>
                            <Button variant="outline" onClick={() => { reset(); onClose(); }}>
                                Cancel
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            USDC on Base Mainnet. Charge execution handled by CDP backend.
                        </p>
                    </div>
                ) : result.id ? (
                    <div className="flex flex-col items-center py-8">
                        <CheckCircle2 className="h-10 w-10 text-green-400 mb-3" />
                        <h3 className="text-lg font-medium mb-1">Recurring Payment Created</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            &quot;{label}&quot; is now active ({frequency}).
                        </p>
                        <Button variant="outline" onClick={() => { reset(); onClose(); }}>Close</Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-8">
                        <XCircle className="h-10 w-10 text-red-400 mb-3" />
                        <h3 className="text-lg font-medium mb-1">Creation Failed</h3>
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
