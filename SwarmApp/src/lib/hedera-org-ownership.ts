/**
 * Hedera Organization Ownership System
 *
 * HCS-backed immutable proof of org ownership, creation, and transfers.
 *
 * Why HCS instead of HTS?
 * - Simpler: No token minting complexity
 * - Cheaper: $0.0001 per message vs token minting costs
 * - Perfect fit: Audit trails and timestamped events
 * - Immutable: Cannot be altered once submitted
 * - Verifiable: Anyone can query HCS to verify ownership
 *
 * Flow:
 * 1. Create Org → Submit signed org creation event to HCS
 * 2. Store HCS sequence number + consensus timestamp in Firestore
 * 3. Verify Ownership → Query HCS message + verify signature
 * 4. Transfer Ownership → Submit signed transfer event to HCS
 */

import {
  Client,
  AccountId,
  PrivateKey,
  TopicMessageSubmitTransaction,
  TopicId,
  TopicMessageQuery,
  PublicKey,
} from "@hashgraph/sdk";
import { ethers } from "ethers";

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const HEDERA_NETWORK = process.env.HEDERA_NETWORK || "testnet";
const HEDERA_OPERATOR_ID = process.env.HEDERA_OPERATOR_ID || "";
const HEDERA_OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY || "";
const HEDERA_ORG_TOPIC_ID = process.env.HEDERA_ORG_TOPIC_ID || ""; // Dedicated topic for org events

function getClient(): Client {
  if (HEDERA_NETWORK === "mainnet") {
    return Client.forMainnet();
  }
  return Client.forTestnet();
}

function configureClient(client: Client): Client {
  if (!HEDERA_OPERATOR_ID || !HEDERA_OPERATOR_KEY) {
    throw new Error("HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set");
  }
  client.setOperator(
    AccountId.fromString(HEDERA_OPERATOR_ID),
    PrivateKey.fromString(HEDERA_OPERATOR_KEY)
  );
  return client;
}

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface OrgCreationEvent {
  type: "org_created";
  orgId: string; // Firestore doc ID
  name: string;
  ownerAddress: string; // EVM address
  ownerSignature: string; // Signature proving ownership
  timestamp: number; // Unix timestamp
  metadata?: {
    description?: string;
    website?: string;
  };
}

export interface OrgTransferEvent {
  type: "org_transferred";
  orgId: string;
  fromOwner: string; // Previous owner EVM address
  toOwner: string; // New owner EVM address
  fromSignature: string; // Previous owner approves transfer
  toSignature: string; // New owner accepts transfer
  timestamp: number;
  reason?: string;
}

export interface OrgOwnershipProof {
  orgId: string;
  currentOwner: string;
  hcsSequenceNumber: string;
  hcsConsensusTimestamp: string;
  hcsTopicId: string;
  verified: boolean;
  createdAt: number;
  lastTransferAt?: number;
  transferCount: number;
}

type OrgEvent = OrgCreationEvent | OrgTransferEvent;

// ═══════════════════════════════════════════════════════════════
// Signature Verification
// ═══════════════════════════════════════════════════════════════

/**
 * Create signature proving org ownership
 * User signs: "Swarm Protocol Org Creation: {orgId} at {timestamp}"
 */
export function createOrgCreationMessage(orgId: string, timestamp: number): string {
  return `Swarm Protocol Org Creation: ${orgId} at ${timestamp}`;
}

/**
 * Create signature for org transfer
 * Owner signs: "Swarm Protocol Org Transfer: {orgId} from {fromOwner} to {toOwner} at {timestamp}"
 */
export function createOrgTransferMessage(
  orgId: string,
  fromOwner: string,
  toOwner: string,
  timestamp: number
): string {
  return `Swarm Protocol Org Transfer: ${orgId} from ${fromOwner} to ${toOwner} at ${timestamp}`;
}

/**
 * Verify EVM signature matches expected signer
 */
export function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// HCS Event Submission
// ═══════════════════════════════════════════════════════════════

/**
 * Submit org creation event to HCS
 * Returns: { sequenceNumber, topicId }
 */
