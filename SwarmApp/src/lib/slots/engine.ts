/**
 * Slot Automation Engine — Core executor.
 *
 * Evaluates triggers, checks conditions, executes actions, handles retries.
 * Pattern mirrors workflow/triggers.ts fireEvent() but generalizes to
 * multiple action types and records execution history.
 */

import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getRedis } from "@/lib/redis";
import { getEnabledPoliciesForTrigger, getSlotPolicy } from "./policies";
import { recordSlotExecution, getSlotExecution } from "./executions";
import type {
  SlotPolicy,
  SlotConditions,
  SlotConditionFilter,
  SlotAction,
  SlotTriggerType,
  ExecutionContext,
  ActionResult,
  FilterOperator,
} from "./types";

// ── Constants ────────────────────────────────────────────────────────────────

/** Max depth for slot-triggered events (anti-loop) */
const MAX_SLOT_DEPTH = 3;
/** Idempotency key TTL in seconds */
const IDEMP_TTL_S = 600; // 10 minutes

// ── Safe expression evaluation (from workflow/triggers.ts) ───────────────────

const SAFE_FILTER_RE = /^[\s\w.'"` \d\-+*/%<>=!&|?:,[\]()]+$/;

const FORBIDDEN_FILTER_PATTERNS = [
  /\b(eval|Function|constructor|__proto__|prototype)\b/,
  /\b(require|import|export|process|globalThis|window|document)\b/,
  /\b(fetch|XMLHttpRequest|WebSocket|setTimeout|setInterval)\b/,
  /[;{}]/,
  /=(?!=)/,
];

function evaluateFilterExpression(
  expression: string,
  data: Record<string, unknown>,
): boolean {
  try {
    if (!SAFE_FILTER_RE.test(expression)) return false;
    for (const pattern of FORBIDDEN_FILTER_PATTERNS) {
      if (pattern.test(expression)) return false;
    }
    const frozen = Object.freeze({ ...data });
    const fn = new Function("event", `"use strict"; return !!(${expression});`);
    return fn(frozen);
  } catch {
    return false;
  }
}

// ── Template interpolation ───────────────────────────────────────────────────

export function interpolateTemplate(
  template: string,
  data: Record<string, unknown>,
): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path: string) => {
    const value = path
      .split(".")
      .reduce<unknown>((obj, key) => (obj as Record<string, unknown>)?.[key], data);
    return value !== undefined && value !== null ? String(value) : "";
  });
}

// ── Condition evaluation ─────────────────────────────────────────────────────

function resolveField(data: Record<string, unknown>, field: string): unknown {
  return field
    .split(".")
    .reduce<unknown>((obj, key) => (obj as Record<string, unknown>)?.[key], data);
}

