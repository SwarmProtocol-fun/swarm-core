/**
 * Hedera Job Bounty System — Onchain escrow with scheduled transactions
 *
 * Architecture:
 * 1. Job Posted → Create ScheduledTransaction for bounty payout
 * 2. Job Completed → Await review approval
 * 3. Review Approved → Execute scheduled transaction (release escrow)
 * 4. Review Rejected → Delete scheduled transaction (return funds)
 *
 * Why Hedera?
 * - Scheduled transactions native (no smart contract needed)
 * - $0.0001 per job posting vs $5+ on Ethereum
 * - 3-5 second finality
 * - Multi-party approval without complex multisig
 *
 * Requires: @hashgraph/sdk
 */

import {
  Client,
  AccountId,
  PrivateKey,
  TransferTransaction,
  ScheduleCreateTransaction,
  ScheduleSignTransaction,
  ScheduleDeleteTransaction,
  ScheduleInfoQuery,
  Hbar,
  TopicMessageSubmitTransaction,
  TopicId,
} from "@hashgraph/sdk";

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const HEDERA_NETWORK = process.env.HEDERA_NETWORK || "testnet";
const HEDERA_OPERATOR_ID = process.env.HEDERA_OPERATOR_ID || "";
const HEDERA_OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY || "";
const HEDERA_HCS_TOPIC_ID = process.env.HEDERA_HCS_TOPIC_ID || "";

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

export interface JobBountyEscrow {
  jobId: string;
  scheduledTransactionId: string; // Hedera ScheduleId
  bountyAmount: string; // HBAR amount
  recipientAccountId: string; // Agent's Hedera account
  creatorAccountId: string; // Job poster's Hedera account
  createdAt: Date;
  status: 'pending' | 'executed' | 'deleted';
}

