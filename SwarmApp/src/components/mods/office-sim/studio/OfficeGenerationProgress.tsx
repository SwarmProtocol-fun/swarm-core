/** OfficeGenerationProgress — Multi-job progress grid for batch office generation */
"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  FURNITURE_LABELS,
  type FurnitureCategory,
} from "./furniture-types";
import {
  TEXTURE_LABELS,
  type TextureMaterial,
} from "./texture-types";

interface BatchJob {
  jobId: string;
  pluginId: string;
  category: string;
  assetKind: string;
}

interface JobStatus {
  id: string;
  status: string;
  progress?: number;
  completed?: boolean;
}

/** Label lookup that works across both furniture and texture categories */
function getCategoryLabel(category: string, pluginId: string): string {
  if (pluginId === "meshy") {
    return FURNITURE_LABELS[category as FurnitureCategory] || category;
  }
  return TEXTURE_LABELS[category as TextureMaterial] || category;
}

export function OfficeGenerationProgress({
  jobs,
}: {
  jobs: BatchJob[];
}) {
  const [statuses, setStatuses] = useState<Map<string, JobStatus>>(new Map());
  const [polling, setPolling] = useState(true);

  const pollJob = useCallback(async (job: BatchJob) => {
    try {
      // Use the unified plugin job polling endpoint
      const res = await fetch(`/api/v1/plugins/jobs/${job.jobId}`);
      if (!res.ok) return;
      const data = await res.json();

      setStatuses((prev) => {
        const next = new Map(prev);
        next.set(job.jobId, {
          id: job.jobId,
          status: data.status,
          progress: data.progress,
          completed: data.completed,
        });
        return next;
      });
    } catch {
      // Ignore individual poll failures
    }
  }, []);

  // Poll all jobs periodically
  useEffect(() => {
    if (!polling || jobs.length === 0) return;

    const pollAll = () => {
      for (const job of jobs) {
        const current = statuses.get(job.jobId);
        if (current?.status === "completed" || current?.status === "failed") continue;
        pollJob(job);
      }
    };

    pollAll();
    const interval = setInterval(pollAll, 4000);
    return () => clearInterval(interval);
  }, [jobs, polling, pollJob, statuses]);

  // Check if all done
  useEffect(() => {
    if (jobs.length === 0) return;
    const allDone = jobs.every((j) => {
      const s = statuses.get(j.jobId);
      return s?.status === "completed" || s?.status === "failed";
    });
    if (allDone) setPolling(false);
  }, [jobs, statuses]);

  const completedCount = jobs.filter(
    (j) => statuses.get(j.jobId)?.status === "completed",
  ).length;
  const failedCount = jobs.filter(
    (j) => statuses.get(j.jobId)?.status === "failed",
  ).length;

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {completedCount}/{jobs.length} completed
          {failedCount > 0 && ` (${failedCount} failed)`}
        </span>
        {polling && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            Generating...
          </Badge>
        )}
        {!polling && completedCount === jobs.length && (
          <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">
            All done
          </Badge>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-500"
          style={{ width: `${jobs.length > 0 ? (completedCount / jobs.length) * 100 : 0}%` }}
        />
      </div>

      {/* Job grid */}
      <div className="grid grid-cols-2 gap-2">
        {jobs.map((job) => {
          const status = statuses.get(job.jobId);
          const label = getCategoryLabel(job.category, job.pluginId);

          return (
            <div
              key={job.jobId}
              className="flex items-center gap-2 p-2 rounded border border-border text-xs"
            >
              <JobIcon status={status?.status} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{label}</p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {status?.status || "pending"}
                  {status?.progress ? ` (${Math.round(status.progress)}%)` : ""}
                </p>
              </div>
              <span className="text-[9px] text-muted-foreground/50">
                {job.pluginId}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JobIcon({ status }: { status?: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
    case "running":
    case "uploading":
      return <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}
