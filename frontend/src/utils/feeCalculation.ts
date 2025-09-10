// B2C Mobile Money Fee Tiers (KES)
export const B2C_FEE_TIERS = [
  { min: 0, max: 100, fee: 1 },
  { min: 101, max: 500, fee: 8 },
  { min: 501, max: 1000, fee: 12 },
  { min: 1001, max: 1500, fee: 20 },
  { min: 1501, max: 2500, fee: 22 },
  { min: 2501, max: 3500, fee: 25 },
  { min: 3501, max: 5000, fee: 27 },
  { min: 5001, max: 7500, fee: 30 },
  { min: 7501, max: 10000, fee: 35 },
  { min: 10001, max: 15000, fee: 37 },
  { min: 15001, max: 20000, fee: 40 },
  { min: 20001, max: 25000, fee: 43 },
  { min: 25001, max: 30000, fee: 45 },
  { min: 30001, max: 35000, fee: 50 },
  { min: 35001, max: 40000, fee: 60 },
  { min: 40001, max: 45000, fee: 70 },
  { min: 45001, max: 50000, fee: 80 },
  { min: 50001, max: 70000, fee: 100 },
  { min: 70001, max: 250000, fee: 150 },
];

/**
 * Calculate the fee for a given amount based on B2C mobile money tiers
 * @param amount - The amount in local currency (KES)
 * @returns The fee amount
 */
export function calculateB2CFee(amount: number): number {
  const tier = B2C_FEE_TIERS.find(tier => amount >= tier.min && amount <= tier.max);
  const baseFee = tier ? tier.fee : 150; // Default to highest fee if amount exceeds all tiers
  
  // Apply 30% discount to all tiers except the lowest tier (0-100 KES with 1 KES fee)
  if (tier && !(tier.min === 0 && tier.max === 100 && tier.fee === 1)) {
    return Math.round(baseFee * 0.70); // 30% discount
  }
  
  return baseFee; // No discount for the lowest tier
}

/**
 * Calculate the total amount including fee
 * @param baseAmount - The base amount in local currency
 * @returns Object containing base amount, fee, and total
 */
export function calculateAmountWithFee(baseAmount: number) {
  const fee = calculateB2CFee(baseAmount);
  const total = baseAmount + fee;
  
  return {
    baseAmount,
    fee,
    total,
    hasFee: fee > 0
  };
}

/**
 * Calculate the USDC equivalent amount including fee
 * @param localAmount - The local currency amount
 * @param exchangeRate - Exchange rate from USDC to local currency
 * @returns Object containing USDC amounts and local fee
 */
export function calculateUSDCAmountWithFee(localAmount: number, exchangeRate: number) {
  const fee = calculateB2CFee(localAmount);
  const totalLocal = localAmount + fee;
  const totalUSDC = totalLocal / exchangeRate;
  const baseUSDC = localAmount / exchangeRate;
  const feeUSDC = fee / exchangeRate;
  
  
  return {
    baseAmountLocal: localAmount,
    feeLocal: fee,
    totalLocal,
    baseAmountUSDC: baseUSDC,
    feeUSDC,
    totalUSDC,
    hasFee: fee > 0
  };
}
