# Mecha LaunchPad Mod

Industrial mech hangar UI skin for Swarm. Features a 3D Three.js background with procedural mech robots representing your agents, a HUD-style status bar, and angular military design language.

Inspired by [seanbud/MechaLaunchPad](https://github.com/seanbud/MechaLaunchPad).

## Features

- **3D Mech Hangar** — React Three Fiber scene with up to 6 procedural robots on landing pads
- **Live agent status** — Online mechs glow green, busy glow yellow, offline dim gray
- **Power-up animation** — Emissive brightness ramp when agents come online
- **HUD status bar** — Military-style header with squadron info and mech status array
- **Industrial sidebar** — Angular bracket indicators, blue active bars, section color coding
- **Share Tech Mono font** — Loaded only when skin is active
- **GitHub-dark palette** — `#0d1117` / `#161b22` / `#21262d` with blue/green/yellow accents
- **Angular card panels** — `clip-path` corner cuts for industrial feel
- **HUD corner brackets** — `.mecha-hud-border` CSS utility for framing panels
- **Grid-line background** — Subtle repeating grid + ambient blue glow
- **Label remapping** — Agents → Mechs, Tasks → Missions, Marketplace → Parts Depot

## Files

| File | Location | Purpose |
|------|----------|---------|
| SkinContext entry | `src/contexts/SkinContext.tsx` | Skin registration |
| SKILL_REGISTRY entry | `src/lib/skills.ts` | Marketplace listing |
| Chart palette | `src/components/charts/chart-theme.ts` | Chart colors |
| CSS skin block | `src/app/globals.css` | ~250 lines of `.skin-mecha` CSS |
| MechaContext | `src/contexts/MechaContext.tsx` | Label remapping |
| MechaSidebar | `src/components/mecha/mecha-sidebar.tsx` | Custom sidebar |
| MechaHeader | `src/components/mecha/mecha-header.tsx` | Custom header |
| MechaBackground | `src/components/mecha/mecha-background.tsx` | 3D Three.js scene |
| DashboardShell | `src/components/dashboard-shell.tsx` | Skin-aware layout switcher |

## 3D Scene

The background renders a mech hangar using React Three Fiber:

- **6 mech bays** arranged in 2 rows of 3
- Each mech is built from primitives: box torso, box head + emissive visor, cylinder arms, box legs, sphere pauldrons, sphere chest light, cylinder landing pad
- `MeshStandardMaterial` with metalness 0.85, roughness 0.25, status-colored emissive
- Auto-orbit camera at ~0.02 rad/s, idle hover bob + head tracking
- Fog fade from 8 to 20 units, Canvas at 35% opacity
- `powerPreference: "low-power"`, low-poly segments (8-sided), code-split via `dynamic({ ssr: false })`

## Mecha Label Map

| Standard | Mecha |
|----------|-------|
| Command | Mission Control |
| Deploy | Launch Bay |
| Coordinate | Tactical Ops |
| Platform | Base Systems |
| Modifications | Mech Upgrades |
| Fleet | Mech Hangar |
| Marketplace | Parts Depot |
| Agents | Mechs |
| Tasks | Missions |
| Credits | Alloy |
| Channels | Comms |
| Scheduler | Mission Planner |
| Organizations | Factions |
| Cerebro | AI Core |
| Settings | Maintenance Bay |
| Docs | Tech Manual |
| Storage | Cargo Bay |
| Swarm | Squadron |
| Admin | Command Authority |