function applyOperator(
  fieldValue: unknown,
  operator: FilterOperator,
  testValue: unknown,
): boolean {
  switch (operator) {
    case "eq":
      return fieldValue === testValue;
    case "neq":
      return fieldValue !== testValue;
    case "gt":
      return Number(fieldValue) > Number(testValue);
    case "gte":
      return Number(fieldValue) >= Number(testValue);
    case "lt":
      return Number(fieldValue) < Number(testValue);
    case "lte":
      return Number(fieldValue) <= Number(testValue);
    case "in":
      return Array.isArray(testValue) && testValue.includes(fieldValue);
    case "not_in":
      return Array.isArray(testValue) && !testValue.includes(fieldValue);
    case "contains":
      return typeof fieldValue === "string" && fieldValue.includes(String(testValue));
    case "matches":
      try {
        return typeof fieldValue === "string" && new RegExp(String(testValue)).test(fieldValue);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function evaluateFilter(filter: SlotConditionFilter, data: Record<string, unknown>): boolean {
  const fieldValue = resolveField(data, filter.field);
  return applyOperator(fieldValue, filter.operator, filter.value);
}

export function evaluateConditions(
  conditions: SlotConditions | undefined,
  eventData: Record<string, unknown>,
): boolean {
  if (!conditions) return true;

  // All filters must pass (AND logic)
  for (const filter of conditions.filters) {
    if (!evaluateFilter(filter, eventData)) return false;
  }

  // Optional expression
  if (conditions.expression) {
    if (!evaluateFilterExpression(conditions.expression, eventData)) return false;
  }

  return true;
}

// ── Idempotency & Cooldown (from workflow/triggers.ts) ───────────────────────

function idempotencyKey(policyId: string, eventId: string): string {
  return `slot:idemp:${policyId}:${eventId}`;
}

async function checkIdempotency(policyId: string, eventId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true; // Fail-open

  const key = idempotencyKey(policyId, eventId);
  try {
    const result = await redis.set(key, "1", { nx: true, ex: IDEMP_TTL_S });
    return result !== null; // null = key existed = duplicate
  } catch {
    return true; // Fail-open
  }
}

async function checkCooldown(policy: SlotPolicy): Promise<boolean> {
  if (policy.cooldownMs <= 0) return true;

  const redis = getRedis();
  if (redis) {
    const key = `slot:cooldown:${policy.id}`;
    try {
      const last = await redis.get(key);
      if (last) return false; // In cooldown
      await redis.set(key, "1", { px: policy.cooldownMs });
      return true;
    } catch {
      return true; // Fail-open
    }
  }

  // No Redis — check Firestore lastExecutedAt
  if (policy.lastExecutedAt) {
    const lastTs =
      typeof policy.lastExecutedAt === "number"
        ? policy.lastExecutedAt
        : (policy.lastExecutedAt as { getTime?: () => number })?.getTime?.() ||
          (policy.lastExecutedAt as { toMillis?: () => number })?.toMillis?.() ||
          0;
    if (Date.now() - lastTs < policy.cooldownMs) return false;
  }
  return true;
}

// ── Action Execution ─────────────────────────────────────────────────────────

export async function executeAction(
  action: SlotAction,
  context: ExecutionContext,
): Promise<ActionResult> {
  const eventData = context.triggerEvent;

  switch (action.type) {
    case "start_workflow": {
      const { startRun } = await import("@/lib/workflow/executor");
      const triggerInput: Record<string, unknown> = {};
      if (action.inputMapping) {
        for (const [key, path] of Object.entries(action.inputMapping)) {
          triggerInput[key] = resolveField(eventData, path);
        }
      }
      triggerInput._slotEvent = {
        policyId: context.policyId,
        slotId: context.slotId,
        triggerType: context.triggerType,
        eventId: context.eventId,
      };

      if (context.testRun) {
        return {
          success: true,
          output: { dryRun: true, workflowId: action.workflowId, triggerInput },
        };
      }

      const runId = await startRun(
        action.workflowId,
        `slot:${context.policyId}`,
        triggerInput,
      );
      return { success: true, output: { runId }, externalRef: runId };
    }

    case "assign_agent": {
      const { createAssignment } = await import("@/lib/assignments");
      const { getAgent } = await import("@/lib/firestore");

      const agentId = action.agentId || context.assignedAgentId;
      if (!agentId) {
        return { success: false, error: "No agent specified and no agent assigned to slot" };
      }

      if (context.testRun) {
        return { success: true, output: { dryRun: true, agentId, title: action.taskTitle } };
      }

      const agent = await getAgent(agentId);
      if (!agent) {
        return { success: false, error: `Agent ${agentId} not found` };
      }

      const assignmentId = await createAssignment({
        orgId: context.orgId,
        fromHumanId: "system:slot-engine",
        fromHumanName: "Slot Automation",
        toAgentId: agentId,
        toAgentName: agent.name,
        title: interpolateTemplate(action.taskTitle, eventData),
        description: interpolateTemplate(action.taskDescription, eventData),
        priority: action.priority || "medium",
        requiresAcceptance: action.requiresAcceptance ?? false,
      });
      return { success: true, output: { assignmentId }, externalRef: assignmentId };
    }

    case "send_to_gateway": {
      const { enqueueTask } = await import("@/lib/gateway/store");

      const payload: Record<string, unknown> = {};
      if (action.payloadTemplate) {
        for (const [key, template] of Object.entries(action.payloadTemplate)) {
          payload[key] = interpolateTemplate(template, eventData);
        }
      }

      if (context.testRun) {
        return {
          success: true,
          output: { dryRun: true, taskType: action.taskType, payload },
        };
      }

      const taskId = await enqueueTask({
        orgId: context.orgId,
        taskType: action.taskType,
        idempotencyKey: `slot:${context.policyId}:${context.eventId}`,
        priority: action.priority || "normal",
        payload,
        resources: {},
        timeoutMs: action.timeoutMs || 60_000,
        maxRetries: 0,
        sourceRef: `slot:${context.policyId}`,
      });
      return { success: true, output: { taskId }, externalRef: taskId };
    }

    case "call_tool_adapter": {
      const url = interpolateTemplate(action.url, eventData);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (action.headersTemplate) {
        for (const [key, template] of Object.entries(action.headersTemplate)) {
          headers[key] = interpolateTemplate(template, eventData);
        }
      }

      if (context.testRun) {
        return {
          success: true,
          output: {
            dryRun: true,
            method: action.method,
            url,
            headers: Object.keys(headers),
          },
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        action.timeoutMs || 9_000,
      );

      try {
        const body = action.bodyTemplate
          ? interpolateTemplate(action.bodyTemplate, eventData)
          : undefined;

        const res = await fetch(url, {
          method: action.method,
          headers,
          body: action.method !== "GET" ? body : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const responseText = await res.text();
        let responseData: unknown;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText.slice(0, 1000);
        }

        if (!res.ok) {
          return {
            success: false,
            error: `HTTP ${res.status}: ${responseText.slice(0, 200)}`,
            output: { status: res.status, data: responseData },
          };
        }

        return { success: true, output: { status: res.status, data: responseData } };
      } catch (err) {
        clearTimeout(timeoutId);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Tool adapter call failed",
        };
      }
    }

    case "post_message": {
      const { sendMessage } = await import("@/lib/firestore");

      const content = interpolateTemplate(action.messageTemplate, eventData);

      if (context.testRun) {
        return {
          success: true,
          output: { dryRun: true, message: content, channelId: action.channelId },
        };
      }

      const messageId = await sendMessage({
        orgId: context.orgId,
        channelId: action.channelId || "general",
        content,
        senderId: "system:slot-engine",
        senderName: "Slot Automation",
        senderType: "agent",
        createdAt: new Date(),
      });
      return { success: true, output: { messageId }, externalRef: messageId };
    }

    case "require_approval": {
      if (context.testRun) {
        return {
          success: true,
          output: {
            dryRun: true,
            approverIds: action.approverIds,
            prompt: action.prompt,
          },
        };
      }

      // Create an approval request as a message + metadata for the approval system
      const { sendMessage } = await import("@/lib/firestore");
      const messageId = await sendMessage({
        orgId: context.orgId,
        channelId: "approvals",
        content: `**Approval Required**: ${action.prompt}\n\nTriggered by slot policy \`${context.policyId}\``,
        senderId: "system:slot-engine",
        senderName: "Slot Automation",
        senderType: "agent",
        createdAt: new Date(),
      });

      return {
        success: true,
        output: {
          approvalMessageId: messageId,
          approverIds: action.approverIds,
          status: "pending_approval",
        },
        externalRef: messageId,
      };
    }

    default:
      return { success: false, error: `Unknown action type: ${(action as SlotAction).type}` };
  }
}

// ── Main Trigger Processor ───────────────────────────────────────────────────

/**
 * Process a slot trigger event.
 *
 * Finds all enabled policies matching this trigger, checks guards
 * (idempotency, cooldown, conditions), executes actions, and records history.
 *
 * @returns Array of execution IDs
 */
export async function processSlotTrigger(
  orgId: string,
  triggerType: SlotTriggerType,
  eventData: Record<string, unknown>,
  eventId: string,
  depth = 0,
): Promise<string[]> {
  // Anti-loop protection
  if (depth >= MAX_SLOT_DEPTH) {
    console.warn(`[slots] Max depth ${MAX_SLOT_DEPTH} reached, skipping trigger ${triggerType}`);
    return [];
  }

  const policies = await getEnabledPoliciesForTrigger(orgId, triggerType);
  const executionIds: string[] = [];

  for (const policy of policies) {
    const startTime = new Date();
    const idempKey = `slot:${policy.id}:${eventId}`;

    try {
      // 1. Trigger-level filter expression
      if (policy.trigger.filterExpression) {
        if (!evaluateFilterExpression(policy.trigger.filterExpression, eventData)) continue;
      }

      // 2. Idempotency check
      if (!(await checkIdempotency(policy.id, eventId))) {
        const endTime = new Date();
        const execId = await recordSlotExecution({
          policyId: policy.id,
          policyName: policy.name,
          slotId: policy.slotId,
          orgId,
          idempotencyKey: idempKey,
          triggerType,
          triggerEvent: eventData,
          status: "skipped",
          actionType: policy.action.type,
          error: "Duplicate event (idempotency)",
          retryCount: 0,
          maxRetries: policy.retryPolicy?.maxRetries ?? 0,
          startTime,
          endTime,
          testRun: false,
          triggeredBy: "system",
        });
        executionIds.push(execId);
        continue;
      }

      // 3. Cooldown check
      if (!(await checkCooldown(policy))) continue;

      // 4. Evaluate conditions
      if (!evaluateConditions(policy.conditions, eventData)) continue;

      // 5. Execute action
      const context: ExecutionContext = {
        orgId,
        slotId: policy.slotId,
        policyId: policy.id,
        triggerType,
        triggerEvent: eventData,
        eventId,
        testRun: false,
        _slotDepth: depth,
      };

      const result = await executeAction(policy.action, context);
      const endTime = new Date();

      // 6. Record execution
      const execId = await recordSlotExecution({
        policyId: policy.id,
        policyName: policy.name,
        slotId: policy.slotId,
        orgId,
        idempotencyKey: idempKey,
        triggerType,
        triggerEvent: eventData,
        status: result.success ? "success" : "failure",
        actionType: policy.action.type,
        actionResult: result.output,
        error: result.error,
        retryCount: 0,
        maxRetries: policy.retryPolicy?.maxRetries ?? 0,
        startTime,
        endTime,
        testRun: false,
        triggeredBy: "system",
      });
      executionIds.push(execId);

      // 7. Update policy stats
      await updateDoc(doc(db, "slotPolicies", policy.id), {
        executionCount: (policy.executionCount ?? 0) + 1,
        lastExecutedAt: serverTimestamp(),
        lastExecutionStatus: result.success ? "success" : "failure",
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(`[slots] Execution failed for policy ${policy.id}:`, err);
      const endTime = new Date();
      const execId = await recordSlotExecution({
        policyId: policy.id,
        policyName: policy.name,
        slotId: policy.slotId,
        orgId,
        idempotencyKey: idempKey,
        triggerType,
        triggerEvent: eventData,
        status: "failure",
        actionType: policy.action.type,
        error: err instanceof Error ? err.message : "Unknown error",
        retryCount: 0,
        maxRetries: policy.retryPolicy?.maxRetries ?? 0,
        startTime,
        endTime,
        testRun: false,
        triggeredBy: "system",
      });
      executionIds.push(execId);
    }
  }

  return executionIds;
}

// ── Test / Dry-Run ───────────────────────────────────────────────────────────

/**
 * Dry-run a slot policy with optional mock event data.
 */
export async function testSlotPolicy(
  policyId: string,
  mockEventData?: Record<string, unknown>,
): Promise<{
  conditionsPassed: boolean;
  actionResult: ActionResult;
  executionId: string;
}> {
  const policy = await getSlotPolicy(policyId);
  if (!policy) throw new Error("Slot policy not found");

  const eventData = mockEventData || {};
  const startTime = new Date();

  // Evaluate conditions
  const conditionsPassed = evaluateConditions(policy.conditions, eventData);

  let actionResult: ActionResult;
  if (conditionsPassed) {
    const context: ExecutionContext = {
      orgId: policy.orgId,
      slotId: policy.slotId,
      policyId: policy.id,
      triggerType: policy.trigger.type,
      triggerEvent: eventData,
      eventId: `test:${Date.now()}`,
      testRun: true,
    };
    actionResult = await executeAction(policy.action, context);
  } else {
    actionResult = {
      success: false,
      error: "Conditions not met (dry-run skipped action)",
    };
  }

  const endTime = new Date();

  const executionId = await recordSlotExecution({
    policyId: policy.id,
    policyName: policy.name,
    slotId: policy.slotId,
    orgId: policy.orgId,
    idempotencyKey: `test:${policyId}:${Date.now()}`,
    triggerType: policy.trigger.type,
    triggerEvent: eventData,
    status: conditionsPassed && actionResult.success ? "success" : "skipped",
    actionType: policy.action.type,
    actionResult: actionResult.output,
    error: actionResult.error,
    retryCount: 0,
    maxRetries: 0,
    startTime,
    endTime,
    testRun: true,
    triggeredBy: "test",
  });

  return { conditionsPassed, actionResult, executionId };
}

// ── Retry ────────────────────────────────────────────────────────────────────

/**
 * Retry a failed execution.
 */
export async function retryExecution(executionId: string): Promise<ActionResult> {
  const execution = await getSlotExecution(executionId);
  if (!execution) throw new Error("Execution not found");
  if (execution.status !== "failure") throw new Error("Only failed executions can be retried");

  const policy = await getSlotPolicy(execution.policyId);
  if (!policy) throw new Error("Policy not found");

  const maxRetries = policy.retryPolicy?.maxRetries ?? 0;
  if (execution.retryCount >= maxRetries) {
    throw new Error(`Max retries (${maxRetries}) reached`);
  }

  const startTime = new Date();
  const context: ExecutionContext = {
    orgId: execution.orgId,
    slotId: execution.slotId,
    policyId: execution.policyId,
    triggerType: execution.triggerType,
    triggerEvent: execution.triggerEvent || {},
    eventId: `retry:${executionId}:${execution.retryCount + 1}`,
    testRun: false,
  };

  const result = await executeAction(policy.action, context);
  const endTime = new Date();

  await recordSlotExecution({
    policyId: execution.policyId,
    policyName: execution.policyName,
    slotId: execution.slotId,
    orgId: execution.orgId,
    idempotencyKey: `retry:${executionId}:${execution.retryCount + 1}`,
    triggerType: execution.triggerType,
    triggerEvent: execution.triggerEvent,
    status: result.success ? "success" : "failure",
    actionType: execution.actionType,
    actionResult: result.output,
    error: result.error,
    retryCount: execution.retryCount + 1,
    maxRetries,
    startTime,
    endTime,
    testRun: false,
    triggeredBy: "retry",
  });

  return result;
}
