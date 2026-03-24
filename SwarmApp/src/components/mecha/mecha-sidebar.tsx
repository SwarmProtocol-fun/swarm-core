/** MechaSidebar — Industrial/military-styled sidebar with angular design and HUD indicators. */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useOrg } from "@/contexts/OrgContext";
import { useSession } from "@/contexts/SessionContext";
import { useMecha } from "@/contexts/MechaContext";
import { DEFAULT_SECTIONS, PINNED_ITEMS, type NavSection, type NavItem } from "@/components/sidebar";
import { getOwnedItems, SKILL_REGISTRY } from "@/lib/skills";
import { ChevronDown } from "lucide-react";

const PLATFORM_ADMIN_ADDRESS = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "").toLowerCase();

function isAdminAddress(addr: string | null | undefined): boolean {
  if (!addr) return false;
  const lower = addr.toLowerCase();
  return lower === PLATFORM_ADMIN_ADDRESS
    || lower === "0x723708273e811a07d90d2e81e799b9ab27f0b549"
    || lower === "0x116c28e6dcabca363f83217c712d79dce168d90e"
    || lower === "0xeab03556443e0b852a8efe836a004bc02cff2974";
}

/** Angular bracket section indicator */
function SectionIndicator({ color = "#58a6ff" }: { color?: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rotate-45 border-t border-r shrink-0"
      style={{ borderColor: color }}
    />
  );
}

/** Section color themes */
const SECTION_COLORS: Record<string, string> = {
  command: "#58a6ff",     // Primary blue
  deploy: "#3fb950",      // Success green
  coordinate: "#d29922",  // Warning yellow
  platform: "#8b949e",    // Muted
  modifications: "#f85149", // Danger red
  admin: "#bc8cff",       // Purple
};

export function MechaSidebar() {
  const pathname = usePathname();
  const { currentOrg } = useOrg();
  const { address } = useSession();
  const { label } = useMecha();
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(["platform"]));
  const [modItems, setModItems] = useState<NavItem[]>([]);
  const isAdmin = isAdminAddress(address);

  // Load installed mods
  useEffect(() => {
    if (!currentOrg) return;
    getOwnedItems(currentOrg.id).then((owned) => {
      const items: NavItem[] = [];
      for (const oi of owned) {
        const reg = SKILL_REGISTRY.find((s) => s.id === oi.skillId);
        if (reg?.sidebarConfig) {
          items.push({
            id: oi.skillId,
            href: reg.sidebarConfig.href,
            label: reg.sidebarConfig.label,
            icon: DEFAULT_SECTIONS[0].items[0].icon,
          });
        }
      }
      setModItems(items);
    }).catch(() => {});
  }, [currentOrg]);

  // Build sections
  const sections: NavSection[] = DEFAULT_SECTIONS.map((s) => ({
    ...s,
    label: label(s.label),
    items: s.items.map((item) => ({ ...item, label: label(item.label) })),
  }));

  if (modItems.length > 0) {
    const modSection = sections.find((s) => s.id === "modifications");
    if (modSection) {
      for (const mi of modItems) {
        if (!modSection.items.some((i) => i.id === mi.id)) {
          modSection.items.push({ ...mi, label: label(mi.label) });
        }
      }
    }
  }

  if (isAdmin) {
    sections.push({
      id: "admin",
      label: label("Admin"),
      collapsible: true,
      items: [
        { id: "admin-dashboard", href: "/admin", label: label("Dashboard"), icon: DEFAULT_SECTIONS[0].items[0].icon },
        { id: "admin-marketplace", href: "/admin/marketplace", label: label("Marketplace"), icon: DEFAULT_SECTIONS[0].items[0].icon },
        { id: "admin-credit-ops", href: "/admin/credit-ops", label: label("Credit Ops"), icon: DEFAULT_SECTIONS[0].items[0].icon },
        { id: "admin-risk", href: "/admin/risk", label: label("Risk"), icon: DEFAULT_SECTIONS[0].items[0].icon },
      ],
    });
  }

  const pinnedItems = PINNED_ITEMS.map((item) => ({ ...item, label: label(item.label) }));

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const sidebarWidth = collapsed ? "w-14" : "w-56";

  return (
    <aside
      className={cn(
        "flex flex-col h-full overflow-hidden transition-all duration-200 border-r border-[#30363d] bg-gradient-to-b from-[#161b22] to-[#0d1117]",
        sidebarWidth,
      )}
    >
      {/* Title */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-[#30363d]">
        {!collapsed && (
          <span
            className="text-[9px] text-[#58a6ff] tracking-widest uppercase font-bold"
            style={{ fontFamily: "var(--font-mecha), monospace" }}
          >
            NAV
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-[#8b949e] hover:text-[#58a6ff] transition-colors p-1"
          title={collapsed ? "Expand" : "Collapse"}
        >
          <span className="text-xs">{collapsed ? "▶" : "◀"}</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-1 space-y-1">
        {sections.map((section) => {
          const isSectionCollapsed = collapsedSections.has(section.id);
          const sectionColor = SECTION_COLORS[section.id] || "#58a6ff";
          return (
            <div key={section.id}>
              {!collapsed && (
                <button
                  onClick={() => section.collapsible && toggleSection(section.id)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[9px] uppercase tracking-wider hover:opacity-80 transition-opacity"
                  style={{ color: sectionColor, fontFamily: "var(--font-mecha), monospace" }}
                >
                  <SectionIndicator color={sectionColor} />
                  {section.collapsible && (
                    <ChevronDown className={cn("h-3 w-3 transition-transform", isSectionCollapsed && "-rotate-90")} />
                  )}
                  <span className="truncate">{section.label}</span>
                </button>
              )}

              {(!section.collapsible || !isSectionCollapsed) && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 transition-all text-xs group",
                          active
                            ? "bg-[#58a6ff]/10 text-[#58a6ff] border-l-2 border-[#58a6ff]"
                            : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22] border-l-2 border-transparent",
                        )}
                        style={{ fontFamily: "var(--font-mecha), monospace" }}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-[#58a6ff]" : "text-[#484f58]")} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {active && !collapsed && (
                          <span className="ml-auto w-1.5 h-1.5 bg-[#3fb950] shadow-[0_0_4px_#3fb950]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              {!collapsed && <div className="mx-2 my-1 border-t border-[#21262d]" />}
            </div>
          );
        })}
      </nav>

      {/* Bottom pinned */}
      <div className="border-t border-[#30363d] py-2 px-1 space-y-0.5">
        {pinnedItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 transition-all text-xs",
                active ? "text-[#58a6ff]" : "text-[#484f58] hover:text-[#8b949e]",
              )}
              style={{ fontFamily: "var(--font-mecha), monospace" }}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-[#58a6ff]" : "text-[#30363d]")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
        {!collapsed && (
          <div
            className="px-2 pt-2 text-[8px] text-[#30363d]"
            style={{ fontFamily: "var(--font-mecha), monospace" }}
          >
            ⌘K — Quick Launch
          </div>
        )}
      </div>
    </aside>
  );
}
