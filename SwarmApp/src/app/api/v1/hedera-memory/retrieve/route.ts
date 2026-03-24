/**
 * POST /api/v1/hedera-memory/retrieve
 *
 * Retrieve and decrypt memories from agent's private HCS topic
 * Requires ASN for decryption
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { retrievePrivateMemories } from "@/lib/hedera-agent-memory";

export async function POST(req: NextRequest) {
  try {
    const session = await validateSession();
    if (!session?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId, asn } = await req.json();

    if (!topicId || !asn) {
      return NextResponse.json(
        { error: "Missing required fields: topicId, asn" },
        { status: 400 }
      );
    }

    const memories = await retrievePrivateMemories(topicId, asn);

    const byType = {
      conversation: memories.filter((m) => m.type === "conversation").length,
      context: memories.filter((m) => m.type === "context").length,
      skill_learned: memories.filter((m) => m.type === "skill_learned").length,
      preference: memories.filter((m) => m.type === "preference").length,
      snapshot: memories.filter((m) => m.type === "snapshot").length,
    };

    return NextResponse.json({
      success: true,
      totalMemories: memories.length,
      breakdown: byType,
      memories: memories.slice(-100), // Return last 100 for UI
      message: `Retrieved ${memories.length} encrypted memories from Hedera HCS`,
    });
  } catch (error) {
    console.error("[API] Failed to retrieve memories from Hedera:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve memories" },
      { status: 500 }
    );
  }
}
