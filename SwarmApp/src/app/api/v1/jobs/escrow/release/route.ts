/**
 * POST /api/v1/jobs/escrow/release
 *
 * Release Hedera escrow to agent (called after delivery approval)
 *
 * Body: { jobId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { getJob, updateJob } from "@/lib/firestore";
import { releaseBountyToAgent } from "@/lib/hedera-job-bounty";

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

    // Verify job poster is releasing funds
    if (job.postedByAddress !== session.address) {
      return NextResponse.json(
        { error: "Only job poster can release escrow" },
        { status: 403 }
      );
    }

    // Verify job is approved
    if (job.reviewStatus !== 'approved') {
      return NextResponse.json(
        { error: "Can only release escrow for approved jobs" },
        { status: 400 }
      );
    }

    // Release Hedera scheduled transaction to agent
    await releaseBountyToAgent(job.hederaScheduledTxId, jobId);

    // Update job escrow status
    await updateJob(jobId, {
      hederaEscrowStatus: 'executed',
    });

    return NextResponse.json({
      success: true,
      scheduledTxId: job.hederaScheduledTxId,
      bountyHbar: job.hederaBountyHbar,
      recipientAccountId: job.hederaRecipientAccountId,
      message: `✅ Released ${job.hederaBountyHbar} HBAR to agent`,
      hashscanUrl: `https://hashscan.io/testnet/transaction/${job.hederaScheduledTxId}`,
    });
  } catch (error) {
    console.error("Release job escrow error:", error);
    return NextResponse.json(
      {
        error: "Failed to release job escrow",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
