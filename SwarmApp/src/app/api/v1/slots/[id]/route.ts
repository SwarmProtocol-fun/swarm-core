/**
 * GET    /api/v1/slots/[id]  — Get a single slot policy
 * PATCH  /api/v1/slots/[id]  — Update a slot policy
 * DELETE /api/v1/slots/[id]  — Delete a slot policy
 */

import { NextRequest } from "next/server";
import { getWalletAddress, requireOrgMember } from "@/lib/auth-guard";
import { rateLimit } from "@/app/api/v1/rate-limit";
import { getSlotPolicy, updateSlotPolicy, deleteSlotPolicy } from "@/lib/slots/policies";
import type { SlotPolicyUpdateInput } from "@/lib/slots/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const limited = await rateLimit(`slots:${ip}`);
  if (limited) return limited;

  const { id } = await params;
  const policy = await getSlotPolicy(id);
  if (!policy) {
    return Response.json({ error: "Slot policy not found" }, { status: 404 });
  }

  const auth = await requireOrgMember(req, policy.orgId);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status || 403 });
  }

  return Response.json({ ok: true, policy });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const limited = await rateLimit(`slots:${ip}`);
  if (limited) return limited;

  const wallet = getWalletAddress(req);
  if (!wallet) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const policy = await getSlotPolicy(id);
  if (!policy) {
    return Response.json({ error: "Slot policy not found" }, { status: 404 });
  }

  const auth = await requireOrgMember(req, policy.orgId);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status || 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const update: SlotPolicyUpdateInput = {};
    if (body.name !== undefined) update.name = body.name as string;
    if (body.description !== undefined) update.description = body.description as string;
    if (body.trigger !== undefined) update.trigger = body.trigger as SlotPolicyUpdateInput["trigger"];
    if (body.conditions !== undefined) update.conditions = body.conditions as SlotPolicyUpdateInput["conditions"];
    if (body.action !== undefined) update.action = body.action as SlotPolicyUpdateInput["action"];
    if (body.retryPolicy !== undefined) update.retryPolicy = body.retryPolicy as SlotPolicyUpdateInput["retryPolicy"];
    if (body.enabled !== undefined) update.enabled = body.enabled as boolean;
    if (body.cooldownMs !== undefined) update.cooldownMs = body.cooldownMs as number;
    if (body.maxConcurrent !== undefined) update.maxConcurrent = body.maxConcurrent as number;
    if (body.priority !== undefined) update.priority = body.priority as number;

    await updateSlotPolicy(id, update);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[slots] Update policy error:", err);
    return Response.json({ error: "Failed to update slot policy" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const limited = await rateLimit(`slots:${ip}`);
  if (limited) return limited;

  const wallet = getWalletAddress(req);
  if (!wallet) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const policy = await getSlotPolicy(id);
  if (!policy) {
    return Response.json({ error: "Slot policy not found" }, { status: 404 });
  }

  const auth = await requireOrgMember(req, policy.orgId);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    await deleteSlotPolicy(id);
    return Response.json({ ok: true, deleted: id });
  } catch (err) {
    console.error("[slots] Delete policy error:", err);
    return Response.json({ error: "Failed to delete slot policy" }, { status: 500 });
  }
}
