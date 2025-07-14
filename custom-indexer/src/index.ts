import { config } from './config/env';
import { testConnection as testDatabaseConnection } from './database/connection';
import { testConnection as testBlockchainConnection } from './blockchain/client';
import { startIndexer, stopIndexer } from './services/indexer';
import { startServer } from './api/server';

// Application state
let isShuttingDown = false;

// Initialize and start the application
const startApplication = async (): Promise<void> => {
  console.log('🚀 Starting Custom Smart Contract Indexer...');
  console.log('Configuration:');
  console.log(`  - Network: Base Sepolia (Chain ID: ${config.chainId})`);
  console.log(`  - RPC URL: ${config.rpcUrl}`);
  console.log(`  - Factory Contract: ${config.contracts.factory}`);
  console.log(`  - Budget Wallet Template: ${config.contracts.budgetWalletTemplate}`);
  console.log(`  - Mock USDC: ${config.contracts.mockUSDC}`);
  console.log(`  - API Port: ${config.app.port}`);
  
  try {
    // Test database connection
    console.log('📊 Testing database connection...');
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection successful');
    
    // Test blockchain connection
    console.log('🔗 Testing blockchain connection...');
    const blockchainConnected = await testBlockchainConnection();
    if (!blockchainConnected) {
      throw new Error('Blockchain connection failed');
    }
    console.log('✅ Blockchain connection successful');
    
    // Start API server
    console.log('🌐 Starting API server...');
    await startServer();
    console.log('✅ API server started successfully');
    
    // Start indexer service
    console.log('🔄 Starting indexer service...');
    await startIndexer();
    console.log('✅ Indexer service started successfully');
    
    console.log('🎉 Custom Smart Contract Indexer started successfully!');
    console.log(`📡 API available at: http://localhost:${config.app.port}`);
    console.log(`📊 Health check: http://localhost:${config.app.port}/api/health`);
    console.log(`📈 Status: http://localhost:${config.app.port}/api/status`);
    
  } catch (error) {
    console.error('💥 Failed to start application:', error);
    process.exit(1);
  }
};

// Graceful shutdown handler
const gracefulShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    console.log('🔄 Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Stop indexer service
    console.log('🔄 Stopping indexer service...');
    await stopIndexer();
    console.log('✅ Indexer service stopped');
    
    // Give some time for pending operations to complete
    console.log('⏳ Waiting for pending operations to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Application shutdown completed');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle process signals
const setupSignalHandlers = (): void => {
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });
};

// CLI commands
const handleCliCommand = async (command: string): Promise<void> => {
  const { syncManual } = await import('./services/indexer');
  
  switch (command) {
    case 'migrate':
      console.log('🔄 Running database migration...');
      const { runMigration } = await import('./database/migrate');
      await runMigration();
      console.log('✅ Database migration completed');
      process.exit(0);
      break;
      
    case 'sync':
      const fromBlock = process.argv[4] ? BigInt(process.argv[4]) : BigInt(config.startBlocks.factory);
      const toBlock = process.argv[5] ? BigInt(process.argv[5]) : await (await import('./blockchain/client')).getCurrentBlock();
      
      console.log(`🔄 Manual sync from block ${fromBlock} to ${toBlock}...`);
      await syncManual(fromBlock, toBlock);
      console.log('✅ Manual sync completed');
      process.exit(0);
      break;
      
    case 'test':
      console.log('🔄 Testing connections...');
      await testDatabaseConnection();
      await testBlockchainConnection();
      console.log('✅ Connection tests completed');
      process.exit(0);
      break;
      
    default:
      console.log('❌ Unknown command:', command);
      console.log('Available commands:');
      console.log('  - migrate: Run database migration');
      console.log('  - sync <fromBlock> <toBlock>: Manual sync for block range');
      console.log('  - test: Test database and blockchain connections');
      process.exit(1);
  }
};

// Main entry point
const main = async (): Promise<void> => {
  const command = process.argv[2];
  
  if (command) {
    await handleCliCommand(command);
    return;
  }
  
  // Setup signal handlers for graceful shutdown
  setupSignalHandlers();
  
  // Start the application
  await startApplication();
};

// Start the application
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});