/**
 * Generation Jobs — Firestore-backed job queue for asset generation.
 *
 * Replaces the scattered pipeline Firestore collections:
 *   agentAvatars (task docs)   → generationJobs
 *   officeFurniture (task docs) → generationJobs
 *   officeTextures (task docs)  → generationJobs
 *
 * Jobs are created by mods, executed by plugins, and produce assets
 * stored in the unified asset registry.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GenerationJob, JobStatus, AssetKind, AssetPurpose, JobStep } from "./types";

const COLLECTION = "generationJobs";

/* ═══════════════════════════════════════
   Helpers
   ═══════════════════════════════════════ */

function toJob(id: string, data: Record<string, unknown>): GenerationJob {
  return {
    id,
    pluginId: (data.pluginId as string) || "",
    assetKind: data.assetKind as AssetKind,
    assetPurpose: data.assetPurpose as AssetPurpose,
    category: (data.category as string) || "",
    orgId: (data.orgId as string) || "",
    agentId: data.agentId as string | undefined,
    themeId: data.themeId as string | undefined,
    prompt: (data.prompt as string) || "",
    config: data.config as Record<string, unknown> | undefined,
    status: (data.status as JobStatus) || "pending",
    steps: (data.steps as JobStep[]) || [],
    currentStep: (data.currentStep as number) || 0,
    progress: (data.progress as number) || 0,
    assetId: data.assetId as string | undefined,
    error: data.error as string | undefined,
    requestedBy: (data.requestedBy as string) || "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    completedAt: data.completedAt,
  };
}

/* ═══════════════════════════════════════
   CRUD
   ═══════════════════════════════════════ */

/** Create a new generation job */
export async function createJob(
  job: Omit<GenerationJob, "id" | "createdAt" | "updatedAt" | "completedAt">,
): Promise<string> {
  const ref = doc(collection(db, COLLECTION));
  await setDoc(ref, {
    ...job,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Get a job by ID */
export async function getJob(id: string): Promise<GenerationJob | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return toJob(snap.id, snap.data());
}

/** Update a job (typically after advancing a step) */
export async function updateJob(
  id: string,
  updates: Partial<Omit<GenerationJob, "id" | "createdAt">>,
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await setDoc(ref, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
}

/* ═══════════════════════════════════════
   Queries
   ═══════════════════════════════════════ */

/** Find an active (non-terminal) job for the same slot to prevent duplicates */
export async function getActiveJob(
  orgId: string,
  pluginId: string,
  assetPurpose: AssetPurpose,
  category: string,
  themeId?: string,
  agentId?: string,
): Promise<GenerationJob | null> {
  const constraints = [
    where("orgId", "==", orgId),
    where("pluginId", "==", pluginId),
    where("assetPurpose", "==", assetPurpose),
    where("category", "==", category),
    where("status", "in", ["pending", "running", "uploading"]),
  ];
  if (themeId) constraints.push(where("themeId", "==", themeId));
  if (agentId) constraints.push(where("agentId", "==", agentId));

  const q = query(collection(db, COLLECTION), ...constraints, limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toJob(snap.docs[0].id, snap.docs[0].data());
}

/** Get all jobs for an org, optionally filtered */
export async function getOrgJobs(
  orgId: string,
  filters?: {
    pluginId?: string;
    status?: JobStatus | JobStatus[];
    assetPurpose?: AssetPurpose;
    themeId?: string;
  },
): Promise<GenerationJob[]> {
  const constraints = [where("orgId", "==", orgId)];

  if (filters?.pluginId) constraints.push(where("pluginId", "==", filters.pluginId));
  if (filters?.assetPurpose) constraints.push(where("assetPurpose", "==", filters.assetPurpose));
  if (filters?.themeId) constraints.push(where("themeId", "==", filters.themeId));

  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    constraints.push(where("status", "in", statuses));
  }

  const q = query(collection(db, COLLECTION), ...constraints, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toJob(d.id, d.data()));
}

/** Get recent jobs for batch progress tracking */
export async function getBatchJobs(jobIds: string[]): Promise<GenerationJob[]> {
  if (jobIds.length === 0) return [];
  // Firestore 'in' queries support max 30 items
  const results: GenerationJob[] = [];
  for (let i = 0; i < jobIds.length; i += 30) {
    const chunk = jobIds.slice(i, i + 30);
    const q = query(
      collection(db, COLLECTION),
      where("__name__", "in", chunk.map((id) => doc(db, COLLECTION, id))),
    );
    const snap = await getDocs(q);
    results.push(...snap.docs.map((d) => toJob(d.id, d.data())));
  }
  return results;
}
