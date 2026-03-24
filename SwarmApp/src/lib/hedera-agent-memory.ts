/**
 * Hedera-Native Agent Private Memory System
 *
 * Store agent memories encrypted on Hedera blockchain:
 * - HCS for conversation messages (streaming, encrypted)
 * - Hedera File Service for memory snapshots (larger blobs)
 * - ASN-based encryption (only agent with ASN can decrypt)
 *
 * Why Hedera over Storacha?
 * - Privacy: Messages encrypted at rest on-chain
 * - Finality: 3-5 second consensus
 * - Cost: $0.0001 per message vs IPFS pinning costs
 * - Proof: Immutable timestamp + sequence number
 * - Recovery: ASN private key is the decryption key
 *
 * Architecture:
 * 1. Each agent gets a private HCS topic for memories
 * 2. Messages encrypted with ASN-derived key
 * 3. Topic ID stored in agent record
 * 4. Restore by querying HCS and decrypting with ASN
 */

import {
  Client,
  AccountId,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicId,
  TopicMessageQuery,
  FileCreateTransaction,
  FileAppendTransaction,
  FileContentsQuery,
  FileId,
} from "@hashgraph/sdk";
import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const HEDERA_NETWORK = process.env.HEDERA_NETWORK || "testnet";
const HEDERA_OPERATOR_ID = process.env.HEDERA_OPERATOR_ID || "";
const HEDERA_OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY || "";

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

export interface AgentMemoryConfig {
  agentId: string;
  asn: string;
  memoryTopicId: string; // Private HCS topic for this agent's memories
  encryptionKeyHash: string; // Hash of ASN-derived encryption key (for verification)
  createdAt: number;
}

export interface MemoryMessage {
  type: "conversation" | "context" | "skill_learned" | "preference" | "snapshot";
  content: string; // Encrypted
  metadata?: {
    role?: "user" | "agent" | "system";
    timestamp?: number;
    orgId?: string;
    sessionId?: string;
  };
  sequenceNumber?: string; // HCS sequence number
  consensusTimestamp?: string;
}

