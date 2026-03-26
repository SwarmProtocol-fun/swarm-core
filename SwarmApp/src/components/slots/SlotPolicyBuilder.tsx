"use client";

/**
 * SlotPolicyBuilder — Multi-step dialog for creating/editing slot automation policies.
 *
 * Steps: Trigger → Conditions → Action → Review
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Zap,
  Filter,
  Play,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { SCHEDULE_PRESETS } from "@/lib/cron";
import type {
  SlotTriggerType,
  SlotTriggerConfig,
  SlotConditions,
  SlotConditionFilter,
  SlotAction,
  SlotActionType,
  FilterOperator,
  RetryPolicy,
} from "@/lib/slots/types";

// ── Constants ────────────────────────────────────────────────────────────────

const TRIGGER_TYPES: { value: SlotTriggerType; label: string; description: string }[] = [
  { value: "task_created", label: "Task Created", description: "When a new task is created" },
  { value: "job_completed", label: "Job Completed", description: "When a job finishes" },
  { value: "workflow_step_success", label: "Workflow Step Success", description: "When a workflow step succeeds" },
  { value: "workflow_step_failure", label: "Workflow Step Failure", description: "When a workflow step fails" },
  { value: "cron", label: "Time-Based (Cron)", description: "Run on a schedule" },
  { value: "webhook", label: "Webhook", description: "On external HTTP webhook" },
  { value: "agent_connected", label: "Agent Connected", description: "When an agent comes online" },
  { value: "agent_disconnected", label: "Agent Disconnected", description: "When an agent goes offline" },
  { value: "assignment_created", label: "Assignment Created", description: "When a task is assigned" },
  { value: "assignment_completed", label: "Assignment Completed", description: "When an assignment finishes" },
];

const ACTION_TYPES: { value: SlotActionType; label: string; description: string }[] = [
  { value: "start_workflow", label: "Start Workflow", description: "Launch a workflow run" },
  { value: "assign_agent", label: "Assign Agent", description: "Create a task assignment" },
  { value: "send_to_gateway", label: "Send to Gateway", description: "Queue task for gateway workers" },
  { value: "call_tool_adapter", label: "Call Tool/API", description: "Make an HTTP request" },
  { value: "post_message", label: "Post Message", description: "Send a message to a channel" },
  { value: "require_approval", label: "Require Approval", description: "Request human approval" },
];

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: "greater than" },
  { value: "gte", label: ">= " },
  { value: "lt", label: "less than" },
  { value: "lte", label: "<= " },
  { value: "in", label: "in list" },
  { value: "not_in", label: "not in list" },
  { value: "contains", label: "contains" },
  { value: "matches", label: "matches regex" },
];

type Step = "trigger" | "conditions" | "action" | "review";
const STEPS: Step[] = ["trigger", "conditions", "action", "review"];
const STEP_META: Record<Step, { label: string; icon: typeof Zap }> = {
  trigger: { label: "Trigger", icon: Zap },
  conditions: { label: "Conditions", icon: Filter },
  action: { label: "Action", icon: Play },
  review: { label: "Review", icon: CheckCircle },
};

// ── Props ────────────────────────────────────────────────────────────────────

interface SlotPolicyBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotId: string;
  slotName: string;
  orgId: string;
  onSave: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SlotPolicyBuilder({
  open,
  onOpenChange,
  slotId,
  slotName,
  orgId,
  onSave,
}: SlotPolicyBuilderProps) {
  const [step, setStep] = useState<Step>("trigger");
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<SlotTriggerType>("task_created");
  const [cronSchedule, setCronSchedule] = useState("0 9 * * *");
  const [filterExpression, setFilterExpression] = useState("");
  const [filters, setFilters] = useState<SlotConditionFilter[]>([]);
  const [conditionExpression, setConditionExpression] = useState("");
  const [actionType, setActionType] = useState<SlotActionType>("post_message");
  const [actionConfig, setActionConfig] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState(true);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [retryEnabled, setRetryEnabled] = useState(false);
  const [maxRetries, setMaxRetries] = useState(3);

  const stepIdx = STEPS.indexOf(step);
  const canGoBack = stepIdx > 0;
  const canGoForward = stepIdx < STEPS.length - 1;
  const isReview = step === "review";

  function reset() {
    setStep("trigger");
    setName("");
    setDescription("");
    setTriggerType("task_created");
    setCronSchedule("0 9 * * *");
    setFilterExpression("");
    setFilters([]);
    setConditionExpression("");
    setActionType("post_message");
    setActionConfig({});
    setEnabled(true);
    setCooldownMs(0);
    setRetryEnabled(false);
    setMaxRetries(3);
  }

  function buildTrigger(): SlotTriggerConfig {
    const config: SlotTriggerConfig = { type: triggerType };
    if (triggerType === "cron") config.schedule = cronSchedule;
    if (filterExpression) config.filterExpression = filterExpression;
    return config;
  }

  function buildConditions(): SlotConditions | undefined {
    if (filters.length === 0 && !conditionExpression) return undefined;
    return {
      filters,
      ...(conditionExpression ? { expression: conditionExpression } : {}),
    };
  }

  function buildAction(): SlotAction {
    switch (actionType) {
      case "start_workflow":
        return {
          type: "start_workflow",
          workflowId: actionConfig.workflowId || "",
          inputMapping: actionConfig.inputMapping
            ? JSON.parse(actionConfig.inputMapping)
            : undefined,
        };
      case "assign_agent":
        return {
          type: "assign_agent",
          agentId: actionConfig.agentId || undefined,
          taskTitle: actionConfig.taskTitle || "Automated Task",
          taskDescription: actionConfig.taskDescription || "",
          priority: (actionConfig.priority as "low" | "medium" | "high" | "urgent") || "medium",
        };
      case "send_to_gateway":
        return {
          type: "send_to_gateway",
          taskType: actionConfig.taskType || "default",
          priority: (actionConfig.gatewayPriority as "low" | "normal" | "high" | "critical") || "normal",
        };
      case "call_tool_adapter":
        return {
          type: "call_tool_adapter",
          toolId: actionConfig.toolId || "",
          method: (actionConfig.method as "GET" | "POST") || "POST",
          url: actionConfig.url || "",
          bodyTemplate: actionConfig.bodyTemplate || undefined,
        };
      case "post_message":
        return {
          type: "post_message",
          channelId: actionConfig.channelId || undefined,
          messageTemplate: actionConfig.messageTemplate || "",
        };
      case "require_approval":
        return {
          type: "require_approval",
          approverIds: (actionConfig.approverIds || "").split(",").map((s) => s.trim()).filter(Boolean),
          prompt: actionConfig.prompt || "",
        };
      default:
        return { type: "post_message", messageTemplate: "" };
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const retryPolicy: RetryPolicy | undefined = retryEnabled
        ? { maxRetries, backoffMs: 1000, maxBackoffMs: 30000 }
        : undefined;

      const res = await fetch("/api/v1/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          slotId,
          name: name || `${slotName} Automation`,
          description: description || undefined,
          trigger: buildTrigger(),
          conditions: buildConditions(),
          action: buildAction(),
          retryPolicy,
          enabled,
          cooldownMs,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      reset();
      onSave();
      onOpenChange(false);
    } catch (err) {
      console.error("Save slot policy error:", err);
    } finally {
      setSaving(false);
    }
  }

  function addFilter() {
    setFilters([...filters, { field: "", operator: "eq", value: "" }]);
  }

  function updateFilter(index: number, patch: Partial<SlotConditionFilter>) {
    setFilters(filters.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeFilter(index: number) {
    setFilters(filters.filter((_, i) => i !== index));
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-zinc-100">
            New Automation — {slotName}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {STEPS.map((s, i) => {
            const StepIcon = STEP_META[s].icon;
            const isActive = s === step;
            const isDone = i < stepIdx;
            return (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : isDone
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-zinc-800/50 text-zinc-500"
                }`}
              >
                <StepIcon className="w-3.5 h-3.5" />
                {STEP_META[s].label}
              </button>
            );
          })}
        </div>

        {/* Step content */}
        <div className="space-y-4">
          {/* ── TRIGGER STEP ── */}
          {step === "trigger" && (
            <>
              <div>
                <Label className="text-zinc-400">Policy Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`${slotName} Automation`}
                  className="mt-1 bg-zinc-900 border-zinc-700"
                />
              </div>
              <div>
                <Label className="text-zinc-400">Description (optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this automation do?"
                  className="mt-1 bg-zinc-900 border-zinc-700"
                />
              </div>
              <div>
                <Label className="text-zinc-400">Trigger Type</Label>
                <Select value={triggerType} onValueChange={(v) => setTriggerType(v as SlotTriggerType)}>
                  <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="font-medium">{t.label}</span>
                        <span className="text-zinc-500 ml-2 text-xs">{t.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cron schedule picker */}
              {triggerType === "cron" && (
                <div>
                  <Label className="text-zinc-400">Schedule</Label>
                  <Select value={cronSchedule} onValueChange={setCronSchedule}>
                    <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_PRESETS.map((p) => (
                        <SelectItem key={p.value + p.label} value={p.value}>
                          {p.icon} {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={cronSchedule}
                    onChange={(e) => setCronSchedule(e.target.value)}
                    placeholder="Custom cron expression"
                    className="mt-2 bg-zinc-900 border-zinc-700 text-xs font-mono"
                  />
                </div>
              )}

              {/* Filter expression (for event triggers) */}
              {triggerType !== "cron" && triggerType !== "webhook" && (
                <div>
                  <Label className="text-zinc-400">Filter Expression (optional)</Label>
                  <Input
                    value={filterExpression}
                    onChange={(e) => setFilterExpression(e.target.value)}
                    placeholder='e.g., event.priority === "high"'
                    className="mt-1 bg-zinc-900 border-zinc-700 text-xs font-mono"
                  />
                  <p className="text-xs text-zinc-600 mt-1">
                    Safe JS expression evaluated against the event payload
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── CONDITIONS STEP ── */}
          {step === "conditions" && (
            <>
              <p className="text-sm text-zinc-500">
                Add filters that must all pass (AND logic). Optional — skip if no conditions needed.
              </p>

              {filters.map((filter, i) => (
                <Card key={i} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-3 flex items-center gap-2">
                    <Input
                      value={filter.field}
                      onChange={(e) => updateFilter(i, { field: e.target.value })}
                      placeholder="field.path"
                      className="flex-1 bg-zinc-800 border-zinc-700 text-xs font-mono"
                    />
                    <Select
                      value={filter.operator}
                      onValueChange={(v) => updateFilter(i, { operator: v as FilterOperator })}
                    >
                      <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={String(filter.value)}
                      onChange={(e) => updateFilter(i, { value: e.target.value })}
                      placeholder="value"
                      className="flex-1 bg-zinc-800 border-zinc-700 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFilter(i)}
                      className="text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addFilter}
                className="border-zinc-700 text-zinc-400"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Filter
              </Button>

              <div>
                <Label className="text-zinc-400">Advanced Expression (optional)</Label>
                <Textarea
                  value={conditionExpression}
                  onChange={(e) => setConditionExpression(e.target.value)}
                  placeholder='e.g., event.count > 5 && event.type === "error"'
                  rows={3}
                  className="mt-1 bg-zinc-900 border-zinc-700 text-xs font-mono"
                />
              </div>
            </>
          )}

          {/* ── ACTION STEP ── */}
          {step === "action" && (
            <>
              <div>
                <Label className="text-zinc-400">Action Type</Label>
                <Select value={actionType} onValueChange={(v) => { setActionType(v as SlotActionType); setActionConfig({}); }}>
                  <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        <span className="font-medium">{a.label}</span>
                        <span className="text-zinc-500 ml-2 text-xs">{a.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action-specific config */}
              {actionType === "start_workflow" && (
                <div>
                  <Label className="text-zinc-400">Workflow ID</Label>
                  <Input
                    value={actionConfig.workflowId || ""}
                    onChange={(e) => setActionConfig({ ...actionConfig, workflowId: e.target.value })}
                    placeholder="workflow-definition-id"
                    className="mt-1 bg-zinc-900 border-zinc-700 font-mono text-xs"
                  />
                </div>
              )}

              {actionType === "assign_agent" && (
                <>
                  <div>
                    <Label className="text-zinc-400">Agent ID (leave empty for slot agent)</Label>
                    <Input
                      value={actionConfig.agentId || ""}
                      onChange={(e) => setActionConfig({ ...actionConfig, agentId: e.target.value })}
                      placeholder="Optional — uses slot's assigned agent"
                      className="mt-1 bg-zinc-900 border-zinc-700 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400">Task Title</Label>
                    <Input
                      value={actionConfig.taskTitle || ""}
                      onChange={(e) => setActionConfig({ ...actionConfig, taskTitle: e.target.value })}
                      placeholder="Task title (supports {{variable}} templates)"
                      className="mt-1 bg-zinc-900 border-zinc-700"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400">Task Description</Label>
                    <Textarea
                      value={actionConfig.taskDescription || ""}
                      onChange={(e) => setActionConfig({ ...actionConfig, taskDescription: e.target.value })}
                      placeholder="Describe the task..."
                      rows={3}
                      className="mt-1 bg-zinc-900 border-zinc-700"
                    />
                  </div>
                </>
              )}

              {actionType === "call_tool_adapter" && (
                <>
                  <div className="flex gap-2">
                    <div className="w-28">
                      <Label className="text-zinc-400">Method</Label>
                      <Select
                        value={actionConfig.method || "POST"}
                        onValueChange={(v) => setActionConfig({ ...actionConfig, method: v })}
                      >
                        <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-zinc-400">URL</Label>
                      <Input
                        value={actionConfig.url || ""}
                        onChange={(e) => setActionConfig({ ...actionConfig, url: e.target.value })}
                        placeholder="https://api.example.com/endpoint"
                        className="mt-1 bg-zinc-900 border-zinc-700 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-zinc-400">Body Template (JSON)</Label>
                    <Textarea
                      value={actionConfig.bodyTemplate || ""}
                      onChange={(e) => setActionConfig({ ...actionConfig, bodyTemplate: e.target.value })}
                      placeholder='{"key": "{{event.value}}"}'
                      rows={3}
                      className="mt-1 bg-zinc-900 border-zinc-700 font-mono text-xs"
                    />
                  </div>
                </>
              )}

              {actionType === "post_message" && (
                <>
                  <div>
                    <Label className="text-zinc-400">Channel ID (optional)</Label>
                    <Input
                      value={actionConfig.channelId || ""}
                      onChange={(e) => setActionConfig({ ...actionConfig, channelId: e.target.value })}
                      placeholder="general"
                      className="mt-1 bg-zinc-900 border-zinc-700"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400">Message Template</Label>
                    <Textarea
                      value={actionConfig.messageTemplate || ""}
                      onChange={(e) => setActionConfig({ ...actionConfig, messageTemplate: e.target.value })}
                      placeholder="Alert: {{event.type}} triggered at {{event.timestamp}}"
                      rows={3}
                      className="mt-1 bg-zinc-900 border-zinc-700"
                    />
                  </div>
                </>
              )}

              {actionType === "send_to_gateway" && (
                <div>
                  <Label className="text-zinc-400">Task Type</Label>
                  <Input
                    value={actionConfig.taskType || ""}
                    onChange={(e) => setActionConfig({ ...actionConfig, taskType: e.target.value })}
                    placeholder="e.g., compute, inference"
                    className="mt-1 bg-zinc-900 border-zinc-700"
                  />
                </div>
              )}

              {actionType === "require_approval" && (
                <>
                  <div>
                    <Label className="text-zinc-400">Approver IDs (comma-separated)</Label>
                    <Input
                      value={actionConfig.approverIds || ""}
                      onChange={(e) => setActionConfig({ ...actionConfig, approverIds: e.target.value })}
                      placeholder="wallet-address-1, wallet-address-2"
                      className="mt-1 bg-zinc-900 border-zinc-700 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400">Approval Prompt</Label>
                    <Textarea
                      value={actionConfig.prompt || ""}
                      onChange={(e) => setActionConfig({ ...actionConfig, prompt: e.target.value })}
                      placeholder="Describe what needs approval..."
                      rows={3}
                      className="mt-1 bg-zinc-900 border-zinc-700"
                    />
                  </div>
                </>
              )}

              {/* Options */}
              <div className="flex items-center gap-4 pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                  <Label className="text-zinc-400 text-sm">Enabled</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={retryEnabled} onCheckedChange={setRetryEnabled} />
                  <Label className="text-zinc-400 text-sm">Auto-retry</Label>
                </div>
                {retryEnabled && (
                  <div className="flex items-center gap-2">
                    <Label className="text-zinc-500 text-xs">Max:</Label>
                    <Input
                      type="number"
                      value={maxRetries}
                      onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
                      className="w-16 bg-zinc-900 border-zinc-700 text-xs"
                      min={1}
                      max={10}
                    />
                  </div>
                )}
              </div>
              <div>
                <Label className="text-zinc-400 text-sm">Cooldown (ms)</Label>
                <Input
                  type="number"
                  value={cooldownMs}
                  onChange={(e) => setCooldownMs(parseInt(e.target.value) || 0)}
                  placeholder="0 = no cooldown"
                  className="mt-1 bg-zinc-900 border-zinc-700 w-40"
                  min={0}
                />
              </div>
            </>
          )}

          {/* ── REVIEW STEP ── */}
          {step === "review" && (
            <>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Name</span>
                    <span className="text-sm font-medium text-zinc-200">
                      {name || `${slotName} Automation`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Slot</span>
                    <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                      {slotName}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Trigger</span>
                    <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                      {TRIGGER_TYPES.find((t) => t.value === triggerType)?.label}
                    </Badge>
                  </div>
                  {triggerType === "cron" && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Schedule</span>
                      <span className="text-xs font-mono text-zinc-300">{cronSchedule}</span>
                    </div>
                  )}
                  {filters.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Conditions</span>
                      <span className="text-xs text-zinc-300">{filters.length} filter(s)</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Action</span>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                      {ACTION_TYPES.find((a) => a.value === actionType)?.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Status</span>
                    <Badge
                      variant="outline"
                      className={
                        enabled
                          ? "border-emerald-500/30 text-emerald-400"
                          : "border-zinc-600 text-zinc-500"
                      }
                    >
                      {enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  {retryEnabled && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Retries</span>
                      <span className="text-xs text-zinc-300">Up to {maxRetries}</span>
                    </div>
                  )}
                  {cooldownMs > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Cooldown</span>
                      <span className="text-xs text-zinc-300">{cooldownMs}ms</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => canGoBack && setStep(STEPS[stepIdx - 1])}
            disabled={!canGoBack}
            className="text-zinc-400"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          {isReview ? (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-1" />
              )}
              {saving ? "Saving..." : "Create Policy"}
            </Button>
          ) : (
            <Button
              onClick={() => canGoForward && setStep(STEPS[stepIdx + 1])}
              disabled={!canGoForward}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
