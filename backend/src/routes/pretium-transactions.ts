import express from 'express';
import { z } from 'zod';
import { PrismaClient, PretiumStatus, PretiumTransactionType, PretiumCategory } from '@prisma/client';

const pretiumTransactionSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.object({
    id: z.number(),
    transaction_code: z.string(),
    status: z.enum(['COMPLETE', 'PENDING', 'FAILED']),
    amount: z.string(),
    amount_in_usd: z.string(),
    type: z.enum(['MOBILE', 'BANK', 'PAYBILL', 'BUY_GOODS']),
    shortcode: z.string().nullable(),
    account_number: z.string().nullable(),
    public_name: z.string(),
    receipt_number: z.string(),
    category: z.enum(['DISBURSEMENT', 'COLLECTION']),
    chain: z.string(),
    asset: z.string(),
    transaction_hash: z.string().nullable(),
    message: z.string(),
    currency_code: z.string(),
    is_released: z.boolean(),
    created_at: z.string()
  })
});

const createPretiumTransactionRouter = (prisma: PrismaClient): express.Router => {
  const router = express.Router();

  router.post('/transactions', async (req, res) => {
    try {
      const validatedData = pretiumTransactionSchema.parse(req.body);
      const { data: txData } = validatedData;

      const transaction = await prisma.pretiumTransaction.upsert({
        where: {
          transactionCode: txData.transaction_code
        },
        update: {
          status: txData.status as PretiumStatus,
          amount: txData.amount,
          amountInUsd: txData.amount_in_usd,
          type: txData.type as PretiumTransactionType,
          shortcode: txData.shortcode,
          accountNumber: txData.account_number,
          publicName: txData.public_name,
          receiptNumber: txData.receipt_number,
          category: txData.category as PretiumCategory,
          chain: txData.chain,
          asset: txData.asset,
          transactionHash: txData.transaction_hash,
          message: txData.message,
          currencyCode: txData.currency_code,
          isReleased: txData.is_released,
          pretiumCreatedAt: new Date(txData.created_at)
        },
        create: {
          pretiumId: txData.id,
          transactionCode: txData.transaction_code,
          status: txData.status as PretiumStatus,
          amount: txData.amount,
          amountInUsd: txData.amount_in_usd,
          type: txData.type as PretiumTransactionType,
          shortcode: txData.shortcode,
          accountNumber: txData.account_number,
          publicName: txData.public_name,
          receiptNumber: txData.receipt_number,
          category: txData.category as PretiumCategory,
          chain: txData.chain,
          asset: txData.asset,
          transactionHash: txData.transaction_hash,
          message: txData.message,
          currencyCode: txData.currency_code,
          isReleased: txData.is_released,
          pretiumCreatedAt: new Date(txData.created_at)
        }
      });

      return res.status(201).json({
        success: true,
        data: transaction
      });
    } catch (error) {
      console.error('Error saving Pretium transaction:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to save transaction'
      });
    }
  });

  router.get('/transactions', async (req, res) => {
    try {
      const {
        status,
        category,
        chain,
        limit = '50',
        offset = '0',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (category) {
        where.category = category;
      }
      
      if (chain) {
        where.chain = chain;
      }

      const orderBy: any = {};
      orderBy[sortBy as string] = sortOrder;

      const [transactions, total] = await prisma.$transaction([
        prisma.pretiumTransaction.findMany({
          where,
          orderBy,
          take: parseInt(limit as string),
          skip: parseInt(offset as string)
        }),
        prisma.pretiumTransaction.count({ where })
      ]);

      return res.json({
        success: true,
        data: transactions,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + transactions.length < total
        }
      });
    } catch (error) {
      console.error('Error fetching Pretium transactions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions'
      });
    }
  });

  router.get('/transactions/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const transaction = await prisma.pretiumTransaction.findUnique({
        where: { id }
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      return res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      console.error('Error fetching Pretium transaction:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction'
      });
    }
  });

  router.get('/transactions/by-code/:transactionCode', async (req, res) => {
    try {
      const { transactionCode } = req.params;

      const transaction = await prisma.pretiumTransaction.findUnique({
        where: { transactionCode }
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      return res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      console.error('Error fetching Pretium transaction by code:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction'
      });
    }
  });

  return router;
};

export default createPretiumTransactionRouter;