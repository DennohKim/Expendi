const { PrismaClient } = require('@prisma/client');

async function simpleDebug() {
  const prisma = new PrismaClient();
  const userId = 'base:0x9435184975f7dcd6d88b9efa7b9f4119c7cc810b';
  
  console.log('=== DOCKER DATABASE SIMPLE DEBUG ===');
  
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { blockTimestamp: 'desc' }
  });
  
  console.log(`Total transactions: ${transactions.length}`);
  
  const spendingTransactions = transactions.filter(t => 
    ['BUCKET_SPENDING', 'WITHDRAWAL', 'UNALLOCATED_WITHDRAW', 'EMERGENCY_WITHDRAW'].includes(t.type)
  );
  
  const totalSpent = spendingTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  console.log(`Spending transactions: ${spendingTransactions.length}`);
  console.log(`Total spent: ${totalSpent}`);
  
  console.log('\nAll transactions:');
  transactions.forEach((t, i) => {
    console.log(`${i+1}. ${t.blockTimestamp.toISOString().slice(0, 19)} | ${t.type.padEnd(16)} | ${parseFloat(t.amount).toLocaleString().padStart(12)} | ${t.transactionHash.slice(0, 12)}...`);
  });
  
  await prisma.$disconnect();
}

simpleDebug().catch(console.error);