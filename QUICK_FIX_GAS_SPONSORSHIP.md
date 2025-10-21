# Quick Fix: Gas Sponsorship Error

## The Error You're Seeing

```
UserOperationExecutionError: HTTP request failed.
Details: {"code":-32601,"message":"method must be one of the following values: pm_sponsorUserOperation..."}
```

## Why This Happens

Privy's `SmartWalletsProvider` requires gas sponsorship to be configured in the Privy Dashboard. Without proper configuration, transactions fail when trying to estimate gas.

## Quick Solutions

### Option 1: Use Pimlico Paymaster (Fastest - 5 minutes)

This uses your existing Pimlico setup that's already in the codebase.

#### Step 1: Get Pimlico API Key

1. Go to [https://pimlico.io](https://pimlico.io)
2. Sign up / Log in
3. Create a new project
4. Copy your API key

#### Step 2: Add Environment Variable

Create or update `frontend/.env.local`:

```bash
NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_api_key_here
```

#### Step 3: Switch to Pimlico Hook

Edit `frontend/src/hooks/bucket-manager/useCreateBucketSponsored.ts`:

**Replace the import at the top:**
```typescript
// OLD:
import { useSmartWallet } from '@/hooks/useSmartWallet';

// NEW:
import { useSmartAccount } from '@/context/SmartAccountContext';
```

**Replace the hook usage:**
```typescript
// OLD:
const { client, isReady } = useSmartWallet();

// NEW:
const { smartAccountClient, smartAccountReady } = useSmartAccount();
const client = smartAccountClient;
const isReady = smartAccountReady;
```

#### Step 4: Fund Pimlico Paymaster

1. Go to [Pimlico Dashboard](https://dashboard.pimlico.io)
2. Navigate to your project
3. Add funds to Base Sepolia paymaster
4. Set sponsorship policies (optional)

#### Step 5: Restart Dev Server

```bash
cd frontend
pnpm dev
```

✅ **Done!** Your transactions will now be sponsored via Pimlico.

---

### Option 2: Configure Privy Gas Sponsorship (Recommended for Production)

This is the proper long-term solution but takes more setup.

#### Step 1: Enable in Privy Dashboard

1. Go to [Privy Dashboard](https://dashboard.privy.io)
2. Select your app
3. Navigate to **Settings → Smart Wallets**
4. Enable "Smart Wallets" feature

#### Step 2: Configure Gas Sponsorship

1. Go to **Settings → Gas Sponsorship**
2. Enable gas sponsorship
3. Add **Base Sepolia** (Chain ID: 84532)
4. Set spending limits:
   - Per transaction: 0.001 ETH
   - Per user daily: 0.01 ETH
   - Total daily: 0.1 ETH

#### Step 3: Fund Sponsorship Wallet

1. Get Base Sepolia testnet ETH from faucet:
   - [Base Sepolia Faucet](https://faucet.quicknode.com/base/sepolia)
   - [Alchemy Faucet](https://www.alchemy.com/faucets/base-sepolia)
2. Send 0.1 ETH to your Privy sponsorship wallet address
3. Verify balance in Privy Dashboard

#### Step 4: Wait for Propagation

- Configuration changes may take 5-10 minutes to propagate
- Refresh your app after configuration is complete

✅ **Done!** Privy will now sponsor your transactions.

---

### Option 3: Use Pre-built Pimlico Hook (Alternative)

We've created an alternative hook that's ready to use:

#### Step 1: Import the Pimlico Hook

Edit `frontend/src/components/bucket-manager/CreateBucketManagerModal.tsx`:

```typescript
// Change the import:
// OLD:
import { useCreateBucketSponsored } from '@/hooks/bucket-manager/useCreateBucketSponsored';

// NEW:
import { useCreateBucketPimlico as useCreateBucketSponsored } from '@/hooks/bucket-manager/useCreateBucketPimlico';
```

#### Step 2: Add Pimlico API Key

```bash
# frontend/.env.local
NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_api_key
```

#### Step 3: Restart

```bash
cd frontend
pnpm dev
```

✅ **Done!** Now using Pimlico for gas sponsorship.

---

## Verification

After implementing any option:

1. **Open browser console**
2. **Try creating a bucket**
3. **Check for successful transaction**
4. **Verify in block explorer:**
   - Go to [Base Sepolia Scan](https://sepolia.basescan.org/)
   - Search for your transaction hash
   - Check that gas was sponsored (sender pays 0 ETH for gas)

## Common Issues

### "Smart account not ready"
- Wait 10-15 seconds after login
- Check console for initialization errors
- Verify Pimlico API key is correct

### "Paymaster has insufficient funds"
- Check Pimlico dashboard balance
- Add more testnet ETH to paymaster
- Verify you're on Base Sepolia network

### "NEXT_PUBLIC_PIMLICO_API_KEY not found"
- Ensure `.env.local` exists in `frontend/` directory
- Restart dev server after adding env vars
- Check spelling of environment variable

## Recommended Approach

**For Development/Testing:**
→ Use **Option 1 or 3** (Pimlico) - Fastest setup

**For Production:**
→ Use **Option 2** (Privy) - Better integration, no external dependencies

## Need Help?

1. Check the full documentation: `SMART_WALLET_IMPLEMENTATION.md`
2. Review console logs for detailed errors
3. Verify all environment variables are set
4. Ensure you have testnet ETH in paymaster
5. Check that Base Sepolia is selected in your wallet

---

**Last Updated:** October 21, 2025

