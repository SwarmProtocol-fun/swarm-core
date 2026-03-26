/**
 * POST /api/v1/mods/cdp-addon/wallets/:walletId/faucet
 *
 * Request testnet funds from the CDP faucet.
 * Only works for wallets on testnet networks.
 */
import { NextRequest } from "next/server";
import { requireOrgAdmin, forbidden } from "@/lib/auth-guard";
import { getServerWallet, logCdpAudit } from "@/lib/cdp-firestore";
import { requestTestnetFaucet } from "@/lib/cdp-client";
import { CDP_TESTNET_CHAIN_IDS, networkFromChainId } from "@/lib/cdp";

type RouteParams = { params: Promise<{ walletId: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
    const { walletId } = await params;

    try {
        const body = await req.json();
        const { orgId, token } = body;

        if (!orgId) return Response.json({ error: "orgId required" }, { status: 400 });

        const auth = await requireOrgAdmin(req, orgId);
        if (!auth.ok) return forbidden(auth.error);

        const wallet = await getServerWallet(walletId);
        if (!wallet || wallet.orgId !== orgId) {
            return Response.json({ error: "Wallet not found" }, { status: 404 });
        }

        if (!CDP_TESTNET_CHAIN_IDS.has(wallet.chainId)) {
            return Response.json({ error: "Faucet is only available on testnet networks" }, { status: 400 });
        }

        const network = networkFromChainId(wallet.chainId);
        const result = await requestTestnetFaucet(wallet.address, token || "eth", network);

        await logCdpAudit({
            orgId,
            walletId,
            action: "faucet.request",
            details: { token: token || "eth", network, txHash: result.transactionHash },
            outcome: "success",
        });

        return Response.json({
            txHash: result.transactionHash,
            token: token || "eth",
            network,
        });
    } catch (err) {
        console.error("cdp-addon/wallets faucet error:", err);
        const message = err instanceof Error ? err.message : "Faucet request failed";
        return Response.json({ error: message }, { status: 500 });
    }
}
