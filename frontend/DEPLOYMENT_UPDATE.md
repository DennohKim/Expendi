# Frontend Contract Updates

## Summary
Frontend has been updated with the latest contract addresses and ABIs from the Celo Mainnet deployment.

## Updated Files

### Contract Utilities
- ✅ `src/lib/contracts/factory.ts` - Updated with correct factory address and ABI
- ✅ `src/lib/contracts/SimpleBudgetWalletFactory.json` - Complete factory ABI
- ✅ `src/lib/contracts/SimpleBudgetWallet.json` - Complete budget wallet ABI  
- ✅ `src/lib/contracts/budget-wallet.ts` - New utility class for budget wallet interactions
- ✅ `src/lib/contracts/index.ts` - Centralized contract exports

### Environment Configuration
- ✅ `.env.local` - Updated with correct contract addresses and subgraph URL
- ✅ `.env.example` - Updated template with new configuration

## Contract Addresses (Celo Mainnet)

| Contract | Address | 
|----------|---------|
| SimpleBudgetWalletFactory | `0x0726E7052DAadD09548aBA2D5e72AD12BE8E787e` |
| SimpleBudgetWallet Template | `0xCdFfB2611428DC4A3EE628abC26EcFB65Dcc0FFF` |

## Environment Variables

```env
# Smart Contract Addresses  
NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS=0x0726E7052DAadD09548aBA2D5e72AD12BE8E787e
NEXT_PUBLIC_BUDGET_WALLET_ADDRESS=0xCdFfB2611428DC4A3EE628abC26EcFB65Dcc0FFF
NEXT_PUBLIC_CHAIN_ID=42220
NEXT_PUBLIC_NETWORK_NAME=Celo Mainnet

# Subgraph Configuration
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/118246/expendi-celo/v0.1.0
```

## New Features

### Budget Wallet Utilities (`budget-wallet.ts`)
- `BudgetWalletUtils` class for interacting with budget wallet contracts
- Methods for creating buckets, depositing funds, spending, and querying balances
- Type-safe interaction with contract functions

### Factory Utilities (`factory.ts`)
- Updated to use environment variables for contract addresses
- Complete ABI with all factory functions
- Improved error handling for wallet creation

### Contract Index (`index.ts`)
- Centralized exports for all contract utilities
- Network and contract address configuration
- Subgraph configuration constants

## Build Status

✅ **Frontend builds successfully** with the new configuration
- Next.js compilation: ✅ Success
- TypeScript compilation: ✅ Success  
- Linting: ⚠️ Some warnings (non-blocking)

## Usage Examples

### Creating a Budget Wallet
```typescript
import { createBudgetWallet, FACTORY_CONTRACT_ADDRESS } from '@/lib/contracts';

const { txHash } = await createBudgetWallet(writeContractAsync, userAddress);
```

### Using Budget Wallet
```typescript
import { createBudgetWalletUtils, ETH_ADDRESS } from '@/lib/contracts';

const walletUtils = createBudgetWalletUtils(walletAddress);
await walletUtils.createBucket(writeContractAsync, "Food", BigInt("1000000000000000000")); // 1 ETH limit
await walletUtils.depositETH(writeContractAsync, BigInt("500000000000000000")); // 0.5 ETH
```

## Next Steps

1. Test wallet creation and interaction in development
2. Update any existing components that use the old contract interfaces
3. Consider adding TypeScript types for better type safety
4. Deploy to staging/production when ready