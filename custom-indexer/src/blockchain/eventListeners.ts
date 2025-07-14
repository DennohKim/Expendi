import { Address, Log, getEventSelector, decodeEventLog } from 'viem';
import { publicClient } from './client';
import { factoryAbi, budgetWalletAbi, erc20Abi } from './abis';
import { config } from '../config/env';
import { IndexedEvent } from '../types';

// Event signature mappings
const eventSignatures = {
  WalletCreated: getEventSelector('WalletCreated(address,address,address)'),
  BucketCreated: getEventSelector('BucketCreated(uint256,string,uint256,address)'),
  Spending: getEventSelector('Spending(uint256,uint256,address,address)'),
  BucketLimitUpdated: getEventSelector('BucketLimitUpdated(uint256,uint256)'),
  DelegatePermissionChanged: getEventSelector('DelegatePermissionChanged(address,uint256,bool)'),
  Transfer: getEventSelector('Transfer(address,address,uint256)'),
} as const;

// Get logs for a specific contract and block range
export const getLogsForContract = async (
  contractAddress: Address,
  fromBlock: bigint,
  toBlock: bigint,
  eventSignatures?: `0x${string}`[]
): Promise<Log[]> => {
  try {
    const logs = await publicClient.getLogs({
      address: contractAddress,
      fromBlock,
      toBlock,
      ...(eventSignatures && { topics: [eventSignatures] }),
    });
    return logs;
  } catch (error) {
    console.error(`Error fetching logs for contract ${contractAddress}:`, error);
    return [];
  }
};

// Get logs for multiple contracts
export const getLogsForContracts = async (
  contractAddresses: Address[],
  fromBlock: bigint,
  toBlock: bigint,
  eventSignatures?: `0x${string}`[]
): Promise<Log[]> => {
  try {
    const logs = await publicClient.getLogs({
      address: contractAddresses,
      fromBlock,
      toBlock,
      ...(eventSignatures && { topics: [eventSignatures] }),
    });
    return logs;
  } catch (error) {
    console.error(`Error fetching logs for contracts ${contractAddresses}:`, error);
    return [];
  }
};

// Parse factory events
export const parseFactoryEvent = (log: Log): IndexedEvent | null => {
  try {
    const decoded = decodeEventLog({
      abi: factoryAbi,
      data: log.data,
      topics: log.topics,
    });

    if (decoded.eventName === 'WalletCreated' && decoded.args) {
      const args = decoded.args as unknown as { user: Address; wallet: Address; template: Address };
      return {
        contractAddress: log.address,
        eventName: 'WalletCreated',
        blockNumber: log.blockNumber!,
        blockHash: log.blockHash!,
        transactionHash: log.transactionHash!,
        transactionIndex: log.transactionIndex!,
        logIndex: log.logIndex!,
        eventData: {
          user: args.user,
          wallet: args.wallet,
          template: args.template,
        },
        timestamp: new Date(),
        processed: false,
      };
    }
    return null;
  } catch (error) {
    console.error('Error parsing factory event:', error);
    return null;
  }
};

// Parse budget wallet events
export const parseBudgetWalletEvent = (log: Log): IndexedEvent | null => {
  try {
    const decoded = decodeEventLog({
      abi: budgetWalletAbi,
      data: log.data,
      topics: log.topics,
    });

    if (!decoded.args || !decoded.eventName) return null;

    const baseEvent = {
      contractAddress: log.address,
      blockNumber: log.blockNumber!,
      blockHash: log.blockHash!,
      transactionHash: log.transactionHash!,
      transactionIndex: log.transactionIndex!,
      logIndex: log.logIndex!,
      timestamp: new Date(),
      processed: false,
    };

    switch (decoded.eventName) {
      case 'BucketCreated': {
        const args = decoded.args as unknown as { bucketId: bigint; name: string; monthlyLimit: bigint; token: Address };
        return {
          ...baseEvent,
          eventName: 'BucketCreated',
          eventData: {
            bucketId: args.bucketId,
            name: args.name,
            monthlyLimit: args.monthlyLimit,
            token: args.token,
          },
        };
      }

      case 'Spending': {
        const args = decoded.args as unknown as { bucketId: bigint; amount: bigint; recipient: Address; token: Address };
        return {
          ...baseEvent,
          eventName: 'Spending',
          eventData: {
            bucketId: args.bucketId,
            amount: args.amount,
            recipient: args.recipient,
            token: args.token,
          },
        };
      }

      case 'BucketLimitUpdated': {
        const args = decoded.args as unknown as { bucketId: bigint; newLimit: bigint };
        return {
          ...baseEvent,
          eventName: 'BucketLimitUpdated',
          eventData: {
            bucketId: args.bucketId,
            newLimit: args.newLimit,
          },
        };
      }

      case 'DelegatePermissionChanged': {
        const args = decoded.args as unknown as { delegate: Address; bucketId: bigint; canSpend: boolean };
        return {
          ...baseEvent,
          eventName: 'DelegatePermissionChanged',
          eventData: {
            delegate: args.delegate,
            bucketId: args.bucketId,
            canSpend: args.canSpend,
          },
        };
      }

      default:
        return null;
    }
  } catch (error) {
    console.error('Error parsing budget wallet event:', error);
    return null;
  }
};

