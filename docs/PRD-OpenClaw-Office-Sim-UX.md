# OpenClaw Office Sim — UX/UI PRD

> **Mod ID:** `openclaw-office-sim`
> **Type:** Premium Swarm Marketplace Mod
> **Version:** 0.1.0-draft
> **Date:** 2026-03-24
> **Status:** Draft

---

## 1. Vision

OpenClaw Office Sim transforms the Swarm agent monitoring experience from static dashboards and log streams into a living, breathing virtual office. Every agent becomes a visible employee — sitting at a desk, walking to a meeting, blocked at a whiteboard, or sprinting through a tool call. Two synchronized views serve distinct purposes: a **2D command-center map** for operational clarity, and a **3D immersive simulation** for cinematic explainability and agent storytelling.

The result is a mod that makes multi-agent systems *legible* to operators, *impressive* to investors, and *intuitive* to developers who've never touched an orchestration framework.

### Inspirations (Cited by Name)

| Repository | What We Borrow |
|---|---|
| **WW-AI-Lab/openclaw-office** | Dual 2D/3D rendering model (SVG isometric + React Three Fiber), deterministic agent avatars, speech bubbles with streaming Markdown, real-time WebSocket state, Zustand store pattern |
| **iamlukethedev/Claw3D** | Retro-styled walkable 3D office concept, Phaser-based layout editor, gateway-first architecture (Browser ↔ Studio ↔ Gateway), separation of visualization from intelligence layer |
| **carlosazaustre/tenacitOS** | OS-style desktop metaphor (topbar, dock, status bar), voxel agent avatars at individual desks, cost analytics pulled from agent databases, heatmap activity feeds |
| **GreenSheep01201/claw-empire** | Pixel-art animated agents walking between departments, Kanban task lifecycle, department-based spatial organization, workflow packs, CEO oversight metaphor |

---

## 2. User Personas

### P1 — Solo Developer ("The Builder")
- Runs 3–10 agents locally or on a single VPS
- Wants to **see** what each agent is doing without reading logs
- Needs quick context switches: "which agent is stuck?" → click → inspect → unblock
- Cares about speed, keyboard shortcuts, and minimal chrome
- Likely discovers the mod from the Swarm marketplace, installs via one click

### P2 — Ops/Admin ("The Operator")
- Manages 10–50+ agents across an organization
- Needs filtering, search, batch operations, and alerting
- Uses the 2D view as a command center — multiple monitors, always-on
- Cares about uptime, error rates, cost attribution, and SLA compliance
- Wants replay capability for post-incident review

### P3 — Demo/Pitch Presenter ("The Storyteller")
- Showing the system to investors, customers, or executives
- Needs the 3D view to create a "wow" moment — agents visibly collaborating
- Wants a curated, cinematic experience: smooth camera, clean UI, no clutter
- May use replay mode to walk through a completed workflow step by step
- Needs one-click "demo mode" that hides sensitive data and shows representative activity

---

## 3. User Flows

### Flow 1: Solo Developer — Morning Check-in
```
1. Opens Swarm dashboard → clicks "Office Sim" in sidebar (Modifications section)
2. Lands on Home Dashboard (overview cards: agents active, tasks in flight, errors)
3. Clicks "Open 2D Office" → sees floor plan with 5 agent desks
4. Notices Agent-03 desk is flashing red (error state)
5. Clicks Agent-03 → Agent Detail Drawer slides in from right
6. Reads error: "Rate limited by OpenAI API" — sees retry countdown
7. Clicks "View Logs" → scrollable log panel within drawer
8. Clicks "Reassign Task" → task moves to Agent-02's queue
9. Closes drawer → Agent-03 goes to idle animation, Agent-02 starts working
```

### Flow 2: Ops/Admin — Incident Investigation
```
1. Receives alert: "3 agents blocked for >5 min"
2. Opens 2D Office → applies filter: status = "blocked"
3. Non-blocked agents dim to 20% opacity — blocked agents pulse
4. Clicks first blocked agent → sees it's waiting on approval gate
5. Bulk-selects all 3 blocked agents → "Approve All" action
6. Agents transition to "active" — watches them resume in real-time
7. Opens Replay View → scrubs timeline back 30 minutes
8. Watches the cascade: API failure → retry storm → rate limit → block
9. Exports replay clip as shareable link for team post-mortem
```

