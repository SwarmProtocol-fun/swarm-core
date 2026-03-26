/**
 * Slot Policies — Firestore CRUD.
 *
 * Collection: `slotPolicies`
 * Pattern follows cron.ts for consistency.
 */

import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  SlotPolicy,
  SlotPolicyCreateInput,
  SlotPolicyUpdateInput,
  SlotTriggerType,
} from "./types";

const COLLECTION = "slotPolicies";

// ── Create ─────────────��────────────────────────���────────────────────────────

export async function createSlotPolicy(input: SlotPolicyCreateInput): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    orgId: input.orgId,
    slotId: input.slotId,
    name: input.name,
    description: input.description || null,
    trigger: input.trigger,
    conditions: input.conditions || null,
    action: input.action,
    retryPolicy: input.retryPolicy || null,
    enabled: input.enabled ?? true,
    cooldownMs: input.cooldownMs ?? 0,
    maxConcurrent: input.maxConcurrent ?? 0,
    priority: input.priority ?? 0,
    executionCount: 0,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// ── Read ────────��───────────────────────────────────���────────────────────────

export async function getSlotPolicy(id: string): Promise<SlotPolicy | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToPolicy(snap);
}

export async function getSlotPolicies(
  orgId: string,
  slotId?: string,
): Promise<SlotPolicy[]> {
  try {
    const constraints = [
      where("orgId", "==", orgId),
      ...(slotId ? [where("slotId", "==", slotId)] : []),
      orderBy("priority", "desc"),
    ];
    const q = query(collection(db, COLLECTION), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(docToPolicy);
  } catch {
    // Composite index fallback — unordered
    const constraints = [
      where("orgId", "==", orgId),
      ...(slotId ? [where("slotId", "==", slotId)] : []),
    ];
    const q = query(collection(db, COLLECTION), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(docToPolicy).sort((a, b) => b.priority - a.priority);
  }
}

export async function getEnabledPoliciesForTrigger(
  orgId: string,
  triggerType: SlotTriggerType,
): Promise<SlotPolicy[]> {
  const q = query(
    collection(db, COLLECTION),
    where("orgId", "==", orgId),
    where("enabled", "==", true),
  );
  const snap = await getDocs(q);

  // Filter by trigger type in-memory (nested field queries not reliable)
  return snap.docs
    .map(docToPolicy)
    .filter((p) => p.trigger.type === triggerType)
    .sort((a, b) => b.priority - a.priority);
}

// ── Update ─────────────��─────────────────────────────────────────────────────

export async function updateSlotPolicy(
  id: string,
  input: SlotPolicyUpdateInput,
): Promise<void> {
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.trigger !== undefined) data.trigger = input.trigger;
  if (input.conditions !== undefined) data.conditions = input.conditions;
  if (input.action !== undefined) data.action = input.action;
  if (input.retryPolicy !== undefined) data.retryPolicy = input.retryPolicy;
  if (input.enabled !== undefined) data.enabled = input.enabled;
  if (input.cooldownMs !== undefined) data.cooldownMs = input.cooldownMs;
  if (input.maxConcurrent !== undefined) data.maxConcurrent = input.maxConcurrent;
  if (input.priority !== undefined) data.priority = input.priority;

  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function toggleSlotPolicy(id: string, enabled: boolean): Promise<void> {
  await updateSlotPolicy(id, { enabled });
}

// ── Delete ───���───────────────────────────────────��───────────────────────────

export async function deleteSlotPolicy(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

// ── Stats Update (called by engine after execution) ──────────────────────────

export async function updatePolicyStats(
  id: string,
  status: "success" | "failure" | "skipped",
): Promise<void> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return;
  const current = snap.data();
  await updateDoc(doc(db, COLLECTION, id), {
    executionCount: (current.executionCount ?? 0) + 1,
    lastExecutedAt: serverTimestamp(),
    lastExecutionStatus: status,
    updatedAt: serverTimestamp(),
  });
}

// ── Document mapper ──────────────────────────────────────────────────────────

function docToPolicy(d: { id: string; data: () => Record<string, unknown> }): SlotPolicy {
  const data = d.data();
  return {
    id: d.id,
    orgId: data.orgId as string,
    slotId: data.slotId as string,
    name: data.name as string,
    description: data.description as string | undefined,
    trigger: data.trigger as SlotPolicy["trigger"],
    conditions: data.conditions as SlotPolicy["conditions"],
    action: data.action as SlotPolicy["action"],
    retryPolicy: data.retryPolicy as SlotPolicy["retryPolicy"],
    enabled: (data.enabled as boolean) ?? true,
    cooldownMs: (data.cooldownMs as number) ?? 0,
    maxConcurrent: (data.maxConcurrent as number) ?? 0,
    priority: (data.priority as number) ?? 0,
    executionCount: (data.executionCount as number) ?? 0,
    lastExecutedAt: data.lastExecutedAt,
    lastExecutionStatus: data.lastExecutionStatus as SlotPolicy["lastExecutionStatus"],
    createdBy: data.createdBy as string,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
  };
}
