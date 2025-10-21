# Smart Wallet Implementation with Privy

This document explains the smart wallet implementation using Privy's native smart wallet support with Biconomy paymaster for gas-sponsored transactions.

## Overview

We've implemented smart wallet functionality to enable gasless transactions for users. This allows users to interact with the Expendi Bucket Manager contract without needing to hold native tokens (ETH) for gas fees.

## Architecture

### 1. Provider Setup

**File:** `frontend/src/lib/privy/providers.tsx`

The application is wrapped with Privy's `SmartWalletsProvider`, which handles smart wallet creation and management:

```typescript
<SmartWalletsProvider>
  {/* App content */}
</SmartWalletsProvider>
```

**Configuration Details:**
- Smart wallet configuration is managed through the Privy Dashboard
- No explicit paymaster configuration needed in code
- Privy handles the bundler and paymaster infrastructure
- Gas sponsorship rules are configured in your Privy app settings

### 2. Smart Wallet Hook

**File:** `frontend/src/hooks/useSmartWallet.ts`

A custom hook that provides access to the smart wallet client:

```typescript
export function useSmartWallet() {
  const { ready: privyReady, authenticated } = usePrivy();
  const smartWallets = useSmartWallets();
  const client = smartWallets.client;

  return {
    client,           // Smart wallet client for sending transactions
    isReady,          // Boolean indicating if smart wallet is ready
    authenticated,    // User authentication status
  };
}
```

**Usage:**
```typescript
const { client, isReady } = useSmartWallet();

if (isReady && client) {
  // Send sponsored transaction
  const hash = await client.sendTransaction({
    to: contractAddress,
    data: encodedData,
    value: BigInt(0),
  });
}
```

### 3. Bucket Creation with Smart Wallet

**File:** `frontend/src/hooks/bucket-manager/useCreateBucketSponsored.ts`

This hook handles creating buckets with sponsored transactions:

**Key Features:**
- ✅ Uses smart wallet client instead of EOA
- ✅ Automatically sponsored gas via Biconomy paymaster
- ✅ Transaction receipt monitoring with Wagmi
- ✅ Automatic query invalidation on success
- ✅ User-friendly error messages

**Transaction Flow:**
1. Check smart wallet readiness
2. Switch to Base Sepolia chain (if needed)
3. Encode function data for `createBucket`
4. Send transaction via smart wallet (gas automatically sponsored)
5. Wait for transaction confirmation
6. Invalidate relevant queries and show success toast

### 4. UI Integration

**File:** `frontend/src/components/bucket-manager/CreateBucketManagerModal.tsx`

The modal component now uses the smart wallet implementation:

**Changes:**
- Removed direct wallet/EOA checks
- Uses `createBucket.isReady` from the hook
- Updated loading messages to mention "Smart Wallet"
- Shows different states: Initializing → Creating → Confirming

## Comparison: Before vs After

### Before (EOA with manual sendTransaction)
```typescript
// Required user to have ETH for gas
const { sendTransaction } = useSendTransaction();
const txResult = await sendTransaction({
  to: contractAddress,
  data: encodedData,
});
```

**Issues:**
- ❌ User needed ETH in wallet for gas
- ❌ Complex gas estimation
- ❌ Poor user experience for new users
- ❌ Transaction could fail due to insufficient gas

### After (Smart Wallet with Paymaster)
```typescript
// Gas automatically sponsored
const { client } = useSmartWallet();
const hash = await client.sendTransaction({
  to: contractAddress,
  data: encodedData,
  value: BigInt(0),
});
```

**Benefits:**
- ✅ No ETH required for gas (sponsored)
- ✅ Automatic gas estimation via paymaster
- ✅ Seamless user experience
- ✅ Biconomy handles gas sponsorship
- ✅ Transactions always have sufficient gas

## Configuration

### Environment Variables

Ensure you have the Privy app ID configured:

