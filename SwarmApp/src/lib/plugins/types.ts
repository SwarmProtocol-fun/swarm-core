/**
 * Plugin System — Core type definitions.
 *
 * Plugins are external service integrations (Meshy.ai, ComfyUI/Replicate, etc.)
 * that produce assets (3D models, textures, sprites) via generation jobs.
 *
 * Mods (Office Sim, etc.) consume assets from the unified registry and create
 * generation jobs through the plugin contract — they never call Meshy/ComfyUI directly.
 */

/* ═══════════════════════════════════════
   Asset Types
   ═══════════════════════════════════════ */

/** What kind of asset a plugin can produce */
export type AssetKind =
  | "model-3d"      // GLB/GLTF 3D model
  | "model-rigged"  // Rigged 3D model (with skeleton)
  | "animation"     // Animation clip (GLB)
  | "texture-2d"    // Tileable texture (PNG)
  | "sprite-2d";    // 2D character sprite (PNG)

/** What the asset is used for */
export type AssetPurpose =
  | "avatar"        // Agent avatar (3D model + animations)
  | "furniture"     // Office furniture piece
  | "texture"       // Floor/wall/ceiling texture
  | "decoration";   // Decorative object

/** A generated asset stored in the unified registry */
export interface GeneratedAsset {
  id: string;
  kind: AssetKind;
  purpose: AssetPurpose;
  /** Sub-category: "desk", "chair", "wood-floor", etc. */
  category: string;

  orgId: string;
  /** Optional — for avatar assets linked to a specific agent */
  agentId?: string;
  /** Optional — theme this asset belongs to */
  themeId?: string;

  /** Plugin that produced this asset */
  pluginId: string;
  /** Generation job that produced this asset */
  jobId: string;

  /** Permanent storage URL (Storage gateway or fallback) */
  url: string;
  /** Storage CID if uploaded to decentralized storage */
  storageCid?: string;
  /** MIME type */
  mimeType: string;
  /** Size in bytes */
  sizeBytes?: number;

  /** Original generation prompt */
  prompt?: string;
  /** Plugin-specific metadata (Meshy task IDs, Replicate prediction IDs, etc.) */
  providerMeta?: Record<string, unknown>;

  /** Who requested the generation */
  requestedBy: string;
  createdAt: unknown;  // Firestore serverTimestamp
  updatedAt: unknown;
}

/* ═══════════════════════════════════════
   Generation Jobs
   ═══════════════════════════════════════ */

export type JobStatus =
  | "pending"
  | "running"
  | "uploading"
  | "completed"
  | "failed";

/** A single step in a multi-step generation pipeline */
export interface JobStep {
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  /** Plugin-specific external task ID (e.g., Meshy task ID, Replicate prediction ID) */
  externalId?: string;
  progress?: number;
  error?: string;
  /** Output URL from this step (fed into next step or used for upload) */
  outputUrl?: string;
  startedAt?: number;
  completedAt?: number;
}

/** A generation job that a plugin executes */
export interface GenerationJob {
  id: string;
  /** Which plugin handles this job */
  pluginId: string;
  /** What kind of asset will be produced */
  assetKind: AssetKind;
  /** What this asset is for */
  assetPurpose: AssetPurpose;
  /** Sub-category */
  category: string;

  orgId: string;
  agentId?: string;
  themeId?: string;

  /** Generation prompt */
  prompt: string;
  /** Plugin-specific generation config */
  config?: Record<string, unknown>;

  /** Overall job status */
  status: JobStatus;
  /** Ordered pipeline steps */
  steps: JobStep[];
  /** Current step index */
  currentStep: number;
  /** Overall progress 0-100 */
  progress: number;

  /** Resulting asset ID once completed */
  assetId?: string;
  /** Error message if failed */
  error?: string;

  requestedBy: string;
  createdAt: unknown;
  updatedAt: unknown;
  completedAt?: unknown;
}

/* ═══════════════════════════════════════
   Plugin Contract
   ═══════════════════════════════════════ */

/** Result of advancing a job by one step */
export interface StepAdvanceResult {
  steps: JobStep[];
  currentStep: number;
  progress: number;
  /** Set when job completes — the downloadable URL before Storage upload */
  outputUrl?: string;
  /** Set when job fails */
  error?: string;
}

/**
 * GenerationPlugin — The contract that Meshy, ComfyUI, and future plugins implement.
 *
 * Plugins are stateless executors. They receive a job + steps array and advance
 * the current step by one. This maps 1:1 with the existing "client-driven polling"
 * pattern used for Netlify's 10s timeout constraint.
 */
export interface GenerationPlugin {
  /** Unique plugin identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** What asset kinds this plugin can produce */
  capabilities: AssetKind[];
  /** Environment variables required for this plugin */
  requiredEnvVars: string[];

  /** Check if the plugin is configured (env vars present) */
  isConfigured(): boolean;

  /**
   * Build the initial step list for a job.
   * Different asset kinds may have different pipelines
   * (e.g., Meshy avatar: preview → refine → rig → animate → upload
   *        Meshy furniture: preview → refine → upload)
   */
  buildSteps(assetKind: AssetKind, config?: Record<string, unknown>): JobStep[];

  /**
   * Advance the job by one step. Called repeatedly via polling.
   * Must complete in <10s to fit Netlify's timeout.
   */
  advanceStep(job: GenerationJob): Promise<StepAdvanceResult>;
}

/* ═══════════════════════════════════════
   Plugin Registry (in-process)
   ═══════════════════════════════════════ */

/** Registration entry for a plugin in the static registry */
export interface PluginRegistration {
  plugin: GenerationPlugin;
  /** ModServiceRegistration slug for gateway integration */
  slug: string;
  /** Description for marketplace listing */
  description: string;
  /** Icon name for UI */
  icon: string;
  /** Tags for searchability */
  tags: string[];
}
