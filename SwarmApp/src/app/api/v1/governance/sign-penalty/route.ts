/**
 * POST /api/v1/governance/sign-penalty
 *
 * Sign approval for a pending penalty proposal.
 * When all required signatures collected, penalty executes automatically.
 *
 * Body: { proposalId }
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { signPenaltyProposal, getPenaltyProposal } from "@/lib/hedera-governance";
import { getWalletAddress } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
    try {
        const wallet = getWalletAddress(req);
        if (!wallet) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const session = await validateSession();
        if (!session?.address) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { proposalId } = await req.json();

        if (!proposalId) {
            return NextResponse.json(
                { error: "Missing proposalId" },
                { status: 400 },
            );
        }

        const result = await signPenaltyProposal(proposalId, session.sub);

        if (result.executed) {
            return NextResponse.json({
                success: true,
                proposalId,
                executed: true,
                message: `✅ Penalty executed! All signatures collected and penalty applied.`,
                status: result.status,
            });
        }

        const proposal = await getPenaltyProposal(proposalId);
        const signaturesCollected = proposal?.currentSigners.length || 0;
        const signaturesRequired = proposal?.requiredSigners.length || 0;

        return NextResponse.json({
            success: true,
            proposalId,
            executed: false,
            message: `✅ Signature recorded (${signaturesCollected}/${signaturesRequired})`,
            status: result.status,
            signaturesCollected,
            signaturesRequired,
        });
    } catch (error) {
        console.error("Sign penalty error:", error);
        return NextResponse.json(
            {
                error: "Failed to sign penalty proposal",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}