```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

### Privy Dashboard Setup

**Important:** Gas sponsorship must be configured in the Privy Dashboard:

1. **Go to [Privy Dashboard](https://dashboard.privy.io)**
   - Log in to your account
   - Select your app

2. **Enable Smart Wallets**
   - Go to Settings → Smart Wallets
   - Enable "Smart Wallets" feature
   - Choose your preferred smart wallet type

3. **Configure Gas Sponsorship**
   - Go to Settings → Gas Sponsorship
   - Enable gas sponsorship for your app
   - Set sponsorship rules (per-user limits, daily limits, etc.)
   - Add Base Sepolia (chain ID 84532) to supported chains

4. **Configure Paymaster (Optional)**
   - If using custom paymaster, add configuration
   - For Privy's managed paymaster, no additional setup needed
   - Set spending limits and policies

5. **Add Funded Wallet**
   - Ensure your sponsorship wallet has sufficient funds
   - For testnet, get ETH from Base Sepolia faucet
   - For mainnet, deposit ETH for gas sponsorship

**Alternative: Using Pimlico Instead**

If you prefer to manage the paymaster yourself, you can use Pimlico with the existing `SmartAccountContext`:

1. Set up Pimlico account at [https://pimlico.io](https://pimlico.io)
2. Get API key and add to `.env.local`:
   ```env
   NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_api_key
   ```
3. Use the `SmartAccountContext` instead of Privy's smart wallets
4. Fund your Pimlico paymaster for Base Sepolia

## Smart Wallet Features

### Automatic Creation
- Smart wallet is automatically created when user logs in
- No additional user interaction required
- Embedded wallet acts as the signer

### Gas Sponsorship
- All transactions are automatically sponsored
- No need for users to hold native tokens
- Configurable sponsorship policies in Privy Dashboard

### Security
- Smart wallets are non-custodial
- User maintains control via embedded wallet
- Account abstraction provides additional security features

## User Flow

1. **User logs in** (via email/social)
   - Privy creates embedded wallet
   - Smart wallet is automatically initialized

2. **User creates bucket**
   - Opens create bucket modal
   - Fills in bucket details
   - Clicks "Create Bucket"

3. **Transaction Processing**
   - Smart wallet sends user operation to bundler
   - Paymaster sponsors the gas
   - Transaction is submitted to blockchain
   - User sees confirmation toast

4. **Post-Transaction**
   - Queries are invalidated
   - UI updates with new bucket
   - Transaction hash available for viewing

## Testing

To test the smart wallet implementation:

1. **Start the development server:**
   ```bash
   cd frontend
   pnpm dev
   ```

2. **Navigate to Bucket Manager:**
   - Go to `/bucket-manager`
   - Click "Create Bucket"

3. **Monitor the Console:**
   - Watch for smart wallet initialization
   - Check for transaction submission logs
   - Verify gas sponsorship

4. **Verify on Block Explorer:**
   - Copy transaction hash from toast
   - Check on Base Sepolia explorer
   - Verify gas was sponsored (check transaction details)

## Troubleshooting

### Error: "method must be one of the following values: pm_sponsorUserOperation..."

**Problem:** You're seeing this error:
```
UserOperationExecutionError: HTTP request failed.
Details: {"code":-32601,"message":"method must be one of the following values: pm_sponsorUserOperation, pm_supportedPaymasters..."}
```

**Root Cause:** Gas sponsorship is not properly configured in Privy Dashboard, or Privy is trying to use an incompatible paymaster endpoint.

**Solutions:**

**Option 1: Configure Privy Gas Sponsorship (Recommended)**

1. Go to [Privy Dashboard](https://dashboard.privy.io)
2. Navigate to Settings → Gas Sponsorship
3. Enable gas sponsorship for your app
4. Add Base Sepolia (84532) to supported networks
5. Fund your sponsorship wallet with testnet ETH
6. Set appropriate spending limits

**Option 2: Use Pimlico Paymaster**

If Privy's gas sponsorship isn't available or configured, use the existing Pimlico setup:

1. **Get Pimlico API Key:**
   - Sign up at [https://pimlico.io](https://pimlico.io)
   - Create a new project
   - Copy your API key

2. **Add to environment:**
   ```bash
   # frontend/.env.local
   NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_api_key_here
   ```

3. **Update the hook to use SmartAccountContext:**

   Edit `frontend/src/hooks/bucket-manager/useCreateBucketSponsored.ts`:

   ```typescript
   // Change from:
   import { useSmartWallet } from '@/hooks/useSmartWallet';
   const { client, isReady } = useSmartWallet();

   // To:
   import { useSmartAccount } from '@/context/SmartAccountContext';
   const { smartAccountClient, smartAccountReady } = useSmartAccount();
   const client = smartAccountClient;
   const isReady = smartAccountReady;
   ```

4. **Fund Pimlico Paymaster:**
   - Go to Pimlico Dashboard
   - Add funds to Base Sepolia paymaster
   - Configure sponsorship policies

**Option 3: Disable Sponsored Transactions (Temporary)**

For testing without gas sponsorship:

1. User pays gas with their embedded wallet
2. Remove `SmartWalletsProvider` temporarily
3. Use direct wallet transactions
4. User needs ETH in wallet for gas

### Smart Wallet Not Initializing
- Ensure Privy app ID is configured
- Check Smart Wallets are enabled in Privy Dashboard
- Verify network connection
- Check browser console for errors
- Wait 10-15 seconds after login for initialization

### Transaction Failing
- Verify contract address is correct
- Check paymaster has sufficient funds (Privy or Pimlico)
- Ensure user is on correct network (Base Sepolia)
- Check transaction parameters are valid
- Verify smart wallet has been initialized

### Gas Sponsorship Not Working
- **Privy:** Verify gas sponsorship is enabled in dashboard
- **Pimlico:** Check paymaster balance and policies
- Ensure network (Base Sepolia) is supported
- Check daily/per-user spending limits
- Verify sponsorship wallet has sufficient ETH
- Contact support if issues persist

## Migration Notes

### From Old Implementation
The old implementation used:
- Custom Permissionless.js setup
- Manual Pimlico paymaster configuration
- Complex smart account initialization

### New Implementation Benefits
- ✅ Simpler setup with Privy's native support
- ✅ Automatic paymaster handling
- ✅ Better error handling
- ✅ Improved user experience
- ✅ Less code to maintain

## Future Enhancements

Potential improvements for the smart wallet implementation:

1. **Batch Transactions**
   - Allow multiple operations in one transaction
   - Reduce transaction count and improve UX

2. **Session Keys**
   - Enable temporary signing permissions
   - Allow transactions without constant approval

3. **Custom Gas Policies**
   - Set spending limits per user/session
   - Implement tiered sponsorship

4. **Multi-Chain Support**
   - Extend to other supported chains
   - Unified cross-chain experience

## Resources

- [Privy Smart Wallets Documentation](https://docs.privy.io/guide/react/wallets/smart-wallets)
- [Biconomy Documentation](https://docs.biconomy.io/)
- [Account Abstraction (ERC-4337)](https://eips.ethereum.org/EIPS/eip-4337)
- [Base Network Documentation](https://docs.base.org/)

## Support

For issues or questions:
- Check Privy documentation
- Review console logs for errors
- Contact Privy support via dashboard
- Check this repository's issues

---

**Last Updated:** October 21, 2025
**Version:** 1.0.0

