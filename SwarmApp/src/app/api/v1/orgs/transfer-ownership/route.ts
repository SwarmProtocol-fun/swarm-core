/**
 * POST /api/v1/orgs/transfer-ownership
 *
 * Transfer organization ownership with dual-signature HCS proof
 *
 * Flow:
 * 1. Verify current owner signature (approval)
 * 2. Verify new owner signature (acceptance)
 * 3. Submit transfer event to HCS
 * 4. Update org ownership in Firestore
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import {
  getOrganization,
  updateOrganization,
} from "@/lib/firestore";
import {
  submitOrgTransferToHCS,
  createOrgTransferMessage,
  verifySignature,
  type OrgTransferEvent,
} from "@/lib/hedera-org-ownership";

export async function POST(req: NextRequest) {
  try {
    const session = await validateSession();
    if (!session?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOwner = session.sub;

    const body = await req.json();
    const {
      orgId,
      newOwner,
      fromSignature,
      toSignature,
      reason,
    } = body;

    if (!orgId || !newOwner || !fromSignature || !toSignature) {
      return NextResponse.json(
        {
          error: "Missing required fields: orgId, newOwner, fromSignature, toSignature",
        },
        { status: 400 }
      );
    }

    // Verify current ownership
    const org = await getOrganization(orgId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (org.ownerAddress.toLowerCase() !== currentOwner.toLowerCase()) {
      return NextResponse.json(
        { error: "Only current owner can transfer ownership" },
        { status: 403 }
      );
    }

    // Verify both signatures
    const timestamp = Date.now();
    const message = createOrgTransferMessage(orgId, currentOwner, newOwner, timestamp);

    const fromValid = verifySignature(message, fromSignature, currentOwner);
    const toValid = verifySignature(message, toSignature, newOwner);

    if (!fromValid || !toValid) {
      return NextResponse.json(
        { error: "Invalid signature(s) for ownership transfer" },
        { status: 400 }
      );
    }

    // Submit transfer event to HCS
    try {
      const event: OrgTransferEvent = {
        type: "org_transferred",
        orgId,
        fromOwner: currentOwner,
        toOwner: newOwner,
        fromSignature,
        toSignature,
        timestamp,
        reason,
      };

      const hcsProof = await submitOrgTransferToHCS(event);

      // Update org ownership in Firestore
      await updateOrganization(orgId, {
        ownerAddress: newOwner,
        hcsSequenceNumber: hcsProof.sequenceNumber,
        hcsConsensusTimestamp: new Date().toISOString(),
        hcsVerifiedAt: new Date(),
        hcsOwnershipVerified: true,
        // Add new owner to members if not already present
        members: org.members.includes(newOwner) ? org.members : [...org.members, newOwner],
      });

      return NextResponse.json({
        success: true,
        orgId,
        newOwner,
        hcsProof: {
          topicId: hcsProof.topicId,
          sequenceNumber: hcsProof.sequenceNumber,
          hashscanUrl: `https://hashscan.io/${process.env.HEDERA_NETWORK || "testnet"}/topic/${hcsProof.topicId}`,
        },
      });
    } catch (hcsError) {
      console.error("[HCS] Failed to submit org transfer to HCS:", hcsError);
      return NextResponse.json(
        {
          error: "HCS submission failed",
          details: hcsError instanceof Error ? hcsError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[API] Failed to transfer org ownership:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