### Flow 3: Demo/Pitch — Investor Walkthrough
```
1. Clicks "Demo Mode" toggle in header → sensitive data masked, sample labels applied
2. Switches to 3D Office → camera auto-orbits the office
3. Narrator describes: "Here you see 8 agents collaborating on a code review"
4. Clicks Agent-01 (lead) → camera zooms to desk, speech bubble shows activity
5. Shows collaboration lines: Agent-01 → Agent-04 (code review handoff)
6. Switches to Replay → plays back a completed 20-minute workflow in 60 seconds
7. Time scrubber shows key moments highlighted: task start, meeting, PR merge
8. Exits demo mode → returns to live view
```

---

## 4. Information Architecture

```
OpenClaw Office Sim (sidebar entry: "Office Sim")
├── Home Dashboard .......................... /office-sim
│   ├── Overview Cards (agents, tasks, errors, cost)
│   ├── Recent Activity Feed
│   ├── Quick Actions (open 2D, open 3D, replay)
│   └── Agent Status Grid (compact table view)
│
├── 2D Office .............................. /office-sim/2d
│   ├── Floor Plan Canvas (SVG/Canvas)
│   ├── Agent Nodes (desks, stations)
│   ├── Rooms (meeting rooms, queues, error bay)
│   ├── Toolbar (filter, search, zoom, layers)
│   └── Agent Detail Drawer (slide-in panel)
│
├── 3D Office .............................. /office-sim/3d
│   ├── Scene (React Three Fiber)
│   ├── Agent Characters (animated models)
│   ├── Environment (desks, rooms, effects)
│   ├── Camera Controls (orbit, follow, cinematic)
│   └── HUD Overlay (agent names, status badges)
│
├── Replay View ............................ /office-sim/replay
│   ├── Timeline Scrubber
│   ├── Playback Controls (play, pause, speed)
│   ├── Event Markers (errors, meetings, completions)
│   ├── 2D or 3D render target (switchable)
│   └── Export/Share controls
│
└── Admin Panel ............................ /office-sim/admin
    ├── Office Layout Editor
    ├── Agent Assignment (desk ↔ agent mapping)
    ├── Alert Configuration
    ├── Theme/Skin Selector
    └── Performance & Usage Metrics
```

---

## 5. Screen-by-Screen Requirements

### 5.1 Home Dashboard (`/office-sim`)

**Purpose:** Entry point. Fast orientation — what's happening right now?

**Wireframe Description:**

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: "Office Sim" title + Demo Mode toggle + ⚙      │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ 🟢 Active │ 📋 Tasks  │ 🔴 Errors │ 💰 Cost   │ ⏱ Uptime   │
│    7/10   │   23     │    2     │  $4.12   │   99.7%    │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│                                                          │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │   QUICK ACTIONS     │  │   RECENT ACTIVITY        │  │
│  │                     │  │                          │  │
│  │  [Open 2D Office]   │  │  10:42 Agent-03 error    │  │
│  │  [Open 3D Office]   │  │  10:41 Agent-01 completed│  │
│  │  [Open Replay]      │  │  10:39 Meeting started   │  │
│  │  [Admin Panel]      │  │  10:38 Agent-05 idle     │  │
│  │                     │  │  10:35 Task assigned     │  │
│  └─────────────────────┘  └──────────────────────────┘  │
│                                                          │
│  AGENT STATUS GRID                                       │
│  ┌────────┬────────┬──────────┬─────────┬──────────────┐│
│  │ Agent  │ Status │ Task     │ Runtime │ Actions      ││
│  ├────────┼────────┼──────────┼─────────┼──────────────┤│
│  │ 🤖 A-01│ 🟢 Active│ PR Review│ 4m 12s │ [Inspect]   ││
│  │ 🤖 A-02│ 🟡 Busy │ Code Gen │ 12m 3s │ [Inspect]   ││
│  │ 🤖 A-03│ 🔴 Error│ —blocked—│ 8m 45s │ [Fix][Skip] ││
│  │ 🤖 A-04│ ⚪ Idle │ —        │ —      │ [Assign]    ││
│  └────────┴────────┴──────────┴─────────┴──────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Key Requirements:**
- Cards are clickable — clicking "Errors" filters to error agents
- Activity feed updates in real-time via WebSocket
- Agent grid supports sort, filter, and bulk selection
- Responsive: cards stack on mobile, grid collapses to list

