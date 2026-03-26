/** OfficeToolbar — Two-row grouped layout with always-visible search & panel buttons */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Layout,
  Box,
  Search,
  Maximize2,
  Minimize2,
  Globe,
  Gamepad2,
  ListTodo,
  Inbox,
  BarChart3,
  DollarSign,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOffice } from "./office-store";
import type { AgentVisualStatus } from "./types";
import { STATUS_LABELS, LAYOUT_TEMPLATES } from "./types";
import { THEME_PRESETS } from "./themes";
import { OfficeGenerationDialog } from "./studio/OfficeGenerationDialog";
import type { Locale } from "./i18n";

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ko", label: "KO" },
  { value: "ja", label: "JA" },
  { value: "zh", label: "ZH" },
];

const STATUS_OPTIONS: (AgentVisualStatus | "all")[] = [
  "all",
  "active",
  "thinking",
  "tool_calling",
  "error",
  "blocked",
  "idle",
  "offline",
];

/** Panels the toolbar can toggle open */
export type ToolbarPanel = "agent-detail" | "task-board" | "decision-inbox" | "reports" | "cost-metrics" | null;

interface OfficeToolbarProps {
  view: "2d" | "3d";
  openPanel?: ToolbarPanel;
  onPanelChange?: (panel: ToolbarPanel) => void;
  /** Badge counts for panel buttons */
  decisionCount?: number;
  taskCount?: number;
  reportCount?: number;
}

