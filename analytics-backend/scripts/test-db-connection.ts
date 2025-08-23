#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

async function testDatabaseConnection() {
  const prisma = new PrismaClient();
  
  console.log('🔍 Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  try {
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // Try to query the users table
    const userCount = await prisma.user.count();
    console.log(`📊 Found ${userCount} users in database`);
    
    // Try to get the specific user
    const user = await prisma.user.findFirst({
      where: {
        walletAddress: '0x9435184975f7dcd6d88b9efa7b9f4119c7cc810b'
      }
    });
    
    if (user) {
      console.log('✅ Found user:', user.id);
      console.log('   Wallet:', user.walletAddress);
      console.log('   Chain:', user.chainName);
      console.log('   Balance:', user.totalBalance);
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection().catch(console.error);