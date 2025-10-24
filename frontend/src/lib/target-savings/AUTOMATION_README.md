# Automated Deposits for Goalz - Implementation Guide

## Overview

This implementation provides automated deposit functionality for savings goals using **Gelato Network** for scheduling and execution. Users can set up recurring deposits that execute automatically without manual intervention.

## 🏗️ Architecture

### Smart Contract Integration
The Goalz Morpho contract (`Goalz_Morpho.sol`) uses Gelato's automation infrastructure:

```solidity
struct AutomatedDeposit {
    uint amount;           // Amount to deposit each time
    uint frequency;        // Time between deposits (in seconds)
    uint lastDeposit;      // Last deposit timestamp
    bytes32 gelatoTaskId;  // Gelato task ID for management
}
```

### Key Functions
- `automateDeposit(goalId, amount, frequency)` - Sets up automation
- `automatedDeposit(goalId)` - Called by Gelato to execute deposits
- `cancelAutomatedDeposit(goalId)` - Cancels automation

## 💡 How It Works

### 1. Setup Phase (User Actions)

```
User → Approve USDC tokens → Create automation task → Done!
```

**Step-by-step:**

1. **User configures automation:**
   - Deposit amount (e.g., 100 USDC)
   - Frequency (Daily, Weekly, Bi-Weekly, Monthly, or Custom)

2. **Token approval (Critical):**
   - User approves calculated amount: `depositAmount × estimatedDeposits × 1.1`
   - 10% buffer added for flexibility
   - This is the "Calculate and Warn" strategy

3. **Gelato task creation:**
   - Contract creates a Gelato task with TIME trigger
   - Task checks every 10 minutes if deposit should execute
   - No further user interaction needed

### 2. Execution Phase (Automated)

```
Gelato Bot → Check conditions → Transfer tokens → Update state
```

**Automated flow:**

1. Gelato checks every 10 minutes: "Has frequency time passed?"
2. When true: Calls `automatedDeposit(goalId)`
3. Contract checks:
   - User has sufficient balance ✅
   - User has sufficient allowance ✅
   - Deposit won't exceed goal target ✅
4. Executes transfer from user wallet to contract
5. Deposits to Morpho vault for interest
6. Updates `lastDeposit` timestamp

## 📦 Components

### Hooks

#### `useAutomatedDeposit(goalId)`
Fetches automation data for a specific goal from the smart contract.

```typescript
const { data: automation, refetch } = useAutomatedDeposit(goalId);
// Returns: AutomatedDepositData | null
```

#### `useAutomationMetrics(goalId, targetAmount, currentAmount, automationData)`
Calculates automation metrics and projections.

```typescript
const metrics = useAutomationMetrics(goalId, targetAmount, currentAmount, automation);
// Returns: { depositsRemaining, estimatedCompletion, approvalNeeded, daysToCompletion }
```

#### `useAutomationAllowanceCheck(tokenAddress, userAddress, requiredAllowance)`
Checks if user has sufficient token allowance for automated deposits.

```typescript
const { hasEnoughAllowance, currentAllowance, shortfall } = useAutomationAllowanceCheck(
  CONTRACTS.USDC,
  address,
  requiredApproval
);
```

### UI Components

#### `<AutomationSheet />`
Modal for setting up automated deposits with multi-step flow:
- Step 1: Configure amount and frequency
- Step 2: Approve tokens (with calculated amount)
- Step 3: Gelato information
- Step 4: Confirm and create

#### `<AutomationStatusCard />`
Displays active automation status on goal cards:
- Next deposit time
- Remaining deposits
- Estimated completion
- Allowance warnings
- Cancel automation button

#### `<GoalCard />` (Updated)
Now includes:
- "Automate" button for goals without automation
- Integrated automation status display
- Automatic detection of active automation

## 🔐 Token Approval Strategy: "Calculate and Warn"

### Why This Approach?

We use calculated approval (not unlimited) for better security and user control.

### How It Works

```typescript
const requiredApproval = depositAmount × estimatedDeposits
const approvalWithBuffer = requiredApproval × 1.1 // Add 10% buffer
```

**Example:**
- Goal: $1,000 USDC
- Current: $200 USDC
- Remaining: $800 USDC
- Weekly deposit: $100 USDC
- Estimated deposits: 8
- Approval requested: $100 × 8 × 1.1 = $880 USDC

### User Experience

✅ **Advantages:**
- More secure than unlimited approval
- Users know exactly how much is approved
- Transparent calculation shown in UI

⚠️ **Trade-offs:**
- Needs renewal after N deposits
- UI shows warnings when allowance is low
- User must re-approve to continue

### Warnings & Notifications

The system shows warnings when:
- **Low allowance**: Not enough for all remaining deposits
- **Near completion**: Only 3 or fewer deposits remaining
- **Deposit due**: Next deposit is scheduled now
- **Few deposits**: Less than 5 deposits possible (suggest smaller amounts)

## 🎯 Configuration

### Frequency Options

```typescript
export const AUTOMATION_INTERVALS = {
  DAILY: 86400,        // 1 day
  WEEKLY: 604800,      // 7 days
  BIWEEKLY: 1209600,   // 14 days
  MONTHLY: 2592000,    // 30 days
  CUSTOM: 0,           // User-defined
}
```

### Validation Rules

```typescript
export const AUTOMATION_CONFIG = {
  MIN_INTERVAL: 86400,                    // 1 day minimum
  MAX_INTERVAL: 31536000,                 // 1 year maximum
  MIN_DEPOSIT_AMOUNT: BigInt('1000000'),  // 1 USDC
  GELATO_CHECK_INTERVAL: 600000,          // 10 minutes
  APPROVAL_BUFFER: 1.1,                   // 10% buffer
  MIN_DEPOSITS_FOR_WARNING: 5,            // Warning threshold
}
```

## 🚀 Usage Example

### Setting Up Automation

```typescript
import { AutomationSheet } from '@/components/target-savings';

// In your component
<AutomationSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  goalId={goalId}
  goalName="Emergency Fund"
  targetAmount={BigInt('5000000000')} // 5000 USDC
  currentAmount={BigInt('1000000000')} // 1000 USDC
  depositToken={CONTRACTS.USDC}
/>
```

### Displaying Automation Status

```typescript
import { AutomationStatusCard } from '@/components/target-savings';

// In your goal card
<AutomationStatusCard
  goalId={goalId}
  targetAmount={targetAmount}
  currentAmount={currentAmount}
  depositToken={depositToken}
/>
```

## 📊 User Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Opens Goal Card                                      │
│    → Clicks "Automate" button                                │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Configure Automation                                      │
│    → Enter deposit amount (e.g., $100)                       │
│    → Select frequency (e.g., Weekly)                         │
│    → See estimates (8 deposits, 56 days)                     │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Approve Tokens                                            │
│    → System calculates: $100 × 8 × 1.1 = $880               │
│    → Shows breakdown and security info                       │
│    → User confirms approval transaction                      │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Gelato Information                                        │
│    → Learn about automated execution                         │
│    → Gas fees explanation                                    │
│    → Cancellation policy                                     │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Confirm & Create                                          │
│    → Review all details                                      │
│    → Create automation task                                  │
│    → Success! Automation is active                           │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Automated Execution (No User Action)                     │
│    → Gelato checks every 10 minutes                          │
│    → When frequency time passes:                             │
│      • Transfers $100 from user wallet                       │
│      • Deposits to Morpho vault                              │
│      • Updates goal progress                                 │
│    → Repeats until goal complete or cancelled                │
└─────────────────────────────────────────────────────────────┘
```

## ⚠️ Important Considerations

### 1. Token Balance
Users must maintain sufficient USDC balance for scheduled deposits. If balance is insufficient when Gelato tries to execute, the transaction will fail (but automation remains active).

### 2. Token Allowance
Users need to re-approve tokens when allowance runs out:
- UI shows warnings when allowance is low
- Automation continues working if allowance is sufficient
- Failed deposits don't cancel the automation

### 3. Goal Completion
Automation automatically stops when:
- Goal target amount is reached
- User cancels the automation
- User deletes the goal

### 4. Gas Fees
Gelato deducts gas fees from deposits:
- Small fee per execution (typically < $0.50)
- Users should factor this into deposit amounts
- No upfront payment required

## 🔧 Troubleshooting

### "Automated deposit failed"
- **Cause**: Insufficient balance or allowance
- **Solution**: Top up balance or re-approve tokens

### "Automation not executing"
- **Cause**: Gelato network delay or user balance issues
- **Solution**: Wait 10-20 minutes; check balance and allowance

### "Can't create automation"
- **Cause**: Validation errors (amount too small, frequency too short)
- **Solution**: Follow UI validation messages

## 📈 Future Enhancements

Potential improvements for future versions:

1. **Unlimited Approval Option**: Give users choice between calculated and max approval
2. **Email Notifications**: Alert users when deposits execute or fail
3. **Automatic Re-approval**: Prompt users to renew allowance before it runs out
4. **Flexible Amounts**: Allow varying deposit amounts over time
5. **Pause/Resume**: Temporarily pause automation without cancelling
6. **Analytics Dashboard**: Show automation history and savings rate

## 🔗 Related Files

- **Smart Contract**: `goalz-morpho/src/Goalz_Morpho.sol`
- **Hooks**: `frontend/src/lib/target-savings/hooks/useAutomation.ts`
- **Types**: `frontend/src/lib/target-savings/types.ts`
- **Config**: `frontend/src/lib/target-savings/config.ts`
- **Components**: 
  - `frontend/src/components/target-savings/AutomationSheet.tsx`
  - `frontend/src/components/target-savings/AutomationStatusCard.tsx`
  - `frontend/src/components/target-savings/GoalCard.tsx`

---

**Last Updated**: October 2025
**Version**: 1.0
**Status**: ✅ Fully Implemented

