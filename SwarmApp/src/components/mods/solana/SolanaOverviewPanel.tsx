"use client";

import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/analytics/stat-card";
import { SOLANA_MANIFEST } from "@/lib/solana";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { useCluster } from "./SolanaClusterContext";
import type { OwnedItem } from "@/lib/skills";
import type { Agent } from "@/lib/firestore";
import type { WalletInfo } from "@/hooks/useSolanaData";
import {
  Wrench, Wallet, GitBranch, Code, ExternalLink,
  Sparkles, Layers, FileEdit, Image, Play, Landmark,
} from "lucide-react";

const TOOL_ICONS: Record<string, typeof Wrench> = {
  Wallet, Coins: Landmark, Lock: GitBranch, Code, ExternalLink,
  Sparkles, Layers, FileEdit, Image,
};

interface Props {
  agents: Agent[];
  inventory: OwnedItem[];
  walletInfo: WalletInfo | null;
  walletLoading: boolean;
  hasMetaplex: boolean;
}

export default function SolanaOverviewPanel({ agents, inventory, walletInfo, walletLoading, hasMetaplex }: Props) {
  const { cluster } = useCluster();
  const clusterLabel = cluster === "mainnet-beta" ? "Mainnet Beta" : cluster === "devnet" ? "Devnet" : "Testnet";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Cluster" value={clusterLabel} icon="🌐" />
        <StatCard title="Agents" value={String(agents.length)} icon="🤖" />
        <StatCard title="SOL Balance" value={walletLoading ? "..." : walletInfo ? `${walletInfo.solBalance}` : "—"} icon="◎" />
        <StatCard title="Metaplex" value={hasMetaplex ? "Active" : "Not Installed"} icon="🎨" />
      </div>

      {/* Tools */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SOLANA_MANIFEST.tools.map(tool => {
            const Icon = TOOL_ICONS[tool.icon] || Wrench;
            return (
              <SpotlightCard key={tool.id} className="p-0 glass-card-enhanced">
                <CardHeader className="px-4 pt-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon className="h-4 w-4 text-purple-400" />
                    {tool.name}
                    <Badge variant="outline" className="ml-auto text-[9px] px-1.5">{tool.category}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xs text-muted-foreground">{tool.description}</p>
                  {tool.usageExample && (
                    <pre className="mt-2 p-2 rounded bg-muted/50 text-[10px] overflow-x-auto">
                      <code>{tool.usageExample}</code>
                    </pre>
                  )}
                </CardContent>
              </SpotlightCard>
            );
          })}
        </div>
      </div>

      {/* Workflows */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Workflows</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SOLANA_MANIFEST.workflows.map(wf => (
            <SpotlightCard key={wf.id} className="p-0 glass-card-enhanced">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span>{wf.icon}</span>
                  {wf.name}
                  {wf.estimatedTime && (
                    <Badge variant="outline" className="ml-auto text-[9px] px-1.5">{wf.estimatedTime}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-xs text-muted-foreground mb-2">{wf.description}</p>
                <ol className="space-y-1">
                  {wf.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-purple-400 font-mono text-[10px] mt-0.5">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </SpotlightCard>
          ))}
        </div>
      </div>

      {/* Agent Skills */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Agent Skills</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SOLANA_MANIFEST.agentSkills.map(skill => (
            <SpotlightCard key={skill.id} className="p-0 glass-card-enhanced">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Play className="h-3.5 w-3.5 text-purple-400" />
                  {skill.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <p className="text-xs text-muted-foreground">{skill.description}</p>
                <div className="text-[10px] font-mono bg-muted/50 px-2 py-1 rounded text-purple-400">{skill.invocation}</div>
                {skill.exampleInput && (
                  <div className="flex gap-4 text-[10px]">
                    <div><span className="text-muted-foreground">Input:</span> <code>{skill.exampleInput}</code></div>
                  </div>
                )}
              </CardContent>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </div>
  );
}
