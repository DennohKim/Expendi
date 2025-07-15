import { Router, Request, Response } from 'express';
import type { Express } from 'express';
import { Address } from 'viem';
import { 
  getEventsByContract, 
  getEventsByQuery, 
  getWalletsByUser, 
  getBucketsByWallet, 
  getSpendingByWallet,
  getIndexerStatus,
  getTransfersByWallet,
  getTransfersByType,
  getTransfersByToken,
  getWithdrawalsByWallet,
  getWithdrawalsByUser,
  getWithdrawalsByType
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

// Get classified transfers by wallet
router.get('/transfers/wallet/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { limit = '100' } = req.query;
    
    const transfers = await getTransfersByWallet(address as Address, parseInt(limit as string));
    
    res.json(createResponse(transfers));
  } catch (error) {
    console.error('Error fetching transfers by wallet:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch transfers'));
  }
});

// Get transfers by type (deposit, withdrawal, bucket_transfer, external)
router.get('/transfers/type/:type', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const { limit = '100' } = req.query;
    
    if (!['deposit', 'withdrawal', 'bucket_transfer', 'external'].includes(type)) {
      res.status(400).json(createResponse(undefined, 'Invalid transfer type'));
      return;
    }
    
    const transfers = await getTransfersByType(type, parseInt(limit as string));
    
    res.json(createResponse(transfers));
  } catch (error) {
    console.error('Error fetching transfers by type:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch transfers'));
  }
});

// Get transfers by token address
router.get('/transfers/token/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { limit = '100' } = req.query;
    
    const transfers = await getTransfersByToken(address as Address, parseInt(limit as string));
    
    res.json(createResponse(transfers));
  } catch (error) {
    console.error('Error fetching transfers by token:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch transfers'));
  }
});

// Get wallet deposits (transfers TO a wallet)
router.get('/wallet/:address/deposits', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { limit = '100' } = req.query;
    
    const transfers = await getTransfersByWallet(address as Address, parseInt(limit as string));
    // Filter for deposits only
    const deposits = transfers.filter(t => t.transfer_type === 'deposit' && t.to_address.toLowerCase() === (address as string).toLowerCase());
    
    res.json(createResponse(deposits));
  } catch (error) {
    console.error('Error fetching wallet deposits:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch deposits'));
  }
});

// Get wallet withdrawals (transfers FROM a wallet)
router.get('/wallet/:address/withdrawals', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { limit = '100' } = req.query;
    
    const transfers = await getTransfersByWallet(address as Address, parseInt(limit as string));
    // Filter for withdrawals only
    const withdrawals = transfers.filter(t => t.transfer_type === 'withdrawal' && t.from_address.toLowerCase() === (address as string).toLowerCase());
    
    res.json(createResponse(withdrawals));
  } catch (error) {
    console.error('Error fetching wallet withdrawals:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch withdrawals'));
  }
});

// Get structured withdrawals by wallet address
router.get('/wallet/:address/structured-withdrawals', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { limit = '100', offset = '0' } = req.query;
    
    const withdrawals = await getWithdrawalsByWallet(
      address as Address, 
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    res.json(createResponse(withdrawals));
  } catch (error) {
    console.error('Error fetching structured withdrawals:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch structured withdrawals'));
  }
});

// Get structured withdrawals by user address
router.get('/user/:address/withdrawals', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { limit = '100', offset = '0' } = req.query;
    
    const withdrawals = await getWithdrawalsByUser(
      address as Address, 
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    res.json(createResponse(withdrawals));
  } catch (error) {
    console.error('Error fetching user withdrawals:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch user withdrawals'));
  }
});

// Get withdrawals by type (unallocated or emergency)
router.get('/withdrawals/type/:type', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const { limit = '100', offset = '0' } = req.query;
    
    if (type !== 'unallocated' && type !== 'emergency') {
      res.status(400).json(createResponse(undefined, 'Invalid withdrawal type. Must be "unallocated" or "emergency"'));
      return;
    }
    
    const withdrawals = await getWithdrawalsByType(
      type as 'unallocated' | 'emergency',
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    res.json(createResponse(withdrawals));
  } catch (error) {
    console.error('Error fetching withdrawals by type:', error);
    res.status(500).json(createResponse(undefined, 'Failed to fetch withdrawals by type'));
  }
});

export default router;