export async function submitOrgCreation(
  event: OrgCreationEvent
): Promise<{ sequenceNumber: string; topicId: string }> {
  // Verify signature before submitting
  const message = createOrgCreationMessage(event.orgId, event.timestamp);
  if (!verifySignature(message, event.ownerSignature, event.ownerAddress)) {
    throw new Error("Invalid owner signature for org creation");
  }

  const client = configureClient(getClient());

  try {
    if (!HEDERA_ORG_TOPIC_ID) {
      throw new Error("HEDERA_ORG_TOPIC_ID not configured");
    }

    const topicId = TopicId.fromString(HEDERA_ORG_TOPIC_ID);
    const payload = JSON.stringify(event);

    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(payload)
      .execute(client);

    const receipt = await tx.getReceipt(client);

    console.log(`[Hedera] Org creation submitted to HCS: ${event.orgId}`);

    return {
      sequenceNumber: receipt.topicSequenceNumber?.toString() || "",
      topicId: topicId.toString(),
    };
  } catch (error) {
    console.error("[Hedera] Failed to submit org creation to HCS:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Submit org transfer event to HCS
 */
export async function submitOrgTransfer(
  event: OrgTransferEvent
): Promise<{ sequenceNumber: string; topicId: string }> {
  // Verify both signatures
  const message = createOrgTransferMessage(
    event.orgId,
    event.fromOwner,
    event.toOwner,
    event.timestamp
  );

  if (!verifySignature(message, event.fromSignature, event.fromOwner)) {
    throw new Error("Invalid fromOwner signature for org transfer");
  }

  if (!verifySignature(message, event.toSignature, event.toOwner)) {
    throw new Error("Invalid toOwner signature for org transfer");
  }

  const client = configureClient(getClient());

  try {
    if (!HEDERA_ORG_TOPIC_ID) {
      throw new Error("HEDERA_ORG_TOPIC_ID not configured");
    }

    const topicId = TopicId.fromString(HEDERA_ORG_TOPIC_ID);
    const payload = JSON.stringify(event);

    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(payload)
      .execute(client);

    const receipt = await tx.getReceipt(client);

    console.log(`[Hedera] Org transfer submitted to HCS: ${event.orgId}`);

    return {
      sequenceNumber: receipt.topicSequenceNumber?.toString() || "",
      topicId: topicId.toString(),
    };
  } catch (error) {
    console.error("[Hedera] Failed to submit org transfer to HCS:", error);
    throw error;
  } finally {
    client.close();
  }
}

// ═══════════════════════════════════════════════════════════════
// HCS Ownership Verification
// ═══════════════════════════════════════════════════════════════

/**
 * Query HCS topic for all events related to an org
 * Returns full ownership history and current owner
 */
export async function verifyOrgOwnership(orgId: string): Promise<OrgOwnershipProof> {
  const client = configureClient(getClient());

  try {
    if (!HEDERA_ORG_TOPIC_ID) {
      throw new Error("HEDERA_ORG_TOPIC_ID not configured");
    }

    const topicId = TopicId.fromString(HEDERA_ORG_TOPIC_ID);

    // Query all messages from the topic
    // NOTE: In production, we'd want to use a mirror node REST API for efficiency
    // This approach works for demo/testnet with limited messages
    const events: OrgEvent[] = [];

    await new Promise<void>((resolve, reject) => {
      new TopicMessageQuery()
        .setTopicId(topicId)
        .setStartTime(0) // Query from beginning
        .subscribe(
          client,
          (message) => {
            if (!message) return;
            try {
              const payload = Buffer.from(message.contents).toString("utf-8");
              const event = JSON.parse(payload) as OrgEvent;

              // Only collect events for this org
              if (event.orgId === orgId) {
                events.push(event);
              }
            } catch (error) {
              console.warn("Failed to parse HCS message:", error);
            }
          },
          (error) => {
            reject(error);
          }
        );

      // Let it run for 5 seconds to collect messages
      // In production, use mirror node API instead
      setTimeout(() => resolve(), 5000);
    });

    if (events.length === 0) {
      throw new Error(`No HCS events found for org: ${orgId}`);
    }

    // Find creation event
    const creationEvent = events.find((e) => e.type === "org_created") as OrgCreationEvent | undefined;
    if (!creationEvent) {
      throw new Error(`No creation event found for org: ${orgId}`);
    }

    // Find latest transfer event (if any)
    const transferEvents = events.filter((e) => e.type === "org_transferred") as OrgTransferEvent[];
    const latestTransfer = transferEvents.length > 0
      ? transferEvents[transferEvents.length - 1]
      : null;

    // Current owner is either latest transfer recipient or original creator
    const currentOwner = latestTransfer ? latestTransfer.toOwner : creationEvent.ownerAddress;

    // Verify all signatures
    const creationMessage = createOrgCreationMessage(creationEvent.orgId, creationEvent.timestamp);
    const creationValid = verifySignature(
      creationMessage,
      creationEvent.ownerSignature,
      creationEvent.ownerAddress
    );

    const transfersValid = transferEvents.every((transfer) => {
      const msg = createOrgTransferMessage(
        transfer.orgId,
        transfer.fromOwner,
        transfer.toOwner,
        transfer.timestamp
      );
      return (
        verifySignature(msg, transfer.fromSignature, transfer.fromOwner) &&
        verifySignature(msg, transfer.toSignature, transfer.toOwner)
      );
    });

    const verified = creationValid && transfersValid;

    return {
      orgId,
      currentOwner,
      hcsSequenceNumber: "0", // Would get from mirror node API
      hcsConsensusTimestamp: new Date(creationEvent.timestamp).toISOString(),
      hcsTopicId: topicId.toString(),
      verified,
      createdAt: creationEvent.timestamp,
      lastTransferAt: latestTransfer?.timestamp,
      transferCount: transferEvents.length,
    };
  } catch (error) {
    console.error("[Hedera] Failed to verify org ownership:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Check if address owns org (queries HCS for verification)
 */
export async function checkOrgOwnership(orgId: string, address: string): Promise<boolean> {
  try {
    const proof = await verifyOrgOwnership(orgId);
    return proof.verified && proof.currentOwner.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error(`[Hedera] Failed to check org ownership for ${orgId}:`, error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

export {
  submitOrgCreation as submitOrgCreationToHCS,
  submitOrgTransfer as submitOrgTransferToHCS,
  verifyOrgOwnership as verifyOrgOwnershipOnHCS,
  checkOrgOwnership as checkOrgOwnershipOnHCS,
};
