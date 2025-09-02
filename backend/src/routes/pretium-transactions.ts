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
    public_name: z.string().nullable(),
    receipt_number: z.string().nullable(),
    category: z.enum(['DISBURSEMENT', 'COLLECTION']),
    chain: z.string().nullable(),
    asset: z.string().nullable(),
    transaction_hash: z.string().nullable(),
    message: z.string().nullable(),
    currency_code: z.string().nullable(),
    is_released: z.boolean(),
    created_at: z.string()
  }),
  user_address: z.string()
});

const createPretiumTransactionRouter = (prisma: PrismaClient): express.Router => {
  const router = express.Router();

  router.post('/transactions', async (req, res) => {
    try {
      const validatedData = pretiumTransactionSchema.parse(req.body);
      const { data: txData, user_address } = validatedData;

      const transaction = await prisma.pretiumTransaction.upsert({
        where: {
          transactionCode: txData.transaction_code
        },
        update: {
          userAddress: user_address,
          status: txData.status as PretiumStatus,
          amount: txData.amount,
          amountInUsd: txData.amount_in_usd,
          type: txData.type as PretiumTransactionType,
          ...(txData.shortcode !== null && { shortcode: txData.shortcode }),
          ...(txData.account_number !== null && { accountNumber: txData.account_number }),
          ...(txData.public_name !== null && { publicName: txData.public_name }),
          ...(txData.receipt_number !== null && { receiptNumber: txData.receipt_number }),
          category: txData.category as PretiumCategory,
          ...(txData.chain !== null && { chain: txData.chain }),
          ...(txData.asset !== null && { asset: txData.asset }),
          ...(txData.transaction_hash !== null && { transactionHash: txData.transaction_hash }),
          ...(txData.message !== null && { message: txData.message }),
          ...(txData.currency_code !== null && { currencyCode: txData.currency_code }),
          isReleased: txData.is_released,
          pretiumCreatedAt: new Date(txData.created_at)
        },
        create: {
          pretiumId: txData.id,
          transactionCode: txData.transaction_code,
          userAddress: user_address,
          status: txData.status as PretiumStatus,
          amount: txData.amount,
          amountInUsd: txData.amount_in_usd,
          type: txData.type as PretiumTransactionType,
          ...(txData.shortcode && { shortcode: txData.shortcode }),
          ...(txData.account_number && { accountNumber: txData.account_number }),
          ...(txData.public_name && { publicName: txData.public_name }),
          ...(txData.receipt_number && { receiptNumber: txData.receipt_number }),
          category: txData.category as PretiumCategory,
          ...(txData.chain && { chain: txData.chain }),
          ...(txData.asset && { asset: txData.asset }),
          ...(txData.transaction_hash && { transactionHash: txData.transaction_hash }),
          ...(txData.message && { message: txData.message }),
          ...(txData.currency_code && { currencyCode: txData.currency_code }),
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
        userAddress,
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
      
      if (userAddress) {
        where.userAddress = userAddress;
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