/**
 * Solana staking utilities — stake account management, validator queries,
 * and transaction building for delegation/undelegation.
 */
import {
  Connection, PublicKey, Keypair, Transaction, StakeProgram,
  Authorized, Lockup, LAMPORTS_PER_SOL, sendAndConfirmTransaction,
} from "@solana/web3.js";

export interface StakeAccountInfo {
  address: string;
  lamports: number;
  state: "inactive" | "activating" | "active" | "deactivating";
  voter?: string;
  activationEpoch?: number;
  deactivationEpoch?: number;
}

export interface ValidatorInfo {
  votePubkey: string;
  identity: string;
  name?: string;
  commission: number;
  activatedStake: number;
  lastVote: number;
}

/** Get all stake accounts owned by a public key. */
export async function getStakeAccounts(connection: Connection, owner: PublicKey): Promise<StakeAccountInfo[]> {
  const accounts = await connection.getParsedProgramAccounts(
    new PublicKey("Stake11111111111111111111111111111111111111"),
    {
      filters: [
        { dataSize: 200 },
        { memcmp: { offset: 12, bytes: owner.toBase58() } },
      ],
    },
  );

  const epochInfo = await connection.getEpochInfo();
  const currentEpoch = epochInfo.epoch;

  return accounts.map(acc => {
    const parsed = (acc.account.data as any)?.parsed?.info;
    const stake = parsed?.stake;
    const delegation = stake?.delegation;

    let state: StakeAccountInfo["state"] = "inactive";
    if (delegation) {
      const activationEpoch = parseInt(delegation.activationEpoch || "0");
      const deactivationEpoch = parseInt(delegation.deactivationEpoch || "0");
      if (deactivationEpoch < currentEpoch && deactivationEpoch !== 0) {
        state = "inactive";
      } else if (deactivationEpoch !== 0 && deactivationEpoch <= currentEpoch + 1) {
        state = "deactivating";
      } else if (activationEpoch >= currentEpoch) {
        state = "activating";
      } else {
        state = "active";
      }
    }

    return {
      address: acc.pubkey.toBase58(),
      lamports: acc.account.lamports,
      state,
      voter: delegation?.voter,
      activationEpoch: delegation ? parseInt(delegation.activationEpoch) : undefined,
      deactivationEpoch: delegation ? parseInt(delegation.deactivationEpoch) : undefined,
    };
  });
}

/** Get current validator list. */
export async function getValidators(connection: Connection): Promise<ValidatorInfo[]> {
  const { current, delinquent } = await connection.getVoteAccounts();

  return current.map(v => ({
    votePubkey: v.votePubkey,
    identity: v.nodePubkey,
    commission: v.commission,
    activatedStake: v.activatedStake,
    lastVote: v.lastVote,
  }));
}

/** Create a new stake account and delegate to a validator. Returns the signature. */
export async function delegateStake(
  connection: Connection,
  payer: Keypair,
  validatorVotePubkey: PublicKey,
  lamports: number,
): Promise<{ signature: string; stakeAccount: string }> {
  const stakeAccount = Keypair.generate();

  const transaction = new Transaction();

  // Create stake account
  transaction.add(
    StakeProgram.createAccount({
      fromPubkey: payer.publicKey,
      stakePubkey: stakeAccount.publicKey,
      authorized: new Authorized(payer.publicKey, payer.publicKey),
      lockup: new Lockup(0, 0, payer.publicKey),
      lamports,
    }),
  );

  // Delegate
  transaction.add(
    StakeProgram.delegate({
      stakePubkey: stakeAccount.publicKey,
      authorizedPubkey: payer.publicKey,
      votePubkey: validatorVotePubkey,
    }),
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [payer, stakeAccount]);

  return { signature, stakeAccount: stakeAccount.publicKey.toBase58() };
}

/** Deactivate a stake account. */
export async function undelegateStake(
  connection: Connection,
  payer: Keypair,
  stakeAccountPubkey: PublicKey,
): Promise<string> {
  const transaction = new Transaction().add(
    StakeProgram.deactivate({
      stakePubkey: stakeAccountPubkey,
      authorizedPubkey: payer.publicKey,
    }),
  );

  return sendAndConfirmTransaction(connection, transaction, [payer]);
}
