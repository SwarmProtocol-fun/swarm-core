/**
 * POST /api/v1/jobs/escrow/refund
 *
 * Refund Hedera escrow to poster (called after delivery rejection or cancellation)
 *
 * Body: { jobId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { getJob, updateJob } from "@/lib/firestore";
import { refundBountyToPoster } from "@/lib/hedera-job-bounty";

export async function POST(req: NextRequest) {
  try {
    const session = await validateSession();
    if (!session?.address) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await req.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing required field: jobId" },
        { status: 400 }
      );
    }

    // Verify job exists
    const job = await getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify job has escrow
    if (!job.hederaScheduledTxId) {
      return NextResponse.json(
        { error: "Job has no Hedera escrow" },
        { status: 400 }
      );
    }

    // Verify job poster is refunding
    if (job.postedByAddress !== session.address) {
      return NextResponse.json(
        { error: "Only job poster can refund escrow" },
        { status: 403 }
      );
    }

    // Refund Hedera scheduled transaction to poster
    await refundBountyToPoster(job.hederaScheduledTxId, jobId);

    // Update job escrow status
    await updateJob(jobId, {
      hederaEscrowStatus: 'refunded',
    });

    return NextResponse.json({
      success: true,
      scheduledTxId: job.hederaScheduledTxId,
      bountyHbar: job.hederaBountyHbar,
      message: `✅ Refunded ${job.hederaBountyHbar} HBAR to poster`,
      hashscanUrl: `https://hashscan.io/testnet/transaction/${job.hederaScheduledTxId}`,
    });
  } catch (error) {
    console.error("Refund job escrow error:", error);
    return NextResponse.json(
      {
        error: "Failed to refund job escrow",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
