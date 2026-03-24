/**
 * POST /api/v1/asn-memory/transfer
 *
 * Transfer memory entries from one agent to another.
 * Copies messages from source agent to target agent.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    query,
    where,
    serverTimestamp,
} from "firebase/firestore";

interface TransferRequest {
    sourceAgentId: string;
    targetAgentId: string;
    orgId: string;
    memoryTypes?: string[];
}

export async function POST(req: NextRequest) {
    try {
        const session = await validateSession();
        if (!session?.address) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: TransferRequest = await req.json();
        const { sourceAgentId, targetAgentId, orgId, memoryTypes } = body;

        if (!sourceAgentId || !targetAgentId || !orgId) {
            return NextResponse.json(
                { error: "sourceAgentId, targetAgentId, and orgId are required" },
                { status: 400 },
            );
        }

        if (sourceAgentId === targetAgentId) {
            return NextResponse.json(
                { error: "Source and target agent must be different" },
                { status: 400 },
            );
        }

        // Verify both agents exist and belong to the org
        const [sourceSnap, targetSnap] = await Promise.all([
            getDoc(doc(db, "agents", sourceAgentId)),
            getDoc(doc(db, "agents", targetAgentId)),
        ]);

        if (!sourceSnap.exists()) {
            return NextResponse.json({ error: "Source agent not found" }, { status: 404 });
        }
        if (!targetSnap.exists()) {
            return NextResponse.json({ error: "Target agent not found" }, { status: 404 });
        }

        const sourceData = sourceSnap.data();
        const targetData = targetSnap.data();

        if (sourceData.orgId !== orgId || targetData.orgId !== orgId) {
            return NextResponse.json({ error: "Both agents must belong to the same org" }, { status: 403 });
        }

        // Fetch source agent's messages
        const msgQ = query(
            collection(db, "messages"),
            where("agentId", "==", sourceAgentId),
            where("orgId", "==", orgId),
        );
        const msgSnap = await getDocs(msgQ);

        let transferred = 0;
        for (const msgDoc of msgSnap.docs) {
            const msgData = msgDoc.data();

            // Filter by memory type if specified
            if (memoryTypes && memoryTypes.length > 0) {
                const msgType = msgData.type || msgData.role || "conversation";
                if (!memoryTypes.includes(msgType)) continue;
            }

            // Copy message to target agent
            await addDoc(collection(db, "messages"), {
                ...msgData,
                agentId: targetAgentId,
                originalAgentId: sourceAgentId,
                transferredAt: serverTimestamp(),
                transferredFrom: sourceData.name || sourceAgentId,
            });
            transferred++;
        }

        // Record the transfer
        await addDoc(collection(db, "memoryTransfers"), {
            sourceAgentId,
            targetAgentId,
            orgId,
            sourceAgentName: sourceData.name,
            targetAgentName: targetData.name,
            messagesCopied: transferred,
            memoryTypes: memoryTypes || ["all"],
            transferredBy: session.address,
            createdAt: serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            transferred,
            source: { id: sourceAgentId, name: sourceData.name },
            target: { id: targetAgentId, name: targetData.name },
        });
    } catch (error) {
        console.error("[API] memory transfer error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Transfer failed" },
            { status: 500 },
        );
    }
}