---

### 5.2 2D Office (`/office-sim/2d`)

**Purpose:** Operational command center. Spatial awareness of all agents at a glance. Optimized for always-on monitoring.

**Wireframe Description:**

```
┌─────────────────────────────────────────────────────────┐
│  TOOLBAR: [Filter▾] [Search🔍] [Zoom±] [Layers▾] [⛶]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│        ┌──────────┐    ┌──────────┐                     │
│        │ MEETING  │    │ MEETING  │                     │
│        │ ROOM A   │    │ ROOM B   │                     │
│        │  🤖🤖    │    │  (empty) │                     │
│        └──────────┘    └──────────┘                     │
│                                                          │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│   │ 🤖  │ │ 🤖  │ │ 🤖  │ │ 🤖  │ │ 🤖  │            │
│   │ A-01│ │ A-02│ │ A-03│ │ A-04│ │ A-05│            │
│   │ 🟢  │ │ 🟡  │ │ 🔴  │ │ ⚪  │ │ 🟢  │            │
│   │ desk│ │ desk│ │ desk│ │ desk│ │ desk│            │
│   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘            │
│                                                          │
│        ┌──────────────────────┐                         │
│        │   QUEUE / INBOX      │                         │
│        │  📋📋📋📋 (4 tasks)    │                         │
│        └──────────────────────┘                         │
│                                                          │
│   ┌────────────────┐  ┌──────────────────┐             │
│   │  ERROR BAY     │  │  TOOL STATION    │             │
│   │  🤖 A-03 ⚠️    │  │  🔧 API calls    │             │
│   └────────────────┘  └──────────────────┘             │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  STATUS BAR: 7 active · 2 errors · 23 tasks · ws:🟢     │
└─────────────────────────────────────────────────────────┘
```

**Spatial Zones:**

| Zone | Purpose | Visual Treatment |
|---|---|---|
| **Desk Row** | Primary workspace. One desk per agent. | Isometric desks with avatar, name label, status ring |
| **Meeting Room** | Agents in collaborative tasks/handoffs | Glass-walled room, agents inside show speech bubbles |
| **Queue/Inbox** | Unassigned or pending tasks | Stack of task cards, glow when overflowing |
| **Error Bay** | Agents in error/blocked state move here | Red-tinted zone, pulsing border, alert icon |
| **Tool Station** | Visualizes active tool calls (API, file I/O) | Animated gear/wrench icons, throughput counter |
| **Approval Gate** | Agents waiting for human approval | Barrier graphic, "Approve" button inline |

**Interaction Model:**
- **Hover** any agent → tooltip: name, current task, duration, status
- **Click** agent → opens Agent Detail Drawer (right panel)
- **Right-click** agent → context menu: inspect, reassign, pause, restart
- **Drag** agent to meeting room → initiate collaborative task
- **Click** empty desk → assign agent from dropdown
- **Scroll wheel** → zoom in/out on floor plan
- **Ctrl+F** → search agents by name, task, or status
- **Arrow keys** → pan the floor plan
- **Shift+click** → multi-select agents for bulk actions

**Toolbar Controls:**
- **Filter**: status (all/active/idle/error/blocked), agent type, department
- **Search**: fuzzy match on agent name, task description, skill name
- **Zoom**: fit-all, zoom-to-selection, percentage slider
- **Layers**: toggle labels, collaboration lines, task queues, alerts
- **Fullscreen**: expand to fill viewport (for always-on monitors)

---

### 5.3 3D Office (`/office-sim/3d`)

**Purpose:** Cinematic, immersive view. Best for demos, storytelling, and understanding complex multi-agent workflows visually.

**Wireframe Description:**

