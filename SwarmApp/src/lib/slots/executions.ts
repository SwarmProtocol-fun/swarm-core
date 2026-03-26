/**
 * Slot Executions — Firestore CRUD for execution history.
 *
 * Collection: `slotExecutions`
 * Pattern follows cron-history.ts for consistency.
 */

import {
  collection,
  doc,
  getDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  SlotExecution,
  SlotExecutionStatus,
  SlotExecutionStats,
  SlotTriggerType,
  SlotActionType,
} from "./types";

const COLLECTION = "slotExecutions";

// ─��� Record ───────────���───────────────────────────────────���───────────────────

export async function recordSlotExecution(params: {
  policyId: string;
  policyName: string;
  slotId: string;
  orgId: string;
  idempotencyKey: string;
  triggerType: SlotTriggerType;
  triggerEvent?: Record<string, unknown>;
  status: SlotExecutionStatus;
  actionType: SlotActionType;
  actionResult?: unknown;
  error?: string;
  retryCount: number;
  maxRetries: number;
  startTime: Date;
  endTime: Date;
  testRun: boolean;
  triggeredBy: string;
}): Promise<string> {
  const durationMs = params.endTime.getTime() - params.startTime.getTime();

  const ref = await addDoc(collection(db, COLLECTION), {
    policyId: params.policyId,
    policyName: params.policyName,
    slotId: params.slotId,
    orgId: params.orgId,
    idempotencyKey: params.idempotencyKey,
    triggerType: params.triggerType,
    triggerEvent: params.triggerEvent || null,
    status: params.status,
    actionType: params.actionType,
    actionResult: params.actionResult || null,
    error: params.error || null,
    retryCount: params.retryCount,
    maxRetries: params.maxRetries,
    startTime: Timestamp.fromDate(params.startTime),
    endTime: Timestamp.fromDate(params.endTime),
    durationMs,
    testRun: params.testRun,
    triggeredBy: params.triggeredBy,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

// ── Retrieval ─────────────��──────────────────────────────────────────────────

export async function getSlotExecution(id: string): Promise<SlotExecution | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToExecution(snap);
}

export async function getSlotExecutionHistory(
  policyId: string,
  limit = 50,
): Promise<SlotExecution[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where("policyId", "==", policyId),
      orderBy("startTime", "desc"),
      firestoreLimit(limit),
    );
    const snap = await getDocs(q);
    return snap.docs.map(docToExecution);
  } catch {
    const q = query(
      collection(db, COLLECTION),
      where("policyId", "==", policyId),
      firestoreLimit(limit),
    );
    const snap = await getDocs(q);
    return snap.docs.map(docToExecution);
  }
}

export async function getSlotExecutionsBySlot(
  slotId: string,
  orgId: string,
  limit = 50,
): Promise<SlotExecution[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where("slotId", "==", slotId),
      where("orgId", "==", orgId),
      orderBy("startTime", "desc"),
      firestoreLimit(limit),
    );
    const snap = await getDocs(q);
    return snap.docs.map(docToExecution);
  } catch {
    const q = query(
      collection(db, COLLECTION),
      where("slotId", "==", slotId),
      where("orgId", "==", orgId),
      firestoreLimit(limit),
    );
    const snap = await getDocs(q);
    return snap.docs.map(docToExecution);
  }
}

export async function getAllSlotExecutions(
  orgId: string,
  limit = 100,
): Promise<SlotExecution[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where("orgId", "==", orgId),
      orderBy("startTime", "desc"),
      firestoreLimit(limit),
    );
    const snap = await getDocs(q);
    return snap.docs.map(docToExecution);
  } catch {
    const q = query(
      collection(db, COLLECTION),
      where("orgId", "==", orgId),
      firestoreLimit(limit),
    );
    const snap = await getDocs(q);
    return snap.docs.map(docToExecution);
  }
}

// ── Statistics ────────────────────────────────────────��──────────────────────

export function calculateSlotStats(history: SlotExecution[]): SlotExecutionStats {
  if (history.length === 0) {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      skippedExecutions: 0,
      successRate: 0,
      avgDurationMs: 0,
      lastExecution: null,
      lastSuccess: null,
      lastFailure: null,
    };
  }

  const successful = history.filter((h) => h.status === "success").length;
  const failed = history.filter((h) => h.status === "failure").length;
  const skipped = history.filter((h) => h.status === "skipped").length;
  const totalDuration = history.reduce((sum, h) => sum + h.durationMs, 0);

  return {
    totalExecutions: history.length,
    successfulExecutions: successful,
    failedExecutions: failed,
    skippedExecutions: skipped,
    successRate: history.length > 0 ? (successful / history.length) * 100 : 0,
    avgDurationMs: history.length > 0 ? totalDuration / history.length : 0,
    lastExecution: history[0]?.startTime || null,
    lastSuccess: history.find((h) => h.status === "success")?.startTime || null,
    lastFailure: history.find((h) => h.status === "failure")?.startTime || null,
  };
}

// ── Document mapper ────────────────────────────────���─────────────────────────

function docToExecution(d: { id: string; data: () => Record<string, unknown> }): SlotExecution {
  const data = d.data();
  return {
    id: d.id,
    policyId: data.policyId as string,
    policyName: data.policyName as string,
    slotId: data.slotId as string,
    orgId: data.orgId as string,
    idempotencyKey: data.idempotencyKey as string,
    triggerType: data.triggerType as SlotExecution["triggerType"],
    triggerEvent: data.triggerEvent as Record<string, unknown> | undefined,
    status: data.status as SlotExecution["status"],
    actionType: data.actionType as SlotExecution["actionType"],
    actionResult: data.actionResult,
    error: data.error as string | undefined,
    retryCount: (data.retryCount as number) ?? 0,
    maxRetries: (data.maxRetries as number) ?? 0,
    startTime: data.startTime instanceof Timestamp ? data.startTime.toDate() : null,
    endTime: data.endTime instanceof Timestamp ? data.endTime.toDate() : null,
    durationMs: (data.durationMs as number) ?? 0,
    testRun: (data.testRun as boolean) ?? false,
    triggeredBy: data.triggeredBy as string,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
  };
}