export interface MemorySnapshot {
  asn: string;
  agentId: string;
  snapshotTimestamp: number;
  messages: MemoryMessage[];
  context: Record<string, any>;
  stats: {
    totalMessages: number;
    conversationCount: number;
    skillsLearned: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// Encryption (ASN-based)
// ═══════════════════════════════════════════════════════════════

/**
 * Derive encryption key from ASN
 * ASN format: ASN-SWM-YYYY-XXXX-XXXX-CC
 * Key = PBKDF2(ASN, salt="swarm-agent-memory", iterations=100000)
 */
function deriveEncryptionKey(asn: string): Buffer {
  const salt = "swarm-agent-memory";
  const iterations = 100000;
  const keyLength = 32; // 256 bits

  return crypto.pbkdf2Sync(asn, salt, iterations, keyLength, "sha256");
}

/**
 * Encrypt content with AES-256-GCM using ASN-derived key
 */
export function encryptMemory(content: string, asn: string): string {
  const key = deriveEncryptionKey(asn);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(content, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt content with AES-256-GCM using ASN-derived key
 */
export function decryptMemory(encryptedData: string, asn: string): string {
  const key = deriveEncryptionKey(asn);
  const parts = encryptedData.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Hash encryption key for verification (don't store the key itself!)
 */
function hashEncryptionKey(asn: string): string {
  const key = deriveEncryptionKey(asn);
  return crypto.createHash("sha256").update(key).digest("hex");
}

// ═══════════════════════════════════════════════════════════════
// HCS Topic Management
// ═══════════════════════════════════════════════════════════════

/**
 * Create private HCS topic for agent's encrypted memories
 */
export async function createAgentMemoryTopic(
  agentId: string,
  asn: string
): Promise<AgentMemoryConfig> {
  const client = configureClient(getClient());

  try {
    // Create private topic for this agent's memories
    const topicTx = await new TopicCreateTransaction()
      .setTopicMemo(`Private memory for agent ${agentId} (ASN: ${asn})`)
      .setAdminKey(PrivateKey.fromString(HEDERA_OPERATOR_KEY))
      .setSubmitKey(PrivateKey.fromString(HEDERA_OPERATOR_KEY))
      .execute(client);

    const receipt = await topicTx.getReceipt(client);
    const topicId = receipt.topicId;

    if (!topicId) {
      throw new Error("Failed to create memory topic");
    }

    const config: AgentMemoryConfig = {
      agentId,
      asn,
      memoryTopicId: topicId.toString(),
      encryptionKeyHash: hashEncryptionKey(asn),
      createdAt: Date.now(),
    };

    console.log(`[Hedera] Created private memory topic: ${topicId.toString()}`);
    console.log(`[Hedera] Agent: ${agentId}, ASN: ${asn}`);

    return config;
  } catch (error) {
    console.error("[Hedera] Failed to create memory topic:", error);
    throw error;
  } finally {
    client.close();
  }
}

// ═══════════════════════════════════════════════════════════════
// Memory Posting
// ═══════════════════════════════════════════════════════════════

/**
 * Post encrypted memory message to agent's private HCS topic
 */
export async function postMemory(
  topicId: string,
  asn: string,
  message: Omit<MemoryMessage, "sequenceNumber" | "consensusTimestamp">
): Promise<{ sequenceNumber: string; consensusTimestamp: string }> {
  const client = configureClient(getClient());

  try {
    // Encrypt the content before posting
    const encryptedContent = encryptMemory(message.content, asn);

    const memoryPayload = {
      ...message,
      content: encryptedContent,
      encryptedBy: "asn-derived-key",
      timestamp: Date.now(),
    };

    const payload = JSON.stringify(memoryPayload);

    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(payload)
      .execute(client);

    const receipt = await tx.getReceipt(client);

    console.log(`[Hedera] Posted encrypted memory to topic ${topicId}`);

    return {
      sequenceNumber: receipt.topicSequenceNumber?.toString() || "",
      consensusTimestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Hedera] Failed to post memory:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Post multiple memories in batch (more efficient)
 */
export async function postMemoryBatch(
  topicId: string,
  asn: string,
  messages: Omit<MemoryMessage, "sequenceNumber" | "consensusTimestamp">[]
): Promise<number> {
  let posted = 0;

  for (const message of messages) {
    try {
      await postMemory(topicId, asn, message);
      posted++;
    } catch (error) {
      console.error(`[Hedera] Failed to post memory ${posted + 1}/${messages.length}:`, error);
      // Continue posting remaining messages
    }
  }

  console.log(`[Hedera] Posted ${posted}/${messages.length} memories`);
  return posted;
}

// ═══════════════════════════════════════════════════════════════
// Memory Retrieval
// ═══════════════════════════════════════════════════════════════

/**
 * Retrieve and decrypt all memories from agent's HCS topic
 * Requires ASN for decryption (only agent with ASN can read their memories)
 */
export async function retrieveMemories(
  topicId: string,
  asn: string
): Promise<MemoryMessage[]> {
  const client = configureClient(getClient());

  try {
    const memories: MemoryMessage[] = [];

    await new Promise<void>((resolve, reject) => {
      new TopicMessageQuery()
        .setTopicId(TopicId.fromString(topicId))
        .setStartTime(0) // Get all messages from the beginning
        .subscribe(
          client,
          (message) => {
            if (!message) return;

            try {
              const payload = Buffer.from(message.contents).toString("utf-8");
              const encryptedMemory = JSON.parse(payload);

              // Decrypt the content using ASN
              const decryptedContent = decryptMemory(encryptedMemory.content, asn);

              memories.push({
                ...encryptedMemory,
                content: decryptedContent, // Now decrypted!
                sequenceNumber: message.sequenceNumber?.toString(),
                consensusTimestamp: message.consensusTimestamp?.toString(),
              });
            } catch (error) {
              console.warn("[Hedera] Failed to decrypt memory (wrong ASN?):", error);
              // Skip this message if decryption fails (wrong ASN or corrupted data)
            }
          },
          (error) => reject(error)
        );

      // Let it run for 5 seconds to collect all messages
      // In production, use Hedera Mirror Node REST API for better performance
      setTimeout(() => resolve(), 5000);
    });

    console.log(`[Hedera] Retrieved ${memories.length} decrypted memories from topic ${topicId}`);

    return memories;
  } catch (error) {
    console.error("[Hedera] Failed to retrieve memories:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Reconnect agent to memories using ASN
 * This is called when agent reconnects with their ASN
 */
export async function reconnectAgentMemories(
  agentId: string,
  asn: string,
  memoryTopicId: string
): Promise<{
  success: boolean;
  memoriesRestored: number;
  conversations: number;
  contextItems: number;
  skillsLearned: number;
}> {
  try {
    const memories = await retrieveMemories(memoryTopicId, asn);

    // Categorize memories
    const conversations = memories.filter((m) => m.type === "conversation").length;
    const contextItems = memories.filter((m) => m.type === "context").length;
    const skillsLearned = memories.filter((m) => m.type === "skill_learned").length;

    console.log(`[Hedera] Agent ${agentId} reconnected with ASN ${asn}`);
    console.log(`[Hedera] Restored: ${conversations} conversations, ${contextItems} context, ${skillsLearned} skills`);

    return {
      success: true,
      memoriesRestored: memories.length,
      conversations,
      contextItems,
      skillsLearned,
    };
  } catch (error) {
    console.error("[Hedera] Failed to reconnect agent memories:", error);
    return {
      success: false,
      memoriesRestored: 0,
      conversations: 0,
      contextItems: 0,
      skillsLearned: 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Memory Snapshots (Hedera File Service)
// ═══════════════════════════════════════════════════════════════

/**
 * Create memory snapshot and store in Hedera File Service
 * Use this for larger memory dumps (conversations, context, skills)
 */
export async function createMemorySnapshot(
  asn: string,
  snapshot: MemorySnapshot
): Promise<{ fileId: string; sizeBytes: number }> {
  const client = configureClient(getClient());

  try {
    // Encrypt entire snapshot
    const snapshotJson = JSON.stringify(snapshot);
    const encryptedSnapshot = encryptMemory(snapshotJson, asn);

    // Store in Hedera File Service
    const fileTx = await new FileCreateTransaction()
      .setKeys([PrivateKey.fromString(HEDERA_OPERATOR_KEY)])
      .setContents(encryptedSnapshot.slice(0, 4096)) // First 4KB
      .execute(client);

    const receipt = await fileTx.getReceipt(client);
    const fileId = receipt.fileId;

    if (!fileId) {
      throw new Error("Failed to create file");
    }

    // Append remaining data if snapshot is larger than 4KB
    if (encryptedSnapshot.length > 4096) {
      const remaining = encryptedSnapshot.slice(4096);
      await new FileAppendTransaction()
        .setFileId(fileId)
        .setContents(remaining)
        .execute(client);
    }

    console.log(`[Hedera] Created memory snapshot file: ${fileId.toString()}`);
    console.log(`[Hedera] Size: ${encryptedSnapshot.length} bytes`);

    return {
      fileId: fileId.toString(),
      sizeBytes: encryptedSnapshot.length,
    };
  } catch (error) {
    console.error("[Hedera] Failed to create memory snapshot:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Retrieve memory snapshot from Hedera File Service
 */
export async function retrieveMemorySnapshot(
  fileId: string,
  asn: string
): Promise<MemorySnapshot> {
  const client = configureClient(getClient());

  try {
    const query = new FileContentsQuery().setFileId(FileId.fromString(fileId));
    const contents = await query.execute(client);

    const encryptedSnapshot = contents.toString();
    const decryptedJson = decryptMemory(encryptedSnapshot, asn);

    const snapshot: MemorySnapshot = JSON.parse(decryptedJson);

    console.log(`[Hedera] Retrieved memory snapshot from file ${fileId}`);

    return snapshot;
  } catch (error) {
    console.error("[Hedera] Failed to retrieve memory snapshot:", error);
    throw error;
  } finally {
    client.close();
  }
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

export {
  createAgentMemoryTopic as createPrivateMemoryTopic,
  postMemory as postPrivateMemory,
  postMemoryBatch as postPrivateMemoryBatch,
  retrieveMemories as retrievePrivateMemories,
  reconnectAgentMemories as reconnectWithASN,
  createMemorySnapshot as snapshotMemoryToHedera,
  retrieveMemorySnapshot as restoreMemoryFromHedera,
};
