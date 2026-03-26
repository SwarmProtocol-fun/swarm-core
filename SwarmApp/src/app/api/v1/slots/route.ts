/**
 * GET  /api/v1/slots  — List slot policies for an org
 * POST /api/v1/slots  — Create a new slot policy
 */

import { NextRequest } from "next/server";
import { getWalletAddress, requireOrgMember } from "@/lib/auth-guard";
import { rateLimit } from "@/app/api/v1/rate-limit";
import { createSlotPolicy, getSlotPolicies } from "@/lib/slots/policies";
import type { SlotPolicyCreateInput } from "@/lib/slots/types";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const limited = await rateLimit(`slots:${ip}`);
  if (limited) return limited;

  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return Response.json({ error: "orgId is required" }, { status: 400 });
  }

  const auth = await requireOrgMember(req, orgId);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status || 403 });
  }

  const slotId = req.nextUrl.searchParams.get("slotId") || undefined;
  const policies = await getSlotPolicies(orgId, slotId);

  return Response.json({ ok: true, policies, count: policies.length });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const limited = await rateLimit(`slots:${ip}`);
  if (limited) return limited;

  const wallet = getWalletAddress(req);
  if (!wallet) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orgId, slotId, name, trigger, action } = body as Record<string, unknown>;

  if (!orgId || !slotId || !name || !trigger || !action) {
    return Response.json(
      { error: "orgId, slotId, name, trigger, and action are required" },
      { status: 400 },
    );
  }

  const auth = await requireOrgMember(req, orgId as string);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const input: SlotPolicyCreateInput = {
      orgId: orgId as string,
      slotId: slotId as string,
      name: name as string,
      description: (body.description as string) || undefined,
      trigger: trigger as SlotPolicyCreateInput["trigger"],
      conditions: (body.conditions as SlotPolicyCreateInput["conditions"]) || undefined,
      action: action as SlotPolicyCreateInput["action"],
      retryPolicy: (body.retryPolicy as SlotPolicyCreateInput["retryPolicy"]) || undefined,
      enabled: (body.enabled as boolean) ?? true,
      cooldownMs: (body.cooldownMs as number) ?? 0,
      maxConcurrent: (body.maxConcurrent as number) ?? 0,
      priority: (body.priority as number) ?? 0,
      createdBy: wallet,
    };

    const id = await createSlotPolicy(input);
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    console.error("[slots] Create policy error:", err);
    return Response.json({ error: "Failed to create slot policy" }, { status: 500 });
  }
}
