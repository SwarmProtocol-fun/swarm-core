/**
 * POST /api/v1/hedera-memory/post
 *
 * Post encrypted memory to agent's private HCS topic
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { postPrivateMemory, type MemoryMessage } from "@/lib/hedera-agent-memory";
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

    const { topicId, asn, message } = await req.json();

    if (!topicId || !asn || !message) {
      return NextResponse.json(
        { error: "Missing required fields: topicId, asn, message" },
        { status: 400 }
      );
    }

    const result = await postPrivateMemory(topicId, asn, message as Omit<MemoryMessage, "sequenceNumber" | "consensusTimestamp">);

    return NextResponse.json({
      success: true,
      sequenceNumber: result.sequenceNumber,
      consensusTimestamp: result.consensusTimestamp,
      message: "Memory posted to Hedera HCS (encrypted)",
    });
  } catch (error) {
    console.error("[API] Failed to post memory to Hedera:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to post memory" },
      { status: 500 }
    );
  }
}
