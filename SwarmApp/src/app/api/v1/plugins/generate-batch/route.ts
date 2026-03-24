/**
 * POST /api/v1/plugins/generate-batch — Create multiple generation jobs at once
 *
 * Replaces: POST /api/v1/mods/office-sim/generate-office
 *
 * Auth: x-wallet-address
 *
 * Body:
 *   orgId    — Organization ID
 *   themeId  — Theme ID (for prompt generation)
 *   jobs     — Array of { pluginId, assetKind, assetPurpose, category, prompt, config? }
 *
 * Or use the shorthand:
 *   orgId, themeId, preset: "office"
 *   → auto-generates the standard office batch (6 furniture + 2 textures)
 */

import { NextRequest } from "next/server";
import { getWalletAddress } from "@/lib/auth-guard";
import "@/lib/plugins"; // ensure plugins are registered
import { getPlugin } from "@/lib/plugins/registry";
import { createJob, getActiveJob } from "@/lib/plugins/generation-jobs";
import { THEME_PRESETS } from "@/components/mods/office-sim/themes";
import type { AssetKind, AssetPurpose } from "@/lib/plugins/types";

/** Standard office furniture batch */
const OFFICE_FURNITURE = [
  { category: "desk", label: "Office Desk" },
  { category: "chair", label: "Office Chair" },
  { category: "plant", label: "Office Plant" },
  { category: "whiteboard", label: "Whiteboard" },
  { category: "coffee-machine", label: "Coffee Machine" },
  { category: "lamp", label: "Desk Lamp" },
];

/** Standard office texture batch */
const OFFICE_TEXTURES = [
  { category: "wood-floor", label: "Wood Floor" },
  { category: "concrete-wall", label: "Concrete Wall" },
];

interface BatchJobSpec {
  pluginId: string;
  assetKind: AssetKind;
  assetPurpose: AssetPurpose;
  category: string;
  prompt: string;
  config?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const wallet = getWalletAddress(req);
  if (!wallet) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: {
    orgId?: string;
    themeId?: string;
    preset?: string;
    jobs?: BatchJobSpec[];
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const orgId = body.orgId?.trim();
  const themeId = body.themeId?.trim();

  if (!orgId) {
    return Response.json({ error: "Required: orgId" }, { status: 400 });
  }

  let jobSpecs: BatchJobSpec[];

  if (body.preset === "office") {
    // Auto-build the office preset batch
    if (!themeId) {
      return Response.json({ error: "Required: themeId for office preset" }, { status: 400 });
    }

    const theme = THEME_PRESETS.find((t) => t.id === themeId);
    if (!theme) {
      return Response.json({ error: `Unknown theme: ${themeId}` }, { status: 400 });
    }

    jobSpecs = [];

    // Furniture jobs (Meshy plugin)
    for (const item of OFFICE_FURNITURE) {
      jobSpecs.push({
        pluginId: "meshy",
        assetKind: "model-3d",
        assetPurpose: "furniture",
        category: item.category,
        prompt: `${item.label}, ${theme.furnitureStylePrompt}, office furniture, 3D model, high quality`,
      });
    }

    // Texture jobs (ComfyUI plugin)
    for (const item of OFFICE_TEXTURES) {
      jobSpecs.push({
        pluginId: "comfyui",
        assetKind: "texture-2d",
        assetPurpose: "texture",
        category: item.category,
        prompt: `seamless tileable ${item.label} texture, ${theme.textureStylePrompt}, photorealistic PBR, top-down view, high resolution`,
      });
    }
  } else if (body.jobs && body.jobs.length > 0) {
    jobSpecs = body.jobs;
  } else {
    return Response.json(
      { error: "Provide either preset: 'office' or a jobs array" },
      { status: 400 },
    );
  }

  // Validate and create all jobs
  const created: { jobId: string; pluginId: string; category: string; assetKind: string; existing: boolean }[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const spec of jobSpecs) {
    const plugin = getPlugin(spec.pluginId);
    if (!plugin) {
      errors.push(`Unknown plugin: ${spec.pluginId}`);
      continue;
    }
    if (!plugin.isConfigured()) {
      skipped.push(`${spec.pluginId}:${spec.category} (not configured)`);
      continue;
    }
    if (!plugin.capabilities.includes(spec.assetKind)) {
      errors.push(`Plugin ${spec.pluginId} cannot produce ${spec.assetKind}`);
      continue;
    }

    // Check for existing active job
    const existing = await getActiveJob(
      orgId,
      spec.pluginId,
      spec.assetPurpose,
      spec.category,
      themeId,
    );
    if (existing) {
      created.push({
        jobId: existing.id,
        pluginId: spec.pluginId,
        category: spec.category,
        assetKind: spec.assetKind,
        existing: true,
      });
      continue;
    }

    const steps = plugin.buildSteps(spec.assetKind, spec.config);
    const jobId = await createJob({
      pluginId: spec.pluginId,
      assetKind: spec.assetKind,
      assetPurpose: spec.assetPurpose,
      category: spec.category,
      orgId,
      themeId,
      prompt: spec.prompt,
      config: spec.config,
      status: "pending",
      steps,
      currentStep: 0,
      progress: 0,
      requestedBy: wallet,
    });

    created.push({
      jobId,
      pluginId: spec.pluginId,
      category: spec.category,
      assetKind: spec.assetKind,
      existing: false,
    });
  }

  return Response.json({
    ok: true,
    themeId,
    jobs: created,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    total: created.length,
  });
}
