#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const USER_WALLET = '0x9435184975f7dcd6d88b9efa7b9f4119c7cc810b';

async function checkMissingTransactionTypes() {
  const prisma = new PrismaClient();
  
  console.log('🔍 Checking for any transaction types that might be missing from calculations...');
  
  try {
    await prisma.$connect();
    
    // Get all unique transaction types in the database
    const allTransactionTypes = await prisma.transaction.groupBy({
      by: ['type'],
      _count: {
        type: true
      },
      orderBy: {
        _count: {
          type: 'desc'
        }
      }
    });
    
    console.log('\n📊 All transaction types found in database:');
    allTransactionTypes.forEach(type => {
      console.log(`   ${type.type}: ${type._count.type} transactions`);
    });
    
    // Get transaction types for our specific user
    const user = await prisma.user.findFirst({
      where: {
        walletAddress: USER_WALLET.toLowerCase()
      }
    });
    
    if (user) {
      const userTransactionTypes = await prisma.transaction.groupBy({
        where: {
          userId: user.id
        },
        by: ['type'],
        _count: {
          type: true
        },
        orderBy: {
          _count: {
            type: 'desc'
          }
        }
      });
      
      console.log(`\n📊 Transaction types for user ${USER_WALLET}:`);
      
      // Get sum amounts separately for each type
      for (const typeInfo of userTransactionTypes) {
        const transactions = await prisma.transaction.findMany({
          where: {
            userId: user.id,
            type: typeInfo.type
          },
          select: {
            amount: true
          }
        });
        
        const sum = transactions.reduce((total, tx) => total + parseFloat(tx.amount), 0);
        console.log(`   ${typeInfo.type}: ${typeInfo._count.type} transactions, Total: ${sum.toFixed(2)}`);
      }
      
      // Check what's included in current analytics calculation
      const currentSpendingTypes = ['BUCKET_SPENDING', 'WITHDRAWAL', 'UNALLOCATED_WITHDRAW', 'EMERGENCY_WITHDRAW'];
      const currentDepositTypes = ['DEPOSIT', 'BUCKET_FUNDING'];
      
      console.log('\n🧮 Current analytics calculation includes:');
      console.log('   Spending types:', currentSpendingTypes.join(', '));
      console.log('   Deposit types:', currentDepositTypes.join(', '));
      
      // Find any transaction types not included in current calculation
      const userTypes = userTransactionTypes.map(t => t.type);
      const unaccountedTypes = userTypes.filter(type => 
        !currentSpendingTypes.includes(type) && !currentDepositTypes.includes(type)
      );
      
      if (unaccountedTypes.length > 0) {
        console.log('\n⚠️  Transaction types NOT included in current calculation:');
        for (const type of unaccountedTypes) {
          const typeData = userTransactionTypes.find(t => t.type === type);
          const transactions = await prisma.transaction.findMany({
            where: {
              userId: user.id,
              type: type
            },
            select: {
              amount: true
            }
          });
          const sum = transactions.reduce((total, tx) => total + parseFloat(tx.amount), 0);
          console.log(`   ${type}: ${typeData?._count.type} transactions, Total: ${sum.toFixed(2)}`);
        }
      } else {
        console.log('\n✅ All user transaction types are included in current calculation');
      }
      
      // Double-check with manual calculation from analytics.ts logic
      const userTransactions = await prisma.transaction.findMany({
        where: { userId: user.id }
      });
      
      const manualTotalSpent = userTransactions
        .filter(t => currentSpendingTypes.includes(t.type))
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const manualTotalDeposited = userTransactions
        .filter(t => currentDepositTypes.includes(t.type))
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      console.log('\n🔄 Manual verification using analytics.ts logic:');
      console.log(`   Manual calculated spent: ${manualTotalSpent.toFixed(2)}`);
      console.log(`   Manual calculated deposited: ${manualTotalDeposited.toFixed(2)}`);
      console.log(`   Manual calculated balance: ${(manualTotalDeposited - manualTotalSpent).toFixed(2)}`);
      console.log(`   Database stored spent: ${user.totalSpent}`);
      console.log(`   Database stored balance: ${user.totalBalance}`);
      
      const spentMatch = Math.abs(manualTotalSpent - parseFloat(user.totalSpent)) < 0.01;
      const balanceFromCalc = manualTotalDeposited - manualTotalSpent;
      const balanceMatch = Math.abs(balanceFromCalc - parseFloat(user.totalBalance)) < 0.01;
      
      console.log(`\n✅ Verification results:`);
      console.log(`   Spent calculation matches: ${spentMatch ? 'YES' : 'NO'}`);
      console.log(`   Balance calculation matches: ${balanceMatch ? 'YES' : 'NO'}`);
      
      if (!spentMatch || !balanceMatch) {
        console.log('\n🔍 Investigating discrepancy...');
        
        // Check if there are any TRANSFER transactions that might affect balance
        const transfers = userTransactions.filter(t => t.type === 'TRANSFER');
        if (transfers.length > 0) {
          const totalTransfers = transfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
          console.log(`   Found ${transfers.length} TRANSFER transactions totaling: ${totalTransfers.toFixed(2)}`);
          console.log(`   These might affect balance but aren't included in deposit/spending calculations`);
        }
      }
      
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMissingTransactionTypes().catch(console.error);