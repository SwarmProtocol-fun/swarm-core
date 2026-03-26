/** office-data.ts — Derives TaskBoard tasks, DecisionInbox items, and ReportHistory
 *  entries from live OfficeState (agents + activity feed).
 */

import type { OfficeState } from "./office-store";
import type { VisualAgent } from "./types";
import type { BoardTask, TaskStatus, TaskType, TaskPriority } from "./panels/TaskBoardPanel";
import type { DecisionInboxItem } from "./panels/DecisionInboxPanel";
import type { TaskReportSummary } from "./panels/ReportHistoryPanel";

/* ═══════════════════════════════════════
   TaskBoard — derive from agent state
   ═══════════════════════════════════════ */

function agentToTaskType(agent: VisualAgent): TaskType {
  if (agent.department === "engineering") return "development";
  if (agent.department === "design") return "design";
  if (agent.department === "research") return "analysis";
  if (agent.department === "qa") return "analysis";
  return "general";
}

function agentToPriority(agent: VisualAgent): TaskPriority {
  if (agent.stressTier === "overloaded") return 5;
  if (agent.stressTier === "stressed") return 4;
  if (agent.stressTier === "busy") return 3;
  if (agent.status === "error") return 5;
  if (agent.status === "blocked") return 4;
  return 2;
}

function agentToTaskStatus(agent: VisualAgent): TaskStatus {
  switch (agent.status) {
    case "active":
    case "tool_calling":
    case "speaking":
      return "in_progress";
    case "thinking":
      return "collaborating";
    case "error":
      return "pending";
    case "blocked":
      return "pending";
    case "idle":
      return agent.currentTask ? "review" : "inbox";
    case "spawning":
      return "planned";
    case "offline":
      return "cancelled";
    default:
      return "inbox";
  }
}

export function deriveBoardTasks(state: OfficeState): BoardTask[] {
  const tasks: BoardTask[] = [];

  for (const agent of state.agents.values()) {
    if (agent.status === "offline" && !agent.currentTask) continue;

    tasks.push({
      id: `task-${agent.id}`,
      title: agent.currentTask || `${agent.name} — ${agent.status}`,
      description: agent.speechBubble || agent.bio || null,
      status: agentToTaskStatus(agent),
      priority: agentToPriority(agent),
      taskType: agentToTaskType(agent),
      departmentId: agent.department || null,
      assignedAgentId: agent.id,
      assignedAgentName: agent.name,
      projectId: null,
      projectPath: null,
      result: null,
      subtaskTotal: agent.childAgentIds.length > 0 ? agent.childAgentIds.length + 1 : 0,
      subtaskDone: agent.childAgentIds.length > 0
        ? agent.childAgentIds.filter(cid => {
            const child = state.agents.get(cid);
            return child && (child.status === "idle" || child.status === "offline");
          }).length
        : 0,
      createdAt: agent.lastActiveAt,
      startedAt: agent.status === "active" || agent.status === "tool_calling" ? agent.lastActiveAt : null,
      completedAt: null,
      hidden: false,
    });
  }

  const completed = state.activityFeed
    .filter(e => e.type === "task_complete" || (e.type === "status_change" && e.description.includes("→ idle")))
    .slice(0, 10);

  for (const event of completed) {
    if (tasks.some(t => t.assignedAgentId === event.agentId)) continue;
    tasks.push({
      id: `done-${event.agentId}-${event.timestamp}`,
      title: event.description,
      description: null,
      status: "done",
      priority: 2,
      taskType: "general",
      departmentId: null,
      assignedAgentId: event.agentId,
      assignedAgentName: event.agentName,
      projectId: null,
      projectPath: null,
      result: null,
      subtaskTotal: 0,
      subtaskDone: 0,
      createdAt: event.timestamp,
      startedAt: event.timestamp,
      completedAt: event.timestamp,
      hidden: false,
    });
  }

  return tasks;
}

/* ═══════════════════════════════════════
   DecisionInbox — derive from agent events
   ═══════════════════════════════════════ */

