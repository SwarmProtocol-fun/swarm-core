/**
 * Meshy Plugin — 3D model generation via Meshy.ai
 *
 * Capabilities:
 *   model-3d     — Static furniture/objects (preview → refine → download)
 *   model-rigged — Rigged characters (preview → refine → rig → download)
 *   animation    — Character animations (requires rig step first)
 *
 * The underlying API client lives at lib/mods/meshy/client.ts.
 * This plugin wraps it with the GenerationPlugin contract.
 */

import type {
  GenerationPlugin,
  GenerationJob,
  JobStep,
  AssetKind,
  StepAdvanceResult,
} from "../types";
import { registerPlugin } from "../registry";

// Re-export client functions for direct use if needed
export {
  isMeshyConfigured,
  createPreview,
  refineModel,
  rigModel,
  generateAnimation,
  getTextTo3DStatus,
  getRigStatus,
  getAnimationStatus,
  downloadModel,
} from "@/lib/mods/meshy/client";

import {
  isMeshyConfigured,
  createPreview,
  refineModel,
  rigModel,
  getTextTo3DStatus,
  getRigStatus,
} from "@/lib/mods/meshy/client";

/* ═══════════════════════════════════════
   Step definitions per asset kind
   ═══════════════════════════════════════ */

function buildSteps(assetKind: AssetKind): JobStep[] {
  const base: JobStep[] = [
    { name: "preview", status: "pending" },
    { name: "refine", status: "pending" },
  ];

  if (assetKind === "model-rigged") {
    base.push({ name: "rig", status: "pending" });
  }

  // All pipelines end with a virtual "download" step
  // (actual upload to Storacha is handled by the job-executor)
  base.push({ name: "download", status: "pending" });

  return base;
}

/* ═══════════════════════════════════════
   Step advancement logic
   ═══════════════════════════════════════ */

async function advanceStep(job: GenerationJob): Promise<StepAdvanceResult> {
  const steps = job.steps.map((s) => ({ ...s }));
  let currentStep = job.currentStep;

  const step = steps[currentStep];
  if (!step) {
    return { steps, currentStep, progress: 100, error: "No step to advance" };
  }

  try {
    switch (step.name) {
      case "preview": {
        if (step.status === "pending") {
          // Kick off preview
          const taskId = await createPreview(job.prompt);
          step.externalId = taskId;
          step.status = "running";
          step.startedAt = Date.now();
          return { steps, currentStep, progress: 5 };
        }

        // Poll preview
        if (!step.externalId) return { steps, currentStep, progress: 0, error: "Missing preview task ID" };
        const result = await getTextTo3DStatus(step.externalId);

        if (result.status === "FAILED" || result.status === "EXPIRED") {
          step.status = "failed";
          return { steps, currentStep, progress: 0, error: `Preview failed: ${result.status}` };
        }
        if (result.status === "SUCCEEDED") {
          step.status = "completed";
          step.completedAt = Date.now();
          currentStep++;
          return { steps, currentStep, progress: 20 };
        }
        return { steps, currentStep, progress: Math.min(15, (result.progress || 0) * 0.15) };
      }

      case "refine": {
        if (step.status === "pending") {
          // Kick off refine using the preview task ID
          const prevStep = steps[currentStep - 1];
          if (!prevStep?.externalId) return { steps, currentStep, progress: 20, error: "Missing preview task ID for refine" };
          const taskId = await refineModel(prevStep.externalId);
          step.externalId = taskId;
          step.status = "running";
          step.startedAt = Date.now();
          return { steps, currentStep, progress: 25 };
        }

        if (!step.externalId) return { steps, currentStep, progress: 20, error: "Missing refine task ID" };
        const result = await getTextTo3DStatus(step.externalId);

        if (result.status === "FAILED" || result.status === "EXPIRED") {
          step.status = "failed";
          return { steps, currentStep, progress: 20, error: `Refine failed: ${result.status}` };
        }
        if (result.status === "SUCCEEDED") {
          step.status = "completed";
          step.outputUrl = result.model_urls?.glb;
          step.completedAt = Date.now();
          currentStep++;
          return { steps, currentStep, progress: 50 };
        }
        return { steps, currentStep, progress: 25 + (result.progress || 0) * 0.25 };
      }

      case "rig": {
        if (step.status === "pending") {
          // Rig uses the refine task ID
          const refineStep = steps.find((s) => s.name === "refine");
          if (!refineStep?.externalId) return { steps, currentStep, progress: 50, error: "Missing refine task ID for rig" };
          const taskId = await rigModel(refineStep.externalId);
          step.externalId = taskId;
          step.status = "running";
          step.startedAt = Date.now();
          return { steps, currentStep, progress: 55 };
        }

        if (!step.externalId) return { steps, currentStep, progress: 50, error: "Missing rig task ID" };
        const result = await getRigStatus(step.externalId);

        if (result.status === "FAILED") {
          step.status = "failed";
          return { steps, currentStep, progress: 50, error: "Rigging failed" };
        }
        if (result.status === "SUCCEEDED" && result.rigged_character_glb_url) {
          step.status = "completed";
          step.outputUrl = result.rigged_character_glb_url;
          step.completedAt = Date.now();
          currentStep++;
          return { steps, currentStep, progress: 75 };
        }
        return { steps, currentStep, progress: 55 + (result.progress || 0) * 0.2 };
      }

      case "download": {
        // Find the last step that has an outputUrl
        let outputUrl: string | undefined;
        for (let i = currentStep - 1; i >= 0; i--) {
          if (steps[i].outputUrl) {
            outputUrl = steps[i].outputUrl;
            break;
          }
        }

        if (!outputUrl) {
          step.status = "failed";
          return { steps, currentStep, progress: 0, error: "No output URL from previous steps" };
        }

        step.status = "completed";
        step.outputUrl = outputUrl;
        step.completedAt = Date.now();
        currentStep++;

        return { steps, currentStep, progress: 100, outputUrl };
      }

      default:
        return { steps, currentStep, progress: job.progress, error: `Unknown step: ${step.name}` };
    }
  } catch (err) {
    step.status = "failed";
    return {
      steps,
      currentStep,
      progress: job.progress,
      error: err instanceof Error ? err.message : "Unknown Meshy error",
    };
  }
}

/* ═══════════════════════════════════════
   Plugin definition + registration
   ═══════════════════════════════════════ */

export const meshyPlugin: GenerationPlugin = {
  id: "meshy",
  name: "Meshy.ai",
  capabilities: ["model-3d", "model-rigged", "animation"],
  requiredEnvVars: ["MESHY_API_KEY"],
  isConfigured: isMeshyConfigured,
  buildSteps,
  advanceStep,
};

// Auto-register on import
registerPlugin({
  plugin: meshyPlugin,
  slug: "meshy",
  description: "AI-powered 3D model generation via Meshy.ai — text-to-3D, rigging, and animation",
  icon: "Box",
  tags: ["3d", "meshy", "generation", "models", "ai"],
});
