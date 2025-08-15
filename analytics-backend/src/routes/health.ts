import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../lib/database';

const router: Router = Router();

router.get('/health', async (req: Request, res: Response) => {
  try {
    // Use shared prisma client
    const prisma = getPrismaClient();
    
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };
    
    res.json(status);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Use shared prisma client
    const prisma = getPrismaClient();
    
    // Check if we can perform basic operations
    const userCount = await prisma.user.count();
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: 'ready',
      userCount
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;