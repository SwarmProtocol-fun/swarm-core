/**
 * GET /api/v1/solana/validators?cluster=devnet&limit=50
 *
 * Returns current validator list with commission and stake info.
 * Cached server-side for 5 minutes. No auth required.
 */
import { createConnection } from "@/lib/solana-keys";
import { clusterFromRequest } from "@/lib/solana-cluster";
import { getValidators, type ValidatorInfo } from "@/lib/solana-staking";

export const dynamic = "force-dynamic";

let validatorCache: { validators: ValidatorInfo[]; epoch: number; epochProgress: number; ts: number; cluster: string } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: Request) {
  try {
    const cluster = clusterFromRequest(request);
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

    // Check cache
    if (validatorCache && validatorCache.cluster === cluster && Date.now() - validatorCache.ts < CACHE_TTL) {
      return Response.json({
        validators: validatorCache.validators.slice(0, limit),
        epoch: validatorCache.epoch,
        epochProgress: validatorCache.epochProgress,
      });
    }

    const connection = createConnection(cluster);

    const [validators, epochInfo] = await Promise.all([
      getValidators(connection),
      connection.getEpochInfo(),
    ]);

    // Sort by activated stake descending
    validators.sort((a, b) => b.activatedStake - a.activatedStake);

    const epochProgress = epochInfo.slotsInEpoch > 0
      ? Number(((epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100).toFixed(1))
      : 0;

    // Update cache
    validatorCache = {
      validators,
      epoch: epochInfo.epoch,
      epochProgress,
      ts: Date.now(),
      cluster,
    };

    return Response.json({
      validators: validators.slice(0, limit),
      epoch: epochInfo.epoch,
      epochProgress,
    });
  } catch (err) {
    console.error("Validators error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch validators";
    return Response.json({ error: message }, { status: 500 });
  }
}
