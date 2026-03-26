/**
 * POST /api/v1/slots/webhook/[id] — Receive external webhook events
 *
 * Auth: HMAC-SHA256 signature in x-webhook-signature header.
 */

import { NextRequest } from "next/server";
import { rateLimit } from "@/app/api/v1/rate-limit";
import { getSlotPolicy } from "@/lib/slots/policies";
import { processSlotTrigger } from "@/lib/slots/engine";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const limited = await rateLimit(`slots-webhook:${ip}`);
  if (limited) return limited;

  const { id } = await params;
  const policy = await getSlotPolicy(id);
  if (!policy) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (policy.trigger.type !== "webhook") {
    return Response.json({ error: "Policy is not a webhook trigger" }, { status: 400 });
  }

  // Read body
  let bodyText: string;
  let payload: Record<string, unknown>;
  try {
    bodyText = await req.text();
    payload = JSON.parse(bodyText);
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // HMAC validation
  const secret = policy.trigger.webhookSecret;
  if (secret) {
    const signature = req.headers.get("x-webhook-signature") || "";
    const expected = crypto
      .createHmac("sha256", secret)
      .update(bodyText)
      .digest("hex");

    // Timing-safe comparison
    try {
      if (
        signature.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
      ) {
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }
    } catch {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // IP allowlist
  if (policy.trigger.allowedIps && policy.trigger.allowedIps.length > 0) {
    if (!policy.trigger.allowedIps.includes(ip)) {
      return Response.json({ error: "IP not allowed" }, { status: 403 });
    }
  }

  // Generate event ID from body hash
  const eventId = `webhook:${id}:${crypto.createHash("sha256").update(bodyText).digest("hex").slice(0, 16)}`;

  try {
    const executionIds = await processSlotTrigger(
      policy.orgId,
      "webhook",
      payload,
      eventId,
    );

    return Response.json({ ok: true, executionIds });
  } catch (err) {
    console.error("[slots] Webhook processing error:", err);
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