export function OfficeToolbar({ view, openPanel, onPanelChange, decisionCount = 0, taskCount = 0, reportCount = 0 }: OfficeToolbarProps) {
  const { state, dispatch } = useOffice();
  const { activeCount, errorCount } = state.metrics;
  const agentCount = state.agents.size;
  const [searchValue, setSearchValue] = useState(state.filter.searchQuery);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Debounced search dispatch
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: "SET_FILTER", filter: { searchQuery: searchValue } });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, dispatch]);

  // Track fullscreen state
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Close settings on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  }, []);

  const togglePanel = useCallback(
    (panel: ToolbarPanel) => {
      onPanelChange?.(openPanel === panel ? null : panel);
    },
    [openPanel, onPanelChange],
  );

  const ViewIcon = view === "2d" ? Layout : Box;
  const otherView = view === "2d" ? "3d" : "2d";
  const OtherIcon = view === "2d" ? Box : Layout;

  return (
    <div className="space-y-1.5">
      {/* ── Row 1: Identity & Status ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/mods/office-sim">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <div className="flex items-center gap-1.5">
            <ViewIcon className="h-4 w-4 text-amber-400" />
            <h1 className="text-sm font-semibold">
              {view === "2d" ? "2D Office" : "3D Office"}
            </h1>
          </div>
          <Badge variant="outline" className="text-[10px] ml-1">
            {activeCount} active / {agentCount} total
          </Badge>
          {errorCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] border-red-500/30 text-red-400"
            >
              {errorCount} errors
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Hub indicator */}
          <Badge
            variant="outline"
            className={`text-[10px] ${
              state.hubConnected
                ? "border-green-500/30 text-green-400"
                : "border-yellow-500/30 text-yellow-400"
            }`}
          >
            {state.hubConnected ? "Hub Live" : "Polling"}
          </Badge>

          {/* View switch */}
          <Link href={`/mods/office-sim/${otherView}`}>
            <Button variant="outline" size="sm" className="text-xs gap-1 h-7 px-2">
              <OtherIcon className="h-3 w-3" />
              {otherView.toUpperCase()}
            </Button>
          </Link>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleFullscreen}
            title="Toggle fullscreen (F11)"
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* ── Row 2: Controls ── */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Search + Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchValue("");
              }}
              placeholder="Search agents... ( / )"
              className="h-7 w-44 rounded-md border border-border bg-background pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder:text-muted-foreground/60"
            />
            {searchValue && (
              <button
                onClick={() => setSearchValue("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <select
            value={state.filter.statusFilter}
            onChange={(e) =>
              dispatch({
                type: "SET_FILTER",
                filter: {
                  statusFilter: e.target.value as AgentVisualStatus | "all",
                },
              })
            }
            className="h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All Statuses" : STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Panels | Settings | Actions */}
        <div className="flex items-center gap-1">
          {/* Panel buttons */}
          <PanelButton
            active={openPanel === "task-board"}
            onClick={() => togglePanel("task-board")}
            title="Task Board"
            icon={<ListTodo className="h-3.5 w-3.5" />}
            label="Tasks"
            count={taskCount}
            activeClass="bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
            countClass="bg-cyan-500/20 text-cyan-300"
          />

          <PanelButton
            active={openPanel === "decision-inbox"}
            onClick={() => togglePanel("decision-inbox")}
            title="CEO Decision Inbox"
            icon={<Inbox className="h-3.5 w-3.5" />}
            label="Inbox"
            count={decisionCount}
            activeClass="bg-amber-500/20 text-amber-400 border-amber-500/30"
            countClass="bg-red-500/20 text-red-300"
          />

          <PanelButton
            active={openPanel === "reports"}
            onClick={() => togglePanel("reports")}
            title="Report History"
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            label="Reports"
            count={reportCount}
            activeClass="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            countClass="bg-emerald-500/20 text-emerald-300"
          />

          <PanelButton
            active={openPanel === "cost-metrics"}
            onClick={() => togglePanel("cost-metrics")}
            title="Cost & Performance"
            icon={<DollarSign className="h-3.5 w-3.5" />}
            label="Costs"
            activeClass="bg-purple-500/20 text-purple-400 border-purple-500/30"
          />

          {/* Separator */}
          <div className="h-4 w-px bg-border mx-1" />

          {/* Settings dropdown */}
          <div className="relative" ref={settingsRef}>
            <Button
              variant={settingsOpen ? "default" : "ghost"}
              size="icon"
              className={`h-7 w-7 ${settingsOpen ? "bg-muted" : ""}`}
              onClick={() => setSettingsOpen(!settingsOpen)}
              title="Workspace settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>

            {settingsOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-popover p-3 shadow-lg space-y-3">
                {/* Theme */}
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Theme
                  </label>
                  <select
                    value={state.theme.id}
                    onChange={(e) => {
                      const t = THEME_PRESETS.find((p) => p.id === e.target.value);
                      if (t) dispatch({ type: "SET_THEME", theme: t });
                    }}
                    className="w-full h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                  >
                    {THEME_PRESETS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Layout */}
                {LAYOUT_TEMPLATES.length > 1 && (
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Layout
                    </label>
                    <select
                      value={state.layout.id}
                      onChange={(e) => {
                        const tmpl = LAYOUT_TEMPLATES.find(
                          (t) => t.id === e.target.value,
                        );
                        if (tmpl)
                          dispatch({ type: "SET_LAYOUT", layout: tmpl });
                      }}
                      className="w-full h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    >
                      {LAYOUT_TEMPLATES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Language */}
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Language
                  </label>
                  <div className="flex items-center gap-1">
                    {LOCALE_OPTIONS.map((l) => (
                      <button
                        key={l.value}
                        onClick={() =>
                          dispatch({
                            type: "SET_LOCALE",
                            locale: l.value,
                          })
                        }
                        className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                          state.locale === l.value
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "text-muted-foreground hover:bg-muted border border-transparent"
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CEO Mode */}
          <Button
            variant={state.ceoActive ? "default" : "outline"}
            size="sm"
            className={`text-xs gap-1 h-7 px-2 ${
              state.ceoActive
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : ""
            }`}
            onClick={() =>
              dispatch({
                type: "SET_CEO_ACTIVE",
                active: !state.ceoActive,
              })
            }
            title={state.ceoActive ? "CEO Mode ON — WASD to move" : "Enable CEO Mode (keyboard avatar)"}
          >
            <Gamepad2 className="h-3.5 w-3.5" />
            CEO
          </Button>

          {/* Generate Office */}
          <OfficeGenerationDialog />
        </div>
      </div>

      {/* CEO Mode hint bar */}
      {state.ceoActive && (
        <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] text-amber-400">
          <Gamepad2 className="h-3 w-3" />
          <span>CEO Mode active — Use <kbd className="rounded bg-amber-500/20 px-1 font-mono">WASD</kbd> or arrow keys to navigate. Press <kbd className="rounded bg-amber-500/20 px-1 font-mono">Esc</kbd> to exit.</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   PanelButton — Toolbar panel toggle with optional badge
   ═══════════════════════════════════════ */

function PanelButton({
  active,
  onClick,
  title,
  icon,
  label,
  count,
  activeClass,
  countClass,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  activeClass: string;
  countClass?: string;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      className={`text-xs gap-1.5 h-7 px-2.5 ${active ? activeClass : ""}`}
      onClick={onClick}
      title={title}
    >
      {icon}
      {label}
      {count != null && count > 0 && (
        <span className={`ml-0.5 rounded-full px-1.5 py-0 text-[10px] font-medium leading-tight ${countClass || "bg-slate-500/20 text-slate-300"}`}>
          {count}
        </span>
      )}
    </Button>
  );
}
