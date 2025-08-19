const { PrismaClient } = require('@prisma/client');

async function debugDatabase() {
  const prisma = new PrismaClient();
  const userId = 'base:0x9435184975f7dcd6d88b9efa7b9f4119c7cc810b';
  
  console.log('=== DOCKER DATABASE DEBUG ===');
  
  // Count all transactions
  const totalTransactions = await prisma.transaction.count({
    where: { userId }
  });
  
  console.log(`Total transactions for user: ${totalTransactions}`);
  
  // Get transaction types breakdown
  const transactionTypes = await prisma.transaction.groupBy({
    by: ['type'],
    where: { userId },
    _count: { type: true },
    _sum: { amount: true }
  });
  
  console.log('\nTransaction breakdown:');
  transactionTypes.forEach(t => {
    console.log(`${t.type}: ${t._count.type} transactions, Total: ${t._sum.amount}`);
  });
  
  // Get recent transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { blockTimestamp: 'desc' },
    take: 5,
    select: {
      type: true,
      amount: true,
      blockTimestamp: true,
      transactionHash: true
    }
  });
  
  console.log('\nRecent transactions:');
  recentTransactions.forEach(t => {
    console.log(`${t.blockTimestamp.toISOString()} | ${t.type} | ${t.amount} | ${t.transactionHash.slice(0, 12)}...`);
  });
  
  await prisma.$disconnect();
}

debugDatabase().catch(console.error);