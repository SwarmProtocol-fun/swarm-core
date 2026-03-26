"use client";

import {
    TrendingUp, CreditCard, Users, KeyRound, Clock, Plus,
    ArrowUpRight, ArrowDownLeft, ShieldCheck, Bot, Info, User,
    Activity, Snowflake, Trash2, CheckCircle2, XCircle, AlertTriangle,
    FileSignature,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
    BasePayment,
    BaseSubAccount,
    BaseSpendPermission,
    BaseRecurringPayment,
    BaseAuditEntry,
    AuditAction,
} from "@/lib/base-accounts";

interface Props {
    payments: BasePayment[];
    subAccounts: BaseSubAccount[];
    permissions: BaseSpendPermission[];
    recurring: BaseRecurringPayment[];
    auditLog: BaseAuditEntry[];
    walletAddress: string | null;
    onSendPayment: () => void;
    onCreateSubAccount: () => void;
    onCreateRecurring: () => void;
}

function auditIcon(action: AuditAction) {
    switch (action) {
        case "siwe_login":
        case "siwe_verify":
            return <ShieldCheck className="h-3 w-3 text-blue-400" />;
        case "payment_sent":
            return <ArrowUpRight className="h-3 w-3 text-red-400" />;
        case "payment_received":
            return <ArrowDownLeft className="h-3 w-3 text-green-400" />;
        case "subaccount_created":
            return <Plus className="h-3 w-3 text-green-400" />;
        case "subaccount_funded":
            return <CreditCard className="h-3 w-3 text-blue-400" />;
        case "subaccount_frozen":
            return <Snowflake className="h-3 w-3 text-yellow-400" />;
        case "subaccount_closed":
            return <Trash2 className="h-3 w-3 text-red-400" />;
        case "permission_requested":
            return <KeyRound className="h-3 w-3 text-yellow-400" />;
        case "permission_approved":
            return <CheckCircle2 className="h-3 w-3 text-green-400" />;
        case "permission_denied":
            return <XCircle className="h-3 w-3 text-red-400" />;
        case "permission_revoked":
            return <AlertTriangle className="h-3 w-3 text-orange-400" />;
        case "recurring_created":
        case "recurring_paused":
        case "recurring_cancelled":
        case "recurring_charged":
            return <Clock className="h-3 w-3 text-indigo-400" />;
        case "signature_requested":
        case "signature_signed":
        case "signature_rejected":
            return <FileSignature className="h-3 w-3 text-violet-400" />;
        default:
            return <Activity className="h-3 w-3 text-gray-400" />;
    }
}

function actorIcon(type: string) {
    if (type === "agent") return <Bot className="h-3 w-3 text-blue-400" />;
    if (type === "system") return <Info className="h-3 w-3 text-gray-400" />;
    return <User className="h-3 w-3 text-green-400" />;
}

function relativeTime(date: Date | null): string {
    if (!date) return "";
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function OverviewPanel({
    payments, subAccounts, permissions, recurring, auditLog, walletAddress,
    onSendPayment, onCreateSubAccount, onCreateRecurring,
}: Props) {
    // Compute stats
    const totalSpent = payments
        .filter((p) => p.fromAddress.toLowerCase() === walletAddress?.toLowerCase() && p.status === "confirmed")
        .reduce((sum, p) => sum + p.amount, 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthSpent = payments
        .filter((p) =>
            p.fromAddress.toLowerCase() === walletAddress?.toLowerCase() &&
            p.status === "confirmed" &&
            p.createdAt && new Date(p.createdAt) >= monthStart
        )
        .reduce((sum, p) => sum + p.amount, 0);

    const totalReceived = payments
        .filter((p) => p.toAddress.toLowerCase() === walletAddress?.toLowerCase() && p.status === "confirmed")
        .reduce((sum, p) => sum + p.amount, 0);

    const activeBudgets = recurring.filter((r) => r.status === "active").length;
    const pendingActions =
        permissions.filter((p) => p.status === "pending").length;

    const activeSubAccounts = subAccounts.filter((a) => a.status === "active");
    const totalSubAccountBalance = activeSubAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Top agents by approved spend
    const agentSpend = new Map<string, { name: string; amount: number; used: number }>();
    for (const p of permissions.filter((p) => p.status === "approved")) {
        const existing = agentSpend.get(p.agentId);
        if (existing) {
            existing.amount += p.amount;
            existing.used += p.usedAmount;
        } else {
            agentSpend.set(p.agentId, { name: p.agentName, amount: p.amount, used: p.usedAmount });
        }
    }
    const topAgents = [...agentSpend.entries()]
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 5);

    const recentAudit = auditLog.slice(0, 10);

    return (
        <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowUpRight className="h-4 w-4 text-red-400" />
                        <span className="text-xs text-muted-foreground">Total Sent</span>
                    </div>
                    <p className="text-2xl font-bold font-mono">{totalSpent.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">USDC all time</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-blue-400" />
                        <span className="text-xs text-muted-foreground">This Month</span>
                    </div>
                    <p className="text-2xl font-bold font-mono">{thisMonthSpent.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">USDC sent</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-green-400" />
                        <span className="text-xs text-muted-foreground">Sub-Accounts</span>
                    </div>
                    <p className="text-2xl font-bold">{activeSubAccounts.length}</p>
                    <p className="text-xs text-muted-foreground">{totalSubAccountBalance.toFixed(2)} USDC total</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <KeyRound className={cn("h-4 w-4", pendingActions > 0 ? "text-yellow-400" : "text-purple-400")} />
                        <span className="text-xs text-muted-foreground">Pending</span>
                    </div>
                    <p className="text-2xl font-bold">{pendingActions}</p>
                    <p className="text-xs text-muted-foreground">actions need review</p>
                </div>
            </div>

            {/* Quick actions */}
            <div>
                <h3 className="text-sm font-medium mb-2">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={onSendPayment}>
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                        Send USDC
                    </Button>
                    <Button variant="outline" size="sm" onClick={onCreateSubAccount}>
                        <Users className="h-3.5 w-3.5 mr-1.5" />
                        Create Sub-Account
                    </Button>
                    <Button variant="outline" size="sm" onClick={onCreateRecurring}>
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        New Recurring
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Recent activity */}
                <div>
                    <h3 className="text-sm font-medium mb-2">Recent Activity</h3>
                    {recentAudit.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-6 text-center">
                            <p className="text-sm text-muted-foreground">No activity yet</p>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-border divide-y divide-border">
                            {recentAudit.map((entry) => (
                                <div key={entry.id} className="flex items-center gap-2.5 px-3 py-2">
                                    {auditIcon(entry.action)}
                                    {actorIcon(entry.actorType)}
                                    <span className="text-xs truncate flex-1">{entry.description}</span>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {relativeTime(entry.timestamp)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top agents by budget */}
                <div>
                    <h3 className="text-sm font-medium mb-2">Agent Budgets</h3>
                    {topAgents.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-6 text-center">
                            <p className="text-sm text-muted-foreground">No active permissions</p>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-border divide-y divide-border">
                            {topAgents.map(([id, agent]) => (
                                <div key={id} className="px-3 py-2.5">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <Bot className="h-3.5 w-3.5 text-purple-400" />
                                            <span className="text-sm font-medium">{agent.name}</span>
                                        </div>
                                        <span className="text-xs font-mono">
                                            {agent.used.toFixed(2)} / {agent.amount} USDC
                                        </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all",
                                                agent.amount > 0 && (agent.used / agent.amount) > 0.8
                                                    ? "bg-orange-500"
                                                    : "bg-blue-500",
                                            )}
                                            style={{ width: `${agent.amount > 0 ? Math.min(100, (agent.used / agent.amount) * 100) : 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recurring summary */}
            {activeBudgets > 0 && (
                <div>
                    <h3 className="text-sm font-medium mb-2">Active Recurring</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {recurring.filter((r) => r.status === "active").slice(0, 6).map((r) => (
                            <div key={r.id} className="rounded-lg border border-border bg-card p-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                                    <span className="text-sm font-medium truncate">{r.label}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {r.amount} USDC / {r.frequency}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Net flow */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Net Flow (all time)</span>
                <span className={cn(
                    "font-mono font-medium",
                    totalReceived - totalSpent >= 0 ? "text-green-400" : "text-red-400",
                )}>
                    {totalReceived - totalSpent >= 0 ? "+" : ""}{(totalReceived - totalSpent).toFixed(2)} USDC
                </span>
            </div>
        </div>
    );
}
