/** CostMetricsPanel — Full cost analytics, utilization breakdown, and per-agent metrics */
"use client";

import { useMemo } from "react";
import {
  DollarSign, BarChart3, TrendingUp, Cpu, AlertTriangle,
  Zap, Users, Activity, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useOffice } from "../office-store";
import { deriveCostSummary } from "../office-data";
import type { CostSummary, AgentCostMetric } from "../office-data";
import { STATUS_COLORS, STRESS_COLORS } from "../types";
import type { StressTier } from "../types";

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

interface CostMetricsPanelProps {
  onClose: () => void;
}

export function CostMetricsPanel({ onClose }: CostMetricsPanelProps) {
  const { state } = useOffice();
  const summary = useMemo(() => deriveCostSummary(state), [state]);
  const hasAgents = summary.agentMetrics.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative mx-4 w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700/50 bg-slate-900 px-6 py-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Cost & Performance Analytics</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!hasAgents ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm text-slate-400">No agents connected</p>
              <p className="mt-1 text-xs text-slate-500">Deploy agents to see cost and performance analytics.</p>
            </div>
          ) : (
            <>
              {/* Top-line metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                  label="Total Tool Calls"
                  value={summary.totalToolCalls.toLocaleString()}
                  icon={<Zap className="h-4 w-4 text-blue-400" />}
                  color="blue"
                />
                <MetricCard
                  label="Est. Tokens"
                  value={summary.totalEstimatedTokens > 0 ? `~${(summary.totalEstimatedTokens / 1000).toFixed(1)}k` : "—"}
                  icon={<Activity className="h-4 w-4 text-cyan-400" />}
                  color="cyan"
                />
                <MetricCard
                  label="Est. Cost"
                  value={summary.totalEstimatedCostUsd > 0 ? `$${summary.totalEstimatedCostUsd.toFixed(4)}` : "—"}
                  icon={<DollarSign className="h-4 w-4 text-amber-400" />}
                  color="amber"
                />
                <MetricCard
                  label="Avg Utilization"
                  value={`${Math.round(summary.avgUtilization * 100)}%`}
                  icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
                  color="emerald"
                />
              </div>

              {/* Agent status row */}
              <div className="grid grid-cols-3 gap-3">
                <MiniStat label="Active" value={summary.activeAgents} color="text-emerald-400" />
                <MiniStat label="Idle" value={summary.idleAgents} color="text-slate-400" />
                <MiniStat label="Errors" value={summary.errorAgents} color="text-red-400" />
              </div>

              {/* Distribution charts row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Distribution */}
                <DistributionCard
                  title="Status Distribution"
                  icon={<Cpu className="h-3.5 w-3.5 text-slate-400" />}
                  data={summary.statusDistribution}
                  colorFn={(key) => STATUS_COLORS[key as keyof typeof STATUS_COLORS] || "#6b7280"}
                  total={summary.agentMetrics.length}
                />

                {/* Department Distribution */}
                <DistributionCard
                  title="By Department"
                  icon={<Users className="h-3.5 w-3.5 text-slate-400" />}
                  data={summary.departmentDistribution}
                  colorFn={deptColor}
                  total={summary.agentMetrics.length}
                />

                {/* Stress Distribution */}
                <DistributionCard
                  title="Stress Levels"
                  icon={<AlertTriangle className="h-3.5 w-3.5 text-slate-400" />}
                  data={summary.stressDistribution}
                  colorFn={(key) => STRESS_COLORS[key as StressTier]?.primary || "#6b7280"}
                  total={summary.agentMetrics.length}
                />
              </div>

              {/* Top consumers */}
              {summary.topConsumers.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase text-slate-500 mb-3">Top Resource Consumers</h3>
                  <div className="rounded-xl border border-slate-700/30 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700/30 bg-slate-800/40">
                          <th className="text-left p-3 font-medium text-slate-500">Agent</th>
                          <th className="text-left p-3 font-medium text-slate-500 hidden md:table-cell">Dept</th>
                          <th className="text-right p-3 font-medium text-slate-500">Tool Calls</th>
                          <th className="text-right p-3 font-medium text-slate-500">Est. Tokens</th>
                          <th className="text-right p-3 font-medium text-slate-500 hidden md:table-cell">Est. Cost</th>
                          <th className="text-right p-3 font-medium text-slate-500">Load</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.topConsumers.map((m) => (
                          <AgentMetricRow key={m.id} metric={m} maxToolCalls={summary.topConsumers[0]?.toolCalls || 1} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Full agent table */}
              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-500 mb-3">
                  All Agents ({summary.agentMetrics.length})
                </h3>
                <div className="rounded-xl border border-slate-700/30 overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-800/80 backdrop-blur">
                      <tr className="border-b border-slate-700/30">
                        <th className="text-left p-2.5 font-medium text-slate-500">Agent</th>
                        <th className="text-left p-2.5 font-medium text-slate-500">Status</th>
                        <th className="text-right p-2.5 font-medium text-slate-500">Calls</th>
                        <th className="text-right p-2.5 font-medium text-slate-500">Load</th>
                        <th className="text-right p-2.5 font-medium text-slate-500">Stress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.agentMetrics.map((m) => (
                        <tr key={m.id} className="border-b border-slate-700/20 hover:bg-slate-800/30">
                          <td className="p-2.5 text-white font-medium truncate max-w-[140px]">{m.name}</td>
                          <td className="p-2.5">
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-1.5"
                              style={{ backgroundColor: STATUS_COLORS[m.status as keyof typeof STATUS_COLORS] || "#6b7280" }}
                            />
                            <span className="text-slate-400 capitalize">{m.status}</span>
                          </td>
                          <td className="p-2.5 text-right text-slate-300 font-mono">{m.toolCalls}</td>
                          <td className="p-2.5 text-right">
                            <UtilBar value={m.utilization} />
                          </td>
                          <td className="p-2.5 text-right">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                              style={{
                                backgroundColor: (STRESS_COLORS[m.stressTier as StressTier]?.primary || "#6b7280") + "20",
                                color: STRESS_COLORS[m.stressTier as StressTier]?.text || "#6b7280",
                              }}
                            >
                              {m.stressTier}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════ */

function MetricCard({ label, value, icon, color }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`rounded-xl border border-${color}-500/20 bg-${color}-500/5 p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-xl font-bold text-white">{value}</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-700/30 bg-slate-800/30 px-4 py-3">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-lg font-bold ${color}`}>{value}</span>
    </div>
  );
}

function DistributionCard({ title, icon, data, colorFn, total }: {
  title: string;
  icon: React.ReactNode;
  data: Record<string, number>;
  colorFn: (key: string) => string;
  total: number;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">{title}</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-3 bg-slate-700/30">
        {entries.map(([key, count]) => (
          <div
            key={key}
            style={{
              width: `${(count / total) * 100}%`,
              backgroundColor: colorFn(key),
            }}
            title={`${key}: ${count}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-1">
        {entries.map(([key, count]) => (
          <div key={key} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorFn(key) }} />
              <span className="text-[10px] text-slate-400 capitalize">{key.replace("_", " ")}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentMetricRow({ metric, maxToolCalls }: { metric: AgentCostMetric; maxToolCalls: number }) {
  const barWidth = maxToolCalls > 0 ? (metric.toolCalls / maxToolCalls) * 100 : 0;
  const stressColor = STRESS_COLORS[metric.stressTier as StressTier]?.primary || "#6b7280";

  return (
    <tr className="border-b border-slate-700/20 hover:bg-slate-800/30 transition-colors">
      <td className="p-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stressColor }} />
          <span className="text-white font-medium truncate max-w-[120px]">{metric.name}</span>
        </div>
      </td>
      <td className="p-3 text-slate-400 capitalize hidden md:table-cell">{metric.department || "—"}</td>
      <td className="p-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="w-16 h-1.5 rounded-full bg-slate-700/50 overflow-hidden hidden md:block">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${barWidth}%` }} />
          </div>
          <span className="text-slate-300 font-mono">{metric.toolCalls}</span>
        </div>
      </td>
      <td className="p-3 text-right text-slate-400 font-mono">
        {metric.estimatedTokens > 0 ? `${(metric.estimatedTokens / 1000).toFixed(1)}k` : "—"}
      </td>
      <td className="p-3 text-right text-slate-400 font-mono hidden md:table-cell">
        {metric.estimatedCostUsd > 0 ? `$${metric.estimatedCostUsd.toFixed(4)}` : "—"}
      </td>
      <td className="p-3 text-right">
        <UtilBar value={metric.utilization} />
      </td>
    </tr>
  );
}

function UtilBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 1.0 ? "#ef4444" : value >= 0.8 ? "#f97316" : value >= 0.5 ? "#eab308" : "#22c55e";

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono text-slate-400 w-7 text-right">{pct}%</span>
    </div>
  );
}

function deptColor(dept: string): string {
  const map: Record<string, string> = {
    engineering: "#3b82f6",
    design: "#a855f7",
    operations: "#22c55e",
    qa: "#eab308",
    research: "#06b6d4",
    security: "#ef4444",
    unassigned: "#6b7280",
  };
  return map[dept] || "#6b7280";
}
