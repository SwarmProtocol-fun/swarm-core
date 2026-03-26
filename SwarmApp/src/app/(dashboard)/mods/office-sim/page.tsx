/** Office Sim — Home Dashboard */
"use client";

import { useMemo } from "react";
import {
  Monitor, Layout, Box, Paintbrush, DollarSign,
  TrendingUp, AlertTriangle, Zap, Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOffice } from "@/components/mods/office-sim/office-store";
import { STATUS_COLORS, STRESS_COLORS } from "@/components/mods/office-sim/types";
import type { VisualAgent, OfficeActivityEvent, StressTier } from "@/components/mods/office-sim/types";
import { deriveCostSummary, deriveDecisionItems } from "@/components/mods/office-sim/office-data";

export default function OfficeSimPage() {
  const { state } = useOffice();
  const agents = Array.from(state.agents.values());
  const { activeCount, errorCount, taskCount } = state.metrics;
  const totalAgents = agents.length;

  const costSummary = useMemo(() => deriveCostSummary(state), [state]);
  const pendingDecisions = useMemo(() => deriveDecisionItems(state), [state]);

  const onlineCount = agents.filter(a => a.status !== "offline").length;
  const uptimePct = totalAgents > 0 ? Math.round((onlineCount / totalAgents) * 100) : 0;
  const stressedCount = agents.filter(a => a.stressTier === "stressed" || a.stressTier === "overloaded").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Monitor className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Office Sim</h1>
            <p className="text-sm text-muted-foreground">
              Watch your agents work in a living virtual office
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingDecisions.length > 0 && (
            <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">
              {pendingDecisions.length} pending decisions
            </Badge>
          )}
          <Badge variant="outline" className={state.connected ? "border-green-500/30 text-green-400" : "border-red-500/30 text-red-400"}>
            {state.connected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <OverviewCard label="Active" value={activeCount} total={totalAgents} color="#22c55e" icon={<Users className="h-3.5 w-3.5" />} />
        <OverviewCard label="Tasks" value={taskCount} color="#3b82f6" icon={<Zap className="h-3.5 w-3.5" />} />
        <OverviewCard label="Errors" value={errorCount} color="#ef4444" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        <OverviewCard label="Uptime" value={`${uptimePct}%`} color="#a855f7" icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <OverviewCard label="Tool Calls" value={costSummary.totalToolCalls} color="#06b6d4" icon={<DollarSign className="h-3.5 w-3.5" />} />
      </div>

      {/* Utilization gauge row */}
      {totalAgents > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Average utilization */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Average Utilization</span>
                <span className="text-sm font-bold" style={{ color: utilColor(costSummary.avgUtilization) }}>
                  {Math.round(costSummary.avgUtilization * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.round(costSummary.avgUtilization * 100))}%`,
                    backgroundColor: utilColor(costSummary.avgUtilization),
                  }}
                />
              </div>
              {stressedCount > 0 && (
                <p className="text-[10px] text-amber-400 mt-2">
                  {stressedCount} agent{stressedCount > 1 ? "s" : ""} under stress
                </p>
              )}
            </CardContent>
          </Card>

          {/* Stress distribution */}
          <Card>
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground block mb-2">Stress Distribution</span>
              <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                {(["normal", "busy", "stressed", "overloaded"] as StressTier[]).map((tier) => {
                  const count = costSummary.stressDistribution[tier] || 0;
                  if (count === 0) return null;
                  return (
                    <div
                      key={tier}
                      style={{
                        width: `${(count / totalAgents) * 100}%`,
                        backgroundColor: STRESS_COLORS[tier].primary,
                      }}
                      title={`${tier}: ${count}`}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-2">
                {(["normal", "busy", "stressed", "overloaded"] as StressTier[]).map((tier) => {
                  const count = costSummary.stressDistribution[tier] || 0;
                  if (count === 0) return null;
                  return (
                    <div key={tier} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STRESS_COLORS[tier].primary }} />
                      <span className="text-[10px] text-muted-foreground capitalize">{tier} {count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/mods/office-sim/2d">
          <Card className="hover:border-amber-500/30 transition-colors cursor-pointer group">
            <CardContent className="flex items-center gap-3 p-4">
              <Layout className="h-5 w-5 text-muted-foreground group-hover:text-amber-400 transition-colors" />
              <div>
                <p className="text-sm font-medium">2D Office</p>
                <p className="text-xs text-muted-foreground">Command center view</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/mods/office-sim/3d">
          <Card className="hover:border-amber-500/30 transition-colors cursor-pointer group">
            <CardContent className="flex items-center gap-3 p-4">
              <Box className="h-5 w-5 text-muted-foreground group-hover:text-amber-400 transition-colors" />
              <div>
                <p className="text-sm font-medium">3D Office</p>
                <p className="text-xs text-muted-foreground">Immersive view</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/mods/office-sim/2d">
          <Card className="hover:border-purple-500/30 transition-colors cursor-pointer group">
            <CardContent className="flex items-center gap-3 p-4">
              <Paintbrush className="h-5 w-5 text-muted-foreground group-hover:text-purple-400 transition-colors" />
              <div>
                <p className="text-sm font-medium">Studio</p>
                <p className="text-xs text-muted-foreground">Art & character design</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/mods/office-sim/2d">
          <Card className="hover:border-cyan-500/30 transition-colors cursor-pointer group">
            <CardContent className="flex items-center gap-3 p-4">
              <DollarSign className="h-5 w-5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
              <div>
                <p className="text-sm font-medium">Analytics</p>
                <p className="text-xs text-muted-foreground">Cost & performance</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Recent Activity
        </h2>
        {state.activityFeed.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              No recent activity. Deploy agents to see live events here.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {state.activityFeed.slice(0, 10).map((event, i) => (
                  <ActivityRow key={`${event.agentId}-${event.timestamp}-${i}`} event={event} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Agent Status Grid */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Agent Status</h2>
        {agents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              No agents found. Deploy agents to see them in your virtual office.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Agent</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Zone</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Load</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Model</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <AgentRow key={agent.id} agent={agent} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewCard({ label, value, total, color, icon }: {
  label: string;
  value: number | string;
  total?: number;
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-1">
          {icon && <span style={{ color }}>{icon}</span>}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold" style={{ color }}>{value}</span>
          {total !== undefined && <span className="text-sm text-muted-foreground">/{total}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function AgentRow({ agent }: { agent: VisualAgent }) {
  const statusColor = STATUS_COLORS[agent.status];
  const stressColor = STRESS_COLORS[agent.stressTier]?.primary || "#6b7280";
  const utilPct = Math.round(agent.utilization * 100);

  return (
    <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">
      <td className="p-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
          <span className="font-medium truncate">{agent.name}</span>
          {agent.department && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground hidden lg:inline capitalize">
              {agent.department}
            </span>
          )}
        </div>
      </td>
      <td className="p-3">
        <Badge variant="outline" className="text-[10px] capitalize" style={{ borderColor: statusColor + "40", color: statusColor }}>
          {agent.status}
        </Badge>
      </td>
      <td className="p-3 hidden md:table-cell text-muted-foreground capitalize">{agent.zone.replace("_", " ")}</td>
      <td className="p-3 hidden md:table-cell">
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, utilPct)}%`, backgroundColor: stressColor }} />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{utilPct}%</span>
        </div>
      </td>
      <td className="p-3 hidden md:table-cell text-muted-foreground text-xs font-mono">{agent.model || "\u2014"}</td>
      <td className="p-3 text-right">
        <Link href={`/mods/office-sim/2d?agent=${agent.id}`}>
          <Button variant="ghost" size="sm" className="text-xs">Inspect</Button>
        </Link>
      </td>
    </tr>
  );
}

const EVENT_ICONS: Record<string, string> = {
  status_change: "\u{1F504}",
  error: "\u26A0\uFE0F",
  recovery: "\u2705",
  spawn: "\u2728",
  despawn: "\u{1F44B}",
  task_start: "\u25B6\uFE0F",
  task_complete: "\u2714\uFE0F",
};

function ActivityRow({ event }: { event: OfficeActivityEvent }) {
  const icon = EVENT_ICONS[event.type] || "\u{1F504}";
  const timeStr = formatRelativeTime(event.timestamp);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
      <span className="text-base shrink-0">{icon}</span>
      <span className="flex-1 truncate text-muted-foreground">
        <span className="text-foreground font-medium">{event.agentName}</span>{" "}
        {event.description.replace(`${event.agentName}: `, "").replace(`${event.agentName} `, "")}
      </span>
      <span className="text-xs text-muted-foreground shrink-0">{timeStr}</span>
    </div>
  );
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

function utilColor(util: number): string {
  if (util >= 1.0) return "#ef4444";
  if (util >= 0.8) return "#f97316";
  if (util >= 0.5) return "#eab308";
  return "#22c55e";
}