```
┌─────────────────────────────────────────────────────────┐
│  HUD: Agent count · Active tasks · [Camera▾] · [2D↔3D]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│          ╔═══════════════════════════════╗               │
│         ╱            3D SCENE            ╲              │
│        ╱                                  ╲             │
│       │     🏢 Office Environment          │             │
│       │                                    │             │
│       │   ┌─────┐  Agent-01 at desk       │             │
│       │   │ 🧑‍💻 │  Speech: "Reviewing PR" │             │
│       │   └─────┘                          │             │
│       │          ↗ collab line             │             │
│       │   ┌─────┐  Agent-04 walking       │             │
│       │   │ 🚶  │  → Meeting Room A       │             │
│       │   └─────┘                          │             │
│       │                                    │             │
│       │   ✨ Tool call particle effect     │             │
│       │   📡 API orb pulsing               │             │
│       │                                    │             │
│        ╲                                  ╱             │
│         ╲________________________________╱              │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  BOTTOM TRAY: [▶ Follow Agent-01] [🎬 Cinematic] [📷]   │
└─────────────────────────────────────────────────────────┘
```

**3D-Specific Features (Beyond 2D):**

| Feature | Description |
|---|---|
| **Agent Animation** | Walk cycles between zones, typing at desk, gesturing in meetings, slumping when idle |
| **Speech Bubbles** | Floating 3D billboards above agents showing streaming text/tool invocations |
| **Collaboration Lines** | Glowing arcs between agents when they exchange messages |
| **Tool Call Effects** | Particle bursts for API calls, file I/O sparkles, database query ripples |
| **Environment Mood** | Ambient lighting shifts: warm (all healthy), cool blue (high load), red tint (errors) |
| **Portal Effects** | Swirling portal when agent spawns/despawns (inspired by openclaw-office) |
| **Skill Holograms** | Holographic icons above agent desks showing their active skills |

**Camera Modes:**
- **Orbit** — default. Mouse drag rotates, scroll zooms, middle-click pans
- **Follow** — camera tracks a selected agent. Smooth lerp. Click another agent to switch
- **Cinematic** — auto-pilot camera that slowly orbits, zooms to action, pulls back for overview
- **Top-Down** — overhead orthographic view (bridge between 2D and 3D)
- **First-Person** — WASD walkthrough. Approach any desk to inspect

**HUD Overlay:**
- Semi-transparent name tags floating above each agent
- Status badges (color-coded dots matching 2D semantics)
- Mini-map in corner showing 2D floor plan with camera frustum indicator
- Click-through: clicking any agent in 3D opens the same Agent Detail Drawer

---

### 5.4 Replay View (`/office-sim/replay`)

**Purpose:** Time-travel through past agent activity. Post-incident review, onboarding demos, audit trails.

