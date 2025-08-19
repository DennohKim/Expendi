#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const USER_WALLET = '0x9435184975f7dcd6d88b9efa7b9f4119c7cc810b';

async function checkUserTransactions() {
  const prisma = new PrismaClient();
  
  console.log('🔍 Checking transaction types for user:', USER_WALLET);
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
  
  try {
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // Find the user first
    const user = await prisma.user.findFirst({
      where: {
        walletAddress: USER_WALLET.toLowerCase()
      },
      include: {
        buckets: true
      }
    });
    
    if (!user) {
      console.log('❌ User not found in database');
      
      // Check if user exists with different casing
      const userAnyCase = await prisma.user.findFirst({
        where: {
          walletAddress: {
            contains: USER_WALLET.substring(2), // Remove 0x and search
            mode: 'insensitive'
          }
        }
      });
      
      if (userAnyCase) {
        console.log('🔍 Found user with different casing:', userAnyCase.walletAddress);
      } else {
        console.log('🔍 No user found with similar wallet address');
        
        // Show some example users
        const exampleUsers = await prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' }
        });
        
        console.log('\n📊 Example users in database:');
        exampleUsers.forEach(u => {
          console.log(`  - ${u.walletAddress} (${u.chainName})`);
        });
      }
      return;
    }
    
    console.log('\n✅ Found user:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Wallet: ${user.walletAddress}`);
    console.log(`   Chain: ${user.chainName}`);
    console.log(`   Total Balance: ${user.totalBalance}`);
    console.log(`   Total Spent: ${user.totalSpent}`);
    console.log(`   Buckets Count: ${user.bucketsCount}`);
    console.log(`   Active Buckets: ${user.buckets.length}`);
    
    // Get all transactions for this user
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        blockTimestamp: 'desc'
      },
      include: {
        bucket: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`\n📊 Found ${transactions.length} total transactions`);
    
    // Group transactions by type
    const transactionsByType = transactions.reduce((acc, tx) => {
      if (!acc[tx.type]) {
        acc[tx.type] = [];
      }
      acc[tx.type].push(tx);
      return acc;
    }, {} as Record<string, any[]>);
    
    console.log('\n📈 Transaction breakdown by type:');
    
    let totalCalculatedSpent = 0;
    let totalCalculatedDeposited = 0;
    
    // Define which transaction types count as spending vs deposits
    const spendingTypes = ['BUCKET_SPENDING', 'WITHDRAWAL', 'UNALLOCATED_WITHDRAW', 'EMERGENCY_WITHDRAW'];
    const depositTypes = ['DEPOSIT', 'BUCKET_FUNDING'];
    const transferTypes = ['TRANSFER']; // These might not affect balance
    
    Object.keys(transactionsByType).sort().forEach(type => {
      const txs = transactionsByType[type];
      const totalAmount = txs.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      const avgAmount = totalAmount / txs.length;
      
      console.log(`\n   ${type}:`);
      console.log(`     Count: ${txs.length}`);
      console.log(`     Total Amount: ${totalAmount.toFixed(6)}`);
      console.log(`     Average Amount: ${avgAmount.toFixed(6)}`);
      
      // Track spending vs deposits for our calculation
      if (spendingTypes.includes(type)) {
        totalCalculatedSpent += totalAmount;
      } else if (depositTypes.includes(type)) {
        totalCalculatedDeposited += totalAmount;
      }
      
      // Show recent transactions of this type
      console.log(`     Recent transactions:`);
      txs.slice(0, 3).forEach(tx => {
        const bucketName = tx.bucket?.name || 'No bucket';
        const date = tx.blockTimestamp.toISOString().split('T')[0];
        console.log(`       - ${tx.amount} (${bucketName}) on ${date}`);
      });
    });
    
    console.log('\n💰 Calculated totals:');
    console.log(`   Total Deposited: ${totalCalculatedDeposited.toFixed(6)}`);
    console.log(`   Total Spent: ${totalCalculatedSpent.toFixed(6)}`);
    console.log(`   Calculated Balance: ${(totalCalculatedDeposited - totalCalculatedSpent).toFixed(6)}`);
    
    console.log('\n📊 Database stored totals:');
    console.log(`   Stored Total Balance: ${user.totalBalance}`);
    console.log(`   Stored Total Spent: ${user.totalSpent}`);
    
    // Calculate differences
    const spentDifference = totalCalculatedSpent - parseFloat(user.totalSpent);
    const balanceDifference = (totalCalculatedDeposited - totalCalculatedSpent) - parseFloat(user.totalBalance);
    
    console.log('\n🔍 Differences:');
    console.log(`   Spent difference: ${spentDifference.toFixed(6)} (calculated - stored)`);
    console.log(`   Balance difference: ${balanceDifference.toFixed(6)} (calculated - stored)`);
    
    if (Math.abs(spentDifference) > 0.001) {
      console.log(`\n⚠️  SIGNIFICANT DIFFERENCE DETECTED!`);
      console.log(`   The calculated total spent (${totalCalculatedSpent.toFixed(6)}) differs from stored value (${user.totalSpent})`);
      console.log(`   This suggests there might be transaction types not included in the original calculation.`);
    }
    
    // Show all available transaction types from the enum
    console.log('\n📋 All possible transaction types from schema:');
    console.log('   - DEPOSIT (counted in deposits)');
    console.log('   - WITHDRAWAL (counted in spending)');
    console.log('   - TRANSFER (not counted in balance)');
    console.log('   - BUCKET_FUNDING (counted in deposits)');
    console.log('   - BUCKET_SPENDING (counted in spending)');
    console.log('   - UNALLOCATED_WITHDRAW (counted in spending)');
    console.log('   - EMERGENCY_WITHDRAW (counted in spending)');
    
    console.log('\n✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserTransactions().catch(console.error);