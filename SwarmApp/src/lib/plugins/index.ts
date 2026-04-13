/**
 * Plugin System — Barrel export + initialization.
 *
 * Importing this module ensures all built-in plugins are registered.
 */

// Core types
export type {
  AssetKind,
  AssetPurpose,
  GeneratedAsset,
  JobStatus,
  JobStep,
  GenerationJob,
  StepAdvanceResult,
  GenerationPlugin,
  PluginRegistration,
} from "./types";

// Registry
export {
  registerPlugin,
  getPlugin,
  getPluginRegistration,
  listPlugins,
  listPluginsForKind,
  listConfiguredPlugins,
  hasPluginForKind,
} from "./registry";

// Asset registry
export {
  createAsset,
  getAsset,
  updateAsset,
  getOrgAssets,
  getLatestAsset,
  getAgentAvatarAssets,
  getOrgFurnitureAssets,
  getOrgTextureAssets,
  getOrgAvatarAssets,
} from "./asset-registry";

// Generation jobs
export {
  createJob,
  getJob,
  updateJob,
  getActiveJob,
  getOrgJobs,
  getBatchJobs,
} from "./generation-jobs";

// Job executor
export { advanceJob } from "./job-executor";

// Register built-in plugins (side-effect imports)
