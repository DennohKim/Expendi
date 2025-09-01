import { calculateB2CFee, calculateAmountWithFee, calculateUSDCAmountWithFee } from './feeCalculation';

// Demo function to show how fee calculation works
export function demonstrateFeeCalculation() {
  console.log('=== B2C Mobile Money Fee Calculation Demo ===\n');
  
  // Example 1: Small amount
  const smallAmount = 500;
  const smallFee = calculateB2CFee(smallAmount);
  console.log(`Amount: ${smallAmount} KES`);
  console.log(`Fee: ${smallFee} KES`);
  console.log(`Total: ${smallAmount + smallFee} KES\n`);
  
  // Example 2: Medium amount
  const mediumAmount = 5000;
  const mediumFee = calculateB2CFee(mediumAmount);
  console.log(`Amount: ${mediumAmount} KES`);
  console.log(`Fee: ${mediumFee} KES`);
  console.log(`Total: ${mediumAmount + mediumFee} KES\n`);
  
  // Example 3: Large amount
  const largeAmount = 25000;
  const largeFee = calculateB2CFee(largeAmount);
  console.log(`Amount: ${largeAmount} KES`);
  console.log(`Fee: ${largeFee} KES`);
  console.log(`Total: ${largeAmount + largeFee} KES\n`);
  
  // Example 4: USDC conversion with exchange rate
  const exchangeRate = 100; // 1 USDC = 100 KES
  const localAmount = 10000;
  const usdcCalculation = calculateUSDCAmountWithFee(localAmount, exchangeRate);
  
  console.log(`Local Amount: ${localAmount} KES`);
  console.log(`Exchange Rate: 1 USDC = ${exchangeRate} KES`);
  console.log(`Fee: ${usdcCalculation.feeLocal} KES`);
  console.log(`Total Local: ${usdcCalculation.totalLocal} KES`);
  console.log(`Base USDC: ${usdcCalculation.baseAmountUSDC.toFixed(2)} USDC`);
  console.log(`Fee USDC: ${usdcCalculation.feeUSDC.toFixed(2)} USDC`);
  console.log(`Total USDC: ${usdcCalculation.totalUSDC.toFixed(2)} USDC\n`);
  
  // Example 5: Show all fee tiers
  console.log('=== All Fee Tiers ===');
  const testAmounts = [0, 100, 500, 1000, 1500, 2500, 3500, 5000, 7500, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000, 70000, 250000];
  
  testAmounts.forEach(amount => {
    const fee = calculateB2CFee(amount);
    console.log(`${amount.toString().padStart(6)} KES -> ${fee.toString().padStart(3)} KES fee`);
  });
}

// Run demo if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).demonstrateFeeCalculation = demonstrateFeeCalculation;
} else {
  // Node.js environment
  demonstrateFeeCalculation();
}
