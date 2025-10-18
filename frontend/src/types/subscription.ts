export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';

export type TransactionStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'INSUFFICIENT_FUNDS' 
  | 'CANCELLED_BY_USER';

export type SubscriptionAction = 
  | 'CREATED' 
  | 'ACTIVATED' 
  | 'PAUSED' 
  | 'RESUMED' 
  | 'CANCELLED' 
  | 'CHARGED' 
  | 'CHARGE_FAILED' 
  | 'UPDATED' 
  | 'EXPIRED';

export interface Subscription {
  id: string;
  userId: string;
  subscriptionId: string;
  payerAddress: string;
  ownerAddress: string;
  name: string;
  description?: string;
  category: string;
  recurringAmount: string;
  currency: string;
  periodInDays: number;
  status: SubscriptionStatus;
  isActive: boolean;
  nextChargeDate: string;
  lastChargeDate?: string;
  lastCheckDate?: string;
  startDate: string;
  endDate?: string;
  pausedAt?: string;
  cancelledAt?: string;
  chainId: number;
  testnet: boolean;
  createdAt: string;
  updatedAt: string;
  transactions?: SubscriptionTransaction[];
  history?: SubscriptionHistory[];
}

export interface SubscriptionTransaction {
  id: string;
  subscriptionId: string;
  amount: string;
  currency: string;
  status: TransactionStatus;
  transactionHashes: string[];
  blockNumber?: string;
  gasUsed?: string;
  attemptedAt: string;
  completedAt?: string;
  failedAt?: string;
  errorMessage?: string;
  retryCount: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionHistory {
  id: string;
  subscriptionId: string;
  action: SubscriptionAction;
  performedBy: string;
  oldValues?: any;
  newValues?: any;
  reason?: string;
  metadata?: any;
  createdAt: string;
}

export interface CreateSubscriptionData {
  subscriptionId: string;
  payerAddress: string;
  name: string;
  description?: string;
  category: string;
  recurringAmount: string;
  periodInDays: number;
  customBillingDate?: string; // ISO string for custom billing date
  testnet: boolean;
}

export interface UpdateSubscriptionData {
  name?: string;
  description?: string;
  category?: string;
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface SubscriptionListResponse {
  subscriptions: Subscription[];
  total: number;
}

export interface SubscriptionStatusResponse {
  isSubscribed: boolean;
  remainingChargeInPeriod: string;
  nextPeriodStart: string;
}

export const SUBSCRIPTION_CATEGORIES = [
  'Entertainment',
  'Utilities',
  'Software',
  'Fitness',
  'Food & Dining',
  'Transportation',
  'Education',
  'Health',
  'Gaming',
  'Music',
  'News',
  'Shopping',
  'Other',
] as const;

export const SUBSCRIPTION_PERIODS = [
  { label: 'Daily', days: 1 },
  { label: 'Weekly', days: 7 },
  { label: 'Bi-weekly', days: 14 },
  { label: 'Monthly', days: 30 },
  { label: 'Quarterly', days: 90 },
  { label: 'Yearly', days: 365 },
  { label: 'Custom Date', days: 0 }, // Special value for custom date selection
] as const;

export const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'text-green-600 bg-green-100',
  PAUSED: 'text-yellow-600 bg-yellow-100',
  CANCELLED: 'text-gray-600 bg-gray-100',
  EXPIRED: 'text-red-600 bg-red-100',
  FAILED: 'text-red-600 bg-red-100',
};

export const TRANSACTION_STATUS_COLORS: Record<TransactionStatus, string> = {
  PENDING: 'text-blue-600 bg-blue-100',
  PROCESSING: 'text-orange-600 bg-orange-100',
  COMPLETED: 'text-green-600 bg-green-100',
  FAILED: 'text-red-600 bg-red-100',
  INSUFFICIENT_FUNDS: 'text-red-600 bg-red-100',
  CANCELLED_BY_USER: 'text-gray-600 bg-gray-100',
};