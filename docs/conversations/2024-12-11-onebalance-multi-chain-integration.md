# OneBalance Multi-Chain Integration - 2024-12-11

## Context
Discussion about integrating OneBalance into the Expendi frontend to enable multi-chain asset management. The challenge was how to maintain unified budget wallet functionality across different chains while providing a seamless user experience.

## Key Questions
- How to handle assets on different chains with separate budget wallets?
- How to maintain unified account experience across chains?
- What's the best architecture for multi-chain budget management?
- How to integrate OneBalance with existing Privy + Smart Account setup?

## Solutions/Decisions

### Approach Chosen
**Hybrid Master-Slave Architecture with OneBalance Integration**
- Keep existing Base contract as master wallet
- Use OneBalance for cross-chain asset movement and abstraction
- Add lightweight proxy contracts on other chains for local spending
- Frontend abstracts complexity into unified interface

### Alternative Approaches Considered

#### Option 1: Pure Master-Slave Architecture
- **Pros**: Strong consistency, single source of truth
- **Cons**: Complex cross-chain messaging, potential latency issues
- **Why not chosen**: Too complex without chain abstraction layer

#### Option 2: Shared State via Cross-Chain Messaging
- **Pros**: Real-time synchronization
- **Cons**: High gas costs, complex failure handling
- **Why not chosen**: Expensive and complex to maintain

#### Option 3: Virtual Unified Wallet (OneBalance-First)
- **Pros**: No contract deployments needed
- **Cons**: Loss of on-chain budget enforcement
- **Why not chosen**: Security and decentralization concerns

## Implementation Notes

### Current Architecture
- **Frontend**: Next.js + TypeScript on Base/Celo
- **Wallet**: Privy embedded wallets + Permissionless smart accounts
- **Budget System**: SimpleBudgetWallet.sol contract for expense management
- **Assets**: Currently USDC on single chain

### Proposed Architecture
```typescript
interface UnifiedWalletContext {
  masterWallet: BudgetWalletContract;  // Base chain
  oneBalance: OneBalanceService;       // Cross-chain operations
  chainWallets: Map<number, ProxyWallet>; // Other chains
  unifiedBalance: MultiChainBalance;
}
```

### Files to Create/Modify
- `frontend/src/context/OneBalanceContext.tsx` - OneBalance integration context
- `frontend/src/services/OneBalanceService.ts` - API integration service
- `frontend/src/components/wallet/UnifiedWalletView.tsx` - Multi-chain UI
- `frontend/src/app/(admin)/wallet/page.tsx` - Enhanced wallet page

### Key Integration Points
1. **Asset Discovery**: OneBalance API to detect assets across chains
2. **Cross-Chain Transfers**: OneBalance quotes + execution
3. **Budget Management**: Master contract on Base with cross-chain awareness
4. **User Experience**: Single interface abstracting chain complexity

## Next Steps
- [ ] Set up OneBalance API access and authentication
- [ ] Create OneBalance service integration layer
- [ ] Design enhanced wallet UI with multi-chain support
- [ ] Implement cross-chain asset detection and balancing
- [ ] Add proxy contracts for spending on secondary chains
- [ ] Test cross-chain transfer flows
- [ ] Update budget allocation logic for multi-chain assets

## Related Documentation
- [OneBalance Documentation](https://docs.onebalance.io/overview/what-is-onebalance)
- [Privy OneBalance Recipe](https://docs.privy.io/recipes/one-balance)
- Current wallet implementation: `frontend/src/app/(admin)/wallet/page.tsx:466`

## Tags
`onebalance`, `multi-chain`, `integration`, `budget-wallet`, `architecture`, `asset-management`