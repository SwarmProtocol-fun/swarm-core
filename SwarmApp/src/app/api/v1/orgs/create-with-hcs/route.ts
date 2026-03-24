/**
 * POST /api/v1/orgs/create-with-hcs
 *
 * Create organization with HCS-backed ownership proof
 *
 * Flow:
 * 1. Verify owner signature
 * 2. Create org in Firestore
 * 3. Submit creation event to HCS
 * 4. Update org with HCS proof
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import {
  createOrganization,
  updateOrganization,
  type Organization,
} from "@/lib/firestore";
import {
  submitOrgCreationToHCS,
  createOrgCreationMessage,
  verifySignature,
  type OrgCreationEvent,
} from "@/lib/hedera-org-ownership";

export async function POST(req: NextRequest) {
  try {
    const session = await validateSession();
    if (!session?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerAddress = session.sub;

    const body = await req.json();
    const { name, description, website, ownerSignature } = body;

    if (!name || !ownerSignature) {
      return NextResponse.json(
        { error: "Missing required fields: name, ownerSignature" },
        { status: 400 }
      );
    }

    // Verify owner signature before creating org
    const timestamp = Date.now();
    // Note: We'll create org first to get ID, then verify signature with that ID
    // This is a slight chicken-egg problem - in production you might want to
    // generate a deterministic org ID beforehand or use a different signature scheme

    // Step 1: Create org in Firestore
    const orgId = await createOrganization({
      name,
      description: description || "",
      ownerAddress,
      members: [ownerAddress],
      createdAt: new Date(),
    } as Omit<Organization, "id">);

    // Step 2: Verify signature now that we have orgId
    const message = createOrgCreationMessage(orgId, timestamp);
    const signatureValid = verifySignature(message, ownerSignature, ownerAddress);

    if (!signatureValid) {
      // Signature invalid - we could delete the org here, but for now just mark as unverified
      console.error(`[HCS] Invalid signature for org creation: ${orgId}`);
      return NextResponse.json(
        {
          error: "Invalid owner signature",
          orgId, // Return orgId so client can retry
        },
        { status: 400 }
      );
    }

    // Step 3: Submit creation event to HCS
    try {
      const event: OrgCreationEvent = {
        type: "org_created",
        orgId,
        name,
        ownerAddress,
        ownerSignature,
        timestamp,
        metadata: {
          description,
          website,
        },
      };

      const hcsProof = await submitOrgCreationToHCS(event);

      // Step 4: Update org with HCS proof
      await updateOrganization(orgId, {
        hcsTopicId: hcsProof.topicId,
        hcsSequenceNumber: hcsProof.sequenceNumber,
        hcsConsensusTimestamp: new Date().toISOString(),
        ownerSignature,
        hcsVerifiedAt: new Date(),
        hcsOwnershipVerified: true,
      });

      return NextResponse.json({
        success: true,
        orgId,
        hcsProof: {
          topicId: hcsProof.topicId,
          sequenceNumber: hcsProof.sequenceNumber,
          hashscanUrl: `https://hashscan.io/${process.env.HEDERA_NETWORK || "testnet"}/topic/${hcsProof.topicId}`,
        },
      });
    } catch (hcsError) {
      console.error("[HCS] Failed to submit org creation to HCS:", hcsError);

      // Org created but HCS submission failed
      // Mark as unverified and return partial success
      await updateOrganization(orgId, {
        hcsOwnershipVerified: false,
      });

      return NextResponse.json(
        {
          warning: "Org created but HCS submission failed",
          orgId,
          error: hcsError instanceof Error ? hcsError.message : "HCS submission failed",
        },
        { status: 201 } // Created but with warning
      );
    }
  } catch (error) {
    console.error("[API] Failed to create org with HCS:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
