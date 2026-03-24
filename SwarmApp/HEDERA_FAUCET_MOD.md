# Hedera Testnet Faucet Mod

**Built for Hedera Hackathon 2026** — Makes it easy for judges and users to get testnet HBAR without leaving the Swarm platform.

---

## Overview

The Hedera Testnet Faucet mod allows users to request free testnet HBAR directly from within the Swarm platform. This eliminates the need to visit external faucets and streamlines the onboarding process for new users and hackathon judges.

### Key Features

- ✅ **100 HBAR per request** — Sufficient for testing agent operations
- ✅ **Instant delivery** — Transactions complete in 3-5 seconds
- ✅ **24-hour cooldown** — Fair distribution, prevents abuse
- ✅ **Rate limiting** — One request per wallet per 24 hours
- ✅ **Transaction tracking** — View all requests on HashScan testnet explorer
- ✅ **Wallet authentication** — Prevents spam and bot abuse
- ✅ **Fallback support** — Links to official Hedera faucet when platform faucet is unavailable

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface                          │
│                                                             │
│  [FaucetPanel.tsx]                                         │
│  • Wallet connection check                                 │
│  • Hedera account ID input                                 │
│  • Request submission                                      │
│  • Transaction status display                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ POST /api/mods/hedera-faucet/request
                  ↓
┌─────────────────────────────────────────────────────────────┐
│                     API Route                               │
│                                                             │
│  [request/route.ts]                                        │
│  • Validate wallet + Hedera account ID                     │
│  • Check cooldown (24h per wallet)                         │
│  • Create transfer transaction                             │
│  • Record request in Firestore                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Transfer 100 HBAR
                  ↓
┌─────────────────────────────────────────────────────────────┐
│                  Hedera Testnet                             │
│                                                             │
│  • Faucet account (funded by platform)                     │
│  • User account (receives testnet HBAR)                    │
│  • Mirror Node (tracks transaction history)                │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

Add these to your `.env.local`:

```bash
# Hedera Faucet Configuration (OPTIONAL)
HEDERA_FAUCET_ACCOUNT_ID=0.0.xxxx      # Platform faucet account on testnet
HEDERA_FAUCET_PRIVATE_KEY=302e...      # Private key for faucet account
```

**Note**: If these variables are not set, the faucet will gracefully degrade and redirect users to the official Hedera faucet at `https://portal.hedera.com/faucet`.

### Funding the Faucet

