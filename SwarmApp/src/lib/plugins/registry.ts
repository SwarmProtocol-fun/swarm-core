/**
 * Plugin Registry — In-process registry of available generation plugins.
 *
 * Plugins register on import. API routes and the job executor look up plugins here.
 * This is a lightweight in-process registry, NOT the Firestore modServiceRegistry
 * (which tracks external mod services). Plugins are built-in integrations.
 */

import type { GenerationPlugin, PluginRegistration, AssetKind } from "./types";

const plugins = new Map<string, PluginRegistration>();

/** Register a plugin */
export function registerPlugin(registration: PluginRegistration): void {
  plugins.set(registration.plugin.id, registration);
}

/** Get a plugin by ID */
export function getPlugin(pluginId: string): GenerationPlugin | null {
  return plugins.get(pluginId)?.plugin ?? null;
}

/** Get a plugin registration by ID */
export function getPluginRegistration(pluginId: string): PluginRegistration | null {
  return plugins.get(pluginId) ?? null;
}

/** List all registered plugins */
export function listPlugins(): PluginRegistration[] {
  return Array.from(plugins.values());
}

/** List plugins that can produce a given asset kind */
export function listPluginsForKind(kind: AssetKind): PluginRegistration[] {
  return Array.from(plugins.values()).filter((r) =>
    r.plugin.capabilities.includes(kind),
  );
}

/** List only configured plugins (env vars present) */
export function listConfiguredPlugins(): PluginRegistration[] {
  return Array.from(plugins.values()).filter((r) => r.plugin.isConfigured());
}

/** Check if any plugin can produce a given asset kind */
export function hasPluginForKind(kind: AssetKind): boolean {
  return listPluginsForKind(kind).some((r) => r.plugin.isConfigured());
}