**Wireframe Description:**

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: "Replay" · Session selector▾ · [2D][3D] toggle │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │           2D or 3D RENDER TARGET                  │  │
│  │        (shows office state at scrubber time)      │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  TIMELINE                                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │ |----⚠---------🤝--------✅-----------🔴------| │  │
│  │  10:00       10:15      10:30      10:45   11:00  │  │
│  │              ▲ scrubber position                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  CONTROLS: [⏮] [⏪] [▶/⏸] [⏩] [⏭] · Speed: [1x▾]    │
│                                                          │
│  EVENT LOG (synced to scrubber)                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 10:15  ⚠  Agent-03 hit rate limit                │  │
│  │ 10:22  🤝  Agent-01 + Agent-04 entered meeting    │  │
│  │ 10:31  ✅  Task "PR-142" completed                │  │
│  │ 10:44  🔴  Agent-03 moved to error bay            │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  [Export as Link] [Export as Video] [Download Events]    │
└─────────────────────────────────────────────────────────┘
```

**Timeline Event Markers:**
- ⚠ Warning (amber) — rate limits, retries, degraded performance
- 🔴 Error (red) — failures, blocked agents, crashes
- 🤝 Meeting (blue) — collaborative tasks, handoffs
- ✅ Completion (green) — task finished, PR merged, output delivered
- 🟢 Spawn (green outline) — agent came online
- ⚪ Despawn (gray) — agent went offline

**Key Interactions:**
- Click any event marker → scrubber jumps to that moment
- Drag scrubber → office state updates in real-time
- Speed: 0.25x, 0.5x, 1x, 2x, 4x, 8x
- Filter events by agent or event type
- Click agent in replay → drawer shows that agent's state at that moment

---

### 5.5 Admin Panel (`/office-sim/admin`)

**Purpose:** Configuration and customization. Office layout, alerts, themes, and usage metrics.

**Wireframe Description:**

```
┌─────────────────────────────────────────────────────────┐
│  TABS: [Layout] [Assignments] [Alerts] [Themes] [Usage] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  LAYOUT TAB (active)                                     │
│  ┌─────────────────────────────┬────────────────────┐   │
│  │                             │  PALETTE           │   │
│  │   FLOOR PLAN EDITOR        │  ┌──────────────┐  │   │
│  │                             │  │ 🪑 Desk       │  │   │
│  │   (drag-and-drop zones,    │  │ 🚪 Meeting Rm │  │   │
│  │    resize rooms,           │  │ 📋 Queue       │  │   │
│  │    place furniture)        │  │ ⚠️ Error Bay   │  │   │
│  │                             │  │ 🔧 Tool Stn   │  │   │
│  │                             │  │ 🚧 Gate        │  │   │
│  │                             │  └──────────────┘  │   │
│  │                             │                    │   │
│  │                             │  PROPERTIES        │   │
│  │                             │  Name: [........]  │   │
│  │                             │  Capacity: [4]     │   │
│  │                             │  Color: [🎨]       │   │
│  └─────────────────────────────┴────────────────────┘   │
│                                                          │
│  [Save Layout] [Reset to Default] [Import] [Export]      │
└─────────────────────────────────────────────────────────┘
```

**Admin Tabs:**

| Tab | Content |
|---|---|
| **Layout** | Drag-and-drop floor plan editor. Place desks, rooms, zones. Inspired by Claw3D's Phaser-based layout editor |
| **Assignments** | Map agents to desks. Auto-assign toggle. Department grouping |
| **Alerts** | Configure rules: "alert if >N agents blocked for >M minutes", webhook/Slack targets |
| **Themes** | Select office skin (default dark, cyberpunk, minimal, retro pixel). Custom accent color |
| **Usage** | Mod performance metrics: render FPS, WebSocket latency, memory footprint, session count |

---

### 5.6 Agent Detail Drawer

**Purpose:** Deep inspection of a single agent without leaving the office view. Slides in from the right edge.

**Wireframe Description:**

```
┌──────────────────────────────┐
│  ← Back     AGENT DETAIL     │
├──────────────────────────────┤
│                              │
│  🤖 Agent-03 "Cipher"        │
│  Role: Security Auditor      │
│  Status: 🔴 Error             │
│  Uptime: 2h 14m              │
│  Desk: B-03                  │
│                              │
│  ─── CURRENT TASK ────────── │
│  Task: Audit auth middleware │
│  Started: 10:22 AM           │
│  Status: Blocked — rate limit│
│  Retry in: 42s               │
│                              │
│  ─── RECENT ACTIVITY ─────── │
│  10:44 Error: 429 Too Many   │
│  10:42 Tool: fetch(api/v2)   │
│  10:41 Output: "Found 3..."  │
│  10:39 Tool: read(auth.ts)   │
│                              │
│  ─── ACTIVE SKILLS ──────── │
│  [Code Analysis] [Web Fetch] │
│  [File Reader] [Git Ops]     │
│                              │
│  ─── SOUL CONFIG ─────────── │
│  Personality: Reserved       │
│  Decision: Data-driven       │
│  Comm Style: Technical       │
│                              │
│  ─── ACTIONS ────────────── │
│  [Retry Now] [Reassign Task] │
│  [Pause Agent] [View Logs]   │
│  [Restart] [Remove from Desk]│
│                              │
└──────────────────────────────┘
```

**Key Requirements:**
- Drawer width: 400px (desktop), full-screen (mobile)
- Activity feed auto-scrolls, with scroll lock toggle
- SOUL Config section only shows if persona is applied
- Actions are context-sensitive: "Retry" only shows in error state, "Approve" only when waiting
- Drawer state persists when switching between 2D and 3D views
- Keyboard: `Esc` closes, `Tab` cycles through agents, `↑↓` scrolls activity

---

## 6. Interaction Design

### 6.1 Core Interaction Patterns

| Interaction | Context | Behavior |
|---|---|---|
| **Hover** | Any agent (2D or 3D) | Show tooltip: name, task summary, duration, status badge |
| **Click** | Agent | Open Agent Detail Drawer. In 3D, camera also smoothly zooms to agent |
| **Double-click** | Agent | Follow mode (3D) or center-and-zoom (2D) |
| **Right-click** | Agent | Context menu: Inspect, Reassign, Pause, Restart, Copy ID |
| **Shift+click** | Multiple agents | Multi-select for bulk operations |
| **Ctrl+F / ⌘F** | Anywhere | Global search — agents, tasks, events |
| **Scroll** | Floor plan | Zoom (2D); Zoom (3D) |
| **Drag** | Floor plan background | Pan (2D); Rotate (3D orbit mode) |
| **Spacebar** | Replay view | Toggle play/pause |
| **[  ]** | Replay view | Decrease / increase playback speed |
| **Esc** | Drawer, modal, search | Close/dismiss |

### 6.2 Real-Time Visual Feedback

When an event occurs on the WebSocket, the UI reacts within one frame:

| Event | 2D Reaction | 3D Reaction |
|---|---|---|
| Agent starts task | Status ring → green, desk lamp turns on | Agent sits down, starts typing animation |
| Agent completes task | Brief green flash, checkmark overlay | Confetti particle burst, agent stands and stretches |
| Agent error | Red pulse ring, moves to error bay | Red tint on agent, slump animation, warning particle |
| Agent enters meeting | Walks to meeting room zone | Walking animation to room, sits in chair |
| Tool call fired | Gear icon animates on desk | Holographic tool icon appears, sparkle particles |
| Agent blocked | Amber barrier graphic appears | Semi-transparent wall materializes in front of agent |
| Agent goes offline | Desk grays out, avatar fades | Agent fades to ghost, desk light turns off |
| New agent spawns | Fade-in at empty desk | Portal swirl effect, agent materializes |

---

## 7. Visual Semantics — Agent States

A unified state vocabulary used across 2D, 3D, dashboard, and drawer:

| State | Color | 2D Icon | 3D Animation | Ring/Badge |
|---|---|---|---|---|
| **Idle** | Gray `#6b7280` | Static avatar, dim desk | Standing by desk, arms at sides | Thin gray ring |
| **Active** | Green `#22c55e` | Bright avatar, lamp on | Typing at keyboard | Solid green ring |
| **Coding** | Emerald `#10b981` | Code brackets overlay | Fast typing, code hologram | Green ring + `</>` badge |
| **Blocked** | Amber `#f59e0b` | Barrier icon, pulsing | Arms crossed, barrier wall | Pulsing amber ring |
| **Error** | Red `#ef4444` | Error triangle, red desk | Slumped, red particles | Thick red ring |
| **Waiting Approval** | Purple `#a855f7` | Hourglass + hand icon | Looking at camera, hand raised | Purple ring + clock |
| **In Meeting** | Blue `#3b82f6` | In meeting room zone | Sitting in meeting room, gesturing | Blue ring |
| **Offline** | Dark gray `#374151` | Ghosted/faded avatar | Transparent ghost, desk dark | Dashed gray ring |
| **Spawning** | Cyan `#06b6d4` | Fade-in animation | Portal swirl effect | Expanding cyan ring |
| **Tool Calling** | Gold `#eab308` | Gear icon on desk | Holographic tool icon | Gold ring + tool icon |

