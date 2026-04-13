/**
 * Job Executor — Advances a generation job by one step via its plugin.
 *
 * Called by API routes on each poll. Delegates to the plugin's advanceStep(),
 * then handles the upload-to-IPFS storage step and asset creation.
 *
 * Each call does at most one external API call, keeping within Netlify's 10s timeout.
 */

import { getJob, updateJob } from "./generation-jobs";
import { createAsset } from "./asset-registry";
import { getPlugin } from "./registry";
import type { GenerationJob, AssetKind } from "./types";

/** MIME types for asset kinds */
const MIME_TYPES: Record<AssetKind, string> = {
  "model-3d": "model/gltf-binary",
  "model-rigged": "model/gltf-binary",
  "animation": "model/gltf-binary",
  "texture-2d": "image/png",
  "sprite-2d": "image/png",
};

/** File extensions for asset kinds */
const EXTENSIONS: Record<AssetKind, string> = {
  "model-3d": "glb",
  "model-rigged": "glb",
  "animation": "glb",
  "texture-2d": "png",
  "sprite-2d": "png",
};

export interface AdvanceResult {
  job: GenerationJob;
  completed: boolean;
}

/**
 * Advance a job by one step. Returns the updated job state.
 */
export async function advanceJob(jobId: string): Promise<AdvanceResult> {
  const job = await getJob(jobId);
  if (!job) throw new Error(`Job not found: ${jobId}`);

  // Already terminal
  if (job.status === "completed" || job.status === "failed") {
    return { job, completed: true };
  }

  const plugin = getPlugin(job.pluginId);
  if (!plugin) {
    await updateJob(jobId, { status: "failed", error: `Plugin not found: ${job.pluginId}` });
    return { job: { ...job, status: "failed", error: `Plugin not found: ${job.pluginId}` }, completed: true };
  }

  if (!plugin.isConfigured()) {
    await updateJob(jobId, { status: "failed", error: `Plugin not configured: ${job.pluginId}` });
    return { job: { ...job, status: "failed", error: `Plugin not configured: ${job.pluginId}` }, completed: true };
  }

  try {
    // Let the plugin advance the current step
    const result = await plugin.advanceStep(job);

    // Check if plugin reported an error
    if (result.error) {
      await updateJob(jobId, {
        status: "failed",
        steps: result.steps,
        currentStep: result.currentStep,
        progress: result.progress,
        error: result.error,
      });
      return {
        job: { ...job, status: "failed", steps: result.steps, error: result.error },
        completed: true,
      };
    }

    // Check if all steps are complete
    const allDone = result.steps.every(
      (s) => s.status === "completed" || s.status === "skipped",
    );

    if (allDone && result.outputUrl) {
      // Upload to IPFS storage and create asset
      const assetUrl = await uploadAndCreateAsset(job, result.outputUrl);

      await updateJob(jobId, {
        status: "completed",
        steps: result.steps,
        currentStep: result.currentStep,
        progress: 100,
        assetId: assetUrl.assetId,
        completedAt: new Date(),
      });

      return {
        job: {
          ...job,
          status: "completed",
          steps: result.steps,
          progress: 100,
          assetId: assetUrl.assetId,
        },
        completed: true,
      };
    }

    // Job still in progress
    const newStatus = result.steps.some((s) => s.status === "running") ? "running" : "pending";
    await updateJob(jobId, {
      status: newStatus,
      steps: result.steps,
      currentStep: result.currentStep,
      progress: result.progress,
    });

    return {
      job: { ...job, status: newStatus, steps: result.steps, progress: result.progress },
      completed: false,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown executor error";
    await updateJob(jobId, { status: "failed", error });
    return { job: { ...job, status: "failed", error }, completed: true };
  }
}

/**
 * Upload the generated output to IPFS storage and create an asset record.
 * Falls back to the raw URL if IPFS storage isn't configured.
 */
async function uploadAndCreateAsset(
  job: GenerationJob,
  outputUrl: string,
): Promise<{ assetId: string; url: string }> {
  let finalUrl = outputUrl;
  let ipfsCid: string | undefined;
  let sizeBytes: number | undefined;

  // Try IPFS storage upload
  try {
    const res = await fetch(outputUrl);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buffer = await res.arrayBuffer();
    sizeBytes = buffer.byteLength;

    // [swarm-core] IPFS storage removed
    const uploadContent = async (..._args: unknown[]) => ({ cid: "" });
    const mimeType = MIME_TYPES[job.assetKind] || "application/octet-stream";
    const ext = EXTENSIONS[job.assetKind] || "bin";
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    const file = new File([blob], `${job.assetPurpose}-${job.category}.${ext}`, { type: mimeType });
    const cid = await uploadContent(file);
    const gateway = "w3s.link";
    ipfsCid = cid.toString();
    finalUrl = `https://${gateway}/ipfs/${cid}`;
  } catch {
    // IPFS storage not configured or upload failed — use raw URL
  }

  const assetId = await createAsset({
    kind: job.assetKind,
    purpose: job.assetPurpose,
    category: job.category,
    orgId: job.orgId,
    agentId: job.agentId,
    themeId: job.themeId,
    pluginId: job.pluginId,
    jobId: job.id,
    url: finalUrl,
    ipfsCid,
    mimeType: MIME_TYPES[job.assetKind] || "application/octet-stream",
    sizeBytes,
    prompt: job.prompt,
    requestedBy: job.requestedBy,
  });

  return { assetId, url: finalUrl };
}
