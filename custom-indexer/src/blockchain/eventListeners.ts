import { Address, Log, getEventSelector, decodeEventLog } from 'viem';
import { publicClient } from './client';
import { factoryAbi, budgetWalletAbi, erc20Abi } from './abis';
import { config } from '../config/env';
import { IndexedEvent } from '../types';

// Event signature mappings
const eventSignatures = {
  WalletCreated: getEventSelector('WalletCreated(address,address,uint256)'),
  WalletRegistered: getEventSelector('WalletRegistered(address,address)'),
  OwnershipTransferred: getEventSelector('OwnershipTransferred(address,address)'),
  BucketCreated: getEventSelector('BucketCreated(address,string,uint256)'),
  BucketUpdated: getEventSelector('BucketUpdated(address,string,uint256,bool)'),
  BucketFunded: getEventSelector('BucketFunded(address,string,uint256,address)'),
  SpentFromBucket: getEventSelector('SpentFromBucket(address,string,uint256,address,address)'),
  BucketTransfer: getEventSelector('BucketTransfer(address,string,string,uint256,address)'),
  FundsDeposited: getEventSelector('FundsDeposited(address,uint256,address)'),
  MonthlyLimitReset: getEventSelector('MonthlyLimitReset(address,string)'),
  DelegateAdded: getEventSelector('DelegateAdded(address,address,string)'),
  DelegateRemoved: getEventSelector('DelegateRemoved(address,address,string)'),
  UnallocatedWithdraw: getEventSelector('UnallocatedWithdraw(address,address,uint256,address)'),
  EmergencyWithdraw: getEventSelector('EmergencyWithdraw(address,address,uint256)'),
  RoleGranted: getEventSelector('RoleGranted(bytes32,address,address)'),
  RoleRevoked: getEventSelector('RoleRevoked(bytes32,address,address)'),
  Transfer: getEventSelector('Transfer(address,address,uint256)'),
  Approval: getEventSelector('Approval(address,address,uint256)'),
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
      const args = decoded.args as unknown as { user: Address; wallet: Address; salt: bigint };
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
          salt: args.salt,
        },
        timestamp: new Date(),
        processed: false,
      };
    }
    
    if (decoded.eventName === 'WalletRegistered' && decoded.args) {
      const args = decoded.args as unknown as { user: Address; wallet: Address };
      return {
        contractAddress: log.address,
        eventName: 'WalletRegistered',
        blockNumber: log.blockNumber!,
        blockHash: log.blockHash!,
        transactionHash: log.transactionHash!,
        transactionIndex: log.transactionIndex!,
        logIndex: log.logIndex!,
        eventData: {
          user: args.user,
          wallet: args.wallet,
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
        const args = decoded.args as unknown as { user: Address; bucketName: string; monthlyLimit: bigint };
        return {
          ...baseEvent,
          eventName: 'BucketCreated',
          eventData: {
            user: args.user,
            bucketName: args.bucketName,
            monthlyLimit: args.monthlyLimit,
          },
        };
      }

      case 'BucketUpdated': {
        const args = decoded.args as unknown as { user: Address; bucketName: string; newLimit: bigint; active: boolean };
        return {
          ...baseEvent,
          eventName: 'BucketUpdated',
          eventData: {
            user: args.user,
            bucketName: args.bucketName,
            newLimit: args.newLimit,
            active: args.active,
          },
        };
      }

      case 'BucketFunded': {
        const args = decoded.args as unknown as { user: Address; bucketName: string; amount: bigint; token: Address };
        return {
          ...baseEvent,
          eventName: 'BucketFunded',
          eventData: {
            user: args.user,
            bucketName: args.bucketName,
            amount: args.amount,
            token: args.token,
          },
        };
      }

      case 'SpentFromBucket': {
        const args = decoded.args as unknown as { user: Address; bucketName: string; amount: bigint; recipient: Address; token: Address };
        return {
          ...baseEvent,
          eventName: 'SpentFromBucket',
          eventData: {
            user: args.user,
            bucketName: args.bucketName,
            amount: args.amount,
            recipient: args.recipient,
            token: args.token,
          },
        };
      }

      case 'BucketTransfer': {
        const args = decoded.args as unknown as { user: Address; fromBucket: string; toBucket: string; amount: bigint; token: Address };
        return {
          ...baseEvent,
          eventName: 'BucketTransfer',
          eventData: {
            user: args.user,
            fromBucket: args.fromBucket,
            toBucket: args.toBucket,
            amount: args.amount,
            token: args.token,
          },
        };
      }

      case 'FundsDeposited': {
        const args = decoded.args as unknown as { user: Address; amount: bigint; token: Address };
        return {
          ...baseEvent,
          eventName: 'FundsDeposited',
          eventData: {
            user: args.user,
            amount: args.amount,
            token: args.token,
          },
        };
      }

      case 'DelegateAdded': {
        const args = decoded.args as unknown as { user: Address; delegate: Address; bucketName: string };
        return {
          ...baseEvent,
          eventName: 'DelegateAdded',
          eventData: {
            user: args.user,
            delegate: args.delegate,
            bucketName: args.bucketName,
          },
        };
      }

      case 'DelegateRemoved': {
        const args = decoded.args as unknown as { user: Address; delegate: Address; bucketName: string };
        return {
          ...baseEvent,
          eventName: 'DelegateRemoved',
          eventData: {
            user: args.user,
            delegate: args.delegate,
            bucketName: args.bucketName,
          },
        };
      }

      case 'RoleGranted': {
        const args = decoded.args as unknown as { role: string; account: Address; sender: Address };
        return {
          ...baseEvent,
          eventName: 'RoleGranted',
          eventData: {
            role: args.role,
            account: args.account,
            sender: args.sender,
          },
        };
      }

      case 'RoleRevoked': {
        const args = decoded.args as unknown as { role: string; account: Address; sender: Address };
        return {
          ...baseEvent,
          eventName: 'RoleRevoked',
          eventData: {
            role: args.role,
            account: args.account,
            sender: args.sender,
          },
        };
      }

      case 'UnallocatedWithdraw': {
        const args = decoded.args as unknown as { user: Address; token: Address; amount: bigint; recipient: Address };
        return {
          ...baseEvent,
          eventName: 'UnallocatedWithdraw',
          eventData: {
            user: args.user,
            token: args.token,
            amount: args.amount,
            recipient: args.recipient,
          },
        };
      }

      case 'EmergencyWithdraw': {
        const args = decoded.args as unknown as { user: Address; token: Address; amount: bigint };
        return {
          ...baseEvent,
          eventName: 'EmergencyWithdraw',
          eventData: {
            user: args.user,
            token: args.token,
            amount: args.amount,
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

    if (!decoded.args || !decoded.eventName) return null;

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
    
    if (decoded.eventName === 'OwnershipTransferred' && decoded.args) {
      const args = decoded.args as unknown as { previousOwner: Address; newOwner: Address };
      return {
        contractAddress: log.address,
        eventName: 'OwnershipTransferred',
        blockNumber: log.blockNumber!,
        blockHash: log.blockHash!,
        transactionHash: log.transactionHash!,
        transactionIndex: log.transactionIndex!,
        logIndex: log.logIndex!,
        eventData: {
          previousOwner: args.previousOwner,
          newOwner: args.newOwner,
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
    [eventSignatures.WalletCreated, eventSignatures.WalletRegistered]
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
      eventSignatures.BucketUpdated,
      eventSignatures.BucketFunded,
      eventSignatures.SpentFromBucket,
      eventSignatures.BucketTransfer,
      eventSignatures.FundsDeposited,
      eventSignatures.MonthlyLimitReset,
      eventSignatures.DelegateAdded,
      eventSignatures.DelegateRemoved,
      eventSignatures.EmergencyWithdraw,
      eventSignatures.RoleGranted,
      eventSignatures.RoleRevoked,
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