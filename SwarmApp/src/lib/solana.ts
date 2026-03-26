/**
 * Solana Mod — Wallet, SPL tokens, staking, and program interactions on Solana.
 *
 * Contains tools, workflows, examples, and agent skills for the Solana marketplace mod.
 * Imported by skills.ts (registry) and the /solana page (UI).
 */
import type { ModManifest, ModTool, ModWorkflow, ModExample, ModAgentSkill } from "./skills";

// ═══════════════════════════════════════════════════════════════
// Tools
// ═══════════════════════════════════════════════════════════════

export const SOLANA_TOOLS: ModTool[] = [
    {
        id: "solana-wallet",
        name: "Wallet Connect",
        description:
            "Connect Phantom, Solflare, or Backpack wallets. Manage keypairs, view balances, and sign transactions on Solana mainnet-beta or devnet.",
        icon: "Wallet",
        category: "Wallet",
        status: "active",
        usageExample: `// Connect wallet and get balance
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const balance = await connection.getBalance(new PublicKey(walletAddress));
console.log("SOL Balance:", balance / LAMPORTS_PER_SOL);`,
    },
    {
        id: "solana-spl-tokens",
        name: "Token Operations",
        description:
            "Transfer SOL and SPL tokens, check balances, create token accounts, and manage token metadata. Supports all SPL token standards.",
        icon: "Coins",
        category: "Tokens",
        status: "active",
        usageExample: `// Transfer SOL
import { SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";

const tx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    toPubkey: new PublicKey(recipient),
    lamports: 1_000_000_000, // 1 SOL
  })
);
await sendAndConfirmTransaction(connection, tx, [sender]);`,
    },
    {
        id: "solana-staking",
        name: "Staking",
        description:
            "Delegate SOL to validators, manage stake accounts, and track staking rewards. Supports native SOL staking and liquid staking protocols.",
        icon: "Lock",
        category: "DeFi",
        status: "active",
        usageExample: `// Create stake account and delegate
import { StakeProgram, Authorized, Lockup } from "@solana/web3.js";

const stakeAccount = Keypair.generate();
const createStakeTx = StakeProgram.createAccount({
  fromPubkey: wallet.publicKey,
  stakePubkey: stakeAccount.publicKey,
  authorized: new Authorized(wallet.publicKey, wallet.publicKey),
  lockup: new Lockup(0, 0, wallet.publicKey),
  lamports: 5_000_000_000, // 5 SOL
});`,
    },
    {
        id: "solana-programs",
        name: "Program Interaction",
        description:
            "Call Solana programs (smart contracts), read on-chain account data, and decode program state. Supports Anchor and native programs.",
        icon: "Code",
        category: "Development",
        status: "active",
        usageExample: `// Read account data
const accountInfo = await connection.getAccountInfo(new PublicKey(programAddress));
if (accountInfo) {
  console.log("Owner:", accountInfo.owner.toBase58());
  console.log("Data length:", accountInfo.data.length);
  console.log("Lamports:", accountInfo.lamports);
}`,
    },
    {
        id: "solana-explorer",
        name: "Block Explorer",
        description:
            "Deep-link to Solscan or Solana Explorer for transaction receipts, account details, token info, and program verification.",
        icon: "ExternalLink",
        category: "Utilities",
        status: "active",
        usageExample: `// Get Solscan link for a transaction
const txUrl = \`https://solscan.io/tx/\${txSignature}\`;
// Get account link
const accountUrl = \`https://solscan.io/account/\${publicKey}\`;`,
    },
    {
        id: "solana-swap",
        name: "Jupiter Swap",
        description:
            "Swap tokens via Jupiter DEX aggregator. Get quotes, compare routes, and execute swaps with configurable slippage. Mainnet only.",
        icon: "ArrowLeftRight",
        category: "DeFi",
        status: "active",
        usageExample: `// Get a swap quote from Jupiter
const res = await fetch("https://quote-api.jup.ag/v6/quote?" +
  "inputMint=So11111111111111111111111111111111111111112" +
  "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" +
  "&amount=1000000000&slippageBps=50");
const quote = await res.json();`,
    },
    {
        id: "solana-transfer",
        name: "Token Transfer",
        description:
            "Send SOL or SPL tokens from agent wallets. Handles associated token account creation automatically.",
        icon: "Send",
        category: "Tokens",
        status: "active",
    },
    {
        id: "solana-history",
        name: "Transaction History",
        description:
            "View past transactions for any wallet. Uses Helius Enhanced API on mainnet for rich parsed data, raw RPC on devnet.",
        icon: "History",
        category: "Explorer",
        status: "active",
    },
    {
        id: "solana-prices",
        name: "Price Feeds",
        description:
            "Real-time token pricing and portfolio valuation via Jupiter Price API. Mainnet only.",
        icon: "TrendingUp",
        category: "Market",
        status: "active",
    },
];

// ═══════════════════════════════════════════════════════════════
// Workflows
// ═══════════════════════════════════════════════════════════════

export const SOLANA_WORKFLOWS: ModWorkflow[] = [
    {
        id: "sol-transfer-flow",
        name: "Token Transfer Flow",
        icon: "💸",
        description:
            "End-to-end SOL or SPL token transfer: connect wallet, select token, specify recipient and amount, sign and confirm transaction.",
        steps: [
            "Connect wallet (Phantom/Solflare)",
            "Select token (SOL or SPL token)",
            "Enter recipient address and amount",
            "Sign transaction with wallet",
            "Confirm on-chain and verify on Solscan",
        ],
        estimatedTime: "~30 seconds",
        tags: ["solana", "tokens", "transfer"],
    },
    {
        id: "agent-wallet-setup",
        name: "Agent Wallet Setup",
        icon: "🤖",
        description:
            "Set up a Solana wallet for an AI agent: generate keypair, fund with SOL (devnet airdrop or transfer), and register wallet on-chain.",
        steps: [
            "Generate Ed25519 keypair for agent",
            "Fund wallet via devnet airdrop or SOL transfer",
            "Store keypair securely in agent config",
            "Register agent wallet address with Swarm hub",
            "Verify balance and connectivity",
        ],
        estimatedTime: "~2 minutes",
        tags: ["solana", "agents", "wallet", "setup"],
    },
    {
        id: "staking-delegation",
        name: "Stake Delegation",
        icon: "🔒",
        description:
            "Delegate SOL to a validator: create stake account, choose validator, delegate, and monitor rewards.",
        steps: [
            "Connect wallet with SOL balance",
            "Create a new stake account",
            "Select a validator from the list",
            "Delegate stake to validator",
            "Monitor staking rewards over time",
        ],
        estimatedTime: "~1 minute",
        tags: ["solana", "staking", "defi"],
    },
    {
        id: "jupiter-swap-flow",
        name: "Jupiter Token Swap",
        icon: "🔄",
        description:
            "Swap tokens via Jupiter DEX aggregator: select tokens, get quote, review route and price impact, execute swap.",
        steps: [
            "Select input and output tokens",
            "Enter amount and get Jupiter quote",
            "Review route, price impact, and slippage",
            "Select agent wallet to swap from",
            "Execute swap and confirm on-chain",
        ],
        estimatedTime: "~30 seconds",
        tags: ["solana", "jupiter", "swap", "defi"],
    },
    {
        id: "portfolio-check-flow",
        name: "Portfolio Check",
        icon: "📊",
        description:
            "View portfolio valuation: SOL balance, token holdings, staked SOL, all priced in USD.",
        steps: [
            "Select agent wallet",
            "Fetch token balances from RPC",
            "Get real-time prices from Jupiter",
            "Display total portfolio value in USD",
        ],
        estimatedTime: "~10 seconds",
        tags: ["solana", "portfolio", "prices"],
    },
];

// ═══════════════════════════════════════════════════════════════
// Agent Skills
// ═══════════════════════════════════════════════════════════════

export const SOLANA_AGENT_SKILLS: ModAgentSkill[] = [
    {
        id: "solana.transfer",
        name: "Transfer SOL/SPL",
        type: "skill",
        description: "Send SOL or SPL tokens to a recipient address.",
        invocation: 'solana.transfer({ to, amount, mint? })',
        exampleInput: '{ "to": "9WzD...", "amount": "1.5" }',
        exampleOutput: '{ "signature": "5Kz...", "slot": 234567890 }',
    },
    {
        id: "solana.balance",
        name: "Check Balance",
        type: "skill",
        description: "Check SOL or SPL token balance for a wallet address.",
        invocation: "solana.balance({ address, mint? })",
        exampleInput: '{ "address": "9WzD..." }',
        exampleOutput: '{ "balance": "12.5", "symbol": "SOL" }',
    },
    {
        id: "solana.stake",
        name: "Delegate Stake",
        type: "skill",
        description: "Delegate SOL to a validator for staking rewards.",
        invocation: "solana.stake({ validator, amount })",
        exampleInput: '{ "validator": "Vote111...", "amount": "10" }',
        exampleOutput: '{ "stakeAccount": "Stake...", "signature": "4Tx..." }',
    },
    {
        id: "solana.read_account",
        name: "Read Account Data",
        type: "skill",
        description: "Read on-chain account data and decode program state.",
        invocation: "solana.readAccount({ address })",
        exampleInput: '{ "address": "Prog..." }',
        exampleOutput: '{ "owner": "11111...", "lamports": 5000000000, "dataLength": 165 }',
    },
    {
        id: "solana.swap",
        name: "Jupiter Swap",
        type: "skill",
        description: "Swap tokens via Jupiter DEX aggregator on mainnet.",
        invocation: "solana.swap({ inputMint, outputMint, amount, slippageBps? })",
        exampleInput: '{ "inputMint": "SOL", "outputMint": "USDC", "amount": "1.0" }',
        exampleOutput: '{ "signature": "3Ab...", "outAmount": "150.5" }',
    },
    {
        id: "solana.history",
        name: "Transaction History",
        type: "skill",
        description: "Fetch recent transaction history for a wallet address.",
        invocation: "solana.history({ address, limit? })",
        exampleInput: '{ "address": "9WzD...", "limit": 10 }',
        exampleOutput: '{ "transactions": [...], "hasMore": true }',
    },
    {
        id: "solana.price",
        name: "Token Price",
        type: "skill",
        description: "Get current USD price for Solana tokens.",
        invocation: "solana.price({ mint })",
        exampleInput: '{ "mint": "SOL" }',
        exampleOutput: '{ "price": 150.25, "symbol": "SOL" }',
    },
];

// ═══════════════════════════════════════════════════════════════
// Examples
// ═══════════════════════════════════════════════════════════════

export const SOLANA_EXAMPLES: ModExample[] = [
    {
        id: "transfer-sol",
        name: "Transfer SOL",
        icon: "Banknote",
        description: "Send SOL from one wallet to another using @solana/web3.js.",
        language: "typescript",
        tags: ["solana", "transfer", "web3"],
        codeSnippet: `import {
  Connection, PublicKey, Keypair,
  SystemProgram, Transaction, sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const sender = Keypair.fromSecretKey(/* your secret key */);
const recipient = new PublicKey("RecipientAddressHere...");

const tx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    toPubkey: recipient,
    lamports: 1 * LAMPORTS_PER_SOL, // 1 SOL
  })
);

const signature = await sendAndConfirmTransaction(connection, tx, [sender]);
console.log("Transfer complete:", signature);
console.log("View on Solscan:", \`https://solscan.io/tx/\${signature}?cluster=devnet\`);`,
    },
    {
        id: "read-balance",
        name: "Read Wallet Balances",
        icon: "Eye",
        description: "Check SOL balance and list all SPL token accounts for a wallet.",
        language: "typescript",
        tags: ["solana", "balance", "tokens"],
        codeSnippet: `import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const wallet = new PublicKey("WalletAddressHere...");

// SOL balance
const solBalance = await connection.getBalance(wallet);
console.log("SOL:", solBalance / LAMPORTS_PER_SOL);

// SPL token accounts
const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, {
  programId: TOKEN_PROGRAM_ID,
});

for (const { account } of tokenAccounts.value) {
  const info = account.data.parsed.info;
  console.log(\`Token: \${info.mint} — Balance: \${info.tokenAmount.uiAmountString}\`);
}`,
    },
];

// ═══════════════════════════════════════════════════════════════
// Manifest
// ═══════════════════════════════════════════════════════════════

export const SOLANA_MANIFEST: ModManifest = {
    tools: SOLANA_TOOLS,
    workflows: SOLANA_WORKFLOWS,
    examples: SOLANA_EXAMPLES,
    agentSkills: SOLANA_AGENT_SKILLS,
};
