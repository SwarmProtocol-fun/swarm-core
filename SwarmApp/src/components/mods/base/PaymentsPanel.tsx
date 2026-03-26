"use client";

import { useState, useMemo } from "react";
import {
    CreditCard, ArrowUpRight, ArrowDownLeft, ExternalLink, RefreshCw, Plus,
    ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BasePayment } from "@/lib/base-accounts";

interface Props {
    payments: BasePayment[];
    walletAddress: string | null;
    loading: boolean;
    onSendPayment: () => void;
    onRefresh: () => void;
}

type DirectionFilter = "all" | "sent" | "received";
type DateRange = "all" | "today" | "week" | "month";

const PAGE_SIZE = 20;

function shortAddr(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default function PaymentsPanel({ payments, walletAddress, loading, onSendPayment, onRefresh }: Props) {
    const [filter, setFilter] = useState<DirectionFilter>("all");
    const [dateRange, setDateRange] = useState<DateRange>("all");
    const [page, setPage] = useState(0);

    const filtered = useMemo(() => {
        let result = payments;

        // Direction filter
        if (filter === "sent") result = result.filter((p) => p.fromAddress.toLowerCase() === walletAddress?.toLowerCase());
        if (filter === "received") result = result.filter((p) => p.toAddress.toLowerCase() === walletAddress?.toLowerCase());

        // Date range filter
        if (dateRange !== "all") {
            const now = new Date();
            let cutoff: Date;
            if (dateRange === "today") cutoff = startOfDay(now);
            else if (dateRange === "week") cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            else cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
            result = result.filter((p) => p.createdAt && new Date(p.createdAt) >= cutoff);
        }

        return result;
    }, [payments, filter, dateRange, walletAddress]);

    // Stats
    const totalSent = filtered
        .filter((p) => p.fromAddress.toLowerCase() === walletAddress?.toLowerCase() && p.status === "confirmed")
        .reduce((sum, p) => sum + p.amount, 0);
    const totalReceived = filtered
        .filter((p) => p.toAddress.toLowerCase() === walletAddress?.toLowerCase() && p.status === "confirmed")
        .reduce((sum, p) => sum + p.amount, 0);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Controls */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-2">
                    <div className="flex gap-1 rounded-lg bg-muted/50 p-1 border border-border">
                        {(["all", "sent", "received"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => { setFilter(f); setPage(0); }}
                                className={cn(
                                    "rounded-md px-3 py-1 text-xs font-medium transition-all",
                                    filter === f
                                        ? "bg-background text-foreground shadow-sm border border-border"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-1 rounded-lg bg-muted/50 p-1 border border-border">
                        {(["all", "today", "week", "month"] as const).map((d) => (
                            <button
                                key={d}
                                onClick={() => { setDateRange(d); setPage(0); }}
                                className={cn(
                                    "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                                    dateRange === d
                                        ? "bg-background text-foreground shadow-sm border border-border"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {d === "all" ? "All Time" : d === "today" ? "Today" : d === "week" ? "Week" : "Month"}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={onRefresh}>
                        <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={onSendPayment}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Send USDC
                    </Button>
                </div>
            </div>

            {/* Totals summary */}
            {filtered.length > 0 && (
                <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground">
                        Sent: <span className="text-red-400 font-mono font-medium">{totalSent.toFixed(2)} USDC</span>
                    </span>
                    <span className="text-muted-foreground">
                        Received: <span className="text-green-400 font-mono font-medium">{totalReceived.toFixed(2)} USDC</span>
                    </span>
                    <span className="text-muted-foreground ml-auto">{filtered.length} transactions</span>
                </div>
            )}

            {/* Payment list */}
            {paged.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-12 text-center">
                    <CreditCard className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium mb-1">No payments</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        {filter !== "all" || dateRange !== "all"
                            ? "No payments match this filter."
                            : "Send your first USDC payment on Base."}
                    </p>
                    {filter === "all" && dateRange === "all" && (
                        <Button variant="outline" size="sm" onClick={onSendPayment}>
                            <Plus className="h-4 w-4 mr-1.5" />
                            Send USDC
                        </Button>
                    )}
                </div>
            ) : (
                paged.map((payment) => {
                    const isSent = payment.fromAddress.toLowerCase() === walletAddress?.toLowerCase();
                    return (
                        <div key={payment.id} className="rounded-lg border border-border bg-card p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-lg",
                                        isSent ? "bg-red-500/10" : "bg-green-500/10",
                                    )}>
                                        {isSent
                                            ? <ArrowUpRight className="h-4 w-4 text-red-400" />
                                            : <ArrowDownLeft className="h-4 w-4 text-green-400" />
                                        }
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                                {isSent ? `To ${shortAddr(payment.toAddress)}` : `From ${shortAddr(payment.fromAddress)}`}
                                            </span>
                                            <span className={cn(
                                                "text-xs px-2 py-0.5 rounded-full border",
                                                payment.status === "confirmed"
                                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                                                    : payment.status === "failed"
                                                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                                                    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                                            )}>
                                                {payment.status.toUpperCase()}
                                            </span>
                                        </div>
                                        {payment.memo && (
                                            <p className="text-xs text-muted-foreground mt-0.5">{payment.memo}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={cn("font-mono font-medium", isSent ? "text-red-400" : "text-green-400")}>
                                        {isSent ? "-" : "+"}{payment.amount} USDC
                                    </p>
                                    {payment.txHash && (
                                        <a
                                            href={`https://basescan.org/tx/${payment.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 mt-0.5"
                                        >
                                            View tx <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                {payment.createdAt && new Date(payment.createdAt).toLocaleString()}
                            </div>
                        </div>
                    );
                })
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
