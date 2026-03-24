/** MechaHeader — HUD-style military status bar replacing the standard header. */
"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import Link from "next/link";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { thirdwebClient } from "@/lib/thirdweb-client";
import { WALLET_CHAINS, DEFAULT_CHAIN } from "@/lib/chains";
import { swarmWallets } from "@/lib/wallets";
import { useOrg } from "@/contexts/OrgContext";
import { useSession } from "@/contexts/SessionContext";
import { useMecha } from "@/contexts/MechaContext";
import { NotificationCenter } from "@/components/notification-center";
import { useThirdwebAuth } from "@/hooks/useThirdwebAuth";

/** Compact wallet display for Mecha header */
function MechaWalletDisplay() {
  const account = useActiveAccount();
  const { address: sessionAddress, authenticated, logout } = useSession();
  const authConfig = useThirdwebAuth();
  const [showMenu, setShowMenu] = useState(false);

  if (account) {
    return <ConnectButton client={thirdwebClient} wallets={swarmWallets} chain={DEFAULT_CHAIN} chains={WALLET_CHAINS} />;
  }

  if (authenticated && sessionAddress) {
    const truncated = `${sessionAddress.slice(0, 6)}...${sessionAddress.slice(-4)}`;
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu((prev) => !prev)}
          className="flex items-center gap-1.5 px-2 py-1 border border-[#30363d] bg-[#0d1117]/80 text-[#58a6ff] text-[10px] hover:border-[#58a6ff] transition-colors"
          style={{ fontFamily: "var(--font-mecha), monospace", borderRadius: "2px" }}
          title={sessionAddress}
        >
          <span className="w-1.5 h-1.5 bg-[#3fb950] shadow-[0_0_4px_#3fb950]" />
          {truncated}
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-[#161b22] border border-[#30363d] z-50 min-w-[140px] py-1 shadow-lg" style={{ borderRadius: "2px" }}>
            <div onClick={() => setShowMenu(false)} className="px-2 py-1.5 text-[10px]">
              <ConnectButton client={thirdwebClient} wallets={swarmWallets} chain={DEFAULT_CHAIN} chains={WALLET_CHAINS} connectButton={{ label: "Connect" }} />
            </div>
            <button
              onClick={async () => { setShowMenu(false); await logout(); }}
              className="w-full text-left px-2 py-1.5 text-[10px] text-[#f85149] hover:text-[#ff7b72]"
              style={{ fontFamily: "var(--font-mecha), monospace" }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return <ConnectButton client={thirdwebClient} wallets={swarmWallets} chain={DEFAULT_CHAIN} chains={WALLET_CHAINS} connectButton={{ label: "Link" }} />;
}

export function MechaHeader() {
  const { theme, setTheme } = useTheme();
  const { currentOrg } = useOrg();
  const { label } = useMecha();
  const account = useActiveAccount();
  const isConnected = !!account;
  const [mounted, setMounted] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string; status: string }[]>([]);
  useEffect(() => setMounted(true), []);

  // Fetch agents for HUD status display
  useEffect(() => {
    if (!currentOrg) return;
    const fetchAgents = async () => {
      try {
        const res = await fetch(`/api/agents?orgId=${currentOrg.id}`);
        if (res.ok) {
          const data = await res.json();
          setAgents((data.agents || data || []).slice(0, 6));
        }
      } catch { /* ignore */ }
    };
    fetchAgents();
  }, [currentOrg]);

  const orgName = currentOrg?.name || "No Squadron";
  const maxSlots = 6;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#30363d] bg-gradient-to-r from-[#0d1117] via-[#161b22] to-[#0d1117]">
      <div className="flex h-12 items-center justify-between px-4">
        {/* Left: Squadron info */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <span
              className="text-sm text-[#58a6ff] group-hover:text-[#3fb950] transition-colors"
              style={{ fontFamily: "var(--font-mecha), monospace" }}
            >
              ⬡
            </span>
            <span
              className="text-xs font-bold text-[#e6edf3] tracking-wider group-hover:text-[#58a6ff] transition-colors uppercase"
              style={{ fontFamily: "var(--font-mecha), monospace" }}
            >
              SWARM
            </span>
          </Link>
          <div className="h-4 w-px bg-[#30363d]" />
          <span
            className="text-[9px] text-[#8b949e] tracking-wide uppercase"
            style={{ fontFamily: "var(--font-mecha), monospace" }}
          >
            {label("Swarm")}: <span className="text-[#58a6ff]">{orgName}</span>
          </span>
        </div>

        {/* Center: Mech Status Array */}
        <div className="hidden md:flex items-center gap-3 px-4 py-1 mecha-hud-border bg-[#0d1117]/60">
          <span
            className="text-[8px] text-[#8b949e] uppercase tracking-wider"
            style={{ fontFamily: "var(--font-mecha), monospace" }}
          >
            {label("Agents")}
          </span>
          {Array.from({ length: maxSlots }).map((_, i) => {
            const agent = agents[i];
            const statusColor = agent?.status === "online" ? "#3fb950"
              : agent?.status === "busy" ? "#d29922"
              : "#484f58";
            return (
              <div key={i} className="flex items-center gap-1" title={agent?.name || "Empty bay"}>
                <span
                  className="w-2 h-2"
                  style={{ backgroundColor: statusColor, boxShadow: agent ? `0 0 4px ${statusColor}` : "none" }}
                />
                {agent && (
                  <span
                    className="text-[7px] text-[#e6edf3]/60 max-w-[50px] truncate"
                    style={{ fontFamily: "var(--font-mecha), monospace" }}
                  >
                    {agent.name}
                  </span>
                )}
              </div>
            );
          })}
          <span
            className="text-[8px] text-[#8b949e]/50 ml-1"
            style={{ fontFamily: "var(--font-mecha), monospace" }}
          >
            {agents.length}/{maxSlots}
          </span>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {isConnected && <NotificationCenter />}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 border border-[#30363d] hover:border-[#58a6ff] bg-[#0d1117]/60 text-[#8b949e] hover:text-[#58a6ff] transition-all"
              style={{ borderRadius: "2px" }}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          )}
          <MechaWalletDisplay />
        </div>
      </div>
    </header>
  );
}
