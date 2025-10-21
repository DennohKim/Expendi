# Chainlink Automation Testing Guide

This guide explains how to test the ExpendiBucketManager Chainlink Automation system both locally and on testnet.

## Overview

The testing suite includes:
- **Unit Tests**: Individual function testing
- **Integration Tests**: Complete workflow simulation
- **Chainlink Simulation**: Exact automation flow testing
- **Manual Testing**: Interactive testing on testnet

## Test Files

1. **ExpendiBucketManagerAutomationTest.t.sol** - Comprehensive unit tests
2. **ChainlinkAutomationIntegrationTest.t.sol** - Integration and workflow tests

## Prerequisites

```bash
# Install Foundry if not already installed
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install
```

## Running Tests

### 1. Run All Tests

```bash
# Run complete test suite
forge test

# Run with detailed output
forge test -vvv

# Run specific test file
forge test --match-path test/ExpendiBucketManagerAutomationTest.t.sol

# Run specific test function
forge test --match-test testChainlinkAutomationFlow -vvv
```

### 2. Run Integration Tests

```bash
# Run the complete Chainlink simulation
forge test --match-path test/ChainlinkAutomationIntegrationTest.t.sol -vvv

# This will output detailed logs showing the exact Chainlink flow
```

### 3. Generate Coverage Report

```bash
# Install lcov for coverage reporting
brew install lcov  # macOS
# or sudo apt-get install lcov  # Linux

# Generate coverage
forge coverage --report lcov
genhtml lcov.info -o coverage/
open coverage/index.html
```

## Test Scenarios

### Basic Automation Tests

1. **Contract Deployment**: Verifies proper initialization
2. **Subscription Tracking**: Tests adding/removing subscriptions
3. **CheckUpkeep Logic**: Tests when upkeep is needed
4. **PerformUpkeep Execution**: Tests payment processing
5. **Emergency Controls**: Tests pause/unpause functionality

### Integration Tests

1. **Complete Workflow**: End-to-end subscription payment
2. **Batch Processing**: Multiple subscriptions at once
3. **Payment Failures**: Insufficient balance handling
4. **Time-based Logic**: Payment scheduling validation

### Chainlink Simulation Tests

1. **Registry Interaction**: Simulates Chainlink registry calls
2. **Gas Optimization**: Validates gas usage is reasonable
3. **Error Handling**: Tests graceful failure modes
4. **Performance Metrics**: Validates statistics tracking

## Manual Testing on Testnet

### 1. Deploy Contracts

```bash
# Set environment variables
export PRIVATE_KEY="your_private_key"
export RPC_URL="https://sepolia.base.org"

# Deploy automation system
forge script script/deployment/DeployAutomation.s.sol \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify
```

### 2. Create Test Subscription

Use the deployed contract addresses to:

1. Create a bucket in ExpendiBucketManager
2. Fund the bucket with test USDC
3. Create a subscription with short period (1 day for testing)
4. Track the subscription in automation

### 3. Test Chainlink Integration

```bash
# Use cast to interact with contracts
export AUTOMATION_CONTRACT="[deployed_automation_address]"
export BUCKET_MANAGER="0x4832FE3192f205F753F1C334916B7cfec7823D64"

# Check if upkeep is needed
cast call $AUTOMATION_CONTRACT "checkUpkeep(bytes)(bool,bytes)" "0x" --rpc-url $RPC_URL

# Manually trigger upkeep (admin only)
cast send $AUTOMATION_CONTRACT "manualUpkeep()" --private-key $PRIVATE_KEY --rpc-url $RPC_URL

# Check automation stats
cast call $AUTOMATION_CONTRACT "getAutomationStats()" --rpc-url $RPC_URL
```

## Test Output Examples

### Successful Integration Test

