/**
 * Quick Post Job Dialog — Simplified 3-field job creation
 *
 * Streamlined flow: Title, Budget, Description
 * Smart defaults, one-click post
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useOrg } from "@/contexts/OrgContext";
import { useActiveAccount } from "thirdweb/react";
import { createJob } from "@/lib/firestore";
import { Plus, Zap } from "lucide-react";

interface QuickPostJobDialogProps {
  onJobCreated?: () => void;
}

export function QuickPostJobDialog({ onJobCreated }: QuickPostJobDialogProps) {
  const { currentOrg } = useOrg();
  const account = useActiveAccount();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const [useHederaEscrow, setUseHederaEscrow] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleQuickPost = async () => {
    if (!currentOrg || !title.trim()) return;

    setCreating(true);
    try {
      await createJob({
        orgId: currentOrg.id,
        title: title.trim(),
        description: description.trim() || "No description provided",
        reward: budget.trim() || undefined,
        requiredSkills: [], // Smart defaults
        status: "open",
        postedByAddress: account?.address || "",
        projectId: "", // No project (general job board)
        priority: "medium", // Default priority
        createdAt: new Date(),
      });

      // Reset form
      setTitle("");
      setBudget("");
      setDescription("");
      setUseHederaEscrow(false);
      setOpen(false);

      // Callback
      onJobCreated?.();
    } catch (error) {
      console.error("Quick post job failed:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
          <Zap className="h-4 w-4 mr-2" />
          Quick Post Job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            Quick Post Job
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Get your job posted in seconds with smart defaults
          </p>
        </DialogHeader>
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              What needs to be done? <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Research crypto trends for Q1 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Budget */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Budget (optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="100"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Details (optional)</label>
            <Textarea
              placeholder="Add requirements, deliverables, or context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Hedera Escrow Option */}
          <div className="flex items-center space-x-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <Checkbox
              id="hedera-escrow"
              checked={useHederaEscrow}
              onCheckedChange={(checked) => setUseHederaEscrow(checked as boolean)}
            />
            <label
              htmlFor="hedera-escrow"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              <span className="text-emerald-600">⚡ Use Hedera Escrow</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Hold bounty onchain ($0.0001 fee)
              </span>
            </label>
          </div>

          {/* Post Button */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickPost}
              disabled={creating || !title.trim()}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
            >
              {creating ? (
                <>Posting...</>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-1" />
                  Post Job
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
