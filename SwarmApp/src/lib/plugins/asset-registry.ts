/**
 * Unified Asset Registry — Single Firestore collection for all generated assets.
 *
 * Replaces the scattered per-use-case collections:
 *   agentAvatars   → generatedAssets (kind: model-rigged | sprite-2d, purpose: avatar)
 *   officeFurniture → generatedAssets (kind: model-3d, purpose: furniture)
 *   officeTextures  → generatedAssets (kind: texture-2d, purpose: texture)
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
import type { GeneratedAsset, AssetKind, AssetPurpose } from "./types";

const COLLECTION = "generatedAssets";

/* ═══════════════════════════════════════
   Helpers
   ═══════════════════════════════════════ */

function toAsset(id: string, data: Record<string, unknown>): GeneratedAsset {
  return {
    id,
    kind: data.kind as AssetKind,
    purpose: data.purpose as AssetPurpose,
    category: (data.category as string) || "",
    orgId: (data.orgId as string) || "",
    agentId: data.agentId as string | undefined,
    themeId: data.themeId as string | undefined,
    pluginId: (data.pluginId as string) || "",
    jobId: (data.jobId as string) || "",
    url: (data.url as string) || "",
    storageCid: data.storageCid as string | undefined,
    mimeType: (data.mimeType as string) || "",
    sizeBytes: data.sizeBytes as number | undefined,
    prompt: data.prompt as string | undefined,
    providerMeta: data.providerMeta as Record<string, unknown> | undefined,
    requestedBy: (data.requestedBy as string) || "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/* ═══════════════════════════════════════
   CRUD
   ═══════════════════════════════════════ */

/** Create a new asset record, returns the generated ID */
export async function createAsset(
  asset: Omit<GeneratedAsset, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ref = doc(collection(db, COLLECTION));
  await setDoc(ref, {
    ...asset,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Get a single asset by ID */
export async function getAsset(id: string): Promise<GeneratedAsset | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return toAsset(snap.id, snap.data());
}

/** Update fields on an existing asset */
export async function updateAsset(
  id: string,
  updates: Partial<Omit<GeneratedAsset, "id" | "createdAt">>,
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await setDoc(ref, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
}

/* ═══════════════════════════════════════
   Queries
   ═══════════════════════════════════════ */

/** Get all assets for an org, optionally filtered by purpose, kind, theme */
export async function getOrgAssets(
  orgId: string,
  filters?: {
    purpose?: AssetPurpose;
    kind?: AssetKind;
    themeId?: string;
    category?: string;
  },
): Promise<GeneratedAsset[]> {
  const constraints = [where("orgId", "==", orgId)];

  if (filters?.purpose) constraints.push(where("purpose", "==", filters.purpose));
  if (filters?.kind) constraints.push(where("kind", "==", filters.kind));
  if (filters?.themeId) constraints.push(where("themeId", "==", filters.themeId));
  if (filters?.category) constraints.push(where("category", "==", filters.category));

  const q = query(collection(db, COLLECTION), ...constraints, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toAsset(d.id, d.data()));
}

/** Get the latest completed asset for a specific slot (org + purpose + category + optional theme) */
export async function getLatestAsset(
  orgId: string,
  purpose: AssetPurpose,
  category: string,
  themeId?: string,
): Promise<GeneratedAsset | null> {
  const constraints = [
    where("orgId", "==", orgId),
    where("purpose", "==", purpose),
    where("category", "==", category),
  ];
  if (themeId) constraints.push(where("themeId", "==", themeId));

  const q = query(
    collection(db, COLLECTION),
    ...constraints,
    orderBy("createdAt", "desc"),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toAsset(snap.docs[0].id, snap.docs[0].data());
}

/** Get all avatar assets for an agent (model + animations + sprite) */
export async function getAgentAvatarAssets(
  orgId: string,
  agentId: string,
): Promise<GeneratedAsset[]> {
  const q = query(
    collection(db, COLLECTION),
    where("orgId", "==", orgId),
    where("agentId", "==", agentId),
    where("purpose", "==", "avatar"),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toAsset(d.id, d.data()));
}

/** Batch get furniture assets for an org + theme, returns Map<category, asset> (latest per category) */
export async function getOrgFurnitureAssets(
  orgId: string,
  themeId: string,
): Promise<Map<string, GeneratedAsset>> {
  const assets = await getOrgAssets(orgId, { purpose: "furniture", themeId });
  const result = new Map<string, GeneratedAsset>();
  // Assets are sorted by createdAt desc, so first per category wins (latest)
  for (const asset of assets) {
    if (!result.has(asset.category)) {
      result.set(asset.category, asset);
    }
  }
  return result;
}

/** Batch get texture assets for an org + theme, returns Map<category, asset> */
export async function getOrgTextureAssets(
  orgId: string,
  themeId: string,
): Promise<Map<string, GeneratedAsset>> {
  const assets = await getOrgAssets(orgId, { purpose: "texture", themeId });
  const result = new Map<string, GeneratedAsset>();
  for (const asset of assets) {
    if (!result.has(asset.category)) {
      result.set(asset.category, asset);
    }
  }
  return result;
}

/** Batch get avatar assets for an org, returns Map<agentId, assets[]> */
export async function getOrgAvatarAssets(
  orgId: string,
): Promise<Map<string, GeneratedAsset[]>> {
  const assets = await getOrgAssets(orgId, { purpose: "avatar" });
  const result = new Map<string, GeneratedAsset[]>();
  for (const asset of assets) {
    if (!asset.agentId) continue;
    const list = result.get(asset.agentId) || [];
    list.push(asset);
    result.set(asset.agentId, list);
  }
  return result;
}
