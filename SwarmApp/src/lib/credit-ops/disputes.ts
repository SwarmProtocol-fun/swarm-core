/**
 * Credit Operations — Dispute Adjudication
 *
 * Multi-party disputes between agents/orgs regarding credit decisions.
 * Admins investigate, mediate, and adjudicate with binding actions.
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordCreditOpsAudit } from "./audit";
import type {
  CreditOpsDispute,
  DisputeType,
  DisputeStatus,
  DisputeAdjudication,
  ReviewPriority,
  ReviewHistoryEntry,
} from "./types";

const DISPUTE_COLLECTION = "creditOpsDisputes";

// ═══════════════════════════════════════════════════════════════
// File Dispute
// ═══════════════════════════════════════════════════════════════

/** File a new dispute. */
export async function fileDispute(params: {
  initiatorType: "agent" | "org";
  initiatorId: string;
  respondentType: "agent" | "org" | "platform";
  respondentId: string;
  disputeType: DisputeType;
  subject: string;
  description: string;
  evidence?: string[];
  relatedAgentIds: string[];
  relatedEventIds: string[];
}): Promise<string> {
  const dispute: Omit<CreditOpsDispute, "id" | "filedAt" | "lastUpdatedAt"> = {
    initiatorType: params.initiatorType,
    initiatorId: params.initiatorId,
    respondentType: params.respondentType,
    respondentId: params.respondentId,
    disputeType: params.disputeType,
    subject: params.subject,
    description: params.description,
    evidence: params.evidence || [],
    relatedAgentIds: params.relatedAgentIds,
    relatedEventIds: params.relatedEventIds,
    status: "filed",
    priority: "medium",
    reviewHistory: [],
  };

  const ref = await addDoc(collection(db, DISPUTE_COLLECTION), {
    ...dispute,
    filedAt: serverTimestamp(),
    lastUpdatedAt: serverTimestamp(),
  });

  await recordCreditOpsAudit({
    action: "dispute.filed",
    performedBy: params.initiatorId,
    targetType: "dispute",
    targetId: ref.id,
    metadata: {
      disputeType: params.disputeType,
      respondentId: params.respondentId,
    },
  });

  return ref.id;
}

// ═══════════════════════════════════════════════════════════════
// Query
// ═══════════════════════════════════════════════════════════════

/** Get a dispute by ID. */
export async function getDispute(disputeId: string): Promise<CreditOpsDispute | null> {
  const ref = doc(db, DISPUTE_COLLECTION, disputeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as CreditOpsDispute;
}

/** List disputes with filters. */
export async function listDisputes(opts: {
  status?: DisputeStatus;
  priority?: ReviewPriority;
  initiatorId?: string;
  limit?: number;
}): Promise<CreditOpsDispute[]> {
  const constraints: Parameters<typeof query>[1][] = [];

  if (opts.status) constraints.push(where("status", "==", opts.status));
  if (opts.priority) constraints.push(where("priority", "==", opts.priority));
  if (opts.initiatorId) constraints.push(where("initiatorId", "==", opts.initiatorId));

  constraints.push(orderBy("filedAt", "desc"));
  constraints.push(firestoreLimit(opts.limit || 50));

  const q = query(collection(db, DISPUTE_COLLECTION), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CreditOpsDispute[];
}

// ═══════════════════════════════════════════════════════════════
// Update
// ═══════════════════════════════════════════════════════════════

/** Update a dispute (assign, investigate, mediate, adjudicate, close). */
export async function updateDispute(
  disputeId: string,
  update: {
    action: "assign" | "investigate" | "mediate" | "adjudicate" | "close";
    performedBy: string;
    comment?: string;
    adjudication?: DisputeAdjudication;
  },
): Promise<void> {
  const ref = doc(db, DISPUTE_COLLECTION, disputeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Dispute not found");

  const current = snap.data();
  const reviewHistory: ReviewHistoryEntry[] = Array.isArray(current.reviewHistory)
    ? current.reviewHistory
    : [];

  reviewHistory.push({
    action: update.action,
    performedBy: update.performedBy,
    performedAt: new Date().toISOString(),
    comment: update.comment,
  });

  const updates: Record<string, unknown> = {
    reviewHistory,
    lastUpdatedAt: serverTimestamp(),
  };

  switch (update.action) {
    case "assign":
      updates.assignedTo = update.performedBy;
      break;
    case "investigate":
      updates.status = "investigating";
      break;
    case "mediate":
      updates.status = "mediation";
      break;
    case "adjudicate":
      updates.status = "adjudicated";
      updates.adjudication = update.adjudication;
      break;
    case "close":
      updates.status = "closed";
      updates.closedAt = serverTimestamp();
      break;
  }

  await updateDoc(ref, updates);

  await recordCreditOpsAudit({
    action: `dispute.${update.action}`,
    performedBy: update.performedBy,
    targetType: "dispute",
    targetId: disputeId,
    metadata: {
      newStatus: updates.status,
      comment: update.comment,
    },
  });
}
