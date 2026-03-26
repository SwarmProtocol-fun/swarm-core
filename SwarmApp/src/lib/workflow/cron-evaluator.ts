/**
 * Cron Evaluator — Parses 5-field cron expressions and fires matching triggers.
 *
 * Called by the autonomous tick endpoint every ~30s. Idempotency keys ensure
 * per-minute granularity even if the evaluator runs multiple times per minute.
 *
 * 5-field format: minute hour dayOfMonth month dayOfWeek
 * Supports: *, N, N-M (ranges), N,M (lists), *​/N (steps)
 */

import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import type { TriggerPolicy, CronTriggerConfig } from "./triggers";
import { fireEvent } from "./triggers";

// ── Cron Expression Parser ───────────────────────────────────────────────────

/** Check if a single cron field matches a given value */
function fieldMatches(field: string, value: number, min: number, max: number): boolean {
  // Wildcard
  if (field === "*") return true;

  // Step: */N
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2), 10);
    if (isNaN(step) || step <= 0) return false;
    return (value - min) % step === 0;
  }

  // Comma-separated list: N,M,...
  const parts = field.split(",");
  for (const part of parts) {
    const trimmed = part.trim();

    // Range: N-M
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && value >= start && value <= end) {
        return true;
      }
      continue;
    }

    // Exact value
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num === value) return true;
  }

  return false;
}

/** Check if a 5-field cron expression matches a given Date */
export function cronMatchesNow(cronExpr: string, now: Date): boolean {
  const fields = cronExpr.trim().split(/\s+/);
  if (fields.length !== 5) return false;

  const [minuteField, hourField, domField, monthField, dowField] = fields;

  const minute = now.getMinutes();
  const hour = now.getHours();
  const dom = now.getDate();
  const month = now.getMonth() + 1; // 1-12
  const dow = now.getDay();          // 0=Sunday

  return (
    fieldMatches(minuteField, minute, 0, 59) &&
    fieldMatches(hourField, hour, 0, 23) &&
    fieldMatches(domField, dom, 1, 31) &&
    fieldMatches(monthField, month, 1, 12) &&
    fieldMatches(dowField, dow, 0, 6)
  );
}

// ── Trigger Evaluation ───────────────────────────────────────────────────────

const TRIGGER_POLICIES = "triggerPolicies";

/** Get all enabled cron trigger policies (cross-org). */
async function getEnabledCronPolicies(): Promise<TriggerPolicy[]> {
  const q = query(
    collection(db, TRIGGER_POLICIES),
    where("triggerType", "==", "cron"),
    where("enabled", "==", true),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TriggerPolicy);
}

/**
 * Evaluate all cron trigger policies and fire matching ones.
 *
 * The idempotency key includes the minute timestamp, so duplicate calls
 * within the same minute are safely deduped by the existing checkIdempotency()
 * in triggers.ts (Redis SET NX with 10-min TTL).
 */
export async function evaluateCronTriggers(): Promise<{
  evaluated: number;
  fired: number;
  errors: number;
}> {
  const now = new Date();
  let policies: TriggerPolicy[];

  try {
    policies = await getEnabledCronPolicies();
  } catch (err) {
    console.error("[cron] Failed to fetch cron policies:", err);
    return { evaluated: 0, fired: 0, errors: 1 };
  }

  let fired = 0;
  let errors = 0;

  for (const policy of policies) {
    const config = policy.config as CronTriggerConfig;
    if (!config.schedule) continue;

    if (!cronMatchesNow(config.schedule, now)) continue;

    // Minute-level event ID for idempotency
    const pad = (n: number) => String(n).padStart(2, "0");
    const minuteKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
    const eventId = `cron:${policy.id}:${minuteKey}`;

    try {
      await fireEvent(policy.orgId, "cron:tick", {
        schedule: config.schedule,
        firedAt: now.toISOString(),
        policyId: policy.id,
      }, eventId);
      fired++;
    } catch (err) {
      console.error(`[cron] Failed to fire trigger for policy ${policy.id}:`, err);
      errors++;
    }
  }

  return { evaluated: policies.length, fired, errors };
}