---

## 8. Visual Language & Design System

### 8.1 Design Principles

1. **Dark-first**: Dark mode is the default and primary experience. Light mode is supported but secondary.
2. **Premium, polished**: Glass morphism, subtle gradients, smooth 60fps animations. No janky transitions.
3. **Information density without clutter**: Show everything that matters, hide everything that doesn't. Progressive disclosure.
4. **Consistent with Swarm**: Inherits Swarm's amber primary (`#fbbf24`), dark blue backgrounds (`hsl(222, 84%, 5%)`), and shadcn/ui component patterns.
5. **Multiplayer feel**: The office should feel like a shared space — like everyone can see the same thing. Activity feed, presence indicators, and real-time updates reinforce this.

### 8.2 Color Palette

```
Primary:       hsl(48, 100%, 50%)   — Amber/Gold (Swarm accent)
Background:    hsl(222, 84%, 5%)    — Deep navy
Card:          hsl(222, 50%, 10%)   — Dark blue card
Border:        hsl(217, 33%, 18%)   — Subtle edge
Text Primary:  hsl(210, 40%, 98%)   — Off-white
Text Muted:    hsl(215, 20%, 65%)   — Gray text
Success:       hsl(142, 71%, 45%)   — Green
Warning:       hsl(38, 92%, 50%)    — Amber
Error:         hsl(0, 84%, 60%)     — Red
Info:          hsl(217, 91%, 60%)   — Blue
Premium:       hsl(270, 50%, 60%)   — Purple
```

