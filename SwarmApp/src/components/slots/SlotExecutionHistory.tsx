"use client";

/**
 * SlotExecutionHistory — Timeline panel showing past slot automation executions.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Clock,
  CheckCircle,
  XCircle,
  SkipForward,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  TestTube,
  Loader2,
} from "lucide-react";
import type { SlotExecution, SlotExecutionStats } from "@/lib/slots/types";

// ── Props ────────────────────────────────────────────────────────────────────

interface SlotExecutionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  policyName: string;
}

// ── Status styling ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckCircle; color: string; bg: string }
> = {
  success: { label: "Success", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  failure: { label: "Failed", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
  skipped: { label: "Skipped", icon: SkipForward, color: "text-zinc-400", bg: "bg-zinc-500/10" },
  retrying: { label: "Retrying", icon: RefreshCw, color: "text-amber-400", bg: "bg-amber-500/10" },
  running: { label: "Running", icon: Loader2, color: "text-blue-400", bg: "bg-blue-500/10" },
  pending: { label: "Pending", icon: Clock, color: "text-zinc-500", bg: "bg-zinc-500/10" },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function SlotExecutionHistory({
  open,
  onOpenChange,
  policyId,
  policyName,
}: SlotExecutionHistoryProps) {
  const [history, setHistory] = useState<SlotExecution[]>([]);
  const [stats, setStats] = useState<SlotExecutionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!policyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/slots/${policyId}/history?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error("Failed to fetch execution history:", err);
    } finally {
      setLoading(false);
    }
  }, [policyId]);

  useEffect(() => {
    if (open && policyId) fetchHistory();
  }, [open, policyId, fetchHistory]);

  const filteredHistory = statusFilter
    ? history.filter((h) => h.status === statusFilter)
    : history;

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  function formatTime(date: Date | string | null): string {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-zinc-100">
            Execution History — {policyName}
          </DialogTitle>
        </DialogHeader>

        {/* Stats summary */}
        {stats && stats.totalExecutions > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-zinc-100">{stats.totalExecutions}</p>
                <p className="text-xs text-zinc-500">Total</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">
                  {stats.successRate.toFixed(0)}%
                </p>
                <p className="text-xs text-zinc-500">Success Rate</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-zinc-100">
                  {formatDuration(stats.avgDurationMs)}
                </p>
                <p className="text-xs text-zinc-500">Avg Duration</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{stats.failedExecutions}</p>
                <p className="text-xs text-zinc-500">Failed</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter badges */}
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant={statusFilter === null ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter(null)}
            className="text-xs"
          >
            All ({history.length})
          </Button>
          {["success", "failure", "skipped"].map((s) => {
            const count = history.filter((h) => h.status === s).length;
            if (count === 0) return null;
            const cfg = STATUS_CONFIG[s];
            return (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                className={`text-xs ${statusFilter !== s ? cfg.color : ""}`}
              >
                {cfg.label} ({count})
              </Button>
            );
          })}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchHistory}
            disabled={loading}
            className="text-zinc-400"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Execution timeline */}
        {loading && history.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No executions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((exec) => {
              const cfg = STATUS_CONFIG[exec.status] || STATUS_CONFIG.pending;
              const StatusIcon = cfg.icon;
              const isExpanded = expandedId === exec.id;

              return (
                <Card
                  key={exec.id}
                  className={`bg-zinc-900 border-zinc-800 ${
                    exec.testRun ? "border-dashed border-cyan-500/20" : ""
                  }`}
                >
                  <CardContent className="p-3">
                    {/* Header row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : exec.id)}
                      className="w-full flex items-center gap-3 text-left"
                    >
                      <div className={`p-1.5 rounded ${cfg.bg}`}>
                        <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-200 truncate">
                            {exec.actionType.replace(/_/g, " ")}
                          </span>
                          {exec.testRun && (
                            <Badge
                              variant="outline"
                              className="border-cyan-500/30 text-cyan-400 text-[10px] px-1.5 py-0"
                            >
                              <TestTube className="w-2.5 h-2.5 mr-0.5" /> TEST
                            </Badge>
                          )}
                          {exec.retryCount > 0 && (
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 text-amber-400 text-[10px] px-1.5 py-0"
                            >
                              Retry #{exec.retryCount}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                          <span>{formatTime(exec.startTime)}</span>
                          <span>{formatDuration(exec.durationMs)}</span>
                          <span className="text-zinc-600">
                            {exec.triggerType.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`${cfg.color} border-zinc-700 text-xs`}>
                        {cfg.label}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-zinc-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                      )}
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
                        {exec.error && (
                          <div className="bg-red-500/5 border border-red-500/20 rounded p-2">
                            <p className="text-xs font-medium text-red-400">Error</p>
                            <p className="text-xs text-red-300 mt-1 font-mono">
                              {exec.error}
                            </p>
                          </div>
                        )}
                        {exec.actionResult != null && (
                          <div>
                            <p className="text-xs font-medium text-zinc-400 mb-1">
                              Action Result
                            </p>
                            <pre className="text-xs text-zinc-300 bg-zinc-800 rounded p-2 overflow-x-auto font-mono">
                              {JSON.stringify(exec.actionResult, null, 2)}
                            </pre>
                          </div>
                        )}
                        {exec.triggerEvent && (
                          <div>
                            <p className="text-xs font-medium text-zinc-400 mb-1">
                              Trigger Event
                            </p>
                            <pre className="text-xs text-zinc-500 bg-zinc-800 rounded p-2 overflow-x-auto font-mono max-h-32">
                              {JSON.stringify(exec.triggerEvent, null, 2)}
                            </pre>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-zinc-600">
                          <span>ID: {exec.id.slice(0, 8)}...</span>
                          <span>Triggered by: {exec.triggeredBy}</span>
                          {exec.maxRetries > 0 && (
                            <span>
                              Retries: {exec.retryCount}/{exec.maxRetries}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
