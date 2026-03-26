"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Copy, Snowflake, Archive, Loader2, RefreshCw, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrg } from "@/contexts/OrgContext";
import { shortCdpAddr, CdpWalletStatus, CDP_TESTNET_CHAIN_IDS, type CdpServerWallet, type CdpTokenBalance } from "@/lib/cdp";

export default function ServerWalletList() {
    const { currentOrg } = useOrg();
    const orgId = currentOrg?.id;
    const [wallets, setWallets] = useState<CdpServerWallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [label, setLabel] = useState("");
    const [walletType, setWalletType] = useState("smart_account");
    const [balances, setBalances] = useState<Record<string, CdpTokenBalance[]>>({});
    const [balanceLoading, setBalanceLoading] = useState<Record<string, boolean>>({});
    const [faucetLoading, setFaucetLoading] = useState<Record<string, boolean>>({});

    const fetchWallets = useCallback(async () => {
        if (!orgId) return;
        try {
            const res = await fetch(`/api/v1/mods/cdp-addon/wallets?orgId=${orgId}`);
            const data = await res.json();
            setWallets(data.wallets || []);
        } catch (err) {
            console.error("Failed to fetch wallets:", err);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { fetchWallets(); }, [fetchWallets]);

    const fetchBalance = useCallback(async (walletId: string) => {
        if (!orgId) return;
        setBalanceLoading((prev) => ({ ...prev, [walletId]: true }));
        try {
            const res = await fetch(`/api/v1/mods/cdp-addon/wallets/${walletId}/balance?orgId=${orgId}`);
            const data = await res.json();
            if (data.balances) {
                setBalances((prev) => ({ ...prev, [walletId]: data.balances }));
            }
        } catch (err) {
            console.error("Failed to fetch balance:", err);
        } finally {
            setBalanceLoading((prev) => ({ ...prev, [walletId]: false }));
        }
    }, [orgId]);

    const handleFaucet = async (walletId: string) => {
        if (!orgId) return;
        setFaucetLoading((prev) => ({ ...prev, [walletId]: true }));
        try {
            const res = await fetch(`/api/v1/mods/cdp-addon/wallets/${walletId}/faucet`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orgId, token: "eth" }),
            });
            if (res.ok) {
                // Refresh balance after faucet
                setTimeout(() => fetchBalance(walletId), 3000);
            }
        } catch (err) {
            console.error("Faucet request error:", err);
        } finally {
            setFaucetLoading((prev) => ({ ...prev, [walletId]: false }));
        }
    };

    const handleCreate = async () => {
        if (!orgId || !label.trim()) return;
        setCreating(true);
        try {
            const res = await fetch("/api/v1/mods/cdp-addon/wallets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orgId, label: label.trim(), walletType }),
            });
            if (res.ok) {
                setShowCreate(false);
                setLabel("");
                fetchWallets();
            }
        } catch (err) {
            console.error("Create wallet error:", err);
        } finally {
            setCreating(false);
        }
    };

    const handleAction = async (walletId: string, action: "freeze" | "unfreeze" | "archive") => {
        if (!orgId) return;
        if (action === "archive") {
            await fetch(`/api/v1/mods/cdp-addon/wallets/${walletId}?orgId=${orgId}`, { method: "DELETE" });
        } else {
            const status = action === "freeze" ? CdpWalletStatus.Frozen : CdpWalletStatus.Active;
            await fetch(`/api/v1/mods/cdp-addon/wallets/${walletId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orgId, status }),
            });
        }
        fetchWallets();
    };

    const formatBalance = (bal: CdpTokenBalance) => {
        const val = Number(BigInt(bal.amount)) / 10 ** bal.decimals;
        const display = val < 0.0001 && val > 0 ? "<0.0001" : val.toFixed(4);
        return `${display} ${bal.symbol || bal.token}`;
    };

    const statusColor: Record<string, string> = {
        active: "bg-green-500/10 text-green-500",
        frozen: "bg-blue-500/10 text-blue-500",
        rotating: "bg-yellow-500/10 text-yellow-500",
        archived: "bg-muted text-muted-foreground",
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-sm">Server Wallets</CardTitle>
                    <CardDescription>CDP-managed wallets for backend operations</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Create Wallet
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                    </div>
                ) : wallets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No server wallets yet. Create one to get started.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="pb-2 font-medium">Label</th>
                                    <th className="pb-2 font-medium">Address</th>
                                    <th className="pb-2 font-medium">Type</th>
                                    <th className="pb-2 font-medium">Network</th>
                                    <th className="pb-2 font-medium">Status</th>
                                    <th className="pb-2 font-medium">Balance</th>
                                    <th className="pb-2 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {wallets.filter(w => w.status !== CdpWalletStatus.Archived).map((w) => (
                                    <tr key={w.id} className="border-b last:border-0">
                                        <td className="py-2 font-medium">{w.label}</td>
                                        <td className="py-2">
                                            <button
                                                className="font-mono text-xs hover:underline"
                                                onClick={() => navigator.clipboard.writeText(w.address)}
                                                title="Copy address"
                                            >
                                                {shortCdpAddr(w.address)} <Copy className="h-3 w-3 inline ml-1 opacity-50" />
                                            </button>
                                        </td>
                                        <td className="py-2">
                                            <Badge variant="outline" className="text-xs">
                                                {w.walletType === "smart_account" ? "Smart Account" : "EOA"}
                                            </Badge>
                                        </td>
                                        <td className="py-2">
                                            <Badge variant="outline" className="text-xs">
                                                {CDP_TESTNET_CHAIN_IDS.has(w.chainId) ? "Testnet" : "Mainnet"}
                                            </Badge>
                                        </td>
                                        <td className="py-2">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[w.status] || ""}`}>
                                                {w.status}
                                            </span>
                                        </td>
                                        <td className="py-2">
                                            {balances[w.id] ? (
                                                <div className="space-y-0.5">
                                                    {balances[w.id].length === 0 ? (
                                                        <span className="text-xs text-muted-foreground">No tokens</span>
                                                    ) : (
                                                        balances[w.id].slice(0, 3).map((b, i) => (
                                                            <div key={i} className="text-xs font-mono">
                                                                {formatBalance(b)}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-xs"
                                                    onClick={() => fetchBalance(w.id)}
                                                    disabled={balanceLoading[w.id]}
                                                >
                                                    {balanceLoading[w.id] ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <><RefreshCw className="h-3 w-3 mr-1" /> Check</>
                                                    )}
                                                </Button>
                                            )}
                                        </td>
                                        <td className="py-2">
                                            <div className="flex gap-1">
                                                {balances[w.id] && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => fetchBalance(w.id)}
                                                        disabled={balanceLoading[w.id]}
                                                        title="Refresh balance"
                                                    >
                                                        {balanceLoading[w.id] ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                )}
                                                {CDP_TESTNET_CHAIN_IDS.has(w.chainId) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => handleFaucet(w.id)}
                                                        disabled={faucetLoading[w.id]}
                                                        title="Request testnet funds"
                                                    >
                                                        {faucetLoading[w.id] ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Droplets className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                )}
                                                {w.status === CdpWalletStatus.Active && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => handleAction(w.id, "freeze")}
                                                        title="Freeze"
                                                    >
                                                        <Snowflake className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                {w.status === CdpWalletStatus.Frozen && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => handleAction(w.id, "unfreeze")}
                                                        title="Unfreeze"
                                                    >
                                                        <Snowflake className="h-3.5 w-3.5 text-blue-500" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive"
                                                    onClick={() => handleAction(w.id, "archive")}
                                                    title="Archive"
                                                >
                                                    <Archive className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>

            {/* Create Wallet Dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Server Wallet</DialogTitle>
                        <DialogDescription>
                            Create a new CDP-managed wallet for backend operations.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Label</label>
                            <Input
                                placeholder="e.g. Trading Agent Wallet"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Wallet Type</label>
                            <Select value={walletType} onValueChange={setWalletType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="smart_account">Smart Account</SelectItem>
                                    <SelectItem value="eoa">EOA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={creating || !label.trim()}>
                            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
