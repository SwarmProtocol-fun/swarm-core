"use client";

import { Droplet, Settings, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FaucetPanel } from "@/components/mods/hedera-faucet/FaucetPanel";

export default function HederaFaucetModPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Droplet className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Hedera Testnet Faucet</h1>
            <p className="text-sm text-muted-foreground">
              Get free testnet HBAR for testing and development
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href="https://portal.hedera.com/faucet" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Official Faucet
            </Button>
          </a>
        </div>
      </div>

      {/* Faucet Panel */}
      <FaucetPanel />
    </div>
  );
}