### 8.3 Typography

- **Font**: Inter (matches Swarm app)
- **Headers**: `font-bold`, `text-lg` to `text-2xl`
- **Body**: `text-sm` (14px)
- **Labels/badges**: `text-xs` (12px) or `text-[10px]`
- **Monospace** (logs, IDs): `font-mono text-xs`

### 8.4 Component Patterns

- **Cards**: Glass-morphism with `backdrop-blur-xl`, `bg-card/80`, `border-border`, hover glow
- **Badges**: Colored backgrounds at 10% opacity, matching text color, `text-[10px]` with icon
- **Buttons**: Primary amber (`bg-amber-500 text-black`), secondary outline (`border-amber-500/30`)
- **Drawer**: `w-[400px]` slide from right, backdrop blur, `z-50`
- **Tabs**: Bottom-border style matching Swarm marketplace tabs
- **Modular Panels**: Every section of the office view is a resizable panel. Users can collapse/expand side panels, bottom trays, and the toolbar

### 8.5 Motion & Animation

- All transitions: `200ms ease-out` (CSS) or `lerp(0.08)` (3D camera)
- Agent movement: smooth interpolation between positions, never teleport
- Status changes: 300ms color transition with brief scale pulse (1.0 → 1.05 → 1.0)
- Drawer: slide in 250ms with spring easing
- 3D particles: GPU-instanced, max 500 particles per effect, auto-recycle pool

---

## 9. Accessibility

### 9.1 WCAG 2.1 AA Compliance

| Requirement | Implementation |
|---|---|
| **Color contrast** | All text meets 4.5:1 ratio. Status colors paired with icons, never color-alone |
| **Keyboard navigation** | Full keyboard support: Tab through agents, Enter to inspect, Esc to close |
| **Screen reader** | `aria-label` on all agent nodes, `aria-live="polite"` on activity feeds |
| **Reduced motion** | `prefers-reduced-motion` disables all animations, 3D falls back to static positions |
| **Focus indicators** | Visible focus ring (amber) on all interactive elements |
| **Alt text** | Agent avatars include descriptive alt: "Agent Cipher, status: error, task: audit middleware" |

### 9.2 Cognitive Accessibility

- Agent states use **icon + color + label** (triple encoding) — never color alone
- Tooltips explain every icon and abbreviation
- Demo mode strips away advanced controls for simplified presentation
- Admin can configure "simplified view" that shows only desk + status, hiding effects

### 9.3 2D Fallback

- On mobile or devices with `prefers-reduced-motion`, default to 2D view
- 3D view requires WebGL2 support — graceful fallback message with link to 2D
- Low-end device detection: if `navigator.hardwareConcurrency < 4`, suggest 2D

---

## 10. Performance Constraints

### 10.1 Targets

| Metric | Target | Measurement |
|---|---|---|
| **2D render** | 60 FPS with 50 agents | Chrome DevTools Performance panel |
| **3D render** | 30 FPS with 20 agents, 60 FPS with 10 | R3F performance monitor |
| **First paint** | < 1.5s (2D), < 3s (3D) | Lighthouse |
| **WebSocket latency** | < 100ms state update reflection | Timestamp diff |
| **Memory** | < 200MB (2D), < 500MB (3D) | Chrome Task Manager |
| **Bundle size** | < 150KB initial (2D), 3D lazy-loaded | Webpack analyzer |
| **Time to interactive** | < 2s (2D), < 4s (3D) | Lighthouse TTI |

