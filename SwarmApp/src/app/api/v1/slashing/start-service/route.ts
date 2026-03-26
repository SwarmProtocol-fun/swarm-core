/**
 * POST /api/v1/slashing/start-service
 *
 * Start the auto-slashing service for missed deadlines.
 * Checks for overdue tasks every 15 minutes and auto-penalizes agents.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { startSlashingService } from "@/lib/hedera-slashing";
import { requirePlatformAdmin, requireInternalService } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
    try {
        const adminCheck = requirePlatformAdmin(req);
        const serviceCheck = requireInternalService(req);
        if (!adminCheck.ok && !serviceCheck.ok) {
            return NextResponse.json({ error: "Platform admin or internal service access required" }, { status: 403 });
        }

        const session = await validateSession();
        if (!session?.address && !serviceCheck.ok) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        startSlashingService();

        return NextResponse.json({
            success: true,
            message: "⚔️ Auto-slashing service started - agents will be penalized for missed deadlines",
            info: "Checks every 15 minutes for overdue tasks and applies penalties based on lateness",
            penalties: {
                "< 24h late": "-5 credit, -1 trust",
                "> 24h late": "-15 credit, -3 trust",
                "> 7 days late": "-30 credit, -5 trust (abandoned)",
            },
        });
    } catch (error) {
        console.error("Start slashing service error:", error);
        return NextResponse.json(
            {
                error: "Failed to start slashing service",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}
