/**
 * Slot Automation Engine — Type Definitions.
 *
 * A slot policy defines: WHEN (trigger) + IF (conditions) + THEN (action).
 * Extends the existing protocol slots (agent role assignments) with
 * programmable automation — zero human required for common flows.
 */

// ── Trigger Types ────────────────────────────────────────────────────────────

export type SlotTriggerType =
  | "task_created"
  | "job_completed"
  | "workflow_step_success"
  | "workflow_step_failure"
  | "cron"
  | "webhook"
  | "agent_connected"
  | "agent_disconnected"
  | "assignment_created"
  | "assignment_completed";

export interface SlotTriggerConfig {
  type: SlotTriggerType;
  /** Cron expression (only for type=cron) */
  schedule?: string;
  /** Timezone for cron (default: UTC) */
  timezone?: string;
  /** Safe filter expression evaluated against event payload */
  filterExpression?: string;
  /** HMAC secret for webhook validation (only for type=webhook) */
  webhookSecret?: string;
  /** Allowed source IPs for webhook (empty = allow all) */
  allowedIps?: string[];
}

// ── Condition Filters ────────────────────────────────────────────────────────

export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "contains"
  | "matches";

export interface SlotConditionFilter {
  /** Dot-notation path into the event payload */
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface SlotConditions {
  /** All filters must pass (AND logic) */
  filters: SlotConditionFilter[];
  /** Optional JS expression for complex conditions (safe eval) */
  expression?: string;
}

// ── Action Types ─────────────────────────────────────────────────────────────

export type SlotActionType =
  | "start_workflow"
  | "assign_agent"
  | "send_to_gateway"
  | "call_tool_adapter"
  | "post_message"
  | "require_approval";

export interface StartWorkflowAction {
  type: "start_workflow";
  workflowId: string;
  /** Map trigger data fields to workflow inputs */
  inputMapping?: Record<string, string>;
}

export interface AssignAgentAction {
  type: "assign_agent";
  /** Specific agent, or null to use the slot's assigned agent */
  agentId?: string;
  taskTitle: string;
  taskDescription: string;
  priority?: "low" | "medium" | "high" | "urgent";
  requiresAcceptance?: boolean;
}

export interface SendToGatewayAction {
  type: "send_to_gateway";
  taskType: string;
  priority?: "low" | "normal" | "high" | "critical";
  /** Template with {{variable}} placeholders */
  payloadTemplate?: Record<string, string>;
  timeoutMs?: number;
}

export interface CallToolAdapterAction {
  type: "call_tool_adapter";
  toolId: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headersTemplate?: Record<string, string>;
  bodyTemplate?: string;
  timeoutMs?: number;
}

export interface PostMessageAction {
  type: "post_message";
  /** Channel ID (null = org's default Agent Hub chat) */
  channelId?: string;
  /** Supports {{variable}} placeholders */
  messageTemplate: string;
  messageType?: "broadcast" | "a2a" | "coord";
  /** Target agent for a2a messages */
  targetAgentId?: string;
}

export interface RequireApprovalAction {
  type: "require_approval";
  /** Wallet addresses or agent IDs who can approve */
  approverIds: string[];
  prompt: string;
  /** Auto-reject after timeout (ms) */
  timeoutMs?: number;
  /** Action if rejected or timed out */
  fallbackAction?: SlotAction;
}

export type SlotAction =
  | StartWorkflowAction
  | AssignAgentAction
  | SendToGatewayAction
  | CallToolAdapterAction
  | PostMessageAction
  | RequireApprovalAction;

// ── Retry Policy ─────────────────────────────────────────────────────────────

export interface RetryPolicy {
  maxRetries: number;
  /** Initial backoff in ms (doubles each retry) */
  backoffMs: number;
  /** Maximum backoff cap in ms */
  maxBackoffMs: number;
}

// ── Slot Policy (the main entity) ────────────────────────────────────────────

export interface SlotPolicy {
  id: string;
  orgId: string;
  /** Which protocol slot this policy belongs to */
  slotId: string;
  name: string;
  description?: string;
  trigger: SlotTriggerConfig;
  conditions?: SlotConditions;
  action: SlotAction;
  retryPolicy?: RetryPolicy;
  enabled: boolean;
  /** Cooldown between executions in ms (0 = no cooldown) */
  cooldownMs: number;
  /** Max concurrent executions (0 = unlimited) */
  maxConcurrent: number;
  /** Higher priority policies execute first when multiple match */
  priority: number;
  /** Stats */
  executionCount: number;
  lastExecutedAt?: unknown;
  lastExecutionStatus?: "success" | "failure" | "skipped";
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface SlotPolicyCreateInput {
  orgId: string;
  slotId: string;
  name: string;
  description?: string;
  trigger: SlotTriggerConfig;
  conditions?: SlotConditions;
  action: SlotAction;
  retryPolicy?: RetryPolicy;
  enabled?: boolean;
  cooldownMs?: number;
  maxConcurrent?: number;
  priority?: number;
  createdBy: string;
}

export interface SlotPolicyUpdateInput {
  name?: string;
  description?: string;
  trigger?: SlotTriggerConfig;
  conditions?: SlotConditions;
  action?: SlotAction;
  retryPolicy?: RetryPolicy;
  enabled?: boolean;
  cooldownMs?: number;
  maxConcurrent?: number;
  priority?: number;
}

// ── Slot Execution (history record) ──────────────────────────────────────────

export type SlotExecutionStatus =
  | "pending"
  | "running"
  | "success"
  | "failure"
  | "skipped"
  | "retrying";

export interface SlotExecution {
  id: string;
  policyId: string;
  policyName: string;
  slotId: string;
  orgId: string;
  /** Prevents duplicate processing */
  idempotencyKey: string;
  triggerType: SlotTriggerType;
  triggerEvent?: Record<string, unknown>;
  status: SlotExecutionStatus;
  actionType: SlotActionType;
  actionResult?: unknown;
  error?: string;
  retryCount: number;
  maxRetries: number;
  startTime: Date | null;
  endTime: Date | null;
  durationMs: number;
  /** Whether this was a dry run (test) */
  testRun: boolean;
  triggeredBy: string;
  createdAt: unknown;
}

export interface SlotExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  skippedExecutions: number;
  successRate: number;
  avgDurationMs: number;
  lastExecution: Date | null;
  lastSuccess: Date | null;
  lastFailure: Date | null;
}

// ── Execution Context (internal) ─────────────────────────────────────────────

export interface ExecutionContext {
  orgId: string;
  slotId: string;
  policyId: string;
  triggerType: SlotTriggerType;
  triggerEvent: Record<string, unknown>;
  eventId: string;
  /** Agent currently assigned to this slot */
  assignedAgentId?: string;
  testRun: boolean;
  /** Anti-loop depth tracking */
  _slotDepth?: number;
}

export interface ActionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  /** External ref (e.g., workflow run ID, assignment ID, gateway task ID) */
  externalRef?: string;
}
