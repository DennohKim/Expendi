const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Helper function for fetch with error handling
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log('🚀 API Request:', options?.method || 'GET', url, options?.body);
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('❌ API Error:', response.status, data);
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  console.log('✅ API Response:', response.status, data);
  return data;
}

export interface CreateSubscriptionRequest {
  payerAddress: string;
  recipientAddress: string;
  amount: string;
  periodInDays: number;
  nextChargeTimestamp: number;
  metadata: {
    name: string;
    description?: string;
    category?: string;
  };
}

export interface SubscriptionResponse {
  id: string;
  payerAddress: string;
  recipientAddress: string;
  amount: string;
  periodInDays: number;
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  nextChargeTimestamp: number;
  metadata: {
    name: string;
    description?: string;
    category?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface QueueStatusResponse {
  healthy: boolean;
  stats: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  timestamp: string;
}

export class SubscriptionAPI {
  // Health check
  static async getQueueStatus(): Promise<QueueStatusResponse> {
    const response = await fetchAPI<{ success: boolean; data: QueueStatusResponse }>('/api/v2/subscriptions/queue/status');
    return response.data;
  }

  // Create subscription
  static async createSubscription(data: CreateSubscriptionRequest): Promise<SubscriptionResponse> {
    const response = await fetchAPI<{ success: boolean; data: SubscriptionResponse }>('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  // Get subscription by ID
  static async getSubscription(subscriptionId: string): Promise<SubscriptionResponse> {
    const response = await fetchAPI<{ success: boolean; data: SubscriptionResponse }>(`/api/subscriptions/${subscriptionId}`);
    return response.data;
  }

  // Get user's subscriptions
  static async getUserSubscriptions(userAddress: string): Promise<SubscriptionResponse[]> {
    const response = await fetchAPI<{ success: boolean; data: SubscriptionResponse[] }>(`/api/subscriptions?userAddress=${userAddress}`);
    return response.data;
  }

  // Pause subscription
  static async pauseSubscription(subscriptionId: string): Promise<void> {
    await fetchAPI(`/api/subscriptions/${subscriptionId}/pause`, {
      method: 'POST',
    });
  }

  // Resume subscription
  static async resumeSubscription(subscriptionId: string): Promise<void> {
    await fetchAPI(`/api/subscriptions/${subscriptionId}/resume`, {
      method: 'POST',
    });
  }

  // Cancel subscription
  static async cancelSubscription(subscriptionId: string): Promise<void> {
    await fetchAPI(`/api/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
    });
  }

  // Get subscription transactions
  static async getSubscriptionTransactions(subscriptionId: string) {
    const response = await fetchAPI<{ success: boolean; data: any }>(`/api/subscriptions/${subscriptionId}/transactions`);
    return response.data;
  }
}

export default SubscriptionAPI;