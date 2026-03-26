/**
 * GET /api/v1/mods/cdp-addon/wallets/:walletId/balance?orgId=...&network=...
 *
 * Fetch token balances for a CDP server wallet via the SDK.
 */
import { NextRequest } from "next/server";
import { requireOrgAdmin, forbidden } from "@/lib/auth-guard";
import { getServerWallet } from "@/lib/cdp-firestore";
import { getTokenBalances } from "@/lib/cdp-client";
import { networkFromChainId, type CdpNetwork } from "@/lib/cdp";

type RouteParams = { params: Promise<{ walletId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
    const { walletId } = await params;
    const orgId = req.nextUrl.searchParams.get("orgId");
    if (!orgId) return Response.json({ error: "orgId required" }, { status: 400 });

    const auth = await requireOrgAdmin(req, orgId);
    if (!auth.ok) return forbidden(auth.error);

    const wallet = await getServerWallet(walletId);
    if (!wallet || wallet.orgId !== orgId) {
        return Response.json({ error: "Wallet not found" }, { status: 404 });
    }

    try {
        const network = (req.nextUrl.searchParams.get("network") as CdpNetwork) ||
            networkFromChainId(wallet.chainId);
        const balances = await getTokenBalances(wallet.address, network);
        return Response.json({ balances });
    } catch (err) {
        console.error("cdp-addon/wallets balance error:", err);
        const message = err instanceof Error ? err.message : "Failed to fetch balances";
        return Response.json({ error: message }, { status: 500 });
    }
}
