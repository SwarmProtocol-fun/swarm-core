# OpenClaw Office Sim — Product Requirements Document

**Status:** Draft v1.0
**Date:** 2026-03-24
**Author:** Swarm Core
**Mod ID:** `mod-openclaw-office-sim`
**Pricing:** Paid (Premium Mod)

---

## 1. Executive Summary

OpenClaw Office Sim is a paid Swarm mod that transforms the dashboard into a living virtual office where OpenClaw multi-agent workflows are visualized as employees working in a spatial environment. Users watch their AI agents collaborate in real-time across 2D isometric and 3D immersive views — sitting at desks, attending meetings, training skills, and delivering completed work — while retaining full operational control through integrated management panels.

The mod bridges the gap between Swarm's existing agent management (fleet, tasks, scheduler) and the emerging "office-as-metaphor" visualization paradigm pioneered by openclaw-office, Claw3D, tenacitOS, and claw-empire. It is the first Swarm mod to combine spatial agent visualization with production ops tooling in a single premium experience.

---

## 2. Problem

### For Swarm Users
- **Agent activity is invisible.** Current dashboard shows agent lists and status badges, but there is no spatial or temporal representation of what agents are actually doing, who they're collaborating with, or how work flows between them.
- **Multi-agent coordination is opaque.** When 3-6 agents run concurrently on sub-tasks, users cannot see the parent-child hierarchy, collaboration sessions, or task handoff patterns without digging through logs.
- **No ambient monitoring.** Users must actively check dashboards. There is no "leave it running on a second monitor" experience that passively communicates system health and agent activity.
- **Status is binary.** Agents are "online" or "offline." There is no visual distinction between thinking, tool-calling, waiting, spawning sub-agents, or encountering errors.

### For the Market
- The open-source ecosystem (openclaw-office, Claw3D, tenacitOS, claw-empire) proves strong demand for office-metaphor agent visualization, with 2,800+ combined stars in under 5 weeks.
- These projects are standalone tools tightly coupled to OpenClaw's gateway protocol. No equivalent exists as an embeddable mod within an existing agent management platform.
- Users who want this experience today must self-host a separate application, manage a WebSocket gateway, and context-switch between their agent platform and the visualization tool.

---

## 3. Solution

A premium Swarm mod that provides:

1. **2D Isometric Office** — Lightweight SVG/CSS view showing agents at desks with status indicators, speech bubbles, collaboration lines, and zone-based spatial layout. Information-dense, low-resource, always-on.

2. **3D Immersive Office** — React Three Fiber scene with procedural voxel avatars, furniture-filled rooms (desks, meeting areas, server room, break room), A* pathfinding, and ambient animations. Cinematic and engaging.

3. **Ops Overlay Panels** — Slide-in panels for agent details, task progress, live terminal output, session transcripts, and cost tracking — accessible by clicking agents or objects in either view.

4. **Real-Time Event Pipeline** — Connects to Swarm's existing agent API and WebSocket events, transforms raw events through a perception engine (classify → aggregate → narrate → render), and drives all visual updates.

5. **Office Customization** — Drag-and-drop office builder for arranging desks, rooms, and furniture. Persisted per-org. Multiple floor plan templates included.

---

## 4. Why This Is a Mod, Not a Core Feature

| Criterion | Assessment |
|-----------|-----------|
| **Required for base functionality?** | No. Swarm's agent management works without spatial visualization. |
| **Resource footprint** | 3D rendering (Three.js, R3F) adds ~500KB+ to bundle and continuous GPU usage. Not appropriate for all users. |
| **Audience** | Power users and teams running 3+ concurrent agents who benefit from ambient monitoring. Not needed for single-agent or occasional users. |
| **Maintenance surface** | 3D scenes, pathfinding, avatar systems, and office builders require specialized maintenance separate from core dashboard concerns. |
| **Revenue opportunity** | Premium visualization is a proven SaaS upsell. Users who derive value from ambient monitoring will pay for it. |
| **Precedent** | All four reference projects (openclaw-office, Claw3D, tenacitOS, claw-empire) ship as standalone applications, confirming this is a discrete product surface. |

---

## 5. Target Users

### Primary: Multi-Agent Power Users
- Run 3-6+ agents concurrently across tasks
- Need ambient monitoring on a second screen or background tab
- Want to understand collaboration patterns and bottleneck sources
- Currently context-switch between Swarm dashboard and terminal/logs

