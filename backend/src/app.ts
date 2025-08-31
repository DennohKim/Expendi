import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from './lib/database';

// Import functional services
import { createSubgraphService } from './lib/subgraph';
import { createMultiChainSubgraphService } from './lib/multi-chain-subgraph';
import { syncAllChains, syncChain, syncUserAcrossChains, fullSync } from './lib/sync';
import { createAnalyticsService } from './lib/analytics';
import { createCronService, CronService } from './lib/cron';

// Import routes
import createAnalyticsRouter from './routes/functional-analytics';
import createMultiChainAnalyticsRouter from './routes/functional-multi-chain-analytics';
import createPretiumTransactionRouter from './routes/pretium-transactions';
import healthRoutes from './routes/health';

// Initialize services
const initializeServices = () => {
  const prisma = getPrismaClient();
  const multiChainSubgraph = createMultiChainSubgraphService();
  const analyticsService = createAnalyticsService(prisma);
  const cronService = createCronService(prisma);

  return {
    prisma,
    multiChainSubgraph,
    analyticsService,
    cronService,
    // Legacy single-chain service for backward compatibility
    legacySubgraph: createSubgraphService(
      process.env.SUBGRAPH_URL_BASE_MAINNET || 
      process.env.SUBGRAPH_URL_BASE_SEPOLIA || ''
    )
  };
};

// Create Express application
export const createApp = (): { app: express.Application; services: ReturnType<typeof initializeServices> } => {
  const app = express();
  const services = initializeServices();

  // Trust proxy for production deployments (Railway, Heroku, etc.)
  app.set('trust proxy', true);

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }));

  // Rate limiting with trusted proxy configuration
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    // Disable validation to prevent trust proxy warnings in production
    validate: false
  });
  app.use('/api/', limiter);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // Share prisma instance with routes
  app.locals.prisma = services.prisma;

  // Routes
  app.use('/', healthRoutes);
  app.use('/api/analytics', createAnalyticsRouter(services.prisma));
  app.use('/api/v2/analytics', createMultiChainAnalyticsRouter(services.prisma));
  app.use('/api/pretium', createPretiumTransactionRouter(services.prisma));

  // Sync endpoints (enabled in development or when explicitly enabled)
  if (process.env.NODE_ENV === 'development' || process.env.ENABLE_SYNC_ENDPOINTS === 'true') {
    console.log('🔧 Manual sync endpoints enabled');

    // Multi-chain sync endpoints
    app.post('/api/v2/sync/all-chains', async (req, res) => {
      try {
        console.log('🔄 Starting manual multi-chain sync...');
        await syncAllChains(services.prisma, services.multiChainSubgraph)();
        res.json({ success: true, message: 'Multi-chain sync completed' });
      } catch (error) {
        console.error('Multi-chain sync failed:', error);
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Multi-chain sync failed' 
        });
      }
    });

    app.post('/api/v2/sync/chain/:chainName', async (req, res) => {
      try {
        const { chainName } = req.params;
        console.log(`🔄 Starting manual sync for ${chainName}...`);
        await syncChain(services.prisma, services.multiChainSubgraph)(chainName);
        res.json({ success: true, message: `Sync completed for ${chainName}` });
      } catch (error) {
        console.error(`Chain sync failed for ${req.params.chainName}:`, error);
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Chain sync failed' 
        });
      }
    });

    app.post('/api/v2/sync/user/:walletAddress', async (req, res) => {
      try {
        const { walletAddress } = req.params;
        console.log(`🔄 Starting user sync for ${walletAddress} across all chains...`);
        await syncUserAcrossChains(services.prisma, services.multiChainSubgraph)(walletAddress);
        res.json({ success: true, message: `User ${walletAddress} synced across all chains` });
      } catch (error) {
        console.error(`User sync failed for ${req.params.walletAddress}:`, error);
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'User sync failed' 
        });
      }
    });

    // Chain status endpoint
    app.get('/api/v2/chains/status', async (req, res) => {
      try {
        const status = await services.multiChainSubgraph.getChainStatus();
        res.json({ success: true, data: status });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get chain status' 
        });
      }
    });

    // Cron job status endpoint
    app.get('/api/v2/cron/status', (req, res) => {
      try {
        const status = services.cronService.getStatus();
        res.json({ success: true, data: status });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get cron status' 
        });
      }
    });

    // Start/stop cron jobs endpoints
    app.post('/api/v2/cron/start', (req, res) => {
      try {
        services.cronService.start();
        res.json({ success: true, message: 'Cron jobs started' });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to start cron jobs' 
        });
      }
    });

    app.post('/api/v2/cron/stop', (req, res) => {
      try {
        services.cronService.stop();
        res.json({ success: true, message: 'Cron jobs stopped' });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to stop cron jobs' 
        });
      }
    });

    // Legacy single-chain sync endpoint for backward compatibility
    app.post('/api/sync/full', async (req, res) => {
      try {
        console.log('Starting legacy full sync...');
        await fullSync(services.prisma, services.legacySubgraph)();
        res.json({ success: true, message: 'Full sync completed' });
      } catch (error) {
        console.error('Legacy sync failed:', error);
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Sync failed' 
        });
      }
    });

    // Manual analytics calculation endpoint
    app.post('/api/analytics/calculate/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { month } = req.body;
        
        const currentMonth = month || new Date().toISOString().substring(0, 7);
        
        console.log(`📊 Calculating analytics for user ${userId}, month ${currentMonth}`);
        await services.analyticsService.calculateMonthlyAnalytics(userId, currentMonth);
        
        res.json({ 
          success: true, 
          message: `Analytics calculated for ${userId} in ${currentMonth}` 
        });
      } catch (error) {
        console.error('Manual analytics calculation failed:', error);
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Analytics calculation failed' 
        });
      }
    });
  }

  // Global error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  });

  // 404 handler
  app.use((req: express.Request, res: express.Response) => {
    res.status(404).json({
      success: false,
      error: `Route ${req.method} ${req.path} not found`
    });
  });

  return { app, services };
};

// Graceful shutdown handler  
export const setupGracefulShutdown = (services: { prisma: PrismaClient; cronService: CronService }) => {
  const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    
    // Stop cron jobs first
    services.cronService.stop();
    
    // Disconnect database
    await services.prisma.$disconnect();
    
    process.exit(0);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
};

// Start server function
export const startServer = async (port: number = 3001) => {
  try {
    const { app, services } = createApp();

    // Test database connection
    await services.prisma.$connect();
    console.log('Database connected successfully');

    // Cron jobs disabled - using manual sync only to reduce subgraph requests
    console.log('⚠️ Cron jobs disabled - using manual sync only to reduce subgraph requests');

    // Setup graceful shutdown
    setupGracefulShutdown({ prisma: services.prisma, cronService: services.cronService });

    // Start HTTP server
    const server = app.listen(port, () => {
      console.log(`🚀 Analytics Backend server running on port ${port}`);
      console.log(`📊 Health check available at http://localhost:${port}/health`);
      console.log(`📈 Analytics API available at http://localhost:${port}/api/analytics`);
      console.log(`🌐 Multi-chain API available at http://localhost:${port}/api/v2/analytics`);
      console.log(`💳 Pretium Transactions API available at http://localhost:${port}/api/pretium`);
      
      if (process.env.NODE_ENV === 'development' || process.env.ENABLE_SYNC_ENDPOINTS === 'true') {
        console.log('🔄 Sync endpoints available');
        console.log('💡 Use /api/v2/sync/* endpoints for multi-chain operations');
      }
    });

    return { server, services };
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};