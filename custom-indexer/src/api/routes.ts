import { Router, Request, Response } from 'express';
import type { Express } from 'express';
import { Address } from 'viem';
import { 
  getEventsByContract, 
  getEventsByQuery, 
  getWalletsByUser, 
  getBucketsByWallet, 
  getSpendingByWallet,
  getIndexerStatus
} from '../database/models';
import { getIndexerInfo } from '../services/indexer';
import { ApiResponse, EventQueryParams } from '../types';

const router: Router = Router();

// Helper function to create API response
const createResponse = <T>(data?: T, error?: string): ApiResponse<T> => ({
  success: !error,
  data,
  error,
});

// Helper function to parse query parameters
const parseQueryParams = (req: Request): EventQueryParams => {
  const {
    contractAddress,
    eventName,
    blockNumber,
    transactionHash,
    user,
    wallet,
    bucketId,
    page = '1',
    limit = '100',
    startBlock,
    endBlock,
  } = req.query;

  return {
    contractAddress: contractAddress as Address,
    eventName: eventName as string,
    blockNumber: blockNumber ? BigInt(blockNumber as string) : undefined,
    transactionHash: transactionHash as `0x${string}`,
    user: user as Address,
    wallet: wallet as Address,
    bucketId: bucketId ? BigInt(bucketId as string) : undefined,
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    startBlock: startBlock ? BigInt(startBlock as string) : undefined,
    endBlock: endBlock ? BigInt(endBlock as string) : undefined,
  };
};

// Get all events with filtering
router.get('/events', async (req: Request, res: Response) => {
  try {
    const params = parseQueryParams(req);
    const events = await getEventsByQuery(params);
    
    res.json(createResponse(events));
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch events'));
  }
});

// Get events by contract address
router.get('/events/contract/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { page = '1', limit = '100' } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const events = await getEventsByContract(address as Address, parseInt(limit as string), offset);
    
    res.json(createResponse(events));
  } catch (error) {
    console.error('Error fetching events by contract:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch events'));
  }
});

// Get wallets by user address
router.get('/wallets/user/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const wallets = await getWalletsByUser(address as Address);
    
    res.json(createResponse(wallets));
  } catch (error) {
    console.error('Error fetching wallets by user:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch wallets'));
  }
});

// Get buckets by wallet address
router.get('/buckets/wallet/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const buckets = await getBucketsByWallet(address as Address);
    
    res.json(createResponse(buckets));
  } catch (error) {
    console.error('Error fetching buckets by wallet:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch buckets'));
  }
});

// Get spending records by wallet address
router.get('/spending/wallet/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { limit = '100' } = req.query;
    
    const spending = await getSpendingByWallet(address as Address, parseInt(limit as string));
    
    res.json(createResponse(spending));
  } catch (error) {
    console.error('Error fetching spending by wallet:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch spending'));
  }
});

// Get indexer status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const indexerInfo = getIndexerInfo();
    res.json(createResponse(indexerInfo));
  } catch (error) {
    console.error('Error fetching indexer status:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch status'));
  }
});

// Get indexer status for specific contract
router.get('/status/contract/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const status = await getIndexerStatus(address as Address);
    
    res.json(createResponse(status));
  } catch (error) {
    console.error('Error fetching contract indexer status:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch contract status'));
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json(createResponse({ status: 'healthy', timestamp: new Date().toISOString() }));
});

// Get factory events specifically
router.get('/factory/events', async (req: Request, res: Response) => {
  try {
    const params = parseQueryParams(req);
    params.eventName = 'WalletCreated';
    
    const events = await getEventsByQuery(params);
    
    res.json(createResponse(events));
  } catch (error) {
    console.error('Error fetching factory events:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch factory events'));
  }
});

// Get bucket events for a specific wallet
router.get('/wallet/:address/buckets/events', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const params = parseQueryParams(req);
    params.contractAddress = address as Address;
    params.eventName = 'BucketCreated';
    
    const events = await getEventsByQuery(params);
    
    res.json(createResponse(events));
  } catch (error) {
    console.error('Error fetching bucket events:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch bucket events'));
  }
});

// Get spending events for a specific wallet
router.get('/wallet/:address/spending/events', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const params = parseQueryParams(req);
    params.contractAddress = address as Address;
    params.eventName = 'Spending';
    
    const events = await getEventsByQuery(params);
    
    res.json(createResponse(events));
  } catch (error) {
    console.error('Error fetching spending events:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch spending events'));
  }
});

// Get token transfer events
router.get('/tokens/transfers', async (req: Request, res: Response) => {
  try {
    const params = parseQueryParams(req);
    params.eventName = 'Transfer';
    
    const events = await getEventsByQuery(params);
    
    res.json(createResponse(events));
  } catch (error) {
    console.error('Error fetching token transfer events:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch token transfers'));
  }
});

export default router;