### Secondary: Team Leads and Org Admins
- Oversee agent fleets across an organization
- Need at-a-glance understanding of agent utilization and health
- Want shareable visual status for stakeholder communication
- Value the "wow factor" for demos and presentations

### Tertiary: Enthusiast/Hobbyist Users
- Enjoy the office-sim aesthetic and gamification layer
- Want to customize their office environment
- Engage with avatar customization and ambient office life

---

## 6. Functional Requirements

### 6.1 Office Views

#### FR-1: 2D Isometric Office
- SVG-rendered isometric floor plan with configurable desk zones
- Agent avatars placed at assigned desks with deterministic appearance from agent ID
- Real-time status indicators: idle (pulse), thinking (spin), tool-calling (flash), speaking (wave), error (shake)
- Speech bubbles showing current activity summary (truncated, 60-char max)
- Collaboration lines between agents sharing a session (animated dash, opacity decays after 60s inactivity)
- Zone labels: Work Area, Meeting Room, Break Room, Server Room
- Click agent → slide-in detail panel
- Minimum 6, maximum 24 agent capacity

#### FR-2: 3D Immersive Office
- React Three Fiber scene with orbit controls (default) and first-person WASD (toggle)
- Procedural voxel avatars with customizable body, hair, clothing, and accessories
- Furniture from primitive geometries: desks, chairs, monitors, server racks, plants, coffee machine, whiteboard
- Room types with functional semantics:
  - **Desk Area** — agents "working" (active task execution)
  - **Meeting Room** — agents in shared sessions cluster here with collaboration lines
  - **Server Room** — agents performing infrastructure/deployment tasks
  - **Break Room** — idle agents with no active tasks
  - **Gym** — agents "training" (skill installation or model fine-tuning)
- A* grid-based pathfinding with collision avoidance around furniture
- Smooth position interpolation (lerp 0.15) and rotation interpolation (lerp 0.12)
- Spawn animation (portal effect) when agents come online
- Despawn animation (walk to corridor, fade) when agents go offline
- Day/night ambient lighting cycle (optional, configurable)
- Canvas at configurable opacity (default 100% for dedicated view, 35% for background mode)
- `powerPreference: "low-power"`, fog fade, code-split via `dynamic({ ssr: false })`

#### FR-3: View Toggle
- Seamless switch between 2D and 3D views with state preservation
- "Background mode" toggle pins the 3D view behind dashboard content at reduced opacity (reuses Mecha LaunchPad pattern)
- View preference persisted per-user

### 6.2 Agent Visualization

#### FR-4: Agent Status Mapping
Map Swarm agent states to visual behaviors:

| Swarm State | Office Behavior | Visual Cue |
|-------------|----------------|------------|
| `online` + idle | Sitting at desk, relaxed pose | Green pulse |
| `online` + active task | Sitting at desk, typing animation | Blue glow |
| `online` + thinking | Leaning back, thought bubble | Yellow spin |
| `online` + tool call | Reaching for tools, screen flash | Cyan flash |
| `online` + speaking/streaming | Animated speech bubble | White wave |
| `online` + error | Red desk highlight, error icon | Red shake |
| `busy` | In meeting room or server room | Yellow indicator |
| `offline` | Empty desk, chair pushed back | Gray, no avatar |
| `spawning` | Walking from corridor to desk | Portal spawn effect |
| `retiring` | Walking from desk to corridor | Fade out |

#### FR-5: Agent Hierarchy Visualization
- Parent-child relationships rendered as connecting lines (2D: SVG paths, 3D: tube geometry)
- Sub-agents spawn at "hot desks" near their parent's desk
- Minimum residency period (configurable, default 30s) before sub-agent retirement animation
- Hierarchy depth indicated by line thickness (d=1 thick, d=2 medium, d=3 thin)

#### FR-6: Collaboration Links
- When multiple agents share a session/task, animated collaboration lines connect them
- Line strength (opacity, thickness) proportional to interaction frequency
- Links decay after 60s of inactivity
- Collaboration triggers meeting-room gathering: agents pathfind to meeting area

### 6.3 Ops Overlay Panels

#### FR-7: Agent Detail Panel
- Triggered by clicking an agent in either view
- Shows: name, status, current task, assigned model, uptime, tool call count, last activity
- Live terminal output stream (last 50 lines, auto-scroll)
- Session transcript viewer (user/assistant/tool_use messages as styled bubbles)
- Quick actions: pause, resume, reassign task, kill process

#### FR-8: Task Board Overlay
- Kanban-style overlay (Inbox → Planned → In Progress → Review → Done)
- Drag-and-drop task assignment to agents
- Task cards show: title, assigned agent avatar, status badge, elapsed time
- Click task → highlights assigned agent in office view

#### FR-9: Cost & Metrics Panel
- Token usage by agent (bar chart)
- Cost trend line (daily, hourly)
- Model breakdown (pie chart)
- Budget threshold alerts
- Uses existing Swarm usage API

### 6.4 Office Customization

#### FR-10: Office Builder
- 2D drag-and-drop editor for arranging desk positions, rooms, and furniture
- Snap-to-grid placement with rotation controls
- Multiple floor plan templates: "Startup Loft" (open plan), "Corporate Floor" (cubicles), "Tech Lab" (server-heavy), "Creative Studio" (lounge-heavy)
- Persisted per-org to Firestore
- Export/import office layouts as JSON

#### FR-11: Avatar Customization
- Per-agent avatar editor accessible from agent detail panel
- Customizable: skin tone (6), hair style (4) + color (8), clothing top/bottom/shoes (8 colors each), accessories (glasses, headset, hat, backpack)
- Deterministic default from agent ID hash, fully overridable
- Live 3D preview in editor modal

### 6.5 Real-Time Pipeline

#### FR-12: Event Ingestion
- Connect to Swarm agent API (`/api/agents?orgId=`) for initial state
- Poll for updates every 5s (HTTP) or subscribe via WebSocket when available
- Event types consumed: agent status change, task assignment, task completion, error, session start/end

#### FR-13: Perception Engine
- **Event Classifier** — categorize events by type (lifecycle, tool, assistant, error) and severity (info, warning, error, critical)
- **Event Aggregator** — group related events within 2s window (e.g., rapid tool calls become "using 3 tools")
- **Narrative Generator** — produce human-readable summaries for speech bubbles ("Analyzing codebase...", "Writing test suite...", "Deploying to staging...")
- **Hold Controller** — enforce minimum 3s display duration to prevent visual flicker on rapid state changes
- **State Machine** — manage agent behavioral transitions with debounce (prevent thrashing between states)

---

## 7. Technical Architecture

### 7.1 Module Structure

```
src/mods/openclaw-office-sim/
├── manifest.json
├── README.md
├── components/
│   ├── office-2d/           # 2D isometric SVG components
│   │   ├── FloorPlan.tsx
│   │   ├── DeskUnit.tsx
│   │   ├── AgentAvatar2D.tsx
│   │   ├── CollaborationLine.tsx
│   │   ├── SpeechBubble.tsx
│   │   └── ZoneLabel.tsx
│   ├── office-3d/           # 3D React Three Fiber components
│   │   ├── OfficeScene.tsx
│   │   ├── AgentModel.tsx
│   │   ├── FurnitureModels.tsx
│   │   ├── RoomManager.tsx
│   │   ├── SpawnPortal.tsx
│   │   ├── CollaborationTube.tsx
│   │   ├── FirstPersonControls.tsx
│   │   └── DayNightCycle.tsx
│   ├── panels/              # Slide-in overlay panels
│   │   ├── AgentDetailPanel.tsx
│   │   ├── TaskBoardOverlay.tsx
│   │   ├── CostMetricsPanel.tsx
│   │   └── TerminalStream.tsx
│   ├── builder/             # Office layout editor
│   │   ├── OfficeBuilder.tsx
│   │   ├── FurniturePalette.tsx
│   │   └── GridCanvas.tsx
│   ├── avatars/             # Avatar system
│   │   ├── AvatarGenerator.ts
│   │   ├── AvatarEditor.tsx
│   │   └── AvatarPreview3D.tsx
│   └── shared/              # Shared UI
│       ├── ViewToggle.tsx
│       ├── StatusBadge.tsx
│       └── OfficeSidebar.tsx
├── engine/                  # Perception & state engine
│   ├── perception.ts        # Event classification + aggregation
│   ├── narrative.ts         # Human-readable activity summaries
│   ├── state-machine.ts     # Agent behavioral state transitions
│   ├── hold-controller.ts   # Minimum display duration enforcement
│   └── office-store.ts      # Zustand store for office state
├── navigation/              # Pathfinding
│   ├── pathfinding.ts       # A* grid-based navigation
│   ├── nav-grid.ts          # Collision grid builder
│   └── movement.ts          # Smooth interpolation + zone transitions
├── layouts/                 # Floor plan templates
│   ├── startup-loft.json
│   ├── corporate-floor.json
│   ├── tech-lab.json
│   └── creative-studio.json
└── types.ts                 # Shared type definitions
```

### 7.2 Integration Points

| Swarm System | Integration Method | Data Flow |
|-------------|-------------------|-----------|
| Agent Status | `GET /api/agents?orgId=` | Poll every 5s → office-store |
| Task Management | Existing task/job APIs | Read task assignments, write reassignments |
| Session/Logs | Existing log APIs | Stream to terminal panel |
| Usage/Cost | Existing usage APIs | Feed cost metrics panel |
| Org Context | `useOrg()` hook | Office layout scoped per-org |
| Skin System | `SkinContext` + `dashboard-shell.tsx` | Registered as mod with sidebar entry |
| Firestore | Existing Firestore client | Persist office layouts, avatar customizations |

### 7.3 State Management

```
Swarm Agent API (HTTP polling / future WebSocket)
        |
        v
    Event Ingestion Layer
        |
        v
    Perception Engine (classify → aggregate → narrate → hold)
        |
        v
    Office Zustand Store (agents Map, collaboration links, office layout, metrics)
        |
        v
    React Components (2D / 3D / Panels / Builder)
```

**Store shape:**

```typescript
interface OfficeState {
  agents: Map<string, VisualAgent>;
  collaborationLinks: CollaborationLink[];
  officeLayout: OfficeLayout;
  activePanel: PanelType | null;
  selectedAgentId: string | null;
  viewMode: "2d" | "3d" | "background";
  metrics: { totalTokens: number; activeTasks: number; errorCount: number };
}

interface VisualAgent {
  id: string;
  name: string;
  status: AgentVisualStatus;
  position: { x: number; y: number };
  targetPosition: { x: number; y: number };
  path: { x: number; y: number }[];
  zone: "desk" | "meeting" | "server" | "break" | "gym" | "corridor";
  currentTask: string | null;
  speechBubble: string | null;
  avatar: AvatarProfile;
  parentAgentId: string | null;
  childAgentIds: string[];
  lastActiveAt: number;
  toolCallCount: number;
}
```

### 7.4 Performance Budget

| Metric | Target | Strategy |
|--------|--------|----------|
| Bundle size (mod) | < 800KB gzipped | Code-split via `dynamic({ ssr: false })`, tree-shake Three.js |
| Initial load | < 2s on 4G | Lazy-load 3D scene, 2D view loads first |
| Frame rate (3D) | 30fps minimum | Low-poly primitives, 8-segment cylinders, fog culling, `powerPreference: "low-power"` |
| Memory (3D) | < 150MB | Dispose materials/geometries on unmount, shared material instances |
| API polling | 5s interval | Batch agent + task status in single request, debounce store updates |
| Agent capacity | 24 agents | Beyond 24, switch to paginated list with top-6 in office view |

### 7.5 Dependencies

All already installed in Swarm:
- `three` (0.183), `@react-three/fiber` (9.5), `@react-three/drei` — 3D rendering
- `zustand` — state management (add if not present, or use existing React context pattern)
- No new dependencies required for MVP

---

## 8. MVP (v1.0) — "Watch Your Agents Work"

**Goal:** Deliver the core "living office" experience with enough visual fidelity and operational utility to justify a premium price point.

### Included in MVP

| Feature | Priority | Complexity |
|---------|----------|------------|
| 2D isometric office with agent status | P0 | Medium |
| 3D immersive office with procedural avatars | P0 | High |
| View toggle (2D / 3D / background) | P0 | Low |
| Agent status mapping (6 states) | P0 | Medium |
| Agent detail panel (click to inspect) | P0 | Medium |
| Speech bubbles with narrative summaries | P1 | Medium |
| Collaboration lines between session-sharing agents | P1 | Medium |
| A* pathfinding with furniture collision | P1 | Medium |
| Spawn/despawn animations | P1 | Low |
| 2 floor plan templates (startup loft, corporate floor) | P1 | Low |
| Background mode (3D behind dashboard) | P1 | Low |
| Cost metrics panel | P2 | Low (reuses existing APIs) |

### Excluded from MVP (deferred to v2)

- Office builder (drag-and-drop editor)
- Avatar customization UI
- First-person WASD controls
- Task board overlay with drag-and-drop
- Sub-agent hierarchy visualization
- Day/night cycle
- Meeting-room gathering behavior
- Terminal stream panel
- Gym/server-room functional semantics

### MVP Milestones

| Milestone | Deliverables | Est. Effort |
|-----------|-------------|-------------|
| M1: Foundation | Types, Zustand store, perception engine, event ingestion | Backend |
| M2: 2D Office | FloorPlan, DeskUnit, AgentAvatar2D, StatusBadge, CollaborationLine | Frontend |
| M3: 3D Office | OfficeScene, AgentModel (procedural), FurnitureModels, pathfinding, spawn FX | Frontend (heavy) |
| M4: Panels | AgentDetailPanel, CostMetricsPanel, ViewToggle | Frontend |
| M5: Integration | Mod registration (skills.ts, dashboard-shell), Firestore persistence, floor plans | Integration |
| M6: Polish | Performance optimization, responsive layout, error boundaries, loading states | QA |

---

## 9. V2 Roadmap — "Run Your Office"

### v2.0: Office Management
- **Office Builder** — Drag-and-drop 2D editor with furniture palette, snap-to-grid, rotation, multi-floor support
- **Avatar Customization** — Full editor modal with 6 body dimensions, 8 colors, 4 hair styles, accessories, live 3D preview
- **Task Board Overlay** — Kanban overlay with drag-and-drop task-to-agent assignment
- **First-Person Mode** — WASD + mouse fly-through of the 3D office

### v2.1: Deep Ops Integration
- **Terminal Stream** — Live agent terminal output in slide-in panel (last 100 lines, auto-scroll)
- **Session Transcript Viewer** — Styled message bubbles (user/assistant/tool) with search and filter
- **Sub-Agent Hierarchy** — Visual parent-child lines, hot desk assignment, animated spawn/retire lifecycle
- **Meeting Gathering** — Agents in shared sessions auto-cluster in meeting room with animated walk

### v2.2: Advanced Visualization
- **Day/Night Cycle** — Ambient lighting shifts based on real clock or configurable schedule
- **Gym Semantics** — Agents "training" during skill installation with exercise animations
- **Server Room** — Agents performing deployment tasks enter server room with door sequence animation
- **Interactive Furniture** — Click whiteboard → roadmap view, click coffee machine → energy/mood metrics, click file cabinet → memory browser

### v2.3: Social & Sharing
- **Office Snapshots** — Capture and share office state as image/video
- **Visitor Mode** — Read-only shareable link for stakeholders to watch the office
- **Ambient Sound** — Optional office ambiance (typing, murmur, coffee machine) with volume control
- **Achievement Badges** — Gamification layer for agent milestones (100 tasks, 1000 tool calls, etc.)

---

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **3D performance on low-end devices** | High | Medium | 2D mode as fallback, `powerPreference: "low-power"`, configurable quality settings, agent cap at 24 |
| **API polling latency** | Medium | Medium | 5s polling is sufficient for office metaphor (not real-time trading); migrate to WebSocket in v2 when Swarm supports it |
| **Three.js bundle size** | Medium | Low | Already installed in Swarm (Mecha mod, FoidMommy). Code-split ensures non-users pay zero cost |
| **Office metaphor feels gimmicky** | Medium | High | Ensure ops panels provide genuine utility beyond visualization. The office is the hook; the panels are the value |
| **Scope creep toward full tenacitOS/Claw3D** | High | High | Strict MVP scoping. Office builder and advanced features gated behind v2. Ship the core loop first |
| **Firestore costs for layout persistence** | Low | Low | Office layouts are small JSON documents (~2KB). One read/write per session |
| **Mobile/tablet experience** | Medium | Medium | 2D mode works on mobile. 3D mode requires desktop. Progressive enhancement strategy |

---

## 11. Key Performance Indicators

### Adoption
- **Mod activation rate** — % of eligible orgs (3+ agents) that install the mod
- **Daily active mod users** — unique users who open the office view per day
- **View mode preference** — 2D vs 3D vs background mode split
- **Session duration** — average time spent with office view open (target: 15min+ indicates ambient monitoring)

### Engagement
- **Panel interaction rate** — % of sessions where user clicks an agent to open detail panel
- **Office builder usage** — % of users who customize their office layout (v2)
- **Avatar customization rate** — % of agents with custom (non-default) avatars (v2)

### Revenue
- **Conversion rate** — free trial → paid subscription
- **Churn rate** — monthly mod uninstall rate (target: < 5%)
- **Revenue per user** — monthly revenue attributed to this mod

### Technical Health
- **3D frame rate p50/p95** — measured via `requestAnimationFrame` timing
- **Time to interactive** — office view fully loaded and agents visible
- **Error rate** — perception engine failures, render errors, API timeouts

---

## 12. Open Questions

1. **Pricing model** — One-time purchase, monthly subscription, or tiered (basic 2D free, 3D premium)? The reference projects are all free/open-source, so the value proposition must clearly exceed what's freely available.

2. **WebSocket vs polling** — Swarm currently uses HTTP polling for agent status. Should this mod introduce WebSocket infrastructure for real-time updates, or is 5s polling acceptable for the office metaphor?

3. **Agent capacity ceiling** — openclaw-office supports 6 agents, Claw3D supports 6 desks, claw-empire scales higher with departments. What's the right maximum for Swarm's use case? Recommendation: 24 (4 rows of 6) with overflow to paginated list.

4. **Cross-mod interaction** — Should the office sim respect active skin themes (Mecha, JRPG, Pokemon)? E.g., mecha-themed office furniture, pixel-art office style. This adds significant scope but could be a powerful differentiator.

5. **Offline/demo mode** — Should the mod include a mock data mode for demos and screenshots when no agents are running? All four reference projects support this (openclaw-office's `VITE_MOCK=true`, Claw3D's mock adapter).

6. **Sound** — Ambient office audio (typing, murmurs, notification chimes) would enhance immersion but adds bundle size and may annoy users. Ship silent with opt-in audio in v2?

7. **OpenClaw Gateway compatibility** — Should this mod speak the OpenClaw Gateway WebSocket protocol natively (enabling use with actual OpenClaw installations), or only work with Swarm's internal agent API? Supporting both expands the addressable market but increases integration complexity.

---

## Appendix A: Reference Repository Analysis

### A.1 openclaw-office (WW-AI-Lab)
- **Best for:** Perception engine architecture, event pipeline design, three visualization tiers (2D/3D/Living Office), gateway adapter pattern
- **Stars:** 419 | **Age:** 25 days | **License:** MIT
- **Key insight:** The perception pipeline (classify → aggregate → narrate → hold) is the most architecturally mature approach to translating raw agent events into coherent visual behavior. Adopt this pattern.

### A.2 Claw3D (iamlukethedev)
- **Best for:** Advanced 3D office with A* pathfinding, procedural voxel avatars, immersive screen overlays, office builder (Phaser-based)
- **Stars:** 633 | **Age:** 9 days | **License:** MIT
- **Key insight:** The two-hop WebSocket proxy (browser → studio server → gateway) keeps credentials server-side. The functional room semantics (gym = training, QA lab = testing, server room = infra) encode real workflow states into spatial metaphors.

### A.3 tenacitOS (carlosazaustre)
- **Best for:** Comprehensive ops dashboard (30+ API routes), cost tracking pipeline, session transcript viewer, multiple 2D office art styles (Habbo, Stardew, Zelda)
- **Stars:** 909 | **Age:** 31 days | **License:** MIT
- **Key insight:** The cost tracking pipeline (collection script → SQLite → query layer → projections) is the most production-ready ops feature. The multiple art style experiments (Habbo, Stardew, Zelda) suggest user demand for themeable office aesthetics.

### A.4 claw-empire (GreenSheep01201)
- **Best for:** Company-sim interaction patterns (CEO metaphor, departments, Kanban, meetings, XP), multi-provider agent orchestration, PixiJS pixel-art rendering
- **Stars:** 850 | **Age:** 5 weeks | **License:** Apache 2.0
- **Key insight:** The CEO/company metaphor with departments, task delegation, and meeting minutes creates a compelling management game layer on top of agent orchestration. The workflow pack system (development, novel, report, video, research, roleplay) shows how to scope agent behavior to context.

### Combined Ecosystem Metrics
- **Total stars:** 2,811
- **Total forks:** 519
- **Average age:** 22 days
- **Signal:** Explosive early interest in office-metaphor agent visualization. Market timing is now.
