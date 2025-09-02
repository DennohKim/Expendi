# Fee Calculation System

feat: add This directory contains the fee calculation logic for B2C payments (Mobile Money, Paybill, and Buy Goods) based on the official fee tiers.

## Files

- `feeCalculation.ts` - Main fee calculation functions
- `feeCalculationDemo.ts` - Demo and examples
- `__tests__/feeCalculation.test.ts` - Unit tests

## Fee Tiers

The system implements the following B2C mobile money fee structure:

| Amount Range (KES) | Fee (KES) |
|-------------------|-----------|
| 0 - 100          | 1         |
| 101 - 500        | 8         |
| 501 - 1000       | 12        |
| 1001 - 1500      | 20        |
| 1501 - 2500      | 22        |
| 2501 - 3500      | 25        |
| 3501 - 5000      | 27        |
| 5001 - 7500      | 30        |
| 7501 - 10000     | 35        |
| 10001 - 15000    | 37        |
| 15001 - 20000    | 40        |
| 20001 - 25000    | 43        |
| 25001 - 30000    | 45        |
| 30001 - 35000    | 50        |
| 35001 - 40000    | 60        |
| 40001 - 45000    | 70        |
| 45001 - 50000    | 80        |
| 50001 - 70000    | 100        |
| 70001 - 250000   | 150        |

## Functions

### `calculateB2CFee(amount: number): number`
Calculates the fee for a given amount based on the B2C tiers.

**Parameters:**
- `amount`: Amount in local currency (KES)

**Returns:**
- Fee amount in local currency

**Example:**
```typescript
const fee = calculateB2CFee(1000); // Returns 12
```

### `calculateAmountWithFee(baseAmount: number)`
Calculates the total amount including fee.

**Parameters:**
- `baseAmount`: Base amount in local currency

**Returns:**
- Object with `baseAmount`, `fee`, `total`, and `hasFee`

**Example:**
```typescript
const result = calculateAmountWithFee(1000);
// Returns: { baseAmount: 1000, fee: 12, total: 1012, hasFee: true }
```

### `calculateUSDCAmountWithFee(localAmount: number, exchangeRate: number)`
Calculates USDC equivalent amounts including fee.

**Parameters:**
- `localAmount`: Amount in local currency
- `exchangeRate`: Exchange rate from USDC to local currency

**Returns:**
- Object with both local and USDC amounts, fees, and totals

**Example:**
```typescript
const result = calculateUSDCAmountWithFee(1000, 100);
// Returns: { 
//   baseAmountLocal: 1000, feeLocal: 12, totalLocal: 1012,
//   baseAmountUSDC: 10, feeUSDC: 0.12, totalUSDC: 10.12,
//   hasFee: true 
// }
```

## Usage in Components

### QuickSpendBucket Component
The component now displays dynamic fees based on the amount entered:

```typescript
import { calculateAmountWithFee } from '@/utils/feeCalculation';

// In the exchange rate display section
const feeCalculation = calculateAmountWithFee(parseFloat(amount));
const fee = feeCalculation.fee;
const total = feeCalculation.total;
```

### PaymentStatusModal Component
The modal now shows the correct fee breakdown:

```typescript
import { calculateAmountWithFee } from '@/utils/feeCalculation';

// Fee calculation is handled automatically in the modal
const { baseAmount, fee, total, hasFee } = calculateAmountBreakdown(paymentStatus.data.data.amount);
```

### useBucketPayment Hook
The hook now calculates the correct USDC amount to spend:

```typescript
import { calculateUSDCAmountWithFee } from '@/utils/feeCalculation';

// Calculate fee based on B2C tiers
const feeCalculation = calculateUSDCAmountWithFee(localAmount, exchangeRate || 1);
const usdcAmountToSpend = feeCalculation.totalUSDC.toString();
```

## Testing

Run the tests to verify the fee calculation logic:

```bash
# If you have a test runner configured
pnpm test feeCalculation.test.ts

# Or run the demo to see examples
# The demo function is available in the browser console as `demonstrateFeeCalculation()`
```

## Notes

- Fees are always calculated in local currency (KES) first
- USDC amounts are calculated by dividing local amounts by the exchange rate
- The system automatically handles edge cases and provides sensible defaults
- All fee calculations are deterministic and follow the official tier structure
