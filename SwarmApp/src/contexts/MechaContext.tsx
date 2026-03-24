/** MechaContext — Provides Mecha LaunchPad label mappings when the mecha skin is active. */
"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSkin } from "@/contexts/SkinContext";

/** Map of standard Swarm labels → Mecha equivalents */
const MECHA_LABELS: Record<string, string> = {
  // ── Sidebar sections ──
  Command: "Mission Control",
  Deploy: "Launch",
  Coordinate: "Tactical HQ",
  Platform: "Foundry",
  Modifications: "Upgrades",
  Admin: "Command Override",

  // ── Sidebar items ──
  Dashboard: "Command Deck",
  Credit: "Alloy Reserve",
  Activity: "Ops Feed",
  Health: "Diagnostics",
  "Agent Map": "Deployment Map",
  Logs: "Telemetry",
  Fleet: "Mech Hangar",
  Projects: "Operations",
  Marketplace: "Parts Depot",
  Team: "Crew",
  Compute: "Reactor",
  Computers: "Cores",
  Workspaces: "Bays",
  "Task Board": "Mission Board",
  "Job Board": "Contracts",
  Channels: "Comms",
  Approvals: "Authorization",
  Workflows: "Procedures",
  Scheduler: "Mission Planner",
  Organizations: "Factions",
  "Usage & Billing": "Resource Alloc",
  Storage: "Cargo Bay",
  Cerebro: "AI Core",
  Publisher: "Fabricator",
  Docs: "Tech Manual",
  Settings: "Maintenance Bay",

  // ── Header / general ──
  Swarm: "Squadron",
  Agents: "Mechs",
  agents: "mechs",
  Tasks: "Missions",
  tasks: "missions",
  Credits: "Alloy",
  credits: "alloy",
  Connected: "Linked",
  Online: "Operational",
  Offline: "Standby",
  Busy: "Deployed",

  // ── Admin ──
  "Credit Ops": "Alloy Ops",
  Risk: "Threat Matrix",

  // ── Status ──
  running: "active",
  idle: "standby",
  error: "malfunction",
  completed: "mission complete",
};

interface MechaContextValue {
  isMecha: boolean;
  label: (key: string) => string;
  labels: Record<string, string>;
}

const MechaContext = createContext<MechaContextValue>({
  isMecha: false,
  label: (key: string) => key,
  labels: {},
});

export function MechaProvider({ children }: { children: ReactNode }) {
  const { skin } = useSkin();
  const isMecha = skin === "mecha";

  const value = useMemo<MechaContextValue>(() => ({
    isMecha,
    label: (key: string) => (isMecha ? MECHA_LABELS[key] ?? key : key),
    labels: isMecha ? MECHA_LABELS : {},
  }), [isMecha]);

  return (
    <MechaContext.Provider value={value}>
      {children}
    </MechaContext.Provider>
  );
}

export function useMecha() {
  return useContext(MechaContext);
}
