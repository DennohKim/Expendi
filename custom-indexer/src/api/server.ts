import express, { Express } from 'express';
import cors from 'cors';
import { config } from '../config/env';
import routes from './routes';

// Create Express app
const createApp = (): Express => {
  const app = express();

  // Middleware
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }));
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // API routes
  app.use('/api', routes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'Custom Smart Contract Indexer API',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        status: '/api/status',
        events: '/api/events',
        wallets: '/api/wallets/user/:address',
        buckets: '/api/buckets/wallet/:address',
        spending: '/api/spending/wallet/:address',
      },
    });
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.path,
    });
  });

  return app;
};

// Start server
export const startServer = async (): Promise<void> => {
  const app = createApp();
  const port = config.app.port;

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`API server running on port ${port}`);
      console.log(`API documentation available at http://localhost:${port}`);
      resolve();
    });

    server.on('error', (error) => {
      console.error('Failed to start API server:', error);
      reject(error);
    });
  });
};

export { createApp };