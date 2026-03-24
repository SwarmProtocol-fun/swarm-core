/**
 * GET /api/v1/plugins/assets — Query generated assets from the unified registry
 *
 * Replaces:
 *   GET /api/v1/mods/office-sim/furniture
 *   GET /api/v1/mods/office-sim/avatars
 *   (and any future per-type asset endpoints)
 *
 * Auth: x-wallet-address
 *
 * Query params:
 *   orgId       — required
 *   purpose?    — "avatar" | "furniture" | "texture" | "decoration"
 *   kind?       — "model-3d" | "model-rigged" | "texture-2d" | "sprite-2d" | "animation"
 *   themeId?    — filter by theme
 *   category?   — filter by category
 *   agentId?    — filter by agent (for avatars)
 */

import { NextRequest } from "next/server";
import { getWalletAddress } from "@/lib/auth-guard";
import {
  getOrgAssets,
  getAgentAvatarAssets,
  getOrgFurnitureAssets,
  getOrgTextureAssets,
} from "@/lib/plugins/asset-registry";
import type { AssetKind, AssetPurpose } from "@/lib/plugins/types";

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

  const purpose = url.searchParams.get("purpose") as AssetPurpose | null;
  const kind = url.searchParams.get("kind") as AssetKind | null;
  const themeId = url.searchParams.get("themeId") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const agentId = url.searchParams.get("agentId") || undefined;

  // Optimized queries for common patterns
  if (agentId && purpose === "avatar") {
    const assets = await getAgentAvatarAssets(orgId, agentId);
    return Response.json({ assets });
  }

  if (purpose === "furniture" && themeId) {
    const furnitureMap = await getOrgFurnitureAssets(orgId, themeId);
    const furniture: Record<string, { url: string; category: string; prompt?: string }> = {};
    for (const [cat, asset] of furnitureMap) {
      furniture[cat] = { url: asset.url, category: asset.category, prompt: asset.prompt };
    }
    return Response.json({ assets: Array.from(furnitureMap.values()), furniture });
  }

  if (purpose === "texture" && themeId) {
    const textureMap = await getOrgTextureAssets(orgId, themeId);
    const textures: Record<string, { url: string; category: string; prompt?: string }> = {};
    for (const [cat, asset] of textureMap) {
      textures[cat] = { url: asset.url, category: asset.category, prompt: asset.prompt };
    }
    return Response.json({ assets: Array.from(textureMap.values()), textures });
  }

  // General query
  const assets = await getOrgAssets(orgId, {
    purpose: purpose || undefined,
    kind: kind || undefined,
    themeId,
    category,
  });

  return Response.json({ assets });
}