export function deriveDecisionItems(state: OfficeState): DecisionInboxItem[] {
  const items: DecisionInboxItem[] = [];

  for (const agent of state.agents.values()) {
    if (agent.status === "error") {
      items.push({
        id: `decision-error-${agent.id}`,
        kind: "task_timeout_resume",
        title: `${agent.name} encountered an error`,
        description: agent.speechBubble || `Agent ${agent.name} is in error state and needs intervention.`,
        agentId: agent.id,
        agentName: agent.name,
        options: [
          { number: 1, action: "retry", label: "Retry the current task" },
          { number: 2, action: "reassign", label: "Reassign to another agent" },
          { number: 3, action: "skip", label: "Skip and move on" },
        ],
        createdAt: agent.lastActiveAt,
      });
    }

    if (agent.status === "blocked") {
      items.push({
        id: `decision-blocked-${agent.id}`,
        kind: "task_timeout_resume",
        title: `${agent.name} is blocked`,
        description: agent.speechBubble || `Agent ${agent.name} is blocked and waiting for input.`,
        agentId: agent.id,
        agentName: agent.name,
        options: [
          { number: 1, action: "unblock", label: "Provide guidance and unblock" },
          { number: 2, action: "reassign", label: "Reassign to a different agent" },
          { number: 3, action: "pause", label: "Pause until later" },
        ],
        createdAt: agent.lastActiveAt,
      });
    }

    if (agent.stressTier === "overloaded") {
      items.push({
        id: `decision-overload-${agent.id}`,
        kind: "project_review_ready",
        title: `${agent.name} is overloaded`,
        description: `Utilization at ${Math.round(agent.utilization * 100)}%. Consider redistributing workload.`,
        agentId: agent.id,
        agentName: agent.name,
        options: [
          { number: 1, action: "redistribute", label: "Redistribute tasks to idle agents" },
          { number: 2, action: "spawn_helper", label: "Spawn a helper sub-agent" },
          { number: 3, action: "accept", label: "Accept current load" },
        ],
        createdAt: agent.lastActiveAt,
      });
    }
  }

  const recentErrors = state.activityFeed.filter(e => e.type === "error").slice(0, 3);
  for (const event of recentErrors) {
    if (items.some(i => i.agentId === event.agentId)) continue;
    items.push({
      id: `decision-review-${event.agentId}-${event.timestamp}`,
      kind: "review_round_pick",
      title: `Review: ${event.agentName} error recovery`,
      description: event.description,
      agentId: event.agentId,
      agentName: event.agentName,
      reviewRound: 1,
      revisionNotes: [
        "Check agent configuration and permissions",
        "Verify API connectivity and rate limits",
        "Review task complexity and break down if needed",
      ],
      options: [
        { number: 1, action: "approve_fix", label: "Approve automated fix" },
        { number: 2, action: "manual_review", label: "Manual review required" },
        { number: 3, action: "dismiss", label: "Dismiss — not critical" },
      ],
      createdAt: event.timestamp,
    });
  }

  return items.sort((a, b) => b.createdAt - a.createdAt);
}

/* ═══════════════════════════════════════
   ReportHistory — derive from activity feed
   ═══════════════════════════════════════ */

export function deriveReportSummaries(state: OfficeState): TaskReportSummary[] {
  const reports: TaskReportSummary[] = [];

  const relevantEvents = state.activityFeed.filter(
    e => e.type === "task_complete" || e.type === "recovery" || e.type === "spawn" || e.type === "despawn"
  );

  for (const event of relevantEvents) {
    const agent = state.agents.get(event.agentId);
    reports.push({
      id: `report-${event.agentId}-${event.timestamp}`,
      title: event.description,
      description: null,
      departmentId: agent?.department || null,
      assignedAgentId: event.agentId,
      status: "done",
      projectId: null,
      projectPath: null,
      projectName: agent?.department ? cap(agent.department) : "General",
      agentName: event.agentName,
      agentRole: agent?.agentType || null,
      deptName: agent?.department ? cap(agent.department) : null,
      createdAt: event.timestamp,
      completedAt: event.timestamp,
    });
  }

  const idleTransitions = state.activityFeed.filter(
    e => e.type === "status_change" && e.description.includes("→ idle")
  );
  for (const event of idleTransitions) {
    const agent = state.agents.get(event.agentId);
    if (reports.some(r => r.assignedAgentId === event.agentId && Math.abs(r.createdAt - event.timestamp) < 5000)) continue;
    reports.push({
      id: `report-idle-${event.agentId}-${event.timestamp}`,
      title: `${event.agentName} completed work`,
      description: agent?.speechBubble || null,
      departmentId: agent?.department || null,
      assignedAgentId: event.agentId,
      status: "done",
      projectId: null,
      projectPath: null,
      projectName: agent?.department ? cap(agent.department) : "General",
      agentName: event.agentName,
      agentRole: agent?.agentType || null,
      deptName: agent?.department ? cap(agent.department) : null,
      createdAt: event.timestamp,
      completedAt: event.timestamp,
    });
  }

  return reports.sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
}