```
[PASS] testChainlinkAutomationFlow() (gas: 485,234)
Logs:
  === CHAINLINK AUTOMATION INTEGRATION TEST ===
  Step 1: User creates subscription...
  ✅ Subscription created with ID: 1
  Step 2: Tracking subscription in automation...
  ✅ Subscription tracked in automation
  Step 3: Verifying initial state...
  ✅ Subscription correctly shows as not due initially
  Step 4: Fast forwarding 30 days...
  ✅ Time advanced to payment due date
  Step 5: Chainlink checking if upkeep is needed...
  ✅ Chainlink determined upkeep is needed
     Perform data length: 96
     Due subscriptions found: 1
  Step 6: Recording balances before payment...
     User bucket balance: 1000 USDC
     Recipient balance: 0 USDC
  Step 7: Chainlink executing payment...
  ✅ Payment executed successfully
     Gas used: 158,423
  Step 8: Verifying payment results...
     User bucket balance after: 950 USDC
     Recipient balance after: 50 USDC
     Payment amount: 50 USDC
  ✅ Payment amounts verified correctly
  Step 9: Checking automation statistics...
     Total payments processed: 1
     Total failed payments: 0
     Total gas used: 158,423
     Upkeep count: 1
  ✅ Automation stats verified
  Step 10: Verifying next payment schedule...
     Next charge scheduled for: 1707408001
     Total charged so far: 50 USDC
     Charge count: 1
  ✅ Next payment correctly scheduled
  === CHAINLINK AUTOMATION TEST COMPLETED SUCCESSFULLY ===
```

### Failed Payment Test

```
[PASS] testChainlinkAutomationPaymentFailure() (gas: 298,567)
Logs:
  === TESTING PAYMENT FAILURE SCENARIO ===
  Drained user bucket balance
  Chainlink still detects upkeep needed (balance check happens in performUpkeep)
  ✅ Payment failure handled gracefully
     Failed payments recorded: 1
  === PAYMENT FAILURE TEST COMPLETED ===
```

## Debugging Tests

### Common Issues

1. **Insufficient Gas**: Increase gas limit in test
2. **Time-based Failures**: Ensure proper `vm.warp()` usage
3. **Permission Errors**: Verify role grants in setup
4. **Balance Issues**: Check token minting and approvals

### Debugging Commands

```bash
# Run with maximum verbosity
forge test --match-test testName -vvvv

# Debug specific line
forge test --match-test testName --debug

# Check gas usage
forge test --gas-report

# Profile test execution
forge test --profile
```

## Performance Expectations

### Gas Usage

- **Single Payment**: ~150,000 gas
- **Batch (5 payments)**: ~600,000 gas
- **CheckUpkeep**: ~50,000 gas (view function)
- **PerformUpkeep overhead**: ~100,000 gas

### Timing

- **Test Suite Runtime**: ~30 seconds
- **Integration Tests**: ~10 seconds
- **Coverage Generation**: ~60 seconds

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test Automation
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
      - name: Run tests
        run: forge test
      - name: Generate coverage
        run: forge coverage --report lcov
```

## Test Data

### Default Test Parameters

```solidity
uint256 SUBSCRIPTION_AMOUNT = 50e6;  // 50 USDC
uint256 PERIOD_DAYS = 30;           // 30 day billing
uint256 INITIAL_BALANCE = 1000e6;   // 1000 USDC
uint256 MONTHLY_LIMIT = 1000e6;     // 1000 USDC limit
```

### Test Accounts

- **Deployer**: Contract admin, has all roles
- **User1/User2**: Subscription creators
- **Recipient**: Payment recipient
- **ChainlinkRegistry**: Simulated Chainlink automation

## Validation Checklist

Before deploying to mainnet, ensure:

- [ ] All tests pass
- [ ] Gas usage is reasonable (<2M gas per upkeep)
- [ ] Error handling works properly
- [ ] Emergency controls function
- [ ] Performance metrics are accurate
- [ ] Integration with ExpendiBucketManager works
- [ ] Role permissions are correct
- [ ] Edge cases are handled

## Support

If tests fail:

1. Check the detailed logs with `-vvv` flag
2. Verify contract addresses are correct
3. Ensure proper role permissions
4. Check for sufficient test token balances
5. Validate time-based logic with `vm.warp()`

For additional help, review the test output and error messages - they provide detailed information about what went wrong and where.