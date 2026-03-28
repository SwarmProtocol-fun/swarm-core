/**
 * TON Mod — Wallet auth, Toncoin/Jetton payments, agent treasury, and spending policy on TON.
 *
 * Contains tools, workflows, examples, and agent skills for the TON Treasury mod.
 * Imported by skills.ts (registry) and the /mods/ton page (UI).
 *
 * Hackathon track: TON Consumer Payments
 * Entry point: Telegram Mini App → TON Connect → ton_proof verify → fund/pay/approve
 */
import type { ModManifest, ModTool, ModWorkflow, ModExample, ModAgentSkill } from "./skills";

// ═══════════════════════════════════════════════════════════════
// Tools
// ═══════════════════════════════════════════════════════════════

export const TON_TOOLS: ModTool[] = [
    {
        id: "ton-wallet-connect",
        name: "Wallet Connect",
        description:
            "Connect Tonkeeper, TonHub, or MyTonWallet via TON Connect 2.0. Binds a TON wallet address to a Swarm org or agent. Mandatory first step for all TON payment flows.",
        icon: "Wallet",
        category: "Wallet",
        status: "active",
        usageExample: `// TON Connect manifest (place at /.well-known/tonconnect-manifest.json)
{
  "url": "https://app.swarmprotocol.fun",
  "name": "Swarm",
  "iconUrl": "https://app.swarmprotocol.fun/icon.png"
}

// Connect from a Telegram Mini App
import TonConnect from "@tonconnect/sdk";
const connector = new TonConnect({
  manifestUrl: "https://app.swarmprotocol.fun/.well-known/tonconnect-manifest.json",
});
await connector.connect({ jsBridgeKey: "tonkeeper" });
console.log("Connected:", connector.account?.address);`,
    },
    {
        id: "ton-proof-verify",
        name: "Ownership Proof",
        description:
            "Verify TON wallet ownership server-side using ton_proof. Cryptographically links a wallet to a Swarm session without requiring a transaction. Mandatory for agent wallet binding.",
        icon: "ShieldCheck",
        category: "Auth",
        status: "active",
        usageExample: `// ton_proof verification (server-side)
// 1. Frontend: request proof during TON Connect
const walletInfo = await connector.connect({
  tonProof: "swarm-session-" + sessionId,
});
// 2. Backend: verify the proof
const payload = buildTonProofPayload(walletInfo.tonProof, domain, address);
const isValid = await verifyEd25519(payload, proof.signature, publicKey);
if (!isValid) return Response.json({ error: "Invalid proof" }, { status: 401 });`,
    },
    {
        id: "ton-balance",
        name: "Balance Reader",
        description:
            "Read Toncoin balance and Jetton holdings for any TON address via TON Center API v3 indexed endpoint. Returns parsed balances with USD estimates.",
        icon: "Eye",
        category: "Wallet",
        status: "active",
        usageExample: `// TON Center API v3 — account balance
const res = await fetch(
  "https://toncenter.com/api/v3/account?address=" + encodeURIComponent(address),
  { headers: { "X-API-Key": process.env.TON_CENTER_API_KEY! } }
);
const data = await res.json();
// Balance is in nanoTON (1 TON = 1e9 nanoTON)
const tonBalance = Number(data.balance) / 1e9;
console.log("Balance:", tonBalance, "TON");`,
    },
    {
        id: "ton-jettons",
        name: "Jetton Balances",
        description:
            "List all Jetton (fungible token) balances for a wallet via TON Center API v3. Supports any Jetton contract including USDT, NOT, and custom tokens.",
        icon: "Coins",
        category: "Tokens",
        status: "active",
        usageExample: `// TON Center API v3 — Jetton wallets
const res = await fetch(
  "https://toncenter.com/api/v3/jetton/wallets?owner_address=" + address + "&limit=50",
  { headers: { "X-API-Key": process.env.TON_CENTER_API_KEY! } }
);
const data = await res.json();
for (const jw of data.jetton_wallets) {
  const balance = Number(jw.balance) / Math.pow(10, jw.jetton.decimals);
  console.log(jw.jetton.symbol, balance);
}`,
    },
    {
        id: "ton-nfts",
        name: "NFT Holdings",
        description:
            "Fetch NFT items owned by a TON wallet via TON Center API v3. Can be used for access gating — e.g., require ownership of a Swarm Agent NFT collection item.",
        icon: "Image",
        category: "NFT",
        status: "active",
        usageExample: `// TON Center API v3 — NFT items
const res = await fetch(
  "https://toncenter.com/api/v3/nft/items?owner_address=" + address + "&limit=50",
  { headers: { "X-API-Key": process.env.TON_CENTER_API_KEY! } }
);
const data = await res.json();
const hasAccess = data.nft_items.some(
  (item: { collection?: { address: string } }) =>
    item.collection?.address === SWARM_AGENT_COLLECTION_ADDRESS
);`,
    },
    {
        id: "ton-payment",
        name: "Toncoin Payment",
        description:
            "Create and confirm Toncoin payment requests. Supports single transfers and agent-executed payouts. Enforces spending policy (per-tx cap, daily cap, allowlist, approval threshold) before executing.",
        icon: "Send",
        category: "Payments",
        status: "active",
        usageExample: `// Create payment intent (server-side, policy-checked)
const payment = await fetch("/api/v1/ton/payments", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orgId, fromAddress, toAddress,
    amountNano: BigInt(1_000_000_000).toString(), // 1 TON in nanoTON
    memo: "Task bounty payout #42",
  }),
});
// Returns: { id, status: "pending_approval" | "ready" | "executed" }`,
    },
    {
        id: "ton-subscription",
        name: "Subscription Billing",
        description:
            "Create and manage recurring Toncoin payment subscriptions. Set frequency (daily/weekly/monthly), max amount, and auto-renewal. Backed by Swarm approval queue for admin control.",
        icon: "RefreshCw",
        category: "Payments",
        status: "active",
        usageExample: `// Create subscription
const sub = await fetch("/api/v1/ton/payments", {
  method: "POST",
  body: JSON.stringify({
    orgId, fromAddress, toAddress,
    amountNano: BigInt(500_000_000).toString(), // 0.5 TON/month
    memo: "Swarm Premium TON mod subscription",
    recurring: { frequency: "monthly", maxCycles: 12 },
  }),
});`,
    },
    {
        id: "ton-policy",
        name: "Spending Policy",
        description:
            "Configure per-org TON spending limits: per-transaction cap, daily spend cap, monthly cap, destination allowlist, approval threshold, and kill switch. All agent payments are checked against active policy before execution.",
        icon: "Shield",
        category: "Safety",
        status: "active",
        usageExample: `// Set spending policy
await fetch("/api/v1/ton/policies", {
  method: "POST",
  body: JSON.stringify({
    orgId,
    perTxCapNano: BigInt(5_000_000_000).toString(),  // 5 TON max per tx
    dailyCapNano: BigInt(20_000_000_000).toString(), // 20 TON/day
    approvalThresholdNano: BigInt(2_000_000_000).toString(), // require approval >2 TON
    allowlist: ["EQD...treasury", "EQA...vendor"],
    paused: false,
  }),
});`,
    },
    {
        id: "ton-tma",
        name: "Telegram Mini App",
        description:
            "Native Telegram Mini App entry point for TON flows. Auto-initializes TON Connect with Telegram wallet bridge, reads initData for user identity, and deep-links to payment and approval flows.",
        icon: "Smartphone",
        category: "Telegram",
        status: "active",
        usageExample: `// Detect Telegram Mini App environment and init TON Connect
import WebApp from "@twa-dev/sdk";
import TonConnect from "@tonconnect/sdk";

WebApp.ready();
const tgUser = WebApp.initDataUnsafe?.user;

const connector = new TonConnect({
  manifestUrl: "https://app.swarmprotocol.fun/.well-known/tonconnect-manifest.json",
});
// In TMA, tonkeeper/telegram wallet bridge is available automatically
await connector.connect({ jsBridgeKey: "telegram-wallet" });`,
    },
    {
        id: "ton-audit",
        name: "Audit Log",
        description:
            "On-chain and off-chain transaction audit log for all TON payments initiated by Swarm agents. Links to TON Center explorer for on-chain verification. Includes policy decisions, approvals, and rejections.",
        icon: "FileText",
        category: "Safety",
        status: "active",
        usageExample: `// Fetch audit entries
const res = await fetch("/api/v1/ton/audit?orgId=" + orgId + "&limit=50");
const { entries } = await res.json();
// Each entry: { id, event, amountNano, txHash, from, to, policyResult, reviewedBy, createdAt }
// TON Center explorer link:
const explorerUrl = \`https://toncenter.com/tx/\${entry.txHash}\`;`,
    },
    {
        id: "ton-agent-wallet",
        name: "Agent Wallet Generator",
        description:
            "Generate dedicated Ed25519 TON keypairs for Swarm agents. Private keys are encrypted with AES-256-GCM and stored in the org secrets vault. Agents can sign and broadcast transactions server-side without user interaction.",
        icon: "KeyRound",
        category: "Wallet",
        status: "active",
        usageExample: `// Generate a wallet for an agent (server-side)
const res = await fetch("/api/v1/ton/agent-wallets", {
  method: "POST",
  body: JSON.stringify({ orgId, label: "Research Agent #1", agentId, createdBy }),
});
const { wallet, privateKeyHex } = await res.json();
// wallet.address = "0:<32-byte-hash>"
// privateKeyHex — save once, used to sign transactions
console.log("Agent address:", wallet.address);`,
    },
    {
        id: "ton-bounty",
        name: "Task Bounty Board",
        description:
            "Post task bounties in TON/Jettons with escrow-style release. Agents claim open tasks, submit delivery proof, and a human admin approves. Platform fee (1–3%) is deducted on release. Full lifecycle: open → claimed → submitted → approved → released.",
        icon: "Trophy",
        category: "Task Management",
        status: "active",
        usageExample: `// Post a bounty
const bounty = await fetch("/api/v1/ton/bounties", {
  method: "POST",
  body: JSON.stringify({
    orgId, title: "Analyze Q4 market data",
    amountNano: "5000000000", // 5 TON
    funderAddress, postedBy,
  }),
});
// Agent claims it
await fetch(\`/api/v1/ton/bounties/\${id}\`, {
  method: "PATCH",
  body: JSON.stringify({ orgId, action: "claim", claimerAddress }),
});`,
    },
    {
        id: "ton-tma-verify",
        name: "Telegram Mini App Verification",
        description:
            "Server-side HMAC-SHA256 verification of Telegram initData. Cryptographically proves the request originated from a real Telegram Mini App session. Required for binding a Telegram user identity to a Swarm org.",
        icon: "MessageCircle",
        category: "Telegram",
        status: "active",
        usageExample: `// In the TMA, send initData to your server for verification
import WebApp from "@twa-dev/sdk";
const res = await fetch("/api/v1/ton/tma/verify", {
  method: "POST",
  body: JSON.stringify({ initData: WebApp.initData }),
});
const { valid, user } = await res.json();
// user: { id, firstName, username, isPremium }
if (valid) bindTelegramUserToOrg(user.id, orgId);`,
    },
    {
        id: "ton-history",
        name: "Transaction History",
        description:
            "Fetch live on-chain transaction history for any TON address via TON Center API v3. Returns direction (in/out), amounts, timestamps, and deep-links to the explorer.",
        icon: "History",
        category: "Explorer",
        status: "active",
        usageExample: `// Fetch last 20 transactions
const res = await fetch("/api/v1/ton/history?address=" + address + "&limit=20");
const { transactions } = await res.json();
for (const tx of transactions) {
  console.log(tx.direction, tx.amountTon, "TON", tx.date);
  // Deep link: tx.explorerUrl
}`,
    },
    {
        id: "ton-simulate",
        name: "Payment Simulator",
        description:
            "Dry-run a payment through the org spending policy without creating any records. Returns policy decision, reason, and remaining daily budget. Use for UI previews before the user confirms.",
        icon: "FlaskConical",
        category: "Safety",
        status: "active",
        usageExample: `// Simulate before sending
const sim = await fetch("/api/v1/ton/simulate", {
  method: "POST",
  body: JSON.stringify({ orgId, toAddress, amountNano: "3000000000" }),
});
const { allowed, requiresApproval, reason, remainingDailyNano } = await sim.json();
// Show result in UI before user confirms the payment`,
    },
    {
        id: "ton-nft-gate",
        name: "NFT Access Gate",
        description:
            "Check whether a TON wallet holds at least one item from a specific NFT collection. Use to gate premium Swarm capabilities behind NFT ownership — e.g. a Swarm Agent Pass collection.",
        icon: "ShieldCheck",
        category: "NFT",
        status: "active",
        usageExample: `// Check NFT-gated access
const res = await fetch(
  "/api/v1/ton/nft-gate?address=" + walletAddress +
  "&collection=" + SWARM_AGENT_PASS_COLLECTION
);
const { hasAccess, ownedCount } = await res.json();
if (!hasAccess) return Response.json({ error: "NFT pass required" }, { status: 403 });`,
    },
    {
        id: "ton-dns",
        name: "TON DNS Resolver",
        description:
            "Resolve .ton domain names to raw TON addresses. Lets users type human-readable names like 'myagent.ton' instead of raw addresses in payment forms. Pass-through for already-valid addresses.",
        icon: "Globe",
        category: "Utilities",
        status: "active",
        usageExample: `// Resolve a .ton name before paying
const res = await fetch("/api/v1/ton/resolve?name=myagent.ton");
const { resolved, address } = await res.json();
if (!resolved) throw new Error("Name not found");
// Use address in payment flow`,
    },
    {
        id: "ton-fees",
        name: "Platform Fee Engine",
        description:
            "Configure and collect platform fees on bounty payouts. Set fee percentage (1–3% default), fee recipient address, and minimum bounty size. Fee revenue is tracked separately and visible in the Analytics tab.",
        icon: "Percent",
        category: "Finance",
        status: "active",
        usageExample: `// Configure 2% platform fee
await fetch("/api/v1/ton/fees", {
  method: "POST",
  body: JSON.stringify({
    orgId, feeBps: 200, // 2%
    feeRecipientAddress: "EQD...",
    minFeeBountyNano: "1000000000", // 1 TON minimum
    enabled: true, updatedBy,
  }),
});`,
    },

    // ── Deployment Tools ──────────────────────────────────────

    {
        id: "ton-deploy-contract",
        name: "Smart Contract Deploy",
        description:
            "Deploy a custom FunC, Tact, or Fift smart contract to TON mainnet or testnet. Accepts pre-compiled BOC (Bag of Cells) or source code. Tracks deployment status, cost, and on-chain address.",
        icon: "FileCode",
        category: "Deploy",
        status: "active",
        usageExample: `// Deploy a Tact smart contract
const deploy = await fetch("/api/v1/ton/deploy", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orgId, type: "smart_contract", name: "MyContract",
    deployerAddress: "EQD...", network: "mainnet",
    config: {
      type: "smart_contract", language: "tact",
      sourceCode: "contract MyContract { ... }",
      initParams: '{"owner": "EQD..."}', precompiled: false,
    },
  }),
});`,
    },
    {
        id: "ton-deploy-jetton",
        name: "Jetton Token Deploy",
        description:
            "Deploy a TEP-74 Jetton (fungible token) on TON. Configure name, symbol, decimals, total supply, mintability, and off-chain metadata URI. Creates the Jetton master contract and initial wallet.",
        icon: "Coins",
        category: "Deploy",
        status: "active",
        usageExample: `// Deploy a Jetton token
const deploy = await fetch("/api/v1/ton/deploy", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orgId, type: "jetton", name: "Swarm Token",
    deployerAddress: "EQD...", network: "mainnet",
    config: {
      type: "jetton", tokenName: "Swarm Token", tokenSymbol: "SWARM",
      decimals: 9, totalSupply: "1000000000000000000", // 1B tokens
      metadataUri: "https://swarmprotocol.fun/jetton.json",
      mintable: true, adminAddress: "EQD...",
    },
  }),
});`,
    },
    {
        id: "ton-deploy-nft-collection",
        name: "NFT Collection Deploy",
        description:
            "Deploy a TEP-62 NFT collection contract on TON. Set collection metadata, max supply, royalty percentage, and owner. Once deployed, mint items into the collection.",
        icon: "Image",
        category: "Deploy",
        status: "active",
        usageExample: `// Deploy an NFT collection
const deploy = await fetch("/api/v1/ton/deploy", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orgId, type: "nft_collection", name: "Agent Passes",
    deployerAddress: "EQD...", network: "mainnet",
    config: {
      type: "nft_collection", collectionName: "Agent Passes",
      metadataUri: "https://swarmprotocol.fun/collection.json",
      maxSupply: 10000, royaltyPercent: 5,
      royaltyAddress: "EQD...", ownerAddress: "EQD...",
    },
  }),
});`,
    },
    {
        id: "ton-deploy-nft-item",
        name: "NFT Item Mint",
        description:
            "Mint a single NFT item into an existing TEP-62 collection on TON. Specify item index, metadata URI, and initial owner address.",
        icon: "Sparkles",
        category: "Deploy",
        status: "active",
        usageExample: `// Mint an NFT item into a collection
const deploy = await fetch("/api/v1/ton/deploy", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orgId, type: "nft_item", name: "Agent Pass #42",
    deployerAddress: "EQD...", network: "mainnet",
    config: {
      type: "nft_item", collectionAddress: "EQC...",
      itemIndex: 42, metadataUri: "https://swarmprotocol.fun/nft/42.json",
      ownerAddress: "EQA...",
    },
  }),
});`,
    },
    {
        id: "ton-deploy-sbt",
        name: "Soulbound Token Deploy",
        description:
            "Deploy a TEP-85 Soulbound Token (SBT) on TON — non-transferable NFTs for identity, credentials, or achievements. Configure authority address for optional revocation.",
        icon: "Fingerprint",
        category: "Deploy",
        status: "active",
        usageExample: `// Deploy a Soulbound Token
const deploy = await fetch("/api/v1/ton/deploy", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orgId, type: "sbt", name: "Agent Credential",
    deployerAddress: "EQD...", network: "mainnet",
    config: {
      type: "sbt", collectionName: "Agent Credentials",
      metadataUri: "https://swarmprotocol.fun/sbt.json",
      authorityAddress: "EQD...", ownerAddress: "EQA...",
      revocable: true,
    },
  }),
});`,
    },
    {
        id: "ton-deploy-dex-pool",
        name: "DEX Liquidity Pool",
        description:
            "Deploy a liquidity pool on DeDust or STON.fi DEX. Provide initial liquidity for a token pair (TON/Jetton or Jetton/Jetton). Supports volatile and stable pool types.",
        icon: "ArrowLeftRight",
        category: "Deploy",
        status: "active",
        usageExample: `// Deploy a DEX liquidity pool on DeDust
const deploy = await fetch("/api/v1/ton/deploy", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orgId, type: "dex_pool", name: "SWARM/TON Pool",
    deployerAddress: "EQD...", network: "mainnet",
    config: {
      type: "dex_pool", platform: "dedust",
      tokenAAddress: "native", // TON
      tokenBAddress: "EQC...", // SWARM Jetton
      tokenAAmount: "10000000000", // 10 TON
      tokenBAmount: "100000000000000", // 100,000 SWARM
      poolType: "volatile",
    },
  }),
});`,
    },
];

