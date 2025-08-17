#!/usr/bin/env tsx

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const SUBGRAPH_URL = process.env.SUBGRAPH_URL_BASE_MAINNET;
const USER_ADDRESS = '0x9435184975f7dcD6D88B9EFa7B9F4119c7Cc810B';

async function checkUserInSubgraph() {
  console.log('🔍 Checking if user exists in subgraph...');
  console.log('User address:', USER_ADDRESS);
  console.log('Subgraph URL:', SUBGRAPH_URL);

  // Check if user exists
  const userQuery = `
    query GetUser {
      user(id: "${USER_ADDRESS.toLowerCase()}") {
        id
        totalBalance
        totalSpent
        bucketsCount
        createdAt
        updatedAt
        buckets {
          id
          name
          balance
          monthlySpent
          monthlyLimit
          active
        }
      }
    }
  `;

  try {
    console.log('\n👤 Checking user...');
    const userResponse = await axios.post(SUBGRAPH_URL, {
      query: userQuery
    });
    
    if (userResponse.data.errors) {
      console.error('User query errors:', userResponse.data.errors);
    } else if (userResponse.data.data.user) {
      console.log('✅ User found in subgraph!');
      console.log('User data:', JSON.stringify(userResponse.data.data.user, null, 2));
    } else {
      console.log('❌ User not found in subgraph');
      
      // Let's see what users do exist
      const usersQuery = `
        query GetSomeUsers {
          users(first: 10, orderBy: createdAt, orderDirection: desc) {
            id
            totalBalance
            totalSpent
            bucketsCount
          }
        }
      `;
      
      console.log('\n📊 Here are some users that do exist:');
      const usersResponse = await axios.post(SUBGRAPH_URL, {
        query: usersQuery
      });
      
      if (usersResponse.data.errors) {
        console.error('Users query errors:', usersResponse.data.errors);
      } else {
        console.log('Recent users:');
        usersResponse.data.data.users.forEach((user: any, index: number) => {
          console.log(`  ${index + 1}. ${user.id} - Balance: ${user.totalBalance}, Spent: ${user.totalSpent}, Buckets: ${user.bucketsCount}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Query failed:', error);
  }
}

checkUserInSubgraph().catch(console.error);