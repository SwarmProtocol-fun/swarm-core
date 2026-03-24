"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Droplet, ExternalLink, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useActiveAccount } from "thirdweb/react";

interface FaucetResponse {
  success?: boolean;
  amount?: number;
  currency?: string;
  txHash?: string;
  explorerUrl?: string;
  message?: string;
  nextRequestAvailable?: string;
  error?: string;
  hoursRemaining?: number;
  officialFaucet?: string;
}

export function FaucetPanel() {
  const account = useActiveAccount();
  const [hederaAccountId, setHederaAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<FaucetResponse | null>(null);

  const handleRequest = async () => {
    if (!account?.address) {
      setResponse({ error: "Please connect your wallet first" });
      return;
    }

    if (!hederaAccountId.trim() || !/^0\.0\.\d+$/.test(hederaAccountId.trim())) {
      setResponse({ error: "Please enter a valid Hedera account ID (format: 0.0.xxxx)" });
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/mods/hedera-faucet/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: account.address,
          accountId: hederaAccountId.trim(),
        }),
      });

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({
        error: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Droplet className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-2xl">Hedera Testnet Faucet</CardTitle>
              <CardDescription className="text-base">
                Get free testnet HBAR for testing and development
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-3xl font-bold text-emerald-400">100 HBAR</div>
              <div className="text-sm text-muted-foreground">per request</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-3xl font-bold text-emerald-400">FREE</div>
              <div className="text-sm text-muted-foreground">testnet only</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-3xl font-bold text-emerald-400">24h</div>
              <div className="text-sm text-muted-foreground">cooldown</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Form */}
      <Card>
        <CardHeader>
          <CardTitle>Request Testnet HBAR</CardTitle>
          <CardDescription>
            Enter your Hedera testnet account ID to receive 100 free testnet HBAR
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Status */}
          {account?.address ? (
            <Alert className="bg-emerald-500/10 border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <AlertDescription className="text-emerald-400">
                Wallet connected: {account.address.slice(0, 6)}...{account.address.slice(-4)}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-amber-500/10 border-amber-500/20">
              <Clock className="h-4 w-4 text-amber-400" />
              <AlertDescription className="text-amber-400">
                Please connect your wallet to request testnet HBAR
              </AlertDescription>
            </Alert>
          )}

          {/* Account ID Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Hedera Testnet Account ID</label>
            <Input
              placeholder="0.0.xxxx"
              value={hederaAccountId}
              onChange={(e) => setHederaAccountId(e.target.value)}
              disabled={loading || !account?.address}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Format: 0.0.xxxx (e.g., 0.0.1234567)
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleRequest}
            disabled={loading || !account?.address || !hederaAccountId.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Droplet className="mr-2 h-4 w-4" />
                Request 100 HBAR
              </>
            )}
          </Button>

          {/* Response Message */}
          {response && (
            <div className="space-y-3 pt-2">
              {response.success ? (
                <Alert className="bg-emerald-500/10 border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <AlertDescription className="space-y-2">
                    <div className="text-emerald-400 font-medium">
                      {response.message || "Success!"}
                    </div>
                    {response.txHash && response.explorerUrl && (
                      <a
                        href={response.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-emerald-400 hover:underline"
                      >
                        View transaction <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {response.nextRequestAvailable && (
                      <div className="text-xs text-muted-foreground">
                        Next request available:{" "}
                        {new Date(response.nextRequestAvailable).toLocaleString()}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-red-500/10 border-red-500/20">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="space-y-2">
                    <div className="text-red-400 font-medium">
                      {response.error || "Request failed"}
                    </div>
                    {response.hoursRemaining && (
                      <div className="text-sm text-muted-foreground">
                        Please wait {response.hoursRemaining} hour(s) before requesting again
                      </div>
                    )}
                    {response.officialFaucet && (
                      <a
                        href={response.officialFaucet}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
                      >
                        Try the official Hedera faucet <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Get Testnet HBAR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                1
              </Badge>
              <div>
                <div className="font-medium">Create a Hedera testnet account</div>
                <div className="text-sm text-muted-foreground">
                  Visit{" "}
                  <a
                    href="https://portal.hedera.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    portal.hedera.com
                  </a>{" "}
                  to create a free testnet account
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                2
              </Badge>
              <div>
                <div className="font-medium">Connect your wallet</div>
                <div className="text-sm text-muted-foreground">
                  Connect your Ethereum wallet to authenticate your request
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                3
              </Badge>
              <div>
                <div className="font-medium">Enter your Hedera account ID</div>
                <div className="text-sm text-muted-foreground">
                  Format: 0.0.xxxx (find this in your Hedera portal dashboard)
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                4
              </Badge>
              <div>
                <div className="font-medium">Receive 100 testnet HBAR</div>
                <div className="text-sm text-muted-foreground">
                  Instant delivery to your testnet account (can request again in 24h)
                </div>
              </div>
            </div>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Note:</strong> This faucet distributes testnet HBAR only. Testnet HBAR has no
              real-world value and is for testing purposes only. For additional testnet HBAR, visit
              the{" "}
              <a
                href="https://portal.hedera.com/faucet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                official Hedera faucet
              </a>
              .
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
