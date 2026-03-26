/**
 * CDP SDK Client — Server-side only
 *
 * Wraps @coinbase/cdp-sdk for server wallet operations,
 * paymaster proxy, swap execution, and balance/faucet features.
 *
 * NEVER import this file from client components.
 * All functions are called exclusively from API routes.
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { encodeFunctionData, parseAbi } from "viem";
import {
    CDP_NETWORK_CHAIN_IDS,
    CDP_TESTNET_CHAIN_ID,
    type CdpNetwork,
    type CdpTokenBalance,
} from "./cdp";

// ═══════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════

let _cdp: CdpClient | null = null;

/**
 * Get or create the CdpClient singleton.
 * The SDK reads CDP_API_KEY_ID (falls back to CDP_API_KEY_NAME),
 * CDP_API_KEY_SECRET, and CDP_WALLET_SECRET from env.
 */
function getCdp(): CdpClient {
    if (!_cdp) {
        _cdp = new CdpClient({
            apiKeyId: process.env.CDP_API_KEY_ID || process.env.CDP_API_KEY_NAME,
            apiKeySecret: process.env.CDP_API_KEY_SECRET,
            walletSecret: process.env.CDP_WALLET_SECRET,
        });
    }
    return _cdp;
}

function getCdpNetwork(): CdpNetwork {
    return (process.env.CDP_NETWORK as CdpNetwork) || "base-sepolia";
}

function getChainId(): number {
    const network = getCdpNetwork();
    return CDP_NETWORK_CHAIN_IDS[network] ?? CDP_TESTNET_CHAIN_ID;
}

// ═══════════════════════════════════════════════════════════════
// Account Creation
// ═══════════════════════════════════════════════════════════════

export interface CreateAccountResult {
    address: string;
    chainId: number;
}

/**
 * Create a new CDP server account.
 * In SDK v2 the address IS the account identifier (no separate walletId).
 */
export async function createCdpAccount(options: {
    name?: string;
}): Promise<CreateAccountResult> {
    const cdp = getCdp();
    const account = options.name
        ? await cdp.evm.getOrCreateAccount({ name: options.name })
        : await cdp.evm.createAccount();
    return {
        address: account.address,
        chainId: getChainId(),
    };
}

// ═══════════════════════════════════════════════════════════════
// Signing
// ═══════════════════════════════════════════════════════════════

export interface SignResult {
    signature: string;
    walletAddress: string;
}

/**
 * Sign an EIP-191 message using a CDP server account.
 */
export async function signWithAccount(
    address: string,
    message: string,
): Promise<SignResult> {
    const cdp = getCdp();
    const result = await cdp.evm.signMessage({
        address: address as `0x${string}`,
        message,
    });
    return {
        signature: result.signature,
        walletAddress: address,
    };
}

// ═══════════════════════════════════════════════════════════════
// Paymaster Proxy
// ═══════════════════════════════════════════════════════════════

export interface SponsorGasParams {
    target: string;
    calldata: string;
    value: string;
    walletAddress: string;
}

export interface SponsorGasResult {
    txHash: string;
    gasSponsored: boolean;
    gasCostUsd: number;
}

/**
 * Sponsor gas for a transaction via the CDP paymaster.
 * The paymaster URL is NEVER returned or exposed to the caller.
 *
 * Note: This remains a raw fetch — the SDK doesn't wrap custom
 * paymaster JSON-RPC proxy endpoints directly.
 */
export async function sponsorGas(params: SponsorGasParams): Promise<SponsorGasResult> {
    const paymasterUrl = process.env.CDP_PAYMASTER_URL;
    if (!paymasterUrl) throw new Error("CDP paymaster URL not configured");

    const res = await fetch(paymasterUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "pm_sponsorUserOperation",
            params: [
                {
                    sender: params.walletAddress,
                    callData: params.calldata,
                    callGasLimit: "0x0",
                    verificationGasLimit: "0x0",
                    preVerificationGas: "0x0",
                    maxFeePerGas: "0x0",
                    maxPriorityFeePerGas: "0x0",
                },
                getChainId().toString(),
            ],
        }),
    });

    if (!res.ok) {
        // CRITICAL: Never include the paymaster URL in error messages
        throw new Error(`Gas sponsorship failed (${res.status})`);
    }

    const result = await res.json();
    if (result.error) {
        throw new Error(`Gas sponsorship error: ${result.error.message || "unknown"}`);
    }

    return {
        txHash: result.result?.txHash || "",
        gasSponsored: true,
        gasCostUsd: 0,
    };
}

// ═══════════════════════════════════════════════════════════════
// Swap Execution
// ═══════════════════════════════════════════════════════════════

export interface ExecuteSwapParams {
    address: string;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    slippageBps: number;
}

export interface ExecuteSwapResult {
    txHash: string;
    toAmount: string;
    status: "submitted" | "confirmed" | "failed";
}

/**
 * Execute a token swap via CDP Swap API.
 * Uses the two-step createSwapQuote → execute pattern.
 */
export async function executeSwap(params: ExecuteSwapParams): Promise<ExecuteSwapResult> {
    const cdp = getCdp();
    const network = getCdpNetwork();

    const quoteResult = await cdp.evm.createSwapQuote({
        network,
        fromToken: params.fromToken as `0x${string}`,
        toToken: params.toToken as `0x${string}`,
        fromAmount: BigInt(params.fromAmount),
        taker: params.address as `0x${string}`,
        slippageBps: params.slippageBps,
    });

    if (!("liquidityAvailable" in quoteResult) || !quoteResult.liquidityAvailable) {
        throw new Error("Swap liquidity unavailable");
    }

    const result = await quoteResult.execute();
    return {
        txHash: result.transactionHash || "",
        toAmount: quoteResult.toAmount.toString(),
        status: "submitted",
    };
}

// ═══════════════════════════════════════════════════════════════
// Transfer (for billing)
// ═══════════════════════════════════════════════════════════════

export interface TransferParams {
    address: string;
    toAddress: string;
    tokenAddress: string;
    amount: string;
}

export interface TransferResult {
    txHash: string;
    status: "submitted" | "confirmed" | "failed";
}

/**
 * Execute an ERC-20 transfer from a server account.
 * Used for billing charges and token sends.
 */
export async function executeTransfer(params: TransferParams): Promise<TransferResult> {
    const cdp = getCdp();
    const network = getCdpNetwork();

    const data = encodeFunctionData({
        abi: parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]),
        functionName: "transfer",
        args: [params.toAddress as `0x${string}`, BigInt(params.amount)],
    });

    const result = await cdp.evm.sendTransaction({
        address: params.address as `0x${string}`,
        transaction: {
            to: params.tokenAddress as `0x${string}`,
            value: 0n,
            data,
        },
        network,
    });

    return {
        txHash: result.transactionHash,
        status: "submitted",
    };
}

// ═══════════════════════════════════════════════════════════════
// Balance
// ═══════════════════════════════════════════════════════════════

/**
 * List token balances for a CDP server account.
 */
export async function getTokenBalances(
    address: string,
    network?: CdpNetwork,
): Promise<CdpTokenBalance[]> {
    const cdp = getCdp();
    const net = network || getCdpNetwork();

    const result = await cdp.evm.listTokenBalances({
        address: address as `0x${string}`,
        network: net,
    });

    return result.balances.map((b) => ({
        token: b.token?.contractAddress || "native",
        amount: b.amount?.amount || "0",
        decimals: Number(b.amount?.decimals ?? 18),
        symbol: b.token?.symbol,
        name: b.token?.name,
    }));
}

// ═══════════════════════════════════════════════════════════════
// Faucet
// ═══════════════════════════════════════════════════════════════

export interface FaucetResult {
    transactionHash: string;
}

/**
 * Request testnet funds from the CDP faucet.
 * Only works on testnet networks (e.g. base-sepolia).
 */
export async function requestTestnetFaucet(
    address: string,
    token: string,
    network?: CdpNetwork,
): Promise<FaucetResult> {
    const cdp = getCdp();
    const net = network || getCdpNetwork();

    const result = await cdp.evm.requestFaucet({
        address: address as `0x${string}`,
        network: net,
        token,
    });

    return {
        transactionHash: result.transactionHash,
    };
}

// ═══════════════════════════════════════════════════════════════
// Secret Rotation
// ═══════════════════════════════════════════════════════════════

export interface RotateSecretResult {
    rotated: boolean;
    secretType: string;
    newKeyPrefix: string;
}

/**
 * Rotate a CDP secret. The actual rotation depends on the secret type.
 * Admin must rotate via CDP Portal and update env vars afterward.
 */
export async function rotateSecret(secretType: "cdp_api_key" | "wallet_secret"): Promise<RotateSecretResult> {
    if (secretType === "cdp_api_key") {
        return {
            rotated: false,
            secretType,
            newKeyPrefix: "Rotate via CDP Portal → API Keys",
        };
    }

    return {
        rotated: false,
        secretType,
        newKeyPrefix: "Rotate via CDP Portal → Wallet Settings",
    };
}
