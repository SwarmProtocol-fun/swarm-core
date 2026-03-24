/**
 * POST /api/v1/plugins/jobs — Create a generation job
 * GET  /api/v1/plugins/jobs — List jobs for an org
 *
 * Unified job creation replaces:
 *   POST /api/v1/mods/office-sim/furniture-design
 *   POST /api/v1/mods/office-sim/texture-design
 *   POST /api/v1/mods/office-sim/character-design
 *
 * Auth: x-wallet-address
 *
 * Body (POST):
 *   pluginId    — "meshy" | "comfyui"
 *   assetKind   — "model-3d" | "model-rigged" | "texture-2d" | "sprite-2d" | "animation"
 *   assetPurpose — "avatar" | "furniture" | "texture" | "decoration"
 *   category    — "desk" | "chair" | "wood-floor" | etc.
 *   orgId       — Organization ID
 *   prompt      — Generation prompt
 *   themeId?    — Optional theme ID
 *   agentId?    — Optional agent ID (for avatars)
 *   config?     — Plugin-specific config
 */

import { NextRequest } from "next/server";
import { getWalletAddress } from "@/lib/auth-guard";
import "@/lib/plugins"; // ensure plugins are registered
import { getPlugin } from "@/lib/plugins/registry";
import { createJob, getActiveJob, getOrgJobs } from "@/lib/plugins/generation-jobs";
import type { AssetKind, AssetPurpose } from "@/lib/plugins/types";

export async function POST(req: NextRequest) {
  const wallet = getWalletAddress(req);
  if (!wallet) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: {
    pluginId?: string;
    assetKind?: string;
    assetPurpose?: string;
    category?: string;
    orgId?: string;
    prompt?: string;
    themeId?: string;
    agentId?: string;
    config?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { pluginId, assetKind, assetPurpose, category, orgId, prompt } = body;

  if (!pluginId || !assetKind || !assetPurpose || !category || !orgId || !prompt) {
    return Response.json(
      { error: "Required: pluginId, assetKind, assetPurpose, category, orgId, prompt" },
      { status: 400 },
    );
  }

  // Validate plugin exists and is configured
  const plugin = getPlugin(pluginId);
  if (!plugin) {
    return Response.json({ error: `Unknown plugin: ${pluginId}` }, { status: 400 });
  }
  if (!plugin.isConfigured()) {
    return Response.json(
      { error: `Plugin ${pluginId} is not configured. Required env vars: ${plugin.requiredEnvVars.join(", ")}` },
      { status: 503 },
    );
  }
  if (!plugin.capabilities.includes(assetKind as AssetKind)) {
    return Response.json(
      { error: `Plugin ${pluginId} cannot produce ${assetKind}. Capabilities: ${plugin.capabilities.join(", ")}` },
      { status: 400 },
    );
  }

  // Check for existing active job (prevent duplicates)
  const existing = await getActiveJob(
    orgId,
    pluginId,
    assetPurpose as AssetPurpose,
    category,
    body.themeId,
    body.agentId,
  );
  if (existing) {
    return Response.json({
      ok: true,
      jobId: existing.id,
      status: existing.status,
      progress: existing.progress,
      existing: true,
    });
  }

  // Build steps from plugin
  const steps = plugin.buildSteps(assetKind as AssetKind, body.config);

  const jobId = await createJob({
    pluginId,
    assetKind: assetKind as AssetKind,
    assetPurpose: assetPurpose as AssetPurpose,
    category,
    orgId,
    agentId: body.agentId,
    themeId: body.themeId,
    prompt,
    config: body.config,
    status: "pending",
    steps,
    currentStep: 0,
    progress: 0,
    requestedBy: wallet,
  });

  return Response.json({ ok: true, jobId, status: "pending", progress: 0 });
}

export async function GET(req: NextRequest) {
  const wallet = getWalletAddress(req);
  if (!wallet) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  if (!orgId) {
    return Response.json({ error: "Required: orgId" }, { status: 400 });
  }

  const jobs = await getOrgJobs(orgId, {
    pluginId: url.searchParams.get("pluginId") || undefined,
    assetPurpose: (url.searchParams.get("assetPurpose") as AssetPurpose) || undefined,
    themeId: url.searchParams.get("themeId") || undefined,
  });

  return Response.json({ jobs });
}
