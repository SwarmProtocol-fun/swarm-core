/**
 * POST /api/mods/hedera-faucet/request
 *
 * Hedera Testnet Faucet — Distributes free testnet HBAR to users.
 * Rate limited to prevent abuse (1 request per 24h per wallet).
 */

import { NextRequest, NextResponse } from "next/server";
import { AccountId, Hbar, PrivateKey, Client, TransferTransaction } from "@hashgraph/sdk";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";

const FAUCET_AMOUNT_HBAR = 100; // 100 HBAR per request
const COOLDOWN_HOURS = 24;

interface FaucetRequest {
  wallet: string;
  accountId?: string; // Optional Hedera account ID (0.0.xxxx)
  requestedAt: string;
  amountHbar: number;
  txHash?: string;
  status: "pending" | "completed" | "failed";
  errorMessage?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const walletAddress = (body.wallet as string)?.trim();
    const hederaAccountId = (body.accountId as string)?.trim(); // 0.0.xxxx format

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    if (!hederaAccountId || !/^0\.0\.\d+$/.test(hederaAccountId)) {
      return NextResponse.json(
        { error: "Valid Hedera account ID required (format: 0.0.xxxx)" },
        { status: 400 }
      );
    }

    // Check cooldown — has this wallet requested in the last 24h?
    const requestsRef = collection(db, "faucetRequests");
    const q = query(
      requestsRef,
      where("wallet", "==", walletAddress),
      where("status", "==", "completed"),
      orderBy("requestedAt", "desc"),
      limit(1)
    );
    const recentRequest = await getDocs(q);

    if (!recentRequest.empty) {
      const lastRequest = recentRequest.docs[0].data() as FaucetRequest;
      const lastRequestTime = new Date(lastRequest.requestedAt).getTime();
      const now = Date.now();
      const hoursSinceLastRequest = (now - lastRequestTime) / (1000 * 60 * 60);

      if (hoursSinceLastRequest < COOLDOWN_HOURS) {
        const hoursRemaining = Math.ceil(COOLDOWN_HOURS - hoursSinceLastRequest);
        return NextResponse.json(
          {
            error: "Cooldown active",
            message: `You can request testnet HBAR again in ${hoursRemaining} hours`,
            hoursRemaining,
          },
          { status: 429 }
        );
      }
    }

    // Check if faucet is configured
    const faucetAccountId = process.env.HEDERA_FAUCET_ACCOUNT_ID;
    const faucetPrivateKey = process.env.HEDERA_FAUCET_PRIVATE_KEY;

    if (!faucetAccountId || !faucetPrivateKey) {
      return NextResponse.json(
        {
          error: "Faucet not configured",
          message: "Platform faucet is not yet configured. Please use the official Hedera faucet at https://portal.hedera.com/faucet",
          officialFaucet: "https://portal.hedera.com/faucet",
        },
        { status: 503 }
      );
    }

    // Create pending request record
    const requestId = `req_${Date.now()}_${walletAddress.slice(0, 8)}`;
    const requestData: FaucetRequest = {
      wallet: walletAddress,
      accountId: hederaAccountId,
      requestedAt: new Date().toISOString(),
      amountHbar: FAUCET_AMOUNT_HBAR,
      status: "pending",
    };

    await setDoc(doc(db, "faucetRequests", requestId), requestData);

    try {
      // Initialize Hedera client (testnet)
      const client = Client.forTestnet();
      client.setOperator(
        AccountId.fromString(faucetAccountId),
        PrivateKey.fromString(faucetPrivateKey)
      );

      // Create transfer transaction
      const transferTx = await new TransferTransaction()
        .addHbarTransfer(faucetAccountId, new Hbar(-FAUCET_AMOUNT_HBAR)) // Deduct from faucet
        .addHbarTransfer(hederaAccountId, new Hbar(FAUCET_AMOUNT_HBAR)) // Send to user
        .setTransactionMemo(`Swarm Faucet: ${FAUCET_AMOUNT_HBAR} HBAR`)
        .execute(client);

      // Wait for receipt
      const receipt = await transferTx.getReceipt(client);
      const txHash = transferTx.transactionId.toString();

      // Update request to completed
      await updateDoc(doc(db, "faucetRequests", requestId), {
        status: "completed",
        txHash,
      });

      return NextResponse.json({
        success: true,
        amount: FAUCET_AMOUNT_HBAR,
        currency: "HBAR",
        txHash,
        explorerUrl: `https://hashscan.io/testnet/transaction/${txHash}`,
        message: `Successfully sent ${FAUCET_AMOUNT_HBAR} HBAR to ${hederaAccountId}`,
        nextRequestAvailable: new Date(Date.now() + COOLDOWN_HOURS * 60 * 60 * 1000).toISOString(),
      });
    } catch (txError) {
      // Update request to failed
      const errorMessage = txError instanceof Error ? txError.message : "Transaction failed";
      await updateDoc(doc(db, "faucetRequests", requestId), {
        status: "failed",
        errorMessage,
      });

      return NextResponse.json(
        {
          error: "Transaction failed",
          message: errorMessage,
          officialFaucet: "https://portal.hedera.com/faucet",
        },
        { status: 500 }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Faucet request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
