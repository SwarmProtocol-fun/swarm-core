/**
 * GET /api/v1/plugins
 *
 * List all registered generation plugins and their capabilities.
 * No auth required — this is a discovery endpoint.
 */

import "@/lib/plugins"; // ensure plugins are registered
import { listPlugins } from "@/lib/plugins/registry";

export async function GET() {
  const plugins = listPlugins().map((r) => ({
    id: r.plugin.id,
    name: r.plugin.name,
    slug: r.slug,
    description: r.description,
    icon: r.icon,
    tags: r.tags,
    capabilities: r.plugin.capabilities,
    configured: r.plugin.isConfigured(),
  }));

  return Response.json({ plugins });
}
