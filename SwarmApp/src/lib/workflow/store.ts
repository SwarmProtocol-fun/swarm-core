/**
 * Workflow Engine — Firestore persistence.
 *
 * Collections:
 *   workflowDefinitions — reusable DAG definitions
 *   workflowRuns         — execution instances
 */

import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
} from "firebase/firestore";
import type {
  WorkflowDefinition,
  WorkflowRun,
  RunStatus,
  NodeRunState,
  StepLog,
} from "./types";

// ── Collections ──────────────────────────────────────────────────────────────

const DEFINITIONS = "workflowDefinitions";
const RUNS = "workflowRuns";
const STEP_LOGS = "workflowStepLogs";

// ── Workflow Definitions ─────────────────────────────────────────────────────

export async function createWorkflowDefinition(
  data: Omit<WorkflowDefinition, "id" | "createdAt" | "updatedAt" | "version">,
): Promise<string> {
  const ref = await addDoc(collection(db, DEFINITIONS), {
    ...data,
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getWorkflowDefinition(
  id: string,
): Promise<WorkflowDefinition | null> {
  const snap = await getDoc(doc(db, DEFINITIONS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WorkflowDefinition;
}

export async function updateWorkflowDefinition(
  id: string,
  data: Partial<
    Pick<
      WorkflowDefinition,
      "name" | "description" | "nodes" | "edges" | "enabled"
    >
  >,
): Promise<void> {
  const current = await getDoc(doc(db, DEFINITIONS, id));
  if (!current.exists()) throw new Error("Workflow not found");

  await updateDoc(doc(db, DEFINITIONS, id), {
    ...data,
    version: (current.data().version || 0) + 1,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteWorkflowDefinition(id: string): Promise<void> {
  await deleteDoc(doc(db, DEFINITIONS, id));
}

export async function getOrgWorkflows(
  orgId: string,
  max = 50,
): Promise<WorkflowDefinition[]> {
  const q = query(
    collection(db, DEFINITIONS),
    where("orgId", "==", orgId),
    orderBy("updatedAt", "desc"),
    firestoreLimit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorkflowDefinition);
}

// ── Workflow Runs ────────────────────────────────────────────────────────────

export async function createWorkflowRun(
  data: Omit<WorkflowRun, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, RUNS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getWorkflowRun(
  id: string,
): Promise<WorkflowRun | null> {
  const snap = await getDoc(doc(db, RUNS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WorkflowRun;
}

export async function updateWorkflowRun(
  id: string,
  data: Partial<
    Pick<
      WorkflowRun,
      "status" | "nodeStates" | "outputs" | "progress" | "error" | "completedAt"
    >
  >,
): Promise<void> {
  await updateDoc(doc(db, RUNS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getOrgRuns(
  orgId: string,
  status?: RunStatus,
  max = 50,
): Promise<WorkflowRun[]> {
  const constraints = [
    where("orgId", "==", orgId),
    ...(status ? [where("status", "==", status)] : []),
    orderBy("createdAt", "desc"),
    firestoreLimit(max),
  ];
  const q = query(collection(db, RUNS), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorkflowRun);
}

export async function getWorkflowRuns(
  workflowId: string,
  max = 20,
): Promise<WorkflowRun[]> {
  const q = query(
    collection(db, RUNS),
    where("workflowId", "==", workflowId),
    orderBy("createdAt", "desc"),
    firestoreLimit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorkflowRun);
}

export async function getActiveRuns(orgId: string): Promise<WorkflowRun[]> {
  const q = query(
    collection(db, RUNS),
    where("orgId", "==", orgId),
    where("status", "in", ["pending", "running"]),
    firestoreLimit(100),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorkflowRun);
}

/**
 * Get all running/pending workflow runs globally (cross-org).
 * Used by the autonomous tick handler to advance workflows server-side.
 */
export async function getGlobalActiveRuns(max = 50): Promise<WorkflowRun[]> {
  const q = query(
    collection(db, RUNS),
    where("status", "in", ["pending", "running"]),
    orderBy("updatedAt", "asc"), // oldest first = fairness
    firestoreLimit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorkflowRun);
}

/**
 * Count active (running/pending) runs for a specific workflow definition.
 * Used by trigger system to enforce maxConcurrentRuns.
 */
export async function getWorkflowActiveRunCount(workflowId: string): Promise<number> {
  const q = query(
    collection(db, RUNS),
    where("workflowId", "==", workflowId),
    where("status", "in", ["pending", "running"]),
    firestoreLimit(100),
  );
  const snap = await getDocs(q);
  return snap.size;
}

/** Update a single node's state within a run */
export async function updateNodeState(
  runId: string,
  nodeId: string,
  state: Partial<NodeRunState>,
): Promise<void> {
  const run = await getWorkflowRun(runId);
  if (!run) throw new Error("Run not found");

  const nodeStates = { ...run.nodeStates };
  nodeStates[nodeId] = { ...nodeStates[nodeId], ...state };

  await updateDoc(doc(db, RUNS, runId), {
    nodeStates,
    updatedAt: serverTimestamp(),
  });
}

// ── Step Logs ─────────────────────────────────────────────────────────────────

export async function addStepLog(
  log: Omit<StepLog, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db, STEP_LOGS), log);
  return ref.id;
}

export async function getStepLogs(
  runId: string,
  nodeId?: string,
  max = 200,
): Promise<StepLog[]> {
  const constraints = [
    where("runId", "==", runId),
    ...(nodeId ? [where("nodeId", "==", nodeId)] : []),
    orderBy("timestamp", "asc"),
    firestoreLimit(max),
  ];
  const q = query(collection(db, STEP_LOGS), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StepLog);
}