// ═══════════════════════════════════════════════════════════════
// Workflows
// ═══════════════════════════════════════════════════════════════

export const TON_WORKFLOWS: ModWorkflow[] = [
    {
        id: "ton-connect-and-pay",
        name: "Connect Wallet & Pay",
        icon: "💎",
        description:
            "End-to-end TON payment from Telegram: open Mini App, connect Tonkeeper, verify ownership via ton_proof, review spending policy, and send Toncoin.",
        steps: [
            "Open Swarm from Telegram Mini App",
            "Connect TON wallet via TON Connect 2.0",
            "Verify wallet ownership with ton_proof (server-side)",
            "Bind wallet to Swarm org or agent",
            "Review active spending policy (caps + allowlist)",
            "Enter recipient and amount",
            "If below threshold: execute immediately",
            "If above threshold: submit for human approval",
            "On approval: sign + broadcast transaction",
            "Record tx hash in audit log",
        ],
        estimatedTime: "~45 seconds",
        tags: ["ton", "telegram", "tma", "payment", "tonconnect"],
    },
    {
        id: "ton-fund-bounty",
        name: "Fund Task Bounty",
        icon: "🏆",
        description:
            "Fund a Swarm task bounty in Toncoin. An agent completes the task, an admin approves, and the payout is released automatically to the agent's TON wallet.",
        steps: [
            "Create a task in Swarm with TON bounty amount",
            "Agent accepts and executes the task",
            "Agent submits completion proof",
            "Admin reviews and approves in Swarm approvals queue",
            "System checks payout against spending policy",
            "Toncoin released to agent wallet",
            "Bounty and payout recorded in audit log with tx hash",
        ],
        estimatedTime: "~2 minutes",
        tags: ["ton", "bounty", "agents", "approvals", "payout"],
    },
    {
        id: "ton-subscribe-service",
        name: "Subscribe to Agent Service",
        icon: "🔄",
        description:
            "Subscribe to a recurring Swarm agent service billed in Toncoin. Auto-renews on schedule with configurable limits and cancellation.",
        steps: [
            "Select agent service from Swarm marketplace",
            "Connect TON wallet and verify ownership",
            "Choose plan (daily / weekly / monthly)",
            "Set max cycles and total spend cap",
            "Confirm subscription — first payment immediate",
            "Subsequent payments auto-executed by Swarm scheduler",
            "Admin can pause or cancel at any time via Policies tab",
        ],
        estimatedTime: "~1 minute",
        tags: ["ton", "subscription", "billing", "recurring", "agent"],
    },
    {
        id: "ton-bounty-flow",
        name: "Bounty Post → Claim → Payout",
        icon: "🏆",
        description:
            "Full bounty lifecycle: admin posts a TON-funded task, agent claims and delivers, admin approves, platform fee deducted, net payout sent on-chain.",
        steps: [
            "Admin posts bounty with TON amount and task description",
            "Agent discovers and claims open bounty",
            "Agent completes task and submits delivery proof",
            "Admin reviews submission in Swarm dashboard",
            "On approval: system calculates platform fee (default 2%)",
            "Net amount queued as a payment via TON policy engine",
            "Payment approved (if above threshold) or executed immediately",
            "Payout tx hash recorded in audit log",
        ],
        estimatedTime: "~5 minutes",
        tags: ["ton", "bounty", "agents", "payout", "fee"],
    },
    {
        id: "ton-agent-wallet-flow",
        name: "Agent Wallet Generation",
        icon: "🔑",
        description:
            "Generate a dedicated TON keypair for an agent, bind it to an agent profile, fund it from the org treasury, and enable autonomous agent payments.",
        steps: [
            "Generate Ed25519 keypair (server-side, never leaves your infrastructure)",
            "Encrypt private key with org-scoped AES-256-GCM key",
            "Store encrypted key in Swarm secrets vault",
            "Record public key and TON address in agent profile",
            "Fund agent wallet from org treasury via policy-gated payment",
            "Agent wallet is now ready to sign transactions autonomously",
        ],
        estimatedTime: "~1 minute",
        tags: ["ton", "agents", "wallet", "keygen", "autonomous"],
    },
    {
        id: "ton-treasury-setup",
        name: "Treasury Setup",
        icon: "🏛️",
        description:
            "Bootstrap a TON org treasury: bind wallet, set spending policy, configure approval thresholds, and add trusted agent wallets to the allowlist.",
        steps: [
            "Connect org TON wallet via TON Connect",
            "Verify ownership with ton_proof",
            "Set per-tx cap and daily spend limit",
            "Configure approval threshold (payments above this require human sign-off)",
            "Add trusted destination addresses to allowlist",
            "Add agent wallets authorized to initiate payments",
            "Enable or disable the kill switch",
            "Verify policy is active in Policies tab",
        ],
        estimatedTime: "~3 minutes",
        tags: ["ton", "treasury", "policy", "setup", "org"],
    },

    // ── Deployment Workflows ─────────────────────────────────

    {
        id: "ton-deploy-jetton-flow",
        name: "Deploy Jetton Token",
        icon: "🪙",
        description:
            "End-to-end Jetton deployment: configure token params, compile TEP-74 master contract, deploy on-chain, verify via TON Center, and distribute initial supply.",
        steps: [
            "Connect TON wallet and verify ownership",
            "Configure token: name, symbol, decimals, total supply",
            "Upload off-chain metadata JSON (name, symbol, image, description)",
            "Set mintable flag and admin address",
            "Estimate deployment gas cost (~0.2 TON)",
            "Check deployment against org spending policy",
            "Compile and deploy Jetton master contract",
            "Wait for on-chain confirmation and record contract address",
            "Verify Jetton metadata via TON Center API",
            "Distribute initial supply to designated wallets",
            "Log deployment in audit trail",
        ],
        estimatedTime: "~2 minutes",
        tags: ["ton", "jetton", "deploy", "token", "tep-74"],
    },
    {
        id: "ton-deploy-nft-collection-flow",
        name: "Deploy NFT Collection",
        icon: "🎨",
        description:
            "Deploy a TEP-62 NFT collection on TON: set collection metadata, royalties, max supply, then batch-mint initial items.",
        steps: [
            "Connect TON wallet and verify ownership",
            "Configure collection: name, description, image",
            "Upload collection metadata to IPFS or Storacha",
            "Set royalty percentage and recipient address",
            "Set max supply (0 for unlimited)",
            "Estimate deployment gas cost (~0.15 TON)",
            "Deploy NFT collection contract on-chain",
            "Record collection contract address",
            "Optionally batch-mint initial NFT items",
            "Verify collection on TON Center / Getgems",
            "Log deployment in audit trail",
        ],
        estimatedTime: "~3 minutes",
        tags: ["ton", "nft", "deploy", "collection", "tep-62"],
    },
    {
        id: "ton-deploy-sbt-flow",
        name: "Deploy Soulbound Tokens",
        icon: "🪪",
        description:
            "Deploy TEP-85 non-transferable SBTs for agent credentials, org membership, or achievement badges. Includes authority setup for revocation.",
        steps: [
            "Connect TON wallet and verify ownership",
            "Configure SBT: name, description, metadata URI",
            "Set authority address (can revoke SBTs)",
            "Choose if SBTs are revocable or permanent",
            "Estimate deployment gas cost (~0.1 TON)",
            "Deploy SBT collection contract",
            "Mint SBT to recipient address",
            "Verify SBT is non-transferable on-chain",
            "Log deployment in audit trail",
        ],
        estimatedTime: "~2 minutes",
        tags: ["ton", "sbt", "deploy", "soulbound", "tep-85", "credentials"],
    },
    {
        id: "ton-deploy-smart-contract-flow",
        name: "Deploy Smart Contract",
        icon: "📜",
        description:
            "Full lifecycle for deploying a custom FunC/Tact smart contract: write or upload code, compile to BOC, deploy, and verify on-chain.",
        steps: [
            "Connect TON wallet and verify ownership",
            "Write contract in Tact or FunC (or upload pre-compiled BOC)",
            "Define constructor/init parameters",
            "Compile contract to BOC (Bag of Cells)",
            "Estimate deployment gas cost",
            "Check deployment cost against spending policy",
            "Sign and broadcast deploy transaction via TON Connect",
            "Wait for on-chain confirmation",
            "Record contract address and tx hash",
            "Verify contract state via TON Center API",
            "Log deployment in audit trail",
        ],
        estimatedTime: "~3 minutes",
        tags: ["ton", "smart-contract", "deploy", "func", "tact", "boc"],
    },
    {
        id: "ton-deploy-dex-pool-flow",
        name: "Create DEX Liquidity Pool",
        icon: "💧",
        description:
            "Deploy a liquidity pool on DeDust or STON.fi: select token pair, provide initial liquidity, configure pool type, and receive LP tokens.",
        steps: [
            "Connect TON wallet and verify ownership",
            "Select DEX platform (DeDust or STON.fi)",
            "Choose token pair (TON/Jetton or Jetton/Jetton)",
            "Set initial liquidity amounts for both tokens",
            "Choose pool type (volatile or stable)",
            "Approve token spending for the DEX router",
            "Create pool and provide initial liquidity",
            "Receive LP tokens representing pool share",
            "Verify pool on DEX frontend",
            "Log deployment in audit trail",
        ],
        estimatedTime: "~5 minutes",
        tags: ["ton", "dex", "deploy", "liquidity", "dedust", "stonfi"],
    },
    {
        id: "ton-deploy-nft-mint-batch-flow",
        name: "Batch Mint NFTs",
        icon: "🖼️",
        description:
            "Mint multiple NFT items into an existing collection. Upload metadata, specify owners, and batch-deploy in a single workflow.",
        steps: [
            "Connect TON wallet and verify ownership",
            "Select target NFT collection contract",
            "Prepare item metadata URIs (JSON with name, image, attributes)",
            "Specify owner address for each item (or use default)",
            "Estimate total gas cost (items × ~0.05 TON)",
            "Check total cost against spending policy",
            "Batch-mint items with sequential indices",
            "Wait for all on-chain confirmations",
            "Record minted item addresses",
            "Log deployment in audit trail",
        ],
        estimatedTime: "~5 minutes",
        tags: ["ton", "nft", "deploy", "mint", "batch"],
    },
];

// ═══════════════════════════════════════════════════════════════
// Agent Skills
// ═══════════════════════════════════════════════════════════════

export const TON_AGENT_SKILLS: ModAgentSkill[] = [
    {
        id: "ton.balance",
        name: "Check TON Balance",
        type: "skill",
        description: "Check Toncoin balance for a TON wallet address.",
        invocation: "ton.balance({ address })",
        exampleInput: '{ "address": "EQD..." }',
        exampleOutput: '{ "balanceTon": "12.5", "balanceNano": "12500000000" }',
    },
    {
        id: "ton.pay",
        name: "Send Toncoin",
        type: "skill",
        description: "Initiate a Toncoin payment from an org treasury wallet. Policy-checked; may return pending_approval.",
        invocation: "ton.pay({ orgId, toAddress, amountNano, memo })",
        exampleInput: '{ "orgId": "org_abc", "toAddress": "EQA...", "amountNano": "1000000000", "memo": "Bounty #42" }',
        exampleOutput: '{ "paymentId": "pay_xyz", "status": "pending_approval" }',
    },
    {
        id: "ton.verify",
        name: "Verify Wallet Proof",
        type: "skill",
        description: "Verify a ton_proof to cryptographically confirm wallet ownership without a transaction.",
        invocation: "ton.verify({ address, proof, domain })",
        exampleInput: '{ "address": "EQD...", "proof": { "timestamp": 1700000000, "signature": "base64..." }, "domain": "swarmprotocol.fun" }',
        exampleOutput: '{ "valid": true, "address": "EQD..." }',
    },
    {
        id: "ton.subscribe",
        name: "Create Subscription",
        type: "skill",
        description: "Create a recurring Toncoin payment subscription for an agent service.",
        invocation: "ton.subscribe({ orgId, toAddress, amountNano, frequency, maxCycles })",
        exampleInput: '{ "orgId": "org_abc", "toAddress": "EQA...", "amountNano": "500000000", "frequency": "monthly", "maxCycles": 6 }',
        exampleOutput: '{ "subscriptionId": "sub_123", "status": "active", "nextPaymentAt": "2026-04-28T00:00:00Z" }',
    },
    {
        id: "ton.policy.check",
        name: "Check Spending Policy",
        type: "skill",
        description: "Check whether a proposed payment passes the active org spending policy.",
        invocation: "ton.policy.check({ orgId, toAddress, amountNano })",
        exampleInput: '{ "orgId": "org_abc", "toAddress": "EQA...", "amountNano": "3000000000" }',
        exampleOutput: '{ "allowed": true, "requiresApproval": false, "remainingDailyNano": "17000000000" }',
    },
    {
        id: "ton.jettons",
        name: "List Jetton Balances",
        type: "skill",
        description: "Fetch all Jetton token balances for a TON wallet.",
        invocation: "ton.jettons({ address })",
        exampleInput: '{ "address": "EQD..." }',
        exampleOutput: '{ "jettons": [{ "symbol": "USDT", "balance": "250.00", "address": "EQC..." }] }',
    },
    {
        id: "ton.bounty.post",
        name: "Post Task Bounty",
        type: "skill",
        description: "Post a new task bounty in TON. Returns bounty ID for tracking.",
        invocation: "ton.bounty.post({ orgId, title, description, amountNano, funderAddress, postedBy })",
        exampleInput: '{ "orgId": "org_abc", "title": "Analyze market data", "amountNano": "5000000000", "funderAddress": "EQD...", "postedBy": "0xabc" }',
        exampleOutput: '{ "bountyId": "bnt_xyz", "status": "open" }',
    },
    {
        id: "ton.bounty.claim",
        name: "Claim Bounty",
        type: "skill",
        description: "Claim an open bounty as an agent.",
        invocation: "ton.bounty.claim({ orgId, bountyId, claimerAddress, claimerAgentId? })",
        exampleInput: '{ "orgId": "org_abc", "bountyId": "bnt_xyz", "claimerAddress": "EQA..." }',
        exampleOutput: '{ "status": "claimed" }',
    },
    {
        id: "ton.wallet.generate",
        name: "Generate Agent Wallet",
        type: "skill",
        description: "Generate a new TON Ed25519 wallet for an agent with encrypted key storage.",
        invocation: "ton.wallet.generate({ orgId, label, agentId?, createdBy })",
        exampleInput: '{ "orgId": "org_abc", "label": "Research Agent #1", "createdBy": "0xabc" }',
        exampleOutput: '{ "address": "0:abcdef...", "publicKey": "hex...", "privateKeyHex": "hex..." }',
    },
    {
        id: "ton.simulate",
        name: "Simulate Payment",
        type: "skill",
        description: "Dry-run a payment through policy without creating records.",
        invocation: "ton.simulate({ orgId, toAddress, amountNano })",
        exampleInput: '{ "orgId": "org_abc", "toAddress": "EQA...", "amountNano": "3000000000" }',
        exampleOutput: '{ "allowed": true, "requiresApproval": false, "reason": "Within policy limits" }',
    },
    {
        id: "ton.resolve",
        name: "Resolve TON DNS",
        type: "skill",
        description: "Resolve a .ton domain name to a raw TON address.",
        invocation: "ton.resolve({ name })",
        exampleInput: '{ "name": "myagent.ton" }',
        exampleOutput: '{ "resolved": true, "address": "0:abcdef..." }',
    },
    {
        id: "ton.history",
        name: "Transaction History",
        type: "skill",
        description: "Fetch on-chain transaction history for a TON address.",
        invocation: "ton.history({ address, limit? })",
        exampleInput: '{ "address": "EQD...", "limit": 10 }',
        exampleOutput: '{ "transactions": [{ "hash": "abc", "direction": "out", "amountTon": "1.0" }] }',
    },

    // ── Deployment Skills ────────────────────────────────────

    {
        id: "ton.deploy.contract",
        name: "Deploy Smart Contract",
        type: "skill",
        description: "Deploy a custom FunC/Tact smart contract to TON. Accepts source code or pre-compiled BOC.",
        invocation: "ton.deploy.contract({ orgId, name, deployerAddress, network, language, sourceCode, initParams })",
        exampleInput: '{ "orgId": "org_abc", "name": "MyContract", "deployerAddress": "EQD...", "network": "mainnet", "language": "tact", "sourceCode": "contract MyContract { ... }", "initParams": "{}" }',
        exampleOutput: '{ "deploymentId": "dep_xyz", "status": "deploying", "estimatedCostNano": "100000000" }',
    },
    {
        id: "ton.deploy.jetton",
        name: "Deploy Jetton Token",
        type: "skill",
        description: "Deploy a TEP-74 Jetton (fungible token) on TON with custom name, symbol, supply, and metadata.",
        invocation: "ton.deploy.jetton({ orgId, deployerAddress, network, tokenName, tokenSymbol, decimals, totalSupply, metadataUri, mintable, adminAddress })",
        exampleInput: '{ "orgId": "org_abc", "deployerAddress": "EQD...", "network": "mainnet", "tokenName": "Swarm Token", "tokenSymbol": "SWARM", "decimals": 9, "totalSupply": "1000000000000000000", "metadataUri": "https://...", "mintable": true, "adminAddress": "EQD..." }',
        exampleOutput: '{ "deploymentId": "dep_xyz", "status": "deploying", "estimatedCostNano": "200000000" }',
    },
    {
        id: "ton.deploy.nft_collection",
        name: "Deploy NFT Collection",
        type: "skill",
        description: "Deploy a TEP-62 NFT collection contract on TON with royalties and max supply.",
        invocation: "ton.deploy.nft_collection({ orgId, deployerAddress, network, collectionName, metadataUri, maxSupply, royaltyPercent, royaltyAddress, ownerAddress })",
        exampleInput: '{ "orgId": "org_abc", "deployerAddress": "EQD...", "network": "mainnet", "collectionName": "Agent Passes", "metadataUri": "https://...", "maxSupply": 10000, "royaltyPercent": 5, "royaltyAddress": "EQD...", "ownerAddress": "EQD..." }',
        exampleOutput: '{ "deploymentId": "dep_xyz", "status": "deploying", "estimatedCostNano": "150000000" }',
    },
    {
        id: "ton.deploy.nft_item",
        name: "Mint NFT Item",
        type: "skill",
        description: "Mint a single NFT item into an existing TEP-62 collection.",
        invocation: "ton.deploy.nft_item({ orgId, deployerAddress, network, collectionAddress, itemIndex, metadataUri, ownerAddress })",
        exampleInput: '{ "orgId": "org_abc", "deployerAddress": "EQD...", "network": "mainnet", "collectionAddress": "EQC...", "itemIndex": 42, "metadataUri": "https://...", "ownerAddress": "EQA..." }',
        exampleOutput: '{ "deploymentId": "dep_xyz", "status": "deploying", "estimatedCostNano": "50000000" }',
    },
    {
        id: "ton.deploy.sbt",
        name: "Deploy SBT",
        type: "skill",
        description: "Deploy a TEP-85 Soulbound Token (non-transferable) for credentials, identity, or achievements.",
        invocation: "ton.deploy.sbt({ orgId, deployerAddress, network, collectionName, metadataUri, authorityAddress, ownerAddress, revocable })",
        exampleInput: '{ "orgId": "org_abc", "deployerAddress": "EQD...", "network": "mainnet", "collectionName": "Agent Credentials", "metadataUri": "https://...", "authorityAddress": "EQD...", "ownerAddress": "EQA...", "revocable": true }',
        exampleOutput: '{ "deploymentId": "dep_xyz", "status": "deploying", "estimatedCostNano": "100000000" }',
    },
    {
        id: "ton.deploy.dex_pool",
        name: "Create DEX Pool",
        type: "skill",
        description: "Deploy a liquidity pool on DeDust or STON.fi with initial liquidity.",
        invocation: "ton.deploy.dex_pool({ orgId, deployerAddress, network, platform, tokenAAddress, tokenBAddress, tokenAAmount, tokenBAmount, poolType })",
        exampleInput: '{ "orgId": "org_abc", "deployerAddress": "EQD...", "network": "mainnet", "platform": "dedust", "tokenAAddress": "native", "tokenBAddress": "EQC...", "tokenAAmount": "10000000000", "tokenBAmount": "100000000000000", "poolType": "volatile" }',
        exampleOutput: '{ "deploymentId": "dep_xyz", "status": "deploying", "estimatedCostNano": "500000000" }',
    },
    {
        id: "ton.deploy.status",
        name: "Check Deploy Status",
        type: "skill",
        description: "Check the status of a deployment. Returns current status, contract address (if deployed), and tx hash.",
        invocation: "ton.deploy.status({ orgId, deploymentId })",
        exampleInput: '{ "orgId": "org_abc", "deploymentId": "dep_xyz" }',
        exampleOutput: '{ "status": "deployed", "contractAddress": "EQC...", "txHash": "abc123...", "actualCostNano": "180000000" }',
    },
    {
        id: "ton.deploy.list",
        name: "List Deployments",
        type: "skill",
        description: "List all deployments for an org, optionally filtered by type.",
        invocation: "ton.deploy.list({ orgId, type?, limit? })",
        exampleInput: '{ "orgId": "org_abc", "type": "jetton", "limit": 10 }',
        exampleOutput: '{ "deployments": [{ "id": "dep_xyz", "type": "jetton", "name": "Swarm Token", "status": "deployed" }] }',
    },
];

// ═══════════════════════════════════════════════════════════════
// Examples
// ═══════════════════════════════════════════════════════════════

export const TON_EXAMPLES: ModExample[] = [
    {
        id: "ton-proof-verify",
        name: "Verify Wallet Ownership",
        icon: "ShieldCheck",
        description: "Server-side ton_proof verification to cryptographically bind a TON wallet to a Swarm session.",
        language: "typescript",
        tags: ["ton", "auth", "ton-connect", "proof"],
        codeSnippet: `import { createHash } from "crypto";
import nacl from "tweetnacl";

interface TonProof {
  timestamp: number;
  domain: { lengthBytes: number; value: string };
  signature: string; // base64
  payload: string;
  stateInit: string;
}

function buildTonProofMessage(address: string, domain: string, timestamp: number, payload: string): Buffer {
  const wc = Buffer.allocUnsafe(4);
  wc.writeInt32BE(0, 0); // workchain 0
  const addrHash = Buffer.from(address.slice(-64), "hex");

  const domainBuf = Buffer.from(domain, "utf8");
  const domainLen = Buffer.allocUnsafe(4);
  domainLen.writeUInt32LE(domainBuf.length, 0);

  const tsBuf = Buffer.allocUnsafe(8);
  tsBuf.writeBigUInt64LE(BigInt(timestamp), 0);

  const payloadBuf = Buffer.from(payload, "utf8");

  const message = Buffer.concat([
    Buffer.from("ton-proof-item-v2/", "utf8"),
    wc,
    addrHash,
    domainLen,
    domainBuf,
    tsBuf,
    payloadBuf,
  ]);

  const msgHash = createHash("sha256").update(message).digest();
  const tonConnectPrefix = createHash("sha256").update(Buffer.from("ton-connect", "utf8")).digest();

  return createHash("sha256").update(
    Buffer.concat([Buffer.from([0xff, 0xff]), tonConnectPrefix, msgHash])
  ).digest();
}

export function verifyTonProof(proof: TonProof, address: string, publicKey: string): boolean {
  const msg = buildTonProofMessage(address, proof.domain.value, proof.timestamp, proof.payload);
  const sig = Buffer.from(proof.signature, "base64");
  const pubkey = Buffer.from(publicKey, "hex");
  return nacl.sign.detached.verify(msg, sig, pubkey);
}`,
    },
    {
        id: "ton-read-balance",
        name: "Read TON + Jetton Balances",
        icon: "Eye",
        description: "Fetch Toncoin balance and all Jetton holdings for a wallet via TON Center API v3.",
        language: "typescript",
        tags: ["ton", "balance", "jettons", "toncenter"],
        codeSnippet: `const TON_CENTER_BASE = "https://toncenter.com/api/v3";
const headers = { "X-API-Key": process.env.TON_CENTER_API_KEY! };

export async function getTonBalance(address: string): Promise<{ ton: number }> {
  const res = await fetch(\`\${TON_CENTER_BASE}/account?address=\${encodeURIComponent(address)}\`, { headers });
  const data = await res.json();
  return { ton: Number(data.balance) / 1e9 };
}

export async function getJettonBalances(address: string) {
  const res = await fetch(
    \`\${TON_CENTER_BASE}/jetton/wallets?owner_address=\${encodeURIComponent(address)}&limit=50\`,
    { headers }
  );
  const data = await res.json();
  return (data.jetton_wallets || []).map((jw: {
    jetton: { symbol: string; name: string; decimals: number; address: string };
    balance: string;
  }) => ({
    symbol: jw.jetton.symbol,
    name: jw.jetton.name,
    balance: (Number(jw.balance) / Math.pow(10, jw.jetton.decimals)).toFixed(jw.jetton.decimals),
    contractAddress: jw.jetton.address,
  }));
}`,
    },
    {
        id: "ton-payment-flow",
        name: "Policy-Gated Payment",
        icon: "Send",
        description: "Create a policy-checked Toncoin payment. Automatically routes to approval queue if above threshold.",
        language: "typescript",
        tags: ["ton", "payments", "policy", "approvals"],
        codeSnippet: `// POST /api/v1/ton/payments
export async function createTonPayment(orgId: string, opts: {
  fromAddress: string;
  toAddress: string;
  amountNano: string; // nanoTON as string to avoid BigInt serialization issues
  memo?: string;
}) {
  const res = await fetch("/api/v1/ton/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId, ...opts }),
  });
  const payment = await res.json();

  if (payment.status === "pending_approval") {
    console.log("Payment queued for human approval:", payment.id);
    // Watch approvals dashboard or subscribe to webhook
  } else if (payment.status === "ready") {
    console.log("Payment ready — sign and broadcast:", payment.id);
    // Use TON Connect to sign: connector.sendTransaction({ to, amount, payload })
  }
  return payment;
}`,
    },
    {
        id: "ton-deploy-jetton-example",
        name: "Deploy Jetton Token",
        icon: "Coins",
        description: "Deploy a TEP-74 Jetton master contract on TON with metadata and initial supply distribution.",
        language: "typescript",
        tags: ["ton", "deploy", "jetton", "tep-74", "token"],
        codeSnippet: `import { Address, beginCell, toNano } from "@ton/core";
import { TonClient } from "@ton/ton";

// Jetton metadata — host this JSON at a public URL
const jettonMetadata = {
  name: "Swarm Token",
  symbol: "SWARM",
  decimals: "9",
  image: "https://swarmprotocol.fun/token-icon.png",
  description: "Utility token for the Swarm agent network",
};

// Build on-chain content cell (Snake format for off-chain metadata)
function buildJettonMetadataCell(uri: string) {
  return beginCell()
    .storeUint(0x01, 8) // off-chain tag
    .storeStringTail(uri)
    .endCell();
}

// Deploy via Swarm API
async function deployJetton(orgId: string, deployerAddress: string) {
  const res = await fetch("/api/v1/ton/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orgId,
      type: "jetton",
      name: "Swarm Token",
      description: "SWARM utility token deployment",
      deployerAddress,
      network: "mainnet",
      config: {
        type: "jetton",
        tokenName: "Swarm Token",
        tokenSymbol: "SWARM",
        decimals: 9,
        totalSupply: "1000000000000000000", // 1B with 9 decimals
        metadataUri: "https://swarmprotocol.fun/jetton.json",
        mintable: true,
        adminAddress: deployerAddress,
      },
    }),
  });
  return res.json();
}`,
    },
    {
        id: "ton-deploy-nft-example",
        name: "Deploy NFT Collection + Mint",
        icon: "Image",
        description: "Deploy an NFT collection on TON and mint items with royalties and off-chain metadata.",
        language: "typescript",
        tags: ["ton", "deploy", "nft", "tep-62", "collection", "mint"],
        codeSnippet: `// Step 1: Deploy the collection
async function deployNftCollection(orgId: string, deployerAddress: string) {
  const res = await fetch("/api/v1/ton/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orgId,
      type: "nft_collection",
      name: "Swarm Agent Passes",
      description: "Agent access pass NFT collection",
      deployerAddress,
      network: "mainnet",
      config: {
        type: "nft_collection",
        collectionName: "Swarm Agent Passes",
        metadataUri: "https://swarmprotocol.fun/collection.json",
        maxSupply: 10000,
        royaltyPercent: 5,
        royaltyAddress: deployerAddress,
        ownerAddress: deployerAddress,
      },
    }),
  });
  return res.json(); // { deploymentId, contractAddress (after deploy) }
}

// Step 2: Mint an item into the deployed collection
async function mintNftItem(
  orgId: string, deployerAddress: string,
  collectionAddress: string, itemIndex: number, ownerAddress: string,
) {
  const res = await fetch("/api/v1/ton/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orgId,
      type: "nft_item",
      name: \`Agent Pass #\${itemIndex}\`,
      description: "Mint agent pass NFT",
      deployerAddress,
      network: "mainnet",
      config: {
        type: "nft_item",
        collectionAddress,
        itemIndex,
        metadataUri: \`https://swarmprotocol.fun/nft/\${itemIndex}.json\`,
        ownerAddress,
      },
    }),
  });
  return res.json();
}`,
    },
    {
        id: "ton-deploy-dex-pool-example",
        name: "Create DEX Liquidity Pool",
        icon: "ArrowLeftRight",
        description: "Create a liquidity pool on DeDust or STON.fi and provide initial liquidity for a token pair.",
        language: "typescript",
        tags: ["ton", "deploy", "dex", "dedust", "stonfi", "liquidity"],
        codeSnippet: `// Deploy a TON/SWARM liquidity pool on DeDust
async function createDexPool(orgId: string, deployerAddress: string) {
  const res = await fetch("/api/v1/ton/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orgId,
      type: "dex_pool",
      name: "SWARM/TON Pool",
      description: "Initial liquidity pool for SWARM token",
      deployerAddress,
      network: "mainnet",
      config: {
        type: "dex_pool",
        platform: "dedust",
        tokenAAddress: "native", // TON
        tokenBAddress: "EQC...", // SWARM Jetton master
        tokenAAmount: "10000000000",     // 10 TON
        tokenBAmount: "100000000000000", // 100k SWARM
        poolType: "volatile",
      },
    }),
  });
  return res.json();
}

// Check deployment status
async function checkDeployStatus(orgId: string, deploymentId: string) {
  const res = await fetch(
    \`/api/v1/ton/deploy?orgId=\${orgId}&id=\${deploymentId}\`
  );
  const data = await res.json();
  console.log("Status:", data.deployment.status);
  console.log("Contract:", data.deployment.contractAddress);
  return data;
}`,
    },
    {
        id: "ton-tma-init",
        name: "Telegram Mini App Bootstrap",
        icon: "Smartphone",
        description: "Initialize TON Connect inside a Telegram Mini App and read user identity from initData.",
        language: "typescript",
        tags: ["ton", "telegram", "tma", "tonconnect"],
        codeSnippet: `import WebApp from "@twa-dev/sdk";
import TonConnect from "@tonconnect/sdk";

// Must be called before any WebApp access
WebApp.ready();
WebApp.expand();

// TON Connect — auto-detects Telegram wallet bridge inside TMA
const connector = new TonConnect({
  manifestUrl: "https://app.swarmprotocol.fun/.well-known/tonconnect-manifest.json",
});

connector.onStatusChange((wallet) => {
  if (wallet) {
    console.log("Wallet connected:", wallet.account.address);
    // Verify ownership: send wallet.connectItems?.tonProof to /api/v1/ton/verify
  }
});

// The Telegram user identity (no wallet needed)
const tgUser = WebApp.initDataUnsafe?.user;
console.log("TG User:", tgUser?.id, tgUser?.username);

// Connect — inside TMA, telegram-wallet bridge is auto-available
await connector.connect({ jsBridgeKey: "telegram-wallet" });`,
    },
];

// ═══════════════════════════════════════════════════════════════
// Manifest
// ═══════════════════════════════════════════════════════════════

export const TON_MANIFEST: ModManifest = {
    tools: TON_TOOLS,
    workflows: TON_WORKFLOWS,
    examples: TON_EXAMPLES,
    agentSkills: TON_AGENT_SKILLS,
};