// Parse ERC20 token events
export const parseTokenEvent = (log: Log): IndexedEvent | null => {
  try {
    const decoded = decodeEventLog({
      abi: erc20Abi,
      data: log.data,
      topics: log.topics,
    });

    if (decoded.eventName === 'Transfer' && decoded.args) {
      const args = decoded.args as unknown as { from: Address; to: Address; value: bigint };
      return {
        contractAddress: log.address,
        eventName: 'Transfer',
        blockNumber: log.blockNumber!,
        blockHash: log.blockHash!,
        transactionHash: log.transactionHash!,
        transactionIndex: log.transactionIndex!,
        logIndex: log.logIndex!,
        eventData: {
          from: args.from,
          to: args.to,
          value: args.value,
        },
        timestamp: new Date(),
        processed: false,
      };
    }
    return null;
  } catch (error) {
    console.error('Error parsing token event:', error);
    return null;
  }
};

// Get factory events for a block range
export const getFactoryEvents = async (
  fromBlock: bigint,
  toBlock: bigint
): Promise<IndexedEvent[]> => {
  const logs = await getLogsForContract(
    config.contracts.factory as Address,
    fromBlock,
    toBlock,
    [eventSignatures.WalletCreated]
  );

  const events: IndexedEvent[] = [];
  for (const log of logs) {
    const event = parseFactoryEvent(log);
    if (event) {
      events.push(event);
    }
  }
  return events;
};

// Get budget wallet events for specific wallets
export const getBudgetWalletEvents = async (
  walletAddresses: Address[],
  fromBlock: bigint,
  toBlock: bigint
): Promise<IndexedEvent[]> => {
  const logs = await getLogsForContracts(
    walletAddresses,
    fromBlock,
    toBlock,
    [
      eventSignatures.BucketCreated,
      eventSignatures.Spending,
      eventSignatures.BucketLimitUpdated,
      eventSignatures.DelegatePermissionChanged,
    ]
  );

  const events: IndexedEvent[] = [];
  for (const log of logs) {
    const event = parseBudgetWalletEvent(log);
    if (event) {
      events.push(event);
    }
  }
  return events;
};

// Get token transfer events
export const getTokenEvents = async (
  fromBlock: bigint,
  toBlock: bigint
): Promise<IndexedEvent[]> => {
  const logs = await getLogsForContract(
    config.contracts.mockUSDC as Address,
    fromBlock,
    toBlock,
    [eventSignatures.Transfer]
  );

  const events: IndexedEvent[] = [];
  for (const log of logs) {
    const event = parseTokenEvent(log);
    if (event) {
      events.push(event);
    }
  }
  return events;
};

// Get all events for a block range
export const getAllEvents = async (
  fromBlock: bigint,
  toBlock: bigint,
  walletAddresses: Address[] = []
): Promise<IndexedEvent[]> => {
  const [factoryEvents, tokenEvents] = await Promise.all([
    getFactoryEvents(fromBlock, toBlock),
    getTokenEvents(fromBlock, toBlock),
  ]);

  let budgetWalletEvents: IndexedEvent[] = [];
  if (walletAddresses.length > 0) {
    budgetWalletEvents = await getBudgetWalletEvents(walletAddresses, fromBlock, toBlock);
  }

  return [...factoryEvents, ...budgetWalletEvents, ...tokenEvents];
};

// Get block timestamp
export const getBlockTimestamp = async (blockNumber: bigint): Promise<Date> => {
  try {
    const block = await publicClient.getBlock({ blockNumber });
    return new Date(Number(block.timestamp) * 1000);
  } catch (error) {
    console.error(`Error getting block timestamp for block ${blockNumber}:`, error);
    return new Date();
  }
};

// Batch process events with timestamps
export const processEventsWithTimestamps = async (events: IndexedEvent[]): Promise<IndexedEvent[]> => {
  const blockNumbers = [...new Set(events.map(e => e.blockNumber))];
  const blockTimestamps = new Map<bigint, Date>();

  // Fetch timestamps for all unique blocks
  for (const blockNumber of blockNumbers) {
    const timestamp = await getBlockTimestamp(blockNumber);
    blockTimestamps.set(blockNumber, timestamp);
  }

  // Apply timestamps to events
  return events.map(event => ({
    ...event,
    timestamp: blockTimestamps.get(event.blockNumber) || new Date(),
  }));
};