/**
 * GET /api/v1/orgs/verify-ownership?orgId=xxx
 *
 * Verify organization ownership by querying HCS
 *
 * Returns:
 * - Current owner from HCS audit trail
 * - Verification status
 * - Full ownership history
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyOrgOwnershipOnHCS } from "@/lib/hedera-org-ownership";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId parameter" }, { status: 400 });
    }

    // Query HCS for ownership proof
    const proof = await verifyOrgOwnershipOnHCS(orgId);

    return NextResponse.json({
      success: true,
      proof: {
        orgId: proof.orgId,
        currentOwner: proof.currentOwner,
        verified: proof.verified,
        hcsTopicId: proof.hcsTopicId,
        hcsSequenceNumber: proof.hcsSequenceNumber,
        hcsConsensusTimestamp: proof.hcsConsensusTimestamp,
        createdAt: proof.createdAt,
        lastTransferAt: proof.lastTransferAt,
        transferCount: proof.transferCount,
        hashscanUrl: `https://hashscan.io/${process.env.HEDERA_NETWORK || "testnet"}/topic/${proof.hcsTopicId}`,
      },
    });
  } catch (error) {
    console.error("[API] Failed to verify org ownership:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Verification failed",
        verified: false,
      },
      { status: 500 }
    );
  }
}