### 10.2 Optimization Strategies

- **3D lazy-loading**: The entire React Three Fiber scene is code-split. Only loaded when user navigates to 3D view
- **Agent LOD (Level of Detail)**: Agents far from camera render as simple sprites. Full model only when close
- **Frustum culling**: Agents outside camera view are not rendered
- **Instanced meshes**: Desk geometry is instanced — one draw call for all desks
- **WebSocket batching**: Updates batched into 16ms frames, not per-event
- **Virtualized lists**: Activity feeds and event logs use virtual scrolling (only render visible rows)
- **SVG optimization**: 2D floor plan uses CSS transforms, not SVG re-renders, for animation
- **Replay**: Events stored as deltas, reconstructed on scrub. Not full snapshots per frame

### 10.3 Degradation Tiers

| Tier | Trigger | Response |
|---|---|---|
| **Full** | Desktop, WebGL2, >4 cores | All features, 3D enabled, particles, post-processing |
| **Reduced** | Laptop, integrated GPU | 3D available but no post-processing, reduced particles |
| **Minimal** | Mobile, no WebGL, `prefers-reduced-motion` | 2D only, no animation, static positions |
| **Server-rendered** | SSR/bot crawl | Static HTML summary dashboard, no interactive office |

---

## 11. MVP UX Scope

### Must Have (v1.0)

- [ ] Home Dashboard with overview cards and agent status grid
- [ ] 2D Office view with desk zones, meeting rooms, queue, and error bay
- [ ] Agent states: idle, active, error, blocked, offline (5 of 10)
- [ ] Agent Detail Drawer with current task, recent activity, and basic actions
- [ ] Real-time WebSocket updates from Swarm hub
- [ ] Hover tooltips and click-to-inspect on all agents
- [ ] Filter by status
- [ ] Search agents by name
- [ ] Dark mode (default)
- [ ] Responsive: 2D works on tablet, dashboard works on mobile
- [ ] Sidebar registration under "Modifications" section

### Should Have (v1.0 stretch)

- [ ] 3D Office view with basic agent models and desk scene
- [ ] Camera modes: orbit and follow
- [ ] Speech bubbles showing current agent output
- [ ] Collaboration lines between agents
- [ ] Basic replay: scrubber + play/pause over last 1 hour
- [ ] Demo mode toggle (mask sensitive data)
- [ ] Keyboard navigation for 2D view

### Deferred to MVP (considered but cut)

- Admin Panel layout editor
- Custom office themes/skins
- Replay export (video/link)
- 3D cinematic camera and first-person mode
- Tool-call particle effects
- Multi-org "floor" support

---

## 12. Future UX Scope

### v1.1 — Polish & Power User

- Full 10-state visual vocabulary with 3D animations
- Admin Panel with layout editor (Phaser-based, inspired by Claw3D)
- Alert configuration with Slack/webhook integration
- Replay export as shareable link or MP4
- Keyboard shortcut cheat sheet (`?` key)
- Agent drag-and-drop assignment in 2D
- Cost overlay per agent (inspired by tenacitOS)

### v1.2 — Cinematic & Collaboration

- 3D cinematic auto-camera mode
- First-person walkthrough (WASD)
- Multi-user cursors (see who else is viewing the office)
- Annotation mode: pin notes to agents or rooms
- Department grouping (inspired by claw-empire's 6-department model)
- Workflow pack visualizations: different office layouts per pack type

### v2.0 — Enterprise & Ecosystem

- Multi-floor view for multi-org deployments
- Custom 3D environment skins (cyberpunk, space station, cozy cabin)
- Compliance audit trail with replay certification
- AI narrator: LLM-generated voiceover for replay walkthroughs
- Embedded mode: `<iframe>` widget for external dashboards
- Plugin API: third-party widgets within office zones (charts, Kanban, terminals)
- VR headset support (WebXR) for fully immersive agent observation

---

*This document is a living specification. All wireframes are structural — final visual design will follow the Swarm design system with adaptations for spatial rendering.*
