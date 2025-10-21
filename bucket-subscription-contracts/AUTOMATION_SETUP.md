# ExpendiBucketManager Chainlink Automation Setup

This guide explains how to deploy and configure Chainlink Automation for automatic subscription payment processing with ExpendiBucketManager.

## Overview

The automation system consists of:
- **ExpendiBucketManagerAutomation.sol** - Main automation contract
- **AutomationSubscriptionTracker.sol** - Helper for tracking subscriptions
- **Chainlink Automation Network** - Decentralized execution infrastructure

## Prerequisites

1. **Base Sepolia Network Access**
   - RPC URL: `https://sepolia.base.org`
   - Chain ID: `84532`

2. **LINK Tokens**
   - Get Base Sepolia LINK from [Chainlink Faucet](https://faucets.chain.link/)
   - Minimum 5 LINK recommended for initial funding

3. **Deployed ExpendiBucketManager**
   - Current address: `0x4832FE3192f205F753F1C334916B7cfec7823D64`

## Deployment Steps

### 1. Deploy Automation Contract

```bash
# Set environment variables
export PRIVATE_KEY="your_private_key_here"
export RPC_URL="https://sepolia.base.org"

# Deploy automation contract
forge script script/deployment/DeployAutomation.s.sol \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify
```

### 2. Verify Permissions

Ensure the automation contract has `SUBSCRIPTION_MANAGER_ROLE`:

```solidity
// Check if automation has the required role
bool hasRole = bucketManager.hasRole(
    keccak256("SUBSCRIPTION_MANAGER_ROLE"), 
    automationContractAddress
);
```

### 3. Register with Chainlink Automation

1. Visit [Chainlink Automation](https://automation.chain.link/)
2. Connect wallet to Base Sepolia
3. Click "Register New Upkeep"
4. Configure upkeep:
   - **Target Contract**: `[AutomationContractAddress]`
   - **Upkeep Name**: "ExpendiBucketManager Subscriptions"
   - **Gas Limit**: `2,000,000`
   - **Starting Balance**: `5 LINK`
   - **Check Data**: `0x` (empty)

### 4. Fund the Upkeep

Transfer LINK tokens to your upkeep for ongoing execution costs.

## Configuration

### Automation Settings

```solidity
// Update automation configuration
automation.updateAutomationConfig(
    300,  // checkInterval: 5 minutes
    5     // maxBatchSize: 5 subscriptions per batch
);
```

### Tracking Subscriptions

Subscriptions must be tracked to be processed by automation:

```solidity
// Track new subscription
automation.trackUserSubscription(userAddress, subscriptionId);

// Untrack cancelled subscription  
automation.untrackUserSubscription(userAddress, subscriptionId);
```

## Usage Workflow

### 1. Creating Subscriptions

When users create subscriptions through your frontend:

```solidity
// 1. User creates subscription in ExpendiBucketManager
uint256 subscriptionId = bucketManager.createBucketSubscription(
    bucketName,
    amount,
    periodInDays,
    token,
    recipient,
    metadata,
    userConsent
);

// 2. Track subscription in automation
automation.trackUserSubscription(msg.sender, subscriptionId);
```

### 2. Automatic Payment Processing

The automation system will:
1. **Check every 5 minutes** for due subscriptions
2. **Batch process** up to 5 payments per transaction
3. **Emit events** for successful/failed payments
4. **Handle errors** gracefully with detailed logging

### 3. Monitoring

Monitor automation performance:

```solidity
// Get automation statistics
(
    uint256 totalPaymentsProcessed,
    uint256 totalFailedPayments,
    uint256 totalGasUsed,
    uint256 upkeepCount,
    uint256 trackedUsersCount,
    uint256 lastUpkeepTimestamp
) = automation.getAutomationStats();
```

## Advanced Features

### Emergency Controls

```solidity
// Pause specific user's subscriptions
automation.emergencyPauseUser(userAddress, true);

// Pause specific subscription
automation.emergencyPauseSubscription(subscriptionId, true);

// Pause entire automation
automation.pauseAutomation();
```

### Batch Operations

```solidity
// Track multiple subscriptions at once
address[] memory users = [user1, user2, user3];
uint256[] memory subscriptionIds = [id1, id2, id3];
tracker.batchTrackSubscriptions(users, subscriptionIds);
```

### Manual Testing

```solidity
// Manually trigger upkeep for testing
automation.manualUpkeep();
```

## Gas Optimization

The system includes several gas optimizations:

1. **Batch Processing**: Process multiple payments in one transaction
2. **Smart Limits**: Maximum 5 subscriptions per batch to prevent gas issues
3. **Early Exit**: Stop processing if gas runs low
4. **Efficient Scanning**: Limited scope subscription discovery

## Cost Estimation

### Chainlink Automation Costs

- **Base Sepolia**: ~$0.001 per upkeep execution
- **Frequency**: Every 5 minutes = 288 executions/day
- **Daily Cost**: ~$0.29 in LINK tokens
- **Monthly Cost**: ~$8.70 in LINK tokens

### Gas Costs per Payment

- **Single Payment**: ~150,000 gas
- **Batch (5 payments)**: ~600,000 gas
- **Cost per Payment**: ~$0.001 on Base

## Troubleshooting

### Common Issues

1. **Upkeep Not Executing**
   - Check LINK balance in upkeep
   - Verify contract has `SUBSCRIPTION_MANAGER_ROLE`
   - Ensure subscriptions are tracked

2. **Payments Failing**
   - Check bucket balances
   - Verify monthly limits
   - Ensure user consent is still valid

3. **High Gas Usage**
   - Reduce `maxBatchSize`
   - Increase `checkInterval`
   - Remove inactive subscriptions from tracking

### Monitoring Events

Listen for key events:

```solidity
// Successful upkeep
event AutomationUpkeepPerformed(
    uint256 indexed upkeepId,
    uint256 subscriptionsChecked,
    uint256 paymentsProcessed,
    uint256 gasUsed,
    uint256 timestamp
);

// Payment processing
event SubscriptionPaymentProcessed(
    address indexed user,
    uint256 indexed subscriptionId,
    bool success,
    string reason,
    uint256 gasUsed
);
```

## Security Considerations

1. **Role Management**: Only grant `ADMIN_ROLE` to trusted addresses
2. **Emergency Pause**: Have emergency procedures ready
3. **Rate Limiting**: Built-in protection against rapid execution
4. **Balance Checks**: Payments fail safely if insufficient funds

## Maintenance

### Regular Tasks

1. **Monitor LINK Balance**: Keep upkeep funded
2. **Track New Subscriptions**: Ensure new subscriptions are tracked
3. **Clean Up**: Remove cancelled subscriptions from tracking
4. **Performance Review**: Monitor gas usage and success rates

### Upgrades

The automation contract is not upgradeable for security. Deploy new versions if needed and update tracking accordingly.

## Support

For issues or questions:
1. Check [Chainlink Automation Docs](https://docs.chain.link/chainlink-automation)
2. Monitor contract events for detailed error information
3. Use `getAutomationStats()` for performance insights

## Contract Addresses

### Base Sepolia
- **ExpendiBucketManager**: `0x4832FE3192f205F753F1C334916B7cfec7823D64`
- **ExpendiBucketManagerAutomation**: `[To be deployed]`
- **AutomationSubscriptionTracker**: `[To be deployed]`

## Example Integration

Complete example of creating and tracking a subscription:

```solidity
contract SubscriptionIntegration {
    ExpendiBucketManager bucketManager;
    ExpendiBucketManagerAutomation automation;
    
    function createAndTrackSubscription(
        string memory bucketName,
        uint256 amount,
        uint256 periodInDays,
        address token,
        address recipient,
        string memory metadata
    ) external {
        // Create subscription
        uint256 subscriptionId = bucketManager.createBucketSubscription(
            bucketName,
            amount,
            periodInDays,
            token,
            recipient,
            metadata,
            true // userConsent
        );
        
        // Track in automation
        automation.trackUserSubscription(msg.sender, subscriptionId);
        
        // Subscription will now be automatically processed
    }
}
```

This completes the Chainlink Automation integration for ExpendiBucketManager. The system provides reliable, decentralized subscription payment processing with minimal operational overhead.