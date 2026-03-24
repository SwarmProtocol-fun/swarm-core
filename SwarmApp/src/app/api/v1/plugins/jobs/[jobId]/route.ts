/**
 * GET /api/v1/plugins/jobs/[jobId] — Poll and advance a generation job
 *
 * Each call advances the job by one pipeline step via the plugin contract.
 * Returns the current job state with step details and progress.
 *
 * Unified polling replaces:
 *   GET /api/v1/mods/office-sim/furniture-design/[taskId]
 *   GET /api/v1/mods/office-sim/texture-design/[taskId]
 *   GET /api/v1/mods/office-sim/character-design/[taskId]
 *
 * Auth: x-wallet-address
 */

import { NextRequest } from "next/server";
import { getWalletAddress } from "@/lib/auth-guard";
import "@/lib/plugins"; // ensure plugins are registered
import { advanceJob } from "@/lib/plugins/job-executor";
import { getJob } from "@/lib/plugins/generation-jobs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const wallet = getWalletAddress(req);
  if (!wallet) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { jobId } = await params;

  // First get current state
  const job = await getJob(jobId);
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  // If already terminal, just return current state
  if (job.status === "completed" || job.status === "failed") {
    return Response.json({
      id: job.id,
      pluginId: job.pluginId,
      assetKind: job.assetKind,
      assetPurpose: job.assetPurpose,
      category: job.category,
      status: job.status,
      progress: job.progress,
      steps: job.steps,
      assetId: job.assetId,
      error: job.error,
      completed: true,
    });
  }

  // Advance by one step
  const result = await advanceJob(jobId);

  return Response.json({
    id: result.job.id,
    pluginId: result.job.pluginId,
    assetKind: result.job.assetKind,
    assetPurpose: result.job.assetPurpose,
    category: result.job.category,
    status: result.job.status,
    progress: result.job.progress,
    steps: result.job.steps,
    assetId: result.job.assetId,
    error: result.job.error,
    completed: result.completed,
  });
}
