/**
 * TON Deploy API
 *
 * GET   /api/v1/ton/deploy — List deployments for an org (query: orgId, type?, id?)
 * POST  /api/v1/ton/deploy — Create a new deployment request
 * PATCH /api/v1/ton/deploy — Update deployment status (compile result, tx hash, contract address)
 */
import { NextRequest } from "next/server";
import {
    createTonDeployment,
    updateTonDeployment,
    getTonDeployment,
    getTonDeployments,
    estimateDeployCost,
    type TonDeployType,
    type TonDeployConfig,
} from "@/lib/ton-deploy";
import { logTonAudit, checkTonPolicy } from "@/lib/ton-policy";
import { requireOrgMember } from "@/lib/auth-guard";

const VALID_TYPES: TonDeployType[] = [
    "smart_contract", "jetton", "nft_collection", "nft_item", "sbt", "dex_pool",
];

// ─── GET: List deployments or fetch single ───────────────────

export async function GET(req: NextRequest) {
    const url = req.nextUrl;
    const orgId = url.searchParams.get("orgId");
    if (!orgId) return Response.json({ error: "orgId required" }, { status: 400 });

    const auth = await requireOrgMember(req, orgId);
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

    // Single deployment lookup
    const id = url.searchParams.get("id");
    if (id) {
        const deployment = await getTonDeployment(id);
        if (!deployment || deployment.orgId !== orgId) {
            return Response.json({ error: "Deployment not found" }, { status: 404 });
        }
        return Response.json({ deployment });
    }

    // List deployments
    const typeFilter = url.searchParams.get("type") as TonDeployType | null;
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const cursor = url.searchParams.get("cursor") || undefined;

    const { deployments, nextCursor } = await getTonDeployments(
        orgId, limit, cursor,
        typeFilter && VALID_TYPES.includes(typeFilter) ? typeFilter : undefined,
    );

    return Response.json({ count: deployments.length, deployments, nextCursor });
}

// ─── POST: Create deployment ────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            orgId, type, name, description,
            deployerAddress, network, config,
            createdBy, agentId,
        } = body as {
            orgId: string;
            type: TonDeployType;
            name: string;
            description?: string;
            deployerAddress: string;
            network?: "mainnet" | "testnet";
            config: TonDeployConfig;
            createdBy?: string;
            agentId?: string;
        };

        if (!orgId || !type || !name || !deployerAddress || !config) {
            return Response.json(
                { error: "orgId, type, name, deployerAddress, and config are required" },
                { status: 400 },
            );
        }

        if (!VALID_TYPES.includes(type)) {
            return Response.json(
                { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
                { status: 400 },
            );
        }

        const auth = await requireOrgMember(req, orgId);
        if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

        // Validate config type matches deployment type
        if (config.type !== type) {
            return Response.json(
                { error: `config.type "${config.type}" must match deployment type "${type}"` },
                { status: 400 },
            );
        }

        // Estimate gas cost
        const estimatedCostNano = estimateDeployCost(type);

        // Check spending policy (deployment cost treated as a payment)
        const policyCheck = await checkTonPolicy({
            orgId,
            toAddress: deployerAddress, // self-deploy
            amountNano: estimatedCostNano,
        });

        let status: "pending" | "pending_approval" = "pending";
        if (!policyCheck.allowed) {
            return Response.json(
                { error: `Blocked by spending policy: ${policyCheck.reason}` },
                { status: 402 },
            );
        }
        if (policyCheck.requiresApproval) {
            status = "pending_approval";
        }

        const safeName = name.trim().slice(0, 256);
        const safeDesc = (description || "").trim().slice(0, 4000);

        const deployment = await createTonDeployment({
            orgId,
            type,
            status,
            name: safeName,
            description: safeDesc,
            deployerAddress,
            network: network || "mainnet",
            contractAddress: null,
            txHash: null,
            bocHex: null,
            config,
            estimatedCostNano,
            actualCostNano: null,
            createdBy: createdBy || auth.walletAddress || "",
            agentId: agentId || null,
            errorMessage: null,
        });

        await logTonAudit({
            orgId,
            event: "payment_created", // reuse existing audit event for deploy tracking
            paymentId: deployment.id,
            subscriptionId: null,
            fromAddress: deployerAddress,
            toAddress: null,
            amountNano: estimatedCostNano,
            txHash: null,
            policyResult: policyCheck.result,
            reviewedBy: createdBy || auth.walletAddress || null,
            note: `Deployment created: ${type} "${safeName}"`,
        });

        return Response.json({
            deployment,
            policyResult: policyCheck.result,
        }, { status: 201 });
    } catch (err) {
        console.error("[ton/deploy POST]", err);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ─── PATCH: Update deployment status ─────────────────────────

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            orgId, id, action,
            contractAddress, txHash, bocHex,
            actualCostNano, errorMessage,
        } = body as {
            orgId: string;
            id: string;
            action: "approve" | "reject" | "compile" | "deploying" | "deployed" | "failed";
            contractAddress?: string;
            txHash?: string;
            bocHex?: string;
            actualCostNano?: string;
            errorMessage?: string;
        };

        if (!orgId || !id || !action) {
            return Response.json({ error: "orgId, id, and action are required" }, { status: 400 });
        }

        const auth = await requireOrgMember(req, orgId);
        if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

        const deployment = await getTonDeployment(id);
        if (!deployment || deployment.orgId !== orgId) {
            return Response.json({ error: "Deployment not found" }, { status: 404 });
        }

        switch (action) {
            case "approve":
                if (deployment.status !== "pending_approval") {
                    return Response.json({ error: "Deployment is not pending approval" }, { status: 400 });
                }
                await updateTonDeployment(id, { status: "pending" });
                break;

            case "reject":
                if (deployment.status !== "pending_approval") {
                    return Response.json({ error: "Deployment is not pending approval" }, { status: 400 });
                }
                await updateTonDeployment(id, { status: "rejected" });
                break;

            case "compile":
                await updateTonDeployment(id, {
                    status: "compiling",
                    ...(bocHex ? { bocHex } : {}),
                });
                break;

            case "deploying":
                await updateTonDeployment(id, { status: "deploying" });
                break;

            case "deployed":
                await updateTonDeployment(id, {
                    status: "deployed",
                    contractAddress: contractAddress || null,
                    txHash: txHash || null,
                    actualCostNano: actualCostNano || null,
                    deployedAt: new Date(),
                });
                await logTonAudit({
                    orgId,
                    event: "payment_executed",
                    paymentId: id,
                    subscriptionId: null,
                    fromAddress: deployment.deployerAddress,
                    toAddress: contractAddress || null,
                    amountNano: actualCostNano || deployment.estimatedCostNano,
                    txHash: txHash || null,
                    policyResult: "allowed",
                    reviewedBy: auth.walletAddress || null,
                    note: `Deployed ${deployment.type} "${deployment.name}" at ${contractAddress || "pending"}`,
                });
                break;

            case "failed":
                await updateTonDeployment(id, {
                    status: "failed",
                    errorMessage: errorMessage || "Deployment failed",
                });
                break;

            default:
                return Response.json({ error: "Invalid action" }, { status: 400 });
        }

        const updated = await getTonDeployment(id);
        return Response.json({ deployment: updated });
    } catch (err) {
        console.error("[ton/deploy PATCH]", err);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