export interface JobBountyEvent {
  type: 'job_posted' | 'job_claimed' | 'bounty_escrowed' | 'bounty_released' | 'bounty_refunded';
  jobId: string;
  scheduledTxId?: string;
  bountyAmount?: string;
  recipientAccountId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// Escrow Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Create job bounty escrow using Hedera Scheduled Transaction
 *
 * Flow:
 * 1. Create a scheduled transfer from job poster → agent
 * 2. Scheduled TX requires approval from job poster before execution
 * 3. On review approval → sign and execute scheduled TX
 * 4. On review rejection → delete scheduled TX
 *
 * @param jobId - Firestore job ID
 * @param bountyHbar - Amount in HBAR
 * @param recipientAccountId - Agent's Hedera account (0.0.xxxxx)
 * @param payerAccountId - Job poster's Hedera account
 * @returns ScheduleId for the escrow transaction
 */
export async function createJobBountyEscrow(
  jobId: string,
  bountyHbar: string,
  recipientAccountId: string,
  payerAccountId: string,
): Promise<string> {
  const client = configureClient(getClient());

  try {
    // Create transfer transaction (to be scheduled)
    const transferTx = new TransferTransaction()
      .addHbarTransfer(payerAccountId, new Hbar(-parseFloat(bountyHbar)))
      .addHbarTransfer(recipientAccountId, new Hbar(parseFloat(bountyHbar)));

    // Create scheduled transaction (holds funds in escrow)
    const scheduleTx = await new ScheduleCreateTransaction()
      .setScheduledTransaction(transferTx)
      .setAdminKey(PrivateKey.fromString(HEDERA_OPERATOR_KEY))
      .setPayerAccountId(AccountId.fromString(HEDERA_OPERATOR_ID))
      .execute(client);

    const receipt = await scheduleTx.getReceipt(client);
    const scheduleId = receipt.scheduleId;

    if (!scheduleId) {
      throw new Error("Failed to create scheduled transaction");
    }

    // Log to HCS topic
    await logJobBountyEvent({
      type: 'bounty_escrowed',
      jobId,
      scheduledTxId: scheduleId.toString(),
      bountyAmount: bountyHbar,
      recipientAccountId,
      timestamp: Date.now() / 1000,
      metadata: { payerAccountId },
    });

    console.log(`[Hedera] Created job bounty escrow: ${scheduleId.toString()}`);
    return scheduleId.toString();
  } catch (error) {
    console.error("[Hedera] Failed to create job bounty escrow:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Execute scheduled transaction to release bounty to agent
 *
 * Called when job delivery is approved
 */
export async function releaseBountyToAgent(
  scheduleIdString: string,
  jobId: string,
): Promise<void> {
  const client = configureClient(getClient());

  try {
    const scheduleId = scheduleIdString; // e.g., "0.0.123456"

    // Sign the scheduled transaction (triggers execution if all signatures collected)
    const signTx = await new ScheduleSignTransaction()
      .setScheduleId(scheduleId)
      .execute(client);

    await signTx.getReceipt(client);

    // Log to HCS topic
    await logJobBountyEvent({
      type: 'bounty_released',
      jobId,
      scheduledTxId: scheduleId,
      timestamp: Date.now() / 1000,
    });

    console.log(`[Hedera] Released bounty for job ${jobId}: ${scheduleId}`);
  } catch (error) {
    console.error("[Hedera] Failed to release bounty:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Delete scheduled transaction to refund bounty to job poster
 *
 * Called when job delivery is rejected or job is cancelled
 */
export async function refundBountyToPoster(
  scheduleIdString: string,
  jobId: string,
): Promise<void> {
  const client = configureClient(getClient());

  try {
    const scheduleId = scheduleIdString;

    // Delete scheduled transaction (funds returned to payer)
    const deleteTx = await new ScheduleDeleteTransaction()
      .setScheduleId(scheduleId)
      .execute(client);

    await deleteTx.getReceipt(client);

    // Log to HCS topic
    await logJobBountyEvent({
      type: 'bounty_refunded',
      jobId,
      scheduledTxId: scheduleId,
      timestamp: Date.now() / 1000,
    });

    console.log(`[Hedera] Refunded bounty for job ${jobId}: ${scheduleId}`);
  } catch (error) {
    console.error("[Hedera] Failed to refund bounty:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Query scheduled transaction status
 */
export async function getScheduledTransactionInfo(scheduleIdString: string) {
  const client = configureClient(getClient());

  try {
    const scheduleId = scheduleIdString;
    const query = new ScheduleInfoQuery().setScheduleId(scheduleId);
    const info = await query.execute(client);

    return {
      scheduleId: info.scheduleId.toString(),
      creatorAccountId: info.creatorAccountId?.toString() || '',
      payerAccountId: info.payerAccountId?.toString() || '',
      adminKey: info.adminKey?.toString(),
      signers: info.signers ? info.signers.toArray().map((s: any) => s.toString()) : [],
      executed: !!(info as any).executed,
      deleted: !!(info as any).deleted,
      executedAt: null, // Not available in ScheduleInfo type
      deletedAt: null, // Not available in ScheduleInfo type
    };
  } catch (error) {
    console.error("[Hedera] Failed to query scheduled transaction:", error);
    throw error;
  } finally {
    client.close();
  }
}

// ═══════════════════════════════════════════════════════════════
// HCS Event Logging
// ═══════════════════════════════════════════════════════════════

/**
 * Log job bounty event to HCS topic
 */
async function logJobBountyEvent(event: JobBountyEvent): Promise<void> {
  if (!HEDERA_HCS_TOPIC_ID) {
    console.warn("[Hedera] HCS topic ID not configured, skipping event log");
    return;
  }

  const client = configureClient(getClient());

  try {
    const topicId = TopicId.fromString(HEDERA_HCS_TOPIC_ID);
    const message = JSON.stringify(event);

    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message)
      .execute(client);

    await tx.getReceipt(client);

    console.log(`[Hedera] Logged job bounty event to HCS: ${event.type}`);
  } catch (error) {
    console.error("[Hedera] Failed to log job bounty event:", error);
    // Don't throw - event logging is non-critical
  } finally {
    client.close();
  }
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

export {
  createJobBountyEscrow as createEscrow,
  releaseBountyToAgent as releaseEscrow,
  refundBountyToPoster as refundEscrow,
  getScheduledTransactionInfo as getEscrowInfo,
};
