// @ts-nocheck
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { createSubscriptionService } from '../lib/subscription-service';
import { createSubscriptionCharger } from '../lib/subscription-charger';
import { getBaseClient } from '../lib/base-client';

const createSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  payerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  name: z.string().min(1, 'Subscription name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  recurringAmount: z.string().regex(/^\d+(\.\d+)?$/, 'Invalid amount format'),
  periodInDays: z.number().int().min(0).max(365, 'Period must be between 0 and 365 days'), // Allow 0 for custom dates
  customBillingDate: z.string().datetime().optional(), // ISO datetime string
  testnet: z.boolean().default(false),
}).refine((data) => {
  // If periodInDays is 0, customBillingDate must be provided
  if (data.periodInDays === 0 && !data.customBillingDate) {
    return false;
  }
  // If customBillingDate is provided, periodInDays should be 0
  if (data.customBillingDate && data.periodInDays !== 0) {
    return false;
  }
  return true;
}, {
  message: "Custom billing date is required when period is 0, and period must be 0 when custom date is provided"
});

const updateSubscriptionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().min(1).optional(),
});

const subscriptionQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'FAILED']).optional(),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export default function createSubscriptionRouter(prisma: PrismaClient): express.Router {
  const router = express.Router();
  const subscriptionService = createSubscriptionService(prisma);
  
  // Middleware to validate user ID (you might want to implement proper auth)
  const validateUser = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User ID required' });
      return;
    }
    req.userId = userId;
    next();
  };

  // Create Subscription
  router.post('/', validateUser, async (req: express.Request, res) => {
    try {
      const validatedData = createSubscriptionSchema.parse(req.body);
      
      // Validate subscription ownership
      const baseClient = getBaseClient(validatedData.testnet);
      const isValidOwnership = await baseClient.validateSubscriptionOwnership(
        validatedData.subscriptionId,
        validatedData.payerAddress as `0x${string}`
      );
      
      if (!isValidOwnership) {
        res.status(400).json({
          success: false,
          error: 'Invalid subscription ownership',
        });
        return;
      }

      const subscription = await subscriptionService.createSubscription(req.userId!, {
        ...validatedData,
        chainId: validatedData.testnet ? 84532 : 8453,
      });

      res.status(201).json({
        success: true,
        data: { subscription },
      });
    } catch (error) {
      console.error('Create subscription error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription',
      });
    }
  });

  // Get User Subscriptions
  router.get('/', validateUser, async (req: express.Request, res) => {
    try {
      const filters = subscriptionQuerySchema.parse(req.query);
      const result = await subscriptionService.getUserSubscriptions(req.userId!, filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Get subscriptions error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscriptions',
      });
    }
  });

  // Get Subscription Details
  router.get('/:id', validateUser, async (req: express.Request, res) => {
    try {
      const { id } = req.params;
      const subscription = await subscriptionService.getSubscriptionById(id, req.userId!);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found',
        });
      }

      res.json({
        success: true,
        data: { subscription },
      });
    } catch (error) {
      console.error('Get subscription details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscription details',
      });
    }
  });

  // Update Subscription
  router.patch('/:id', validateUser, async (req: express.Request, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateSubscriptionSchema.parse(req.body);

      const subscription = await subscriptionService.updateSubscription(id, req.userId!, validatedData);

      res.json({
        success: true,
        data: { subscription },
      });
    } catch (error) {
      console.error('Update subscription error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update subscription',
      });
    }
  });

  // Pause Subscription
  router.post('/:id/pause', validateUser, async (req: express.Request, res) => {
    try {
      const { id } = req.params;
      const subscription = await subscriptionService.pauseSubscription(id, req.userId!);

      res.json({
        success: true,
        data: { subscription },
      });
    } catch (error) {
      console.error('Pause subscription error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pause subscription',
      });
    }
  });

  // Resume Subscription
  router.post('/:id/resume', validateUser, async (req: express.Request, res) => {
    try {
      const { id } = req.params;
      const subscription = await subscriptionService.resumeSubscription(id, req.userId!);

      res.json({
        success: true,
        data: { subscription },
      });
    } catch (error) {
      console.error('Resume subscription error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume subscription',
      });
    }
  });

  // Cancel Subscription
  router.delete('/:id', validateUser, async (req: express.Request, res) => {
    try {
      const { id } = req.params;
      await subscriptionService.cancelSubscription(id, req.userId!);

      res.json({
        success: true,
        message: 'Subscription cancelled successfully',
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      });
    }
  });

  // Check Subscription Status (from Base SDK)
  router.get('/:id/status', validateUser, async (req: express.Request, res) => {
    try {
      const { id } = req.params;
      const subscription = await subscriptionService.getSubscriptionById(id, req.userId!);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found',
        });
      }

      const baseClient = getBaseClient(subscription.testnet);
      const status = await baseClient.getSubscriptionStatus(subscription.subscriptionId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Check subscription status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check subscription status',
      });
    }
  });

  // Get Transaction History
  router.get('/:id/transactions', validateUser, async (req: express.Request, res) => {
    try {
      const { id } = req.params;
      const subscription = await subscriptionService.getSubscriptionById(id, req.userId!);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found',
        });
      }

      res.json({
        success: true,
        data: { transactions: (subscription as any).transactions || [] },
      });
    } catch (error) {
      console.error('Get transaction history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction history',
      });
    }
  });

  // Admin endpoint: Force charge subscription (development only)
  if (process.env.NODE_ENV === 'development') {
    router.post('/:id/charge', validateUser, async (req: express.Request, res) => {
      try {
        const { id } = req.params;
        const subscription = await subscriptionService.getSubscriptionById(id, req.userId!);

        if (!subscription) {
          return res.status(404).json({
            success: false,
            error: 'Subscription not found',
          });
        }

        const charger = createSubscriptionCharger(prisma, subscriptionService);
        const result = await charger.processSubscription(subscription);

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error('Force charge subscription error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to charge subscription',
        });
      }
    });
  }

  return router;
}

// Extend Express Request interface  
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}