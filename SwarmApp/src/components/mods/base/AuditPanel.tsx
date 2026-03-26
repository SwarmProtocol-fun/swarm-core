"use client";

import { useState, useMemo } from "react";
import {
    Activity, Eye, RefreshCw, User, Bot, Info,
    Plus, Trash2, CheckCircle2, XCircle, AlertTriangle, KeyRound,
    CreditCard, Clock, FileSignature, ShieldCheck, Snowflake,
    Search, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BaseAuditEntry, AuditAction } from "@/lib/base-accounts";

interface Props {
    entries: BaseAuditEntry[];
    loading: boolean;
    onRefresh: () => void;
}

type AuditCategory = "all" | "auth" | "payments" | "sub-accounts" | "permissions" | "recurring" | "signatures";

const CATEGORY_ACTIONS: Record<AuditCategory, AuditAction[] | null> = {
    all: null,
    auth: ["siwe_login", "siwe_verify"],
    payments: ["payment_sent", "payment_received"],
    "sub-accounts": ["subaccount_created", "subaccount_funded", "subaccount_frozen", "subaccount_closed"],
    permissions: ["permission_requested", "permission_approved", "permission_denied", "permission_revoked"],
    recurring: ["recurring_created", "recurring_paused", "recurring_cancelled", "recurring_charged"],
    signatures: ["signature_requested", "signature_signed", "signature_rejected"],
};

const CATEGORY_LABELS: Record<AuditCategory, string> = {
    all: "All",
    auth: "Auth",
    payments: "Payments",
    "sub-accounts": "Sub-Accounts",
    permissions: "Permissions",
    recurring: "Recurring",
    signatures: "Signatures",
};

const PAGE_SIZE = 20;

function actionIcon(action: AuditAction) {
    switch (action) {
        case "siwe_login":
        case "siwe_verify":
            return <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />;
        case "payment_sent":
            return <CreditCard className="h-3.5 w-3.5 text-red-400" />;
        case "payment_received":
            return <CreditCard className="h-3.5 w-3.5 text-green-400" />;
        case "subaccount_created":
            return <Plus className="h-3.5 w-3.5 text-green-400" />;
        case "subaccount_funded":
            return <CreditCard className="h-3.5 w-3.5 text-blue-400" />;
        case "subaccount_frozen":
            return <Snowflake className="h-3.5 w-3.5 text-yellow-400" />;
        case "subaccount_closed":
            return <Trash2 className="h-3.5 w-3.5 text-red-400" />;
        case "permission_requested":
            return <KeyRound className="h-3.5 w-3.5 text-yellow-400" />;
        case "permission_approved":
            return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />;
        case "permission_denied":
            return <XCircle className="h-3.5 w-3.5 text-red-400" />;
        case "permission_revoked":
            return <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />;
        case "recurring_created":
            return <Clock className="h-3.5 w-3.5 text-green-400" />;
        case "recurring_paused":
            return <Clock className="h-3.5 w-3.5 text-yellow-400" />;
        case "recurring_cancelled":
            return <Clock className="h-3.5 w-3.5 text-red-400" />;
        case "recurring_charged":
            return <Clock className="h-3.5 w-3.5 text-blue-400" />;
        case "signature_requested":
            return <FileSignature className="h-3.5 w-3.5 text-yellow-400" />;
        case "signature_signed":
            return <FileSignature className="h-3.5 w-3.5 text-green-400" />;
        case "signature_rejected":
            return <FileSignature className="h-3.5 w-3.5 text-red-400" />;
        default:
            return <Activity className="h-3.5 w-3.5 text-gray-400" />;
    }
}

export default function AuditPanel({ entries, loading, onRefresh }: Props) {
    const [category, setCategory] = useState<AuditCategory>("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);

    const filtered = useMemo(() => {
        let result = entries;
        const allowedActions = CATEGORY_ACTIONS[category];
        if (allowedActions) {
            result = result.filter((e) => allowedActions.includes(e.action));
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter((e) => e.description.toLowerCase().includes(q));
        }
        return result;
    }, [entries, category, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // Reset page when filters change
    const handleCategoryChange = (c: AuditCategory) => {
        setCategory(c);
        setPage(0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <Eye className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-1">No audit events</h3>
                <p className="text-sm text-muted-foreground">
                    All Base operations will be logged here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Controls row */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-1 rounded-lg bg-muted/50 p-1 border border-border overflow-x-auto">
                    {(Object.keys(CATEGORY_LABELS) as AuditCategory[]).map((c) => (
                        <button
                            key={c}
                            onClick={() => handleCategoryChange(c)}
                            className={cn(
                                "rounded-md px-2.5 py-1 text-xs font-medium transition-all whitespace-nowrap",
                                category === c
                                    ? "bg-background text-foreground shadow-sm border border-border"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {CATEGORY_LABELS[c]}
                        </button>
                    ))}
                </div>

                <div className="relative flex-1 min-w-[160px] max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search events..."
                        className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    />
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-muted-foreground">{filtered.length} events</span>
                    <Button variant="ghost" size="sm" onClick={onRefresh}>
                        <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Table */}
            {paged.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <p className="text-sm text-muted-foreground">No events match this filter.</p>
                </div>
            ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                    <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-0 text-xs">
                        {paged.map((entry, i) => (
                            <div
                                key={entry.id}
                                className={cn("contents", i % 2 === 0 ? "" : "[&>*]:bg-muted/30")}
                            >
                                <div className="flex items-center gap-2 pl-3 py-2">
                                    {actionIcon(entry.action)}
                                    {entry.actorType === "agent"
                                        ? <Bot className="h-3 w-3 text-blue-400" />
                                        : entry.actorType === "system"
                                        ? <Info className="h-3 w-3 text-gray-400" />
                                        : <User className="h-3 w-3 text-green-400" />
                                    }
                                </div>
                                <div className="py-2 truncate">
                                    <span className="text-foreground">{entry.description}</span>
                                </div>
                                <div className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "\u2014"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        Page {page + 1} of {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={page === 0}
                            onClick={() => setPage(page - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(page + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