/* ═══════════════════════════════════════
   Cost/Metrics — aggregate from agents
   ═══════════════════════════════════════ */

export interface AgentCostMetric {
  id: string;
  name: string;
  department: string | null;
  status: string;
  toolCalls: number;
  estimatedTokens: number;
  estimatedCostUsd: number;
  utilization: number;
  stressTier: string;
  uptimeMinutes: number;
}

export interface CostSummary {
  totalToolCalls: number;
  totalEstimatedTokens: number;
  totalEstimatedCostUsd: number;
  activeAgents: number;
  idleAgents: number;
  errorAgents: number;
  avgUtilization: number;
  statusDistribution: Record<string, number>;
  departmentDistribution: Record<string, number>;
  stressDistribution: Record<string, number>;
  agentMetrics: AgentCostMetric[];
  topConsumers: AgentCostMetric[];
}

const TOKENS_PER_TOOL_CALL = 850;
const COST_PER_1K_TOKENS = 0.003;

export function deriveCostSummary(state: OfficeState): CostSummary {
  const agents = Array.from(state.agents.values());
  const agentMetrics: AgentCostMetric[] = agents.map(agent => {
    const estimatedTokens = agent.toolCallCount * TOKENS_PER_TOOL_CALL;
    return {
      id: agent.id,
      name: agent.name,
      department: agent.department,
      status: agent.status,
      toolCalls: agent.toolCallCount,
      estimatedTokens,
      estimatedCostUsd: (estimatedTokens / 1000) * COST_PER_1K_TOKENS,
      utilization: agent.utilization,
      stressTier: agent.stressTier,
      uptimeMinutes: Math.max(0, Math.round((Date.now() - agent.lastActiveAt) / 60000)),
    };
  });

  const statusDistribution: Record<string, number> = {};
  const departmentDistribution: Record<string, number> = {};
  const stressDistribution: Record<string, number> = {};

  for (const agent of agents) {
    statusDistribution[agent.status] = (statusDistribution[agent.status] || 0) + 1;
    departmentDistribution[agent.department || "unassigned"] = (departmentDistribution[agent.department || "unassigned"] || 0) + 1;
    stressDistribution[agent.stressTier] = (stressDistribution[agent.stressTier] || 0) + 1;
  }

  const totalToolCalls = agentMetrics.reduce((s, m) => s + m.toolCalls, 0);
  const totalEstimatedTokens = agentMetrics.reduce((s, m) => s + m.estimatedTokens, 0);

  return {
    totalToolCalls,
    totalEstimatedTokens,
    totalEstimatedCostUsd: (totalEstimatedTokens / 1000) * COST_PER_1K_TOKENS,
    activeAgents: agents.filter(a => ["active", "thinking", "tool_calling", "speaking"].includes(a.status)).length,
    idleAgents: agents.filter(a => a.status === "idle").length,
    errorAgents: agents.filter(a => a.status === "error").length,
    avgUtilization: agents.length > 0 ? agents.reduce((s, a) => s + a.utilization, 0) / agents.length : 0,
    statusDistribution,
    departmentDistribution,
    stressDistribution,
    agentMetrics,
    topConsumers: [...agentMetrics].sort((a, b) => b.toolCalls - a.toolCalls).slice(0, 5),
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
