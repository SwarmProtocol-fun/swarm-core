"use client";

/**
 * 3D Robot Swarm Visualization
 *
 * Shows three AI agent robots in 3D using Spline.
 * Perfect for hero sections, landing pages, and demo presentations.
 */
export function RobotSwarm3D() {
  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20">
      <iframe
        src="https://prod.spline.design/Apa6K76Zg3Ki-VRj/scene.splinecode"
        frameBorder="0"
        width="100%"
        height="100%"
        className="w-full h-full"
        title="3D Agent Swarm"
      />

      {/* Overlay gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />

      {/* Agent labels */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-6 pointer-events-none">
        <AgentLabel name="Research Agent" status="active" />
        <AgentLabel name="Trading Agent" status="active" />
        <AgentLabel name="Security Agent" status="active" />
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-cyan-900/10">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Loading 3D Agent Swarm...</p>
      </div>
    </div>
  );
}

function AgentLabel({ name, status }: { name: string; status: "active" | "idle" | "busy" }) {
  const statusColors = {
    active: "bg-emerald-500",
    idle: "bg-amber-500",
    busy: "bg-blue-500",
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-lg">
      <div className={`w-2 h-2 rounded-full ${statusColors[status]} animate-pulse`} />
      <span className="text-sm font-medium">{name}</span>
    </div>
  );
}

/**
 * Compact version for smaller sections
 */
export function RobotSwarm3DCompact() {
  return (
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden">
      <iframe
        src="https://prod.spline.design/Apa6K76Zg3Ki-VRj/scene.splinecode"
        frameBorder="0"
        width="100%"
        height="100%"
        className="w-full h-full scale-125"
        title="3D Agent Swarm Compact"
      />
    </div>
  );
}