1. **Create a Hedera testnet account** at [portal.hedera.com](https://portal.hedera.com)
2. **Fund it with testnet HBAR** from the [official faucet](https://portal.hedera.com/faucet)
3. **Add credentials to `.env.local`** (see above)
4. **Restart the platform** — the faucet will now distribute HBAR

**Recommended balance**: 10,000+ testnet HBAR (supports 100 requests)

---

## Usage

### For Users

1. **Navigate to the faucet**: [https://swarmprotocol.fun/mods/hedera-faucet](https://swarmprotocol.fun/mods/hedera-faucet)
2. **Connect your wallet** — Authenticate with MetaMask or any web3 wallet
3. **Enter your Hedera account ID** — Format: `0.0.xxxx` (find this in Hedera portal)
4. **Click "Request 100 HBAR"** — Testnet HBAR arrives in 3-5 seconds
5. **View transaction** — Click the HashScan link to see the transaction on-chain

### Rate Limits

- **Per wallet**: 1 request every 24 hours
- **Amount**: 100 HBAR per request
- **Network**: Hedera Testnet only

### Cooldown Logic

```typescript
// Firestore: faucetRequests collection
{
  wallet: "0x123...",
  accountId: "0.0.1234567",
  requestedAt: "2026-03-23T10:00:00Z",
  amountHbar: 100,
  status: "completed",
  txHash: "0.0.12345@1234567890.123456789"
}

// Next request allowed at: requestedAt + 24 hours
```

---

## API Reference

### POST `/api/mods/hedera-faucet/request`

**Request Body**:
```json
{
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "accountId": "0.0.1234567"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "amount": 100,
  "currency": "HBAR",
  "txHash": "0.0.12345@1234567890.123456789",
  "explorerUrl": "https://hashscan.io/testnet/transaction/0.0.12345@1234567890.123456789",
  "message": "Successfully sent 100 HBAR to 0.0.1234567",
  "nextRequestAvailable": "2026-03-24T10:00:00Z"
}
```

**Cooldown Response** (429):
```json
{
  "error": "Cooldown active",
  "message": "You can request testnet HBAR again in 8 hours",
  "hoursRemaining": 8
}
```

**Faucet Not Configured** (503):
```json
{
  "error": "Faucet not configured",
  "message": "Platform faucet is not yet configured. Please use the official Hedera faucet.",
  "officialFaucet": "https://portal.hedera.com/faucet"
}
```

---

## Firestore Schema

### Collection: `faucetRequests`

```typescript
interface FaucetRequest {
  wallet: string;              // Ethereum wallet address
  accountId: string;           // Hedera account ID (0.0.xxxx)
  requestedAt: string;         // ISO timestamp
  amountHbar: number;          // Amount transferred (100)
  status: "pending" | "completed" | "failed";
  txHash?: string;             // Hedera transaction ID
  errorMessage?: string;       // Error if failed
}
```

**Indexes**:
- `wallet` + `status` + `requestedAt` (for cooldown checks)

---

## Hackathon Value

### Why This Matters for Judges

1. **Zero friction** — Judges can get testnet HBAR without leaving the platform
2. **No external accounts** — Don't need to create a Hedera portal account
3. **Instant testing** — Start testing agent operations in seconds
4. **Professional UX** — Demonstrates full-stack Hedera integration

### Ecosystem Impact

- **Onboarding**: Reduces user drop-off during setup
- **Developer experience**: Makes testnet HBAR accessible to all users
- **Hedera adoption**: Showcases HBAR utility and Hedera SDK integration
- **Hackathon readiness**: Judges can test the full platform immediately

---

## Security

### Rate Limiting

- ✅ **Wallet-based cooldown** — Prevents spam from a single wallet
- ✅ **Firestore tracking** — All requests logged for audit
- ✅ **Transaction confirmation** — Verifies on-chain success before marking complete

### Future Enhancements

- [ ] IP-based rate limiting (prevent multiple wallets from same IP)
- [ ] Captcha integration (prevent bot abuse)
- [ ] Whitelist mode (restrict to verified users during high demand)
- [ ] Dynamic amounts (adjust based on platform balance)

---

## Publishing to Marketplace

Run the publish script:

```bash
cd SwarmApp
npx tsx scripts/publish-hedera-faucet-mod.ts
```

This publishes the mod to the Swarm marketplace as a **free, auto-approved** mod under the "Developer Tools" category.

---

## Testing

### Manual Test Flow

1. **Connect wallet** — Use MetaMask with a testnet account
2. **Enter Hedera account ID** — Use a valid testnet account (0.0.xxxx)
3. **Request HBAR** — Should complete in 3-5 seconds
4. **Verify on HashScan** — Check that transaction appears on testnet explorer
5. **Test cooldown** — Try requesting again (should fail with 429 error)
6. **Test unconfigured fallback** — Remove env vars, verify graceful degradation

### Automated Tests (TODO)

```typescript
describe("Hedera Faucet API", () => {
  it("should transfer HBAR to valid account", async () => {
    // Test successful transfer
  });

  it("should enforce 24h cooldown", async () => {
    // Test cooldown logic
  });

  it("should reject invalid account IDs", async () => {
    // Test validation
  });

  it("should handle faucet balance depletion", async () => {
    // Test insufficient balance scenario
  });
});
```

---

## Maintenance

### Monitoring

Check faucet health:
- **Platform balance**: Visit [HashScan](https://hashscan.io/testnet) and search for faucet account ID
- **Request logs**: Query Firestore `faucetRequests` collection
- **Failed requests**: Filter by `status: "failed"` to see errors

### Refilling the Faucet

When the faucet balance is low:
1. Visit [https://portal.hedera.com/faucet](https://portal.hedera.com/faucet)
2. Request 10,000 testnet HBAR to the faucet account
3. Confirm balance on HashScan
4. Resume normal operation

---

## Future Improvements

- [ ] **Tiered amounts** — Give more HBAR to verified users
- [ ] **Leaderboard** — Show top users by testnet HBAR received
- [ ] **Mainnet support** — Micro-faucet for mainnet HBAR (requires funding)
- [ ] **Faucet analytics** — Dashboard showing requests per day, total distributed
- [ ] **Social auth** — Allow Twitter/Discord auth for additional requests

---

## License

MIT License — Free to use, modify, and distribute.

---

**Built with 💚 on Hedera Hashgraph**
