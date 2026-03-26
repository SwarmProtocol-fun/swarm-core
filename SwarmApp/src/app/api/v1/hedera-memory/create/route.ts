/**
 * POST /api/v1/hedera-memory/create
 *
 * Create private HCS topic for agent's encrypted memories
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createPrivateMemoryTopic } from "@/lib/hedera-agent-memory";
import { getWalletAddress } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
  try {
    const wallet = getWalletAddress(req);
    if (!wallet) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const session = await validateSession();
    if (!session?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId, asn } = await req.json();

    if (!agentId || !asn) {
      return NextResponse.json(
        { error: "Missing required fields: agentId, asn" },
        { status: 400 }
      );
    }

    // Create private memory topic on Hedera
    const config = await createPrivateMemoryTopic(agentId, asn);

    // Update agent record with memory topic
    const agentRef = doc(db, "agents", agentId);
    await updateDoc(agentRef, {
      hederaMemoryTopicId: config.memoryTopicId,
      hederaMemoryEnabled: true,
      hederaMemoryCreatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      memoryTopicId: config.memoryTopicId,
      hashscanUrl: `https://hashscan.io/${process.env.HEDERA_NETWORK || "testnet"}/topic/${config.memoryTopicId}`,
      message: "Private memory topic created on Hedera HCS",
    });
  } catch (error) {
    console.error("[API] Failed to create Hedera memory topic:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create memory topic" },
      { status: 500 }
    );
  }
}
