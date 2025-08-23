import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugUserTransactions() {
  const userId = 'base:0x9435184975f7dcd6d88b9efa7b9f4119c7cc810b';
  
  console.log(`\n=== DEBUG: Transaction Analysis for ${userId} ===\n`);
  
  // Get all transactions
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { blockTimestamp: 'desc' }
  });
  
  console.log(`Total transactions found: ${transactions.length}\n`);
  
  // Group by transaction type
  const byType = transactions.reduce((acc, t) => {
    if (!acc[t.type]) {
      acc[t.type] = {
        count: 0,
        totalAmount: 0,
        transactions: []
      };
    }
    acc[t.type].count++;
    acc[t.type].totalAmount += parseFloat(t.amount);
    acc[t.type].transactions.push({
      amount: t.amount,
      hash: t.transactionHash.slice(0, 10) + '...',
      timestamp: t.blockTimestamp.toISOString().slice(0, 19)
    });
    return acc;
  }, {} as any);
  
  // Print summary by type
  console.log('=== TRANSACTION SUMMARY BY TYPE ===');
  Object.entries(byType).forEach(([type, data]: [string, any]) => {
    console.log(`\n${type}:`);
    console.log(`  Count: ${data.count}`);
    console.log(`  Total Amount: ${data.totalAmount.toLocaleString()}`);
    console.log(`  Avg Amount: ${(data.totalAmount / data.count).toFixed(2)}`);
  });
  
  // Current calculation logic
  console.log('\n=== CURRENT CALCULATION LOGIC ===');
  
  const currentSpendingTypes = ['BUCKET_SPENDING', 'WITHDRAWAL', 'UNALLOCATED_WITHDRAW', 'EMERGENCY_WITHDRAW'];
  const currentDepositTypes = ['DEPOSIT', 'BUCKET_FUNDING'];
  
  const calculatedSpent = transactions
    .filter(t => currentSpendingTypes.includes(t.type))
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
  const calculatedDeposited = transactions
    .filter(t => currentDepositTypes.includes(t.type))
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  console.log(`Current Total Spent: ${calculatedSpent.toLocaleString()}`);
  console.log(`Current Total Deposited: ${calculatedDeposited.toLocaleString()}`);
  console.log(`Current Balance: ${(calculatedDeposited - calculatedSpent).toLocaleString()}`);
  
  // Alternative calculation including TRANSFER
  console.log('\n=== ALTERNATIVE: INCLUDING TRANSFER AS SPENDING ===');
  
  const altSpendingTypes = [...currentSpendingTypes, 'TRANSFER'];
  const altCalculatedSpent = transactions
    .filter(t => altSpendingTypes.includes(t.type))
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  console.log(`Alternative Total Spent: ${altCalculatedSpent.toLocaleString()}`);
  console.log(`Alternative Balance: ${(calculatedDeposited - altCalculatedSpent).toLocaleString()}`);
  
  // Show recent transactions
  console.log('\n=== RECENT TRANSACTIONS (Last 10) ===');
  transactions.slice(0, 10).forEach(t => {
    console.log(`${t.blockTimestamp.toISOString().slice(0, 19)} | ${t.type.padEnd(18)} | ${parseFloat(t.amount).toLocaleString().padStart(12)} | ${t.transactionHash.slice(0, 12)}...`);
  });
}

debugUserTransactions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());