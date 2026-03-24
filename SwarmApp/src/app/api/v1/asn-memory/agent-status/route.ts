/**
 * GET /api/v1/asn-memory/agent-status
 *
 * Returns memory backup status for a specific agent.
 * Query params: agentId, orgId
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
} from "firebase/firestore";

export async function GET(req: NextRequest) {
    const agentId = req.nextUrl.searchParams.get("agentId");
    const orgId = req.nextUrl.searchParams.get("orgId");

    if (!agentId || !orgId) {
        return NextResponse.json(
            { error: "agentId and orgId are required" },
            { status: 400 },
        );
    }

    try {
        // Get agent record
        const agentSnap = await getDoc(doc(db, "agents", agentId));
        if (!agentSnap.exists()) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }
        const agentData = agentSnap.data();

        if (agentData.orgId !== orgId) {
            return NextResponse.json({ error: "Agent not in this org" }, { status: 403 });
        }

        const asn = agentData.asn;

        // Check ASN backup
        let hasBackup = false;
        let lastBackup: string | undefined;
        let messageCount = 0;
        let cid: string | undefined;

        if (asn) {
            const backupSnap = await getDoc(doc(db, "asnMemoryBackups", asn));
            if (backupSnap.exists()) {
                const backupData = backupSnap.data();
                hasBackup = true;
                lastBackup = backupData.lastBackup?.toDate?.()?.toISOString()
                    ?? backupData.createdAt?.toDate?.()?.toISOString()
                    ?? undefined;
                messageCount = backupData.messageCount ?? 0;
                cid = backupData.cid ?? undefined;
            }
        }

        // Count messages for this agent
        if (!messageCount) {
            try {
                const msgQ = query(
                    collection(db, "messages"),
                    where("agentId", "==", agentId),
                    where("orgId", "==", orgId),
                );
                const msgSnap = await getDocs(msgQ);
                messageCount = msgSnap.size;
            } catch {
                // Non-fatal: may fail if index is missing
            }
        }

        return NextResponse.json({
            hasBackup,
            lastBackup,
            messageCount,
            cid,
            hederaTopicId: agentData.hederaMemoryTopicId ?? null,
            hederaMemoryEnabled: agentData.hederaMemoryEnabled ?? false,
        });
    } catch (error) {
        console.error("[API] agent-status error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
