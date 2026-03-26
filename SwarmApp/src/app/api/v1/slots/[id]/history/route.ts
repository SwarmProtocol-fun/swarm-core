/**
 * GET /api/v1/slots/[id]/history — Execution history for a slot policy
 */

import { NextRequest } from "next/server";
import { requireOrgMember } from "@/lib/auth-guard";
import { rateLimit } from "@/app/api/v1/rate-limit";
import { getSlotPolicy } from "@/lib/slots/policies";
import { getSlotExecutionHistory, calculateSlotStats } from "@/lib/slots/executions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const limited = await rateLimit(`slots-history:${ip}`);
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

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam || "50", 10) || 50, 1), 500);

  const history = await getSlotExecutionHistory(id, limit);
  const stats = calculateSlotStats(history);

  return Response.json({
    ok: true,
    policyId: id,
    history,
    stats,
    count: history.length,
  });
}
