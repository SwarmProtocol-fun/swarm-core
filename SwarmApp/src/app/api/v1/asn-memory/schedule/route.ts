/**
 * GET/POST /api/v1/asn-memory/schedule
 *
 * Manage automatic backup schedules for agent memory.
 * GET  — fetch schedule for a given agent
 * POST — create or update a backup schedule
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    getDoc,
    setDoc,
    query,
    where,
    getDocs,
    serverTimestamp,
} from "firebase/firestore";

const COLLECTION = "memoryBackupSchedules";

export type BackupFrequency = "off" | "6h" | "12h" | "daily" | "twice_daily";

const FREQ_LABELS: Record<BackupFrequency, string> = {
    off: "Off",
    "6h": "Every 6 hours",
    "12h": "Every 12 hours",
    daily: "Once a day",
    twice_daily: "Twice a day",
};

export async function GET(req: NextRequest) {
    try {
        const session = await validateSession();
        if (!session?.address) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const agentId = req.nextUrl.searchParams.get("agentId");
        const orgId = req.nextUrl.searchParams.get("orgId");
        if (!agentId || !orgId) {
            return NextResponse.json({ error: "agentId and orgId required" }, { status: 400 });
        }

        const docRef = doc(db, COLLECTION, `${orgId}_${agentId}`);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
            return NextResponse.json({
                agentId,
                orgId,
                frequency: "off" as BackupFrequency,
                label: FREQ_LABELS["off"],
                enabled: false,
            });
        }

        const data = snap.data();
        return NextResponse.json({
            agentId,
            orgId,
            frequency: data.frequency || "off",
            label: FREQ_LABELS[data.frequency as BackupFrequency] || "Off",
            enabled: data.frequency !== "off",
            lastAutoBackup: data.lastAutoBackup?.toDate?.()?.toISOString() || null,
            nextBackup: data.nextBackup?.toDate?.()?.toISOString() || null,
        });
    } catch (error) {
        console.error("[API] backup schedule GET error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch schedule" },
            { status: 500 },
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await validateSession();
        if (!session?.address) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { agentId, orgId, frequency } = body as {
            agentId: string;
            orgId: string;
            frequency: BackupFrequency;
        };

        if (!agentId || !orgId || !frequency) {
            return NextResponse.json(
                { error: "agentId, orgId, and frequency required" },
                { status: 400 },
            );
        }

        const validFreqs: BackupFrequency[] = ["off", "6h", "12h", "daily", "twice_daily"];
        if (!validFreqs.includes(frequency)) {
            return NextResponse.json(
                { error: `Invalid frequency. Must be one of: ${validFreqs.join(", ")}` },
                { status: 400 },
            );
        }

        // Fetch agent to get ASN (needed for backup execution)
        const agentSnap = await getDocs(
            query(collection(db, "agents"), where("__name__", "==", agentId)),
        );
        // Also try direct doc lookup
        let agentASN = "";
        let agentName = "";
        if (!agentSnap.empty) {
            const d = agentSnap.docs[0].data();
            agentASN = d.asn || "";
            agentName = d.name || "";
        } else {
            const directSnap = await getDoc(doc(db, "agents", agentId));
            if (directSnap.exists()) {
                const d = directSnap.data();
                agentASN = d.asn || "";
                agentName = d.name || "";
            }
        }

        const docRef = doc(db, COLLECTION, `${orgId}_${agentId}`);
        await setDoc(docRef, {
            agentId,
            orgId,
            agentASN,
            agentName,
            frequency,
            label: FREQ_LABELS[frequency],
            enabled: frequency !== "off",
            updatedBy: session.address,
            updatedAt: serverTimestamp(),
        }, { merge: true });

        return NextResponse.json({
            success: true,
            agentId,
            frequency,
            label: FREQ_LABELS[frequency],
            enabled: frequency !== "off",
        });
    } catch (error) {
        console.error("[API] backup schedule POST error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update schedule" },
            { status: 500 },
        );
    }
}
