# OpenClaw Office Sim — Business & Packaging PRD

> **Mod ID:** `openclaw-office-sim`
> **Type:** Premium Swarm Marketplace Mod
> **Version:** 0.1.0-draft
> **Date:** 2026-03-24
> **Status:** Draft

---

## 1. Positioning

**OpenClaw Office Sim** is the premier spatial monitoring and visualization mod for multi-agent systems on the Swarm Protocol. It transforms invisible agent orchestration into a visible, interactive virtual office — making AI teams legible to operators, impressive to stakeholders, and auditable for compliance.

**One-line positioning:**

> "The mission control room your AI agents have been missing."

**Category positioning within the Swarm Marketplace:**

| Existing Category | How Office Sim Differs |
|---|---|
| Dashboard/Analytics mods | Analytics show *numbers*. Office Sim shows *behavior* — spatially, temporally, cinematically |
| Agent monitoring tools (logs, metrics) | Monitoring tools are text-first. Office Sim is visual-first: you *see* agents working |
| Skin/theme mods | Skins change appearance. Office Sim changes the entire observation paradigm |

**Market context — cited technical inspirations:**

| Project | What It Proves | Gap Office Sim Fills |
|---|---|---|
| **WW-AI-Lab/openclaw-office** | Dual 2D/3D office rendering for AI agents is viable and compelling. SVG isometric + React Three Fiber with WebSocket state | Locked to OpenClaw ecosystem. No Swarm integration, no marketplace packaging, no replay, no multi-org support |
| **iamlukethedev/Claw3D** | 3D walkable office environments for agent monitoring create a "wow" factor that flat dashboards cannot | Requires self-hosting an OpenClaw gateway. No 2D fallback, no admin controls, no demo mode |
| **carlosazaustre/tenacitOS** | OS-style desktop metaphor with voxel avatars and cost analytics resonates with ops teams | Read-only dashboard. No interactivity, no 3D immersion, no replay. Tightly coupled to local filesystem |
| **GreenSheep01201/claw-empire** | Pixel-art office simulation with departments, Kanban, and CEO metaphor proves the "virtual company" concept | Local-first with SQLite. No cloud deployment, no marketplace distribution, no Swarm Protocol integration |

**What Office Sim uniquely combines:**
- Both 2D (operational) and 3D (cinematic) in one mod — switchable
- Swarm Protocol native — works with any Swarm hub deployment
- Marketplace-distributed — install in one click, no self-hosting required
- Replay with time scrubber — unique to this mod in the ecosystem
- Multi-persona: builder, operator, and presenter modes in one product

---

## 2. Customer Pain

### Pain 1: "I can't see what my agents are doing"

Developers run 3–10 agents and monitor them via terminal logs or basic status endpoints. When something goes wrong, they grep logs. When nothing is wrong, they have no confirmation things are *right*. There's no spatial awareness, no at-a-glance view, no way to watch agents collaborate.

### Pain 2: "Explaining AI agents to non-technical people is impossible"

Product managers, investors, and customers can't understand agent orchestration from dashboards, metrics, or log files. Every demo devolves into "trust me, it's working." There's no visual proof, no narrative, no storytelling medium.

### Pain 3: "Post-incident review is painful"

When agents fail, operators reconstruct what happened from scattered logs across multiple agents. There's no unified timeline, no spatial replay, no way to watch the cascade unfold. Root cause analysis takes hours instead of minutes.

### Pain 4: "Our agent infrastructure looks unprofessional"

Teams pitching agent-powered products to enterprise customers have no way to present their system as mature and enterprise-grade. Terminal output doesn't inspire confidence. A polished, real-time office simulation does.

### Pain 5: "I can't manage 20+ agents without tooling"

At scale (10–50+ agents), operators need filtering, search, batch operations, alerting, and spatial organization. Flat lists and log aggregators don't provide the cognitive scaffolding of a spatial metaphor (desks, rooms, zones).

---

## 3. Value Proposition

| Audience | Value |
|---|---|
| **Solo Developer** | See your agents working in real-time. Catch errors visually. Understand inter-agent communication through spatial metaphor. Stop guessing, start watching. |
| **Ops/Admin Team** | Command center for 10–50+ agents. Filter, search, batch-approve, alert. Replay incidents in minutes. Spatial organization reduces cognitive load. |
| **Product/Sales Team** | Demo mode turns your agent stack into a cinematic investor pitch. 3D walkthrough, replay narration, shareable clips. Close deals faster. |
| **Enterprise Buyer** | Audit trail via replay. Compliance-ready event logs. SSO integration. Private deployment option. Looks like a mature, managed platform. |

**ROI Model:**

- **Developer productivity**: 15–30 min/day saved on agent monitoring (vs. log-grepping)
- **Incident resolution**: 50% faster MTTR with visual replay vs. log reconstruction
- **Sales acceleration**: Demos with Office Sim convert at higher rate than terminal-based demos
- **Compliance**: Replay export satisfies audit requirements without custom tooling

---

## 4. Packaging

### Tier 1: Office Sim Base (Free)

The free tier establishes the mod in the marketplace and drives adoption. It's genuinely useful — not a crippled trial.

| Feature | Included |
|---|---|
| Home Dashboard | Overview cards, agent grid, activity feed |
| 2D Office View | Floor plan with desks, meeting rooms, queue, error bay |
| 5 Agent States | Idle, Active, Error, Blocked, Offline |
| Agent Detail Drawer | Current task, recent activity (last 50 events), basic actions |
| Real-time Updates | WebSocket from Swarm hub |
| Agent Limit | Up to 5 agents |
| Replay | None |
| 3D View | None |
| Admin Panel | None |
| Themes | Default dark only |
| Support | Community (GitHub Issues) |

### Tier 2: Office Sim Pro (Subscription)

The Pro tier unlocks the full experience for serious users — developers running real workloads and ops teams managing production agents.

| Feature | Included |
|---|---|
| Everything in Base | Yes |
| Unlimited Agents | No cap |
| Full 10 Agent States | + Coding, Waiting Approval, In Meeting, Spawning, Tool Calling |
| 3D Office View | Full scene with agent models, animations, speech bubbles |
| Camera Modes | Orbit, Follow, Cinematic, Top-Down |
| Collaboration Lines | Visible inter-agent message flow |
| Tool Call Effects | Particle effects for API calls, file I/O, database queries |
| Replay | Full timeline scrubber, event markers, speed control, up to 7 days history |
| Demo Mode | Mask sensitive data, sample labels, cinematic auto-camera |
| Admin Panel | Layout editor, agent assignments, alert configuration |
| 3 Office Themes | Default Dark, Cyberpunk Neon, Minimal Frost |
| Search & Filter | Full text search, multi-filter, bulk operations |
| Keyboard Shortcuts | Complete set |
| Support | Email support, 48h response |

### Tier 3: Office Sim Enterprise (Custom Pricing)

Enterprise tier adds private deployment, compliance features, and organizational controls. Sold via direct sales, not self-serve.

| Feature | Included |
|---|---|
| Everything in Pro | Yes |
| Private Deployment | Self-hosted or dedicated cloud instance |
| SSO Integration | SAML/OIDC with existing identity provider |
| Role-Based Access | Viewer, Operator, Admin roles with granular permissions |
| Multi-Floor View | Separate floors per org/team/department |
| Replay Export | MP4 video, shareable links, certified audit logs |
| Compliance Package | Tamper-evident event logs, SOC 2 mappings, retention policies |
| Custom Themes | Branded office environments (company colors, logos, custom furniture) |
| API Access | REST API for embedding office views in external dashboards |
| SLA | 99.9% uptime, 4h response, dedicated support channel |
| Onboarding | White-glove setup, layout design consultation, training session |

---

## 5. Pricing

### Strategy: Freemium → Pro Conversion → Enterprise Expansion

```
Free (Base)          $0/mo    — drives adoption, 5-agent cap creates natural upgrade trigger
Pro Monthly         $29/mo    — per org, unlimited agents, full feature set
Pro Annual         $249/yr    — 2 months free vs. monthly ($20.75/mo effective)
Pro Lifetime       $599 once  — for indie developers who hate subscriptions
Enterprise         Custom     — starts at $199/mo, scales with agents/floors/features
```

**Pricing Rationale:**

| Decision | Reasoning |
|---|---|
| Free tier is genuinely useful | Drives marketplace installs, reviews, and word-of-mouth. 5-agent cap is generous for evaluation but tight for production |
| $29/mo Pro | Aligned with Swarm marketplace norms. Low enough for solo devs, justifiable for teams. Comparable to observability tool pricing (Datadog dev tier: $15–30/mo) |
| Lifetime option | Captures indie/hobbyist segment that dislikes subscriptions. Revenue recognized upfront. $599 = ~2 years of monthly |
| Enterprise custom | Every enterprise deployment is different (SSO provider, compliance requirements, scale). Custom pricing prevents leaving money on the table |

**Crypto Pricing (HBAR Alternative):**

```
Pro Monthly         120 HBAR/mo
Pro Annual        1,000 HBAR/yr
Pro Lifetime      2,500 HBAR once
```

HBAR pricing provides a native Web3 payment option for the Swarm ecosystem. Prices pegged quarterly to maintain approximate USD equivalence.

---

## 6. Licensing

### Open Components (MIT License)

These components are open source and available to the community:

| Component | Rationale |
|---|---|
| Agent state type definitions | Standard vocabulary benefits the entire ecosystem |
| WebSocket event schema | Interoperability — other mods can build on the same event format |
| 2D SVG avatar generator | Community contribution. Deterministic avatars from agent IDs |
| Floor plan data format (JSON schema) | Enables community-created office layouts |
| Base 2D rendering utilities | Establishes the mod as a platform, not just a product |
| Color/state mapping constants | Ensures consistent visual language across ecosystem |

### Proprietary Components (Swarm Commercial License)

These components require a Pro or Enterprise license:

| Component | Rationale |
|---|---|
| 3D scene, models, and animations | Significant art/engineering investment. Core differentiator |
| Replay engine and timeline scrubber | Complex engineering. Key selling point for Pro |
| Admin panel and layout editor | Enterprise value. Requires ongoing maintenance |
| Cinematic camera system | Premium polish. Demo/pitch mode is a paid feature |
| Office themes and skins | Monetizable add-on content |
| Compliance and audit features | Enterprise revenue driver |
| SSO/RBAC integration | Enterprise-only complexity |
| Particle effects and post-processing | Visual premium that justifies Pro pricing |

### License Enforcement

- Free tier: enforced client-side via agent count check + Swarm marketplace subscription status
- Pro tier: validated against Swarm org subscription state via `GET /api/v1/mods/openclaw-office-sim/license`
- Enterprise: license key validated on startup, offline grace period of 72 hours
- No DRM or obfuscation beyond standard minification — trust-based model with audit capability

---

## 7. Deployment Models

### Model A: Swarm Cloud (Default)

```
User's Browser  →  Swarm App (Netlify)  →  Office Sim Mod (embedded)
                                        →  Swarm Hub (WebSocket)
```

- Office Sim runs as an integrated mod within the Swarm App
- Installed via marketplace one-click
- No additional infrastructure required
- State sourced from Swarm Hub via existing WebSocket connection
- 3D assets served from Swarm CDN (lazy-loaded)
- Replay data stored in Firestore (7-day rolling for Pro)

**Best for:** Solo developers, small teams, evaluation

### Model B: Self-Hosted (Enterprise)

```
User's Browser  →  Customer's Swarm Instance  →  Office Sim (self-hosted)
                                               →  Customer's Swarm Hub
```

- Office Sim deployed as a Docker container alongside customer's Swarm Hub
- All data stays within customer's infrastructure
- Configuration via environment variables + `office-sim.config.json`
- Replay data stored in customer's database (Postgres or SQLite)
- SSO integrates with customer's identity provider

**Best for:** Enterprise customers with data residency requirements, air-gapped environments

### Model C: Hybrid (Pro+)

```
User's Browser  →  Swarm App (Netlify)  →  Office Sim Mod (embedded)
                                        →  Customer's Swarm Hub (remote)
```

