// Custom hook for wallet connection and user management with Privy
import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/types/database.types';
import { GraphQLClient } from 'graphql-request';

type User = Database['public']['Tables']['users']['Row'];
type UserAnalytics = Database['public']['Tables']['user_analytics']['Row'];
type Notification = Database['public']['Tables']['notifications']['Row'];

interface SubgraphUser {
  id: string;
  address: string;
  totalBalance: string;
  totalSpent: string;
  bucketsCount: number;
  buckets: Array<{
    id: string;
    name: string;
    balance: string;
    monthlySpent: string;
    monthlyLimit: string;
    active: boolean;
  }>;
}

interface UserDashboardData {
  user: User | null;
  analytics: UserAnalytics | null;
  realTimeData: SubgraphUser | null;
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
}

const subgraphClient = new GraphQLClient(
  process.env.NEXT_PUBLIC_SUBGRAPH_URL || ''
);

export function useWalletUser() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  
  // Get the primary wallet (first connected wallet)
  const wallet = wallets[0];
  const address = wallet?.address;
  const isConnected = authenticated && !!address;
  
  const [dashboardData, setDashboardData] = useState<UserDashboardData>({
    user: null,
    analytics: null,
    realTimeData: null,
    notifications: [],
    isLoading: false,
    error: null,
  });

  // Sync user to Supabase when wallet connects
  const syncUserToSupabase = useCallback(async (
    walletAddress: string, 
    walletContractAddress?: string,
    userMetadata: { email?: string; username?: string; avatar_url?: string } = {}
  ) => {
    try {
      setDashboardData(prev => ({ ...prev, isLoading: true, error: null }));

      // Check if user exists in Supabase
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();

      let user = existingUser;

      if (!existingUser && !userError) {
        // Create new user
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            wallet_address: walletAddress.toLowerCase(),
            wallet_contract_address: walletContractAddress,
            email: userMetadata.email,
            username: userMetadata.username,
            avatar_url: userMetadata.avatar_url,
          })
          .select()
          .single();

        if (createError) throw createError;
        user = newUser;
      }

      // Trigger backend sync by calling your API endpoint
      await fetch('/api/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: walletAddress.toLowerCase(),
          userId: user?.id 
        }),
      });

      return user;
    } catch (error) {
      console.error('Error syncing user:', error);
      setDashboardData(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to sync user' 
      }));
      throw error;
    }
  }, []);

  // Fetch user dashboard data
  const fetchDashboardData = useCallback(async (walletAddress: string) => {
    try {
      setDashboardData(prev => ({ ...prev, isLoading: true, error: null }));

      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
      }

      // Get user from Supabase
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw new Error(`Supabase error: ${userError.message} (Code: ${userError.code})`);
      }

      let analytics = null;
      let notifications: Notification[] = [];

      if (user) {
        // Get current month analytics
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const { data: analyticsData } = await supabase
          .from('user_analytics')
          .select('*')
          .eq('user_id', user.id)
          .eq('period_type', 'monthly')
          .gte('period_start', monthStart.toISOString().split('T')[0])
          .single();

        analytics = analyticsData;

        // Get unread notifications
        const { data: notificationsData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(10);

        notifications = notificationsData || [];
      }

      // Get real-time data from subgraph
      let realTimeData = null;
      try {
        const subgraphUrl = process.env.NEXT_PUBLIC_SUBGRAPH_URL;
        if (!subgraphUrl) {
          console.warn('NEXT_PUBLIC_SUBGRAPH_URL not configured, skipping subgraph data');
        } else {
          const subgraphResponse = await subgraphClient.request<{ user: SubgraphUser }>(`
            query GetUser($walletAddress: ID!) {
              user(id: $walletAddress) {
                id
                address
                totalBalance
                totalSpent
                bucketsCount
                buckets {
                  id
                  name
                  balance
                  monthlySpent
                  monthlyLimit
                  active
                }
              }
            }
          `, { walletAddress: walletAddress.toLowerCase() });

          realTimeData = subgraphResponse.user;
        }
      } catch (subgraphError) {
        console.warn('Subgraph query failed:', subgraphError);
        // Continue without subgraph data
      }

      setDashboardData({
        user,
        analytics,
        realTimeData,
        notifications,
        isLoading: false,
        error: null,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Provide detailed error information
      let errorMessage = 'Failed to fetch data';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error, null, 2);
      } else {
        errorMessage = String(error);
      }
      
      setDashboardData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  // Handle wallet connection with Privy
  useEffect(() => {
    if (!ready) return; // Wait for Privy to be ready
    
    if (isConnected && address) {
      // Sync user with additional Privy user data
      const userMetadata = {
        email: user?.email?.address,
        // Add other Privy user fields as needed
      };
      
      syncUserToSupabase(address, undefined, userMetadata)
        .then(() => fetchDashboardData(address))
        .catch(error => {
          console.error('Failed to sync user on connection:', error);
        });
    } else {
      // Reset data when wallet disconnects
      setDashboardData({
        user: null,
        analytics: null,
        realTimeData: null,
        notifications: [],
        isLoading: false,
        error: null,
      });
    }
  }, [ready, isConnected, address, user, syncUserToSupabase, fetchDashboardData]);

  // Set up real-time subscriptions for notifications
  useEffect(() => {
    if (!dashboardData.user?.id) return;

    const notificationsSubscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${dashboardData.user.id}`,
        },
        (payload) => {
          setDashboardData(prev => ({
            ...prev,
            notifications: [payload.new as Notification, ...prev.notifications],
          }));
        }
      )
      .subscribe();

    return () => {
      notificationsSubscription.unsubscribe();
    };
  }, [dashboardData.user?.id]);

  // Utility functions
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      setDashboardData(prev => ({
        ...prev,
        notifications: prev.notifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const updateUserProfile = useCallback(async (updates: Partial<User>) => {
    if (!dashboardData.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', dashboardData.user.id)
        .select()
        .single();

      if (error) throw error;

      setDashboardData(prev => ({
        ...prev,
        user: data,
      }));

      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }, [dashboardData.user?.id]);

  const refreshData = useCallback(() => {
    if (address) {
      fetchDashboardData(address);
    }
  }, [address, fetchDashboardData]);

  return {
    // Wallet connection state
    ready,
    authenticated,
    isConnected,
    address,
    wallet,
    privyUser: user, // Privy user object
    login,
    logout,
    
    // Dashboard data
    ...dashboardData,
    
    // Utility functions
    markNotificationAsRead,
    updateUserProfile,
    refreshData,
    
    // Computed values
    unreadNotificationsCount: dashboardData.notifications.filter(n => !n.read).length,
    totalBalance: dashboardData.realTimeData?.totalBalance || '0',
    monthlySpent: dashboardData.analytics?.total_spent || '0',
    bucketsCount: dashboardData.realTimeData?.bucketsCount || 0,
  };
}