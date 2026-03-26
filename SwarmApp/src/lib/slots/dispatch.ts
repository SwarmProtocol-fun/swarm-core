/**
 * Slot Event Dispatch — Bridge between system events and slot triggers.
 *
 * Maps ActivityEventType to SlotTriggerType and fires slot processing
 * as a non-blocking side effect.
 */

import type { SlotTriggerType } from "./types";
import type { ActivityEventType } from "@/lib/activity";

// ── Event mapping ────────────────────────────────────────────────────────────

const ACTIVITY_TO_SLOT_TRIGGER: Partial<Record<ActivityEventType, SlotTriggerType>> = {
  "task.created": "task_created",
  "task.completed": "job_completed",
  "task.failed": "job_completed",
  "job.dispatched": "job_completed",
  "job.completed": "job_completed",
  "agent.connected": "agent_connected",
  "agent.disconnected": "agent_disconnected",
};

// ── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Dispatch a slot event. Fire-and-forget — errors are logged, never thrown.
 *
 * @param orgId - Organization ID
 * @param triggerType - The slot trigger type
 * @param eventData - Payload data from the event
 * @param eventId - Unique event ID for idempotency
 * @param depth - Current slot depth (for anti-loop protection)
 */
export async function dispatchSlotEvent(
  orgId: string,
  triggerType: SlotTriggerType,
  eventData: Record<string, unknown>,
  eventId: string,
  depth = 0,
): Promise<void> {
  try {
    // Dynamic import to avoid circular dependencies
    const { processSlotTrigger } = await import("./engine");
    await processSlotTrigger(orgId, triggerType, eventData, eventId, depth);
  } catch (err) {
    console.error("[slots:dispatch] Failed to dispatch slot event:", err);
  }
}

/**
 * Check if an activity event type should trigger slot automation,
 * and dispatch if so.
 *
 * Designed to be called from activity logging callsites as a fire-and-forget
 * side effect.
 */
export function maybeDispatchSlotEvent(
  eventType: ActivityEventType,
  orgId: string,
  eventData: Record<string, unknown>,
  eventId: string,
): void {
  const triggerType = ACTIVITY_TO_SLOT_TRIGGER[eventType];
  if (!triggerType) return;

  // Fire-and-forget
  dispatchSlotEvent(orgId, triggerType, eventData, eventId).catch((err) =>
    console.error("[slots:dispatch] Background dispatch failed:", err),
  );
}