- Office Sim UI runs in Swarm Cloud
- Connects to customer's self-hosted Swarm Hub via WebSocket
- Replay data optionally stored locally (customer's Hub) or in Swarm Cloud
- No additional deployment needed for the mod itself

**Best for:** Teams with self-hosted Swarm Hubs who want managed UI

---

## 8. Marketplace Strategy

### Listing Requirements

The mod listing in the Swarm Marketplace must include:

```typescript
{
  id: "openclaw-office-sim",
  name: "OpenClaw Office Sim",
  description: "2D command center and 3D immersive office for monitoring your AI agents. Watch them work, catch errors visually, replay incidents, and demo your agent stack.",
  type: "mod",
  source: "verified",
  category: "Monitoring",
  icon: "🏢",
  version: "1.0.0",
  author: "Swarm Protocol",
  tags: ["monitoring", "visualization", "office", "3D", "2D", "agents", "replay", "demo"],
  pricing: {
    model: "subscription",
    tiers: [
      { plan: "monthly", price: 0, currency: "USD" },      // Free base
      { plan: "monthly", price: 29, currency: "USD" },      // Pro monthly
      { plan: "yearly", price: 249, currency: "USD" },      // Pro annual
      { plan: "lifetime", price: 599, currency: "USD" }     // Pro lifetime
    ]
  },
  sidebarConfig: {
    sectionId: "modifications",
    label: "Office Sim",
    href: "/office-sim",
    iconName: "Building2"
  },
  manifest: {
    tools: [
      { id: "2d-office", name: "2D Office View", description: "SVG isometric floor plan with real-time agent monitoring", icon: "🗺️", category: "Visualization", status: "active" },
      { id: "3d-office", name: "3D Office View", description: "Immersive React Three Fiber office with animated agents", icon: "🎮", category: "Visualization", status: "active" },
      { id: "replay-engine", name: "Replay Engine", description: "Time-travel through agent activity with timeline scrubber", icon: "⏪", category: "Analysis", status: "active" },
      { id: "layout-editor", name: "Layout Editor", description: "Drag-and-drop floor plan designer for custom office layouts", icon: "📐", category: "Configuration", status: "active" },
      { id: "demo-mode", name: "Demo Mode", description: "Presentation-ready view with masked data and cinematic camera", icon: "🎬", category: "Presentation", status: "active" }
    ],
    workflows: [
      { id: "incident-replay", name: "Incident Replay Investigation", description: "Replay the last N minutes to visually trace error cascades", icon: "🔍", tags: ["debugging", "ops"], steps: ["Select time range", "Filter by affected agents", "Play back at variable speed", "Identify root cause visually", "Export replay for post-mortem"], estimatedTime: "5-15 minutes" },
      { id: "investor-demo", name: "Investor Demo Walkthrough", description: "Present your agent system with cinematic 3D visualization", icon: "🎪", tags: ["sales", "demo"], steps: ["Enable Demo Mode", "Switch to 3D Office", "Activate Cinematic Camera", "Walk through agent collaboration", "Show replay of completed workflow"], estimatedTime: "10-20 minutes" }
    ],
    agentSkills: [],
    examples: [
      { id: "quickstart", name: "Quick Start", description: "Install and open the office in 60 seconds", icon: "🚀", tags: ["setup"], codeSnippet: "// 1. Install from Marketplace\n// 2. Click 'Office Sim' in sidebar\n// 3. Your agents appear as office workers", language: "typescript" }
    ]
  }
}
```

### Discovery & Conversion Funnel

```
Marketplace Browse → Listing Page → Install (Free) → Use 2D Office
                                                    → Hit 5-agent cap
                                                    → Try 3D (locked)
                                                    → Upgrade prompt
                                                    → Pro Subscription
                                                    → Scale to team
                                                    → Enterprise inquiry
```

**Conversion Triggers:**

| Trigger | Where | Action |
|---|---|---|
| 6th agent connects | 2D Office | "Upgrade to Pro for unlimited agents" banner |
| Click 3D tab (free tier) | Navigation | Preview screenshot + "Unlock 3D with Pro" overlay |
| Click Replay tab (free tier) | Navigation | "Pro feature: replay last 7 days of agent activity" |
| Agent count >15 | Dashboard | "Consider Enterprise for multi-floor layouts" suggestion |
| Shared with team member | Admin | "Enterprise SSO keeps your team in sync" upsell |

### Marketplace Metrics to Track

| Metric | Target (Month 1) | Target (Month 6) |
|---|---|---|
| Installs (free) | 200 | 2,000 |
| Pro conversions | 20 (10% of installs) | 300 (15% cumulative) |
| Enterprise inquiries | 2 | 15 |
| Average rating | 4.5+ stars | 4.5+ stars |
| DAU (daily active users) | 50 | 500 |
| Replay sessions/week | 100 | 2,000 |
| 3D view sessions/week | 150 | 3,000 |

---

## 9. Proprietary vs. Open Components

### Strategic Philosophy

> Open the **platform** (data formats, state definitions, base rendering), own the **experience** (3D, replay, admin, themes).

This creates a moat around the premium experience while encouraging ecosystem growth. Third-party developers can build on the open schemas (alternative 2D renderers, custom integrations) without competing directly with the premium features.

### Boundary Map

```
OPEN (MIT)                              PROPRIETARY (Commercial)
─────────────────────────────────────   ─────────────────────────────────
AgentState enum                         3D Scene & R3F Components
WebSocket event schema                  Agent 3D Models & Animations
Floor plan JSON schema                  Replay Engine & Timeline UI
SVG avatar generator                    Cinematic Camera System
2D base rendering utils                 Admin Panel & Layout Editor
State → Color mapping                   Office Themes & Skins
TypeScript type exports                 Compliance & Audit Package
                                        Demo Mode
                                        Particle Effects System
                                        SSO/RBAC Integration
                                        Export (Video/Link/Audit)
```

### npm Package Strategy

```
@swarm/office-sim-types      (MIT)     — TypeScript types, schemas, constants
@swarm/office-sim-avatars    (MIT)     — SVG avatar generator
@swarm/office-sim            (Commercial) — Full mod (2D + 3D + Replay + Admin)
```

The MIT packages encourage ecosystem adoption and make Office Sim's data format the standard for agent visualization in the Swarm ecosystem.

---

## 10. Expansion Opportunities — Monetizable Add-Ons

### Add-On 1: Custom Office Themes ($9.99 each or $29.99 theme pack)

| Theme | Description |
|---|---|
| Cyberpunk Neon | Neon-lit, rain-streaked windows, holographic displays, synthwave palette |
| Space Station | Zero-gravity floating desks, starfield backdrop, astronaut agents |
| Cozy Cabin | Warm lighting, wooden desks, fireplace, forest view through windows |
| Retro Pixel | Pixel-art style (inspired by claw-empire), chiptune sound effects |
| Minimal White | Clean, Bauhaus-inspired, black-on-white, maximum data density |
| Corporate HQ | Realistic modern office, glass walls, branded lobby |

**Revenue model:** One-time purchase per theme. Theme pack bundles at 50% discount. New themes released quarterly.

### Add-On 2: Vertical-Specific Environments ($19.99/mo)

| Vertical | Customization |
|---|---|
| **DevOps/SRE** | Server room instead of office. Agents as sysadmins. Racks, cables, consoles. Alert lights |
| **Trading Floor** | Bloomberg-terminal aesthetic. Ticker tapes. Green/red P&L per agent. Urgency everywhere |
| **Research Lab** | Whiteboards, papers, microscopes. Agents as researchers. Discovery moments visualized |
| **Customer Support** | Call center layout. Queue visualization. CSAT scores above agents. Ticket flow |
| **Legal/Compliance** | Document review room. Filing cabinets. Approval stamps. Audit trail emphasis |

**Revenue model:** Monthly subscription per vertical. Each vertical includes custom floor plan, agent animations, and domain-specific metrics overlays.

### Add-On 3: Replay Analytics ($14.99/mo)

Extends the base replay feature with advanced analysis:

- **Bottleneck detection**: Automatically identify agents/tasks that slow the system
- **Collaboration graph**: Heatmap of which agents communicate most
- **Error cascade visualization**: Animated tree showing how one failure propagates
- **Performance comparison**: Replay two time periods side-by-side
- **AI-generated summary**: LLM narrates what happened in a replay session
- **Export as report**: PDF with timeline, screenshots, and recommendations

### Add-On 4: Compliance & Security Package ($49.99/mo)

For regulated industries:

- **Tamper-evident logs**: Cryptographically signed event logs
- **Retention policies**: Configurable data retention (30/60/90/365 days)
- **SOC 2 mapping**: Pre-built controls mapped to SOC 2 Type II requirements
- **Access audit trail**: Who viewed what, when, from where
- **Data masking rules**: Configure which fields are masked in demo mode and exports
- **PII detection**: Alert if agent output contains PII in visual displays

### Add-On 5: Enterprise SSO & Admin Features ($29.99/mo)

- SAML 2.0 and OIDC integration
- Role-based access: Viewer, Operator, Admin, Super Admin
- Team/department scoping: limit visibility to assigned agents
- Usage quotas per team
- Centralized theme and layout management
- Audit log export for IT governance

---

## 11. Launch Plan

### Phase 0: Pre-Launch (Weeks 1–4)

| Action | Owner | Output |
|---|---|---|
| Finalize UX/UI PRD and get design review | Product | Approved wireframes |
| Build 2D Office MVP (5 agent states, drawer, dashboard) | Engineering | Working prototype |
| Set up WebSocket integration with Swarm Hub | Engineering | Live agent data flowing |
| Create marketplace listing (screenshots, description, manifest) | Marketing | Draft listing |
| Recruit 10 beta testers from Swarm community | Community | Beta cohort |
| Define telemetry events (installs, upgrades, feature usage) | Analytics | Event schema |

### Phase 1: Closed Beta (Weeks 5–8)

| Action | Owner | Output |
|---|---|---|
| Ship Base (free) tier to beta testers | Engineering | v0.9.0-beta |
| Collect feedback on 2D Office usability | Product | Feedback report |
| Build 3D Office scene (basic models, orbit camera) | Engineering | 3D prototype |
| Build Replay MVP (1-hour history, scrubber) | Engineering | Replay working |
| Iterate on feedback — fix top 5 issues | Engineering | v0.9.5-beta |
| Create demo video (60-second showcase) | Marketing | Video asset |

### Phase 2: Public Launch (Weeks 9–10)

| Action | Owner | Output |
|---|---|---|
| Publish to Swarm Marketplace (Base = free, Pro = $29/mo) | Engineering | Live listing |
| Launch blog post: "Introducing Office Sim" | Marketing | Blog post |
| Social media campaign (Twitter/X, Discord, Farcaster) | Marketing | Launch thread |
| Product Hunt launch | Marketing | PH listing |
| Email Swarm user base | Marketing | Email blast |
| Monitor install rate, crash reports, feedback | Eng + Product | Dashboard |

### Phase 3: Post-Launch Growth (Weeks 11–16)

| Action | Owner | Output |
|---|---|---|
| Ship 3D view to Pro tier | Engineering | v1.1.0 |
| Ship Admin Panel (layout editor, alerts) | Engineering | v1.2.0 |
| First custom theme drop (Cyberpunk Neon) | Design | Theme add-on |
| Enterprise pilot with 2 customers | Sales | Pilot contracts |
| Replay Analytics add-on (beta) | Engineering | Add-on listing |
| Community showcase: best office layouts | Community | Social content |

### Phase 4: Scale (Months 4–6)

| Action | Owner | Output |
|---|---|---|
| Vertical-specific environments (first 2) | Design + Eng | Add-on listings |
| Compliance package (beta) | Engineering | Enterprise add-on |
| SSO integration | Engineering | Enterprise feature |
| Self-hosted deployment guide + Docker image | Engineering | Docs + image |
| Conference demo at [relevant AI/Web3 event] | Marketing | Live demo |
| Evaluate VR/WebXR prototype | R&D | Feasibility report |

---

## 12. Competitive Differentiators

### vs. Traditional Monitoring (Datadog, Grafana, New Relic)

| Dimension | Traditional | Office Sim |
|---|---|---|
| **Metaphor** | Charts, graphs, log streams | Spatial office with agents as people |
| **Learning curve** | Requires query language (PromQL, LogQL) | Visual — no query language needed |
| **Agent-awareness** | Generic service/container monitoring | Purpose-built for AI agent orchestration |
| **Demo value** | Screenshots of graphs | Live 3D walkthrough |
| **Replay** | Log replay requires manual correlation | Visual replay with timeline scrubber |
| **Price** | $15–50+/host/mo | $0–29/org/mo |

### vs. openclaw-office

| Dimension | openclaw-office | Office Sim |
|---|---|---|
| **Ecosystem** | OpenClaw only | Swarm Protocol (broader) |
| **Distribution** | Self-hosted, `npx` install | One-click marketplace install |
| **Replay** | Not available | Full timeline + scrubber |
| **Admin** | Basic settings | Layout editor, alerts, RBAC |
| **Packaging** | Open source, all features | Tiered: Free/Pro/Enterprise |
| **Demo mode** | Not available | Built-in, one-click |

### vs. Claw3D

| Dimension | Claw3D | Office Sim |
|---|---|---|
| **2D fallback** | No (3D only) | Yes, 2D is primary, 3D optional |
| **Performance** | Heavy 3D only | Degradation tiers, mobile-friendly |
| **Standalone** | Requires OpenClaw gateway | Works with any Swarm Hub |
| **Enterprise** | Community project | Commercial support, SLA, SSO |

### vs. claw-empire

| Dimension | claw-empire | Office Sim |
|---|---|---|
| **Architecture** | Local-first, SQLite | Cloud-native, Firestore, self-host option |
| **Agent support** | Specific CLI tools | Any Swarm-compatible agent |
| **Visualization** | Pixel-art (PixiJS) | 2D SVG + 3D R3F (professional) |
| **Distribution** | Clone + self-host | Marketplace one-click |
| **Monetization** | Open source | Freemium with Pro/Enterprise tiers |

### vs. tenacitOS

| Dimension | tenacitOS | Office Sim |
|---|---|---|
| **Interactivity** | Read-only dashboard | Full CRUD: assign, approve, reassign, restart |
| **Replay** | Not available | Full timeline replay |
| **Scale** | Single VPS | Multi-org, multi-floor |
| **Deployment** | Lives in OpenClaw workspace | Marketplace mod, standalone, or self-hosted |

### Unique Moats

1. **Swarm-native**: First and deepest integration with Swarm Protocol's agent model, SOUL configs, and hub WebSocket
2. **Dual-view paradigm**: Only solution offering both operational 2D and cinematic 3D in a single product
3. **Replay engine**: No competing agent visualization tool offers time-travel replay with scrubber
4. **Marketplace distribution**: One-click install from the Swarm Marketplace. No DevOps required
5. **Tiered packaging**: Free tier drives adoption, Pro monetizes power users, Enterprise captures budget
6. **Ecosystem lock-in**: Open schemas make Office Sim's data format the standard, creating switching costs for alternatives

---

## Summary: Revenue Model at Maturity (Month 12 Projection)

```
Revenue Stream                          Monthly Estimate
──────────────────────────────────────  ────────────────
Pro subscriptions (200 orgs × $29)      $5,800
Annual subscriptions (50 × $249/12)     $1,037
Lifetime (10/mo × $599, amortized 24m)  $250
Theme packs (30/mo × $10 avg)           $300
Vertical environments (15 × $20)        $300
Replay Analytics (40 × $15)             $600
Compliance package (5 × $50)            $250
Enterprise contracts (3 × $199 avg)     $597
──────────────────────────────────────  ────────────────
Estimated Monthly Revenue               ~$9,134
Estimated Annual Run Rate               ~$109,600
```

*Conservative estimate. Growth accelerates with Swarm Protocol adoption, enterprise pipeline, and conference exposure.*

---

*This document is a living specification. Pricing, packaging, and timeline are subject to market feedback and beta results.*