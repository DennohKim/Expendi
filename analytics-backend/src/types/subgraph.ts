export interface SubgraphUser {
  id: string;
  totalBalance: string;
  totalSpent: string;
  bucketsCount: string;
  createdAt: string;
  updatedAt: string;
  buckets: SubgraphBucket[];
}

export interface SubgraphBucket {
  id: string;
  name: string;
  balance: string;
  monthlySpent: string;
  monthlyLimit: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
  };
  transactions: SubgraphTransaction[];
}

export interface SubgraphTransaction {
  id: string;
  bucket?: {
    id: string;
    name: string;
  };
  amount: string;
  tokenAddress: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface SubgraphDeposit extends SubgraphTransaction {
  type: 'DIRECT_DEPOSIT' | 'BUCKET_FUNDING';
  user: {
    id: string;
  };
}

export interface SubgraphWithdrawal extends SubgraphTransaction {
  type: 'BUCKET_SPENDING' | 'UNALLOCATED_WITHDRAW' | 'EMERGENCY_WITHDRAW';
  recipient: string;
  user: {
    id: string;
  };
}

export interface SubgraphBucketTransfer extends SubgraphTransaction {
  fromBucket: {
    id: string;
    name: string;
  };
  toBucket: {
    id: string;
    name: string;
  };
  user: {
    id: string;
  };
}

export interface SubgraphResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: string[];
  }>;
}