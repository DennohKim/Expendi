# Target Savings Hooks

This directory contains React hooks for interacting with the Goalz savings contract and subgraph.

## Query Hooks (Reading Data)

### `useSavingsGoals(userAddress?: Address)`

Fetches all savings goals for a specific user address from the subgraph.

**Features:**
- Automatically converts address to lowercase for subgraph compatibility
- Polls for updates every 10 seconds
- Transforms subgraph data to typed GoalCard objects
- Calculates progress, interest earned, and expiry status

**Usage:**
```typescript
import { useSavingsGoals } from '@/lib/target-savings';

function MyComponent() {
  const { goals, isLoading, error, refetch } = useSavingsGoals(userAddress);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {goals.map(goalCard => (
        <div key={goalCard.id.toString()}>
          {goalCard.goal.name} - {goalCard.progress.progressPercentage.toString()}%
        </div>
      ))}
    </div>
  );
}
```

### `useMyGoals()`

Convenience hook that fetches goals for the currently connected wallet.

**Usage:**
```typescript
import { useMyGoals } from '@/lib/target-savings';
import { useAccount } from 'wagmi';

function MyGoalsPage() {
  const { isConnected } = useAccount();
  const { goals, isLoading } = useMyGoals();
  
  if (!isConnected) return <div>Connect your wallet</div>;
  
  return <div>You have {goals.length} goals</div>;
}
```

### `useFilteredGoals(userAddress, filter, sort)`

Advanced hook with built-in filtering and sorting capabilities.

**Parameters:**
- `userAddress?: Address` - User's wallet address
- `filter: 'all' | 'active' | 'completed' | 'expired'` - Filter type
- `sort: 'newest' | 'deadline' | 'progress' | 'amount'` - Sort order

**Usage:**
```typescript
import { useFilteredGoals } from '@/lib/target-savings';

function FilteredGoalsList() {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'expired'>('all');
  const [sort, setSort] = useState<'newest' | 'deadline' | 'progress' | 'amount'>('newest');
  
  const { goals, isLoading } = useFilteredGoals(userAddress, filter, sort);
  
  return (
    <div>
      {/* Filter controls */}
      <select value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
        <option value="expired">Expired</option>
      </select>
      
      {/* Sort controls */}
      <select value={sort} onChange={e => setSort(e.target.value)}>
        <option value="newest">Newest First</option>
        <option value="deadline">By Deadline</option>
        <option value="progress">By Progress</option>
        <option value="amount">By Amount</option>
      </select>
      
      {/* Goals list */}
      {goals.map(goal => <GoalCard key={goal.id.toString()} {...goal} />)}
    </div>
  );
}
```

## Mutation Hooks (Writing Data)

### `useCreateGoal()`

Creates a new savings goal.

```typescript
const { createGoal, isPending, isConfirmed } = useCreateGoal();

createGoal({
  name: 'Vacation Fund',
  description: 'Save for summer vacation',
  targetAmount: parseUnits('1000', 6), // 1000 USDC
  deadline: BigInt(Math.floor(Date.now() / 1000) + 180 * 86400), // 180 days
  token: CONTRACTS.USDC,
});
```

### `useDepositToGoal()`

Deposits funds to an existing goal.

```typescript
const { depositToGoal, isPending, isConfirmed } = useDepositToGoal();

depositToGoal({
  goalId: BigInt(0),
  amount: parseUnits('100', 6), // 100 USDC
});
```

### `useWithdrawFromGoal()`

Withdraws all funds from a goal.

```typescript
const { withdrawFromGoal, isPending, isConfirmed } = useWithdrawFromGoal();

withdrawFromGoal({
  goalId: BigInt(0),
});
```

### `useTokenApproval()`

Approves tokens for the Goalz contract to spend.

```typescript
const { approveToken, isPending, isConfirmed } = useTokenApproval();

approveToken(
  CONTRACTS.USDC,
  parseUnits('1000', 6)
);
```

## Utility Hooks

### `useGoalzUtils()`

Provides formatting and validation utilities.

```typescript
const { 
  formatAmount,
  formatCurrency,
  formatDate,
  formatProgress,
  getDaysRemaining,
  validateGoalForm
} = useGoalzUtils();

// Format amounts
const formatted = formatAmount(BigInt('1000000'), 6); // "1.00"
const currency = formatCurrency(BigInt('1000000'), 6); // "$1.00"

// Format dates
const dateStr = formatDate(BigInt(1234567890)); // "Feb 14, 2009"

// Calculate days remaining
const days = getDaysRemaining(BigInt(Math.floor(Date.now() / 1000) + 86400 * 30)); // 30

// Validate form data
const errors = validateGoalForm(formData);
if (errors.length > 0) {
  console.log('Validation errors:', errors);
}
```

## Data Flow

1. **User Address**: The address from `useAccount()` is automatically converted to lowercase
2. **GraphQL Query**: Queries the subgraph with the lowercase address
3. **Data Transformation**: Raw subgraph data is transformed to typed TypeScript objects
4. **Progress Calculation**: Progress percentage, time left, and expiry status are calculated
5. **Interest Calculation**: Interest earned from vault shares is computed
6. **Filtering & Sorting**: Goals are filtered and sorted based on user preferences

## Important Notes

- **Address Format**: Always use lowercase addresses when querying the subgraph
- **Polling**: Goals are automatically refetched every 10 seconds
- **BigInt Types**: All amounts and timestamps use BigInt for precision
- **Decimals**: USDC uses 6 decimals (1 USDC = 1,000,000)
- **Apollo Provider**: Components must be wrapped in `GoalzApolloWrapper` to use these hooks

## Example: Complete Goal Workflow

```typescript
import { 
  useFilteredGoals,
  useCreateGoal,
  useDepositToGoal,
  useTokenApproval,
  useGoalzUtils 
} from '@/lib/target-savings';

function GoalsManager() {
  const { address } = useAccount();
  const { goals, isLoading } = useFilteredGoals(address, 'active', 'deadline');
  const { createGoal } = useCreateGoal();
  const { approveToken } = useTokenApproval();
  const { depositToGoal } = useDepositToGoal();
  const { parseAmount, formatCurrency } = useGoalzUtils();
  
  // 1. Create a new goal
  const handleCreateGoal = async () => {
    createGoal({
      name: 'Emergency Fund',
      description: 'Build 6 months of expenses',
      targetAmount: parseAmount('5000'),
      deadline: BigInt(Math.floor(Date.now() / 1000) + 365 * 86400),
      token: CONTRACTS.USDC,
    });
  };
  
  // 2. Approve tokens
  const handleApprove = async () => {
    approveToken(CONTRACTS.USDC, parseAmount('10000'));
  };
  
  // 3. Deposit to goal
  const handleDeposit = async (goalId: bigint) => {
    depositToGoal({
      goalId,
      amount: parseAmount('100'),
    });
  };
  
  return (
    <div>
      <button onClick={handleCreateGoal}>Create Goal</button>
      <button onClick={handleApprove}>Approve USDC</button>
      
      {goals.map(goalCard => (
        <div key={goalCard.id.toString()}>
          <h3>{goalCard.goal.name}</h3>
          <p>{formatCurrency(goalCard.goal.currentAmount)} / {formatCurrency(goalCard.goal.targetAmount)}</p>
          <button onClick={() => handleDeposit(goalCard.id)}>Deposit $100</button>
        </div>
      ))}
    </div>
  );
}
```

