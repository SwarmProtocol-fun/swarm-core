/**
 * POST /api/v1/slots/[id]/test — Dry-run a slot policy
 */

import { NextRequest } from "next/server";
import { requireOrgMember } from "@/lib/auth-guard";
import { rateLimit } from "@/app/api/v1/rate-limit";
import { getSlotPolicy } from "@/lib/slots/policies";
import { testSlotPolicy } from "@/lib/slots/engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const limited = await rateLimit(`slots-test:${ip}`);
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

  let mockEventData: Record<string, unknown> | undefined;
  try {
    const body = await req.json();
    mockEventData = body.mockEventData;
  } catch {
    // No body is fine — will use empty event data
  }

  try {
    const result = await testSlotPolicy(id, mockEventData);

    return Response.json({
      ok: true,
      testRun: true,
      policy: {
        id: policy.id,
        name: policy.name,
        slotId: policy.slotId,
        trigger: policy.trigger,
        action: policy.action,
      },
      simulation: {
        conditionsPassed: result.conditionsPassed,
        actionResult: result.actionResult,
        executionId: result.executionId,
      },
    });
  } catch (err) {
    console.error("[slots] Test policy error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Test failed" },
      { status: 500 },
    );
  }
}
