#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { createMultiChainSubgraphService } from '../src/lib/multi-chain-subgraph';
import { createSubgraphService } from '../src/lib/subgraph';
import { syncAllChains, syncChain, syncUserAcrossChains, fullSync } from '../src/lib/sync';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🚀 Manual Sync Script Starting...');
  console.log('Command:', command);
  
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    switch (command) {
      case 'all-chains':
        console.log('🌐 Syncing all supported chains...');
        const multiChainService = createMultiChainSubgraphService();
        await syncAllChains(prisma, multiChainService)();
        break;

      case 'chain':
        const chainName = args[1];
        if (!chainName) {
          console.error('❌ Please specify a chain name');
          console.log('Usage: npm run sync:manual chain <chain-name>');
          console.log('Available chains: base, base-sepolia, celo, celo-alfajores, scroll, scroll-sepolia');
          process.exit(1);
        }
        console.log(`🔗 Syncing chain: ${chainName}`);
        const chainService = createMultiChainSubgraphService();
        await syncChain(prisma, chainService)(chainName);
        break;

      case 'user':
        const walletAddress = args[1];
        if (!walletAddress) {
          console.error('❌ Please specify a wallet address');
          console.log('Usage: npm run sync:manual user <wallet-address>');
          process.exit(1);
        }
        console.log(`👤 Syncing user: ${walletAddress}`);
        const userService = createMultiChainSubgraphService();
        await syncUserAcrossChains(prisma, userService)(walletAddress);
        break;

      case 'base-legacy':
        console.log('🔄 Running legacy Base mainnet sync...');
        const legacyService = createSubgraphService(
          process.env.SUBGRAPH_URL_BASE_MAINNET || ''
        );
        await fullSync(prisma, legacyService)();
        break;

      case 'status':
        console.log('📊 Checking chain status...');
        const statusService = createMultiChainSubgraphService();
        const status = await statusService.getChainStatus();
        console.log('Chain Status:');
        Object.entries(status).forEach(([chain, info]) => {
          const statusIcon = info.available ? '✅' : '❌';
          console.log(`  ${statusIcon} ${chain}: ${info.available ? 'Available' : 'Unavailable'}`);
          if (info.lastBlock) {
            console.log(`    Last block: ${info.lastBlock}`);
          }
          if (info.error) {
            console.log(`    Error: ${info.error}`);
          }
        });
        break;

      case 'help':
      case '--help':
      case '-h':
        printHelp();
        break;

      default:
        console.error('❌ Unknown command');
        printHelp();
        process.exit(1);
    }

    console.log('✅ Sync completed successfully!');
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function printHelp() {
  console.log(`
📚 Manual Sync Script Help

Usage: npm run sync:manual <command> [options]

Commands:
  all-chains              Sync all supported chains
  chain <name>           Sync specific chain (base, base-sepolia, celo, etc.)
  user <wallet-address>  Sync specific user across all chains
  base-legacy           Run legacy Base mainnet sync
  status                Check status of all chains
  help                  Show this help message

Examples:
  npm run sync:manual all-chains
  npm run sync:manual chain base
  npm run sync:manual user 0x1234567890abcdef1234567890abcdef12345678
  npm run sync:manual status
  npm run sync:manual base-legacy

Available Chains:
  - base (Base Mainnet)
  - base-sepolia (Base Sepolia Testnet)
  - celo (Celo Mainnet)
  - celo-alfajores (Celo Alfajores Testnet)
  - scroll (Scroll Mainnet)
  - scroll-sepolia (Scroll Sepolia Testnet)

Note: Only chains with configured subgraph URLs will be available.
`);
}

main().catch(console.error);