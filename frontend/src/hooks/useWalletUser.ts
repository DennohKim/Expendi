// Custom hook for wallet connection and user management with Privy
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSetActiveWallet } from '@privy-io/wagmi';
import { useWriteContract } from 'wagmi';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/types/database.types';
import { GraphQLClient } from 'graphql-request';
import { checkExistingBudgetWallet } from '@/lib/contracts/factory';
import { useSmartAccount } from '@/context/SmartAccountContext';

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
  walletCreation: {
    isCreating: boolean;
    step: string;
    error: string | null;
  };
}

const subgraphClient = new GraphQLClient(
  process.env.NEXT_PUBLIC_SUBGRAPH_URL || ''
);

export function useWalletUser() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { smartAccountClient, smartAccountReady } = useSmartAccount();
  
  // ONLY use the Privy embedded wallet - ignore all external wallets
  const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
  const externalWallets = wallets.filter(wallet => wallet.walletClientType !== 'privy');
  
  // Warn if external wallets are detected (they should be disabled)
  if (externalWallets.length > 0) {
    console.warn('⚠️ External wallets detected despite being disabled:', externalWallets.map(w => w.walletClientType));
  }
  
  const wallet = embeddedWallet; // Only use embedded wallet, never external ones
  const address = wallet?.address;
  
  console.log('Available wallets:', wallets.map(w => ({ type: w.walletClientType, address: w.address })));
  console.log('Selected wallet (ONLY embedded):', { type: wallet?.walletClientType, address });
  console.log('🎯 Using ONLY Privy embedded wallet address:', address);
  
  // Only consider connected if we have an embedded wallet
  const isConnected = authenticated && !!embeddedWallet && !!address;
  
  // Use refs to prevent multiple calls
  const syncInProgressRef = useRef(false);
  const lastSyncedAddressRef = useRef<string | null>(null);
  
  const [dashboardData, setDashboardData] = useState<UserDashboardData>({
    user: null,
    analytics: null,
    realTimeData: null,
    notifications: [],
    isLoading: false,
    error: null,
    walletCreation: {
      isCreating: false,
      step: 'checking',
      error: null,
    },
  });

  // Separate state for wallet creation to avoid re-render loops
  const [walletCreationState, setWalletCreationState] = useState({
    isCreating: false,
    step: 'checking' as string,
    error: null as string | null,
  });

  // Wagmi hooks
  const { writeContractAsync } = useWriteContract();
  const { setActiveWallet } = useSetActiveWallet();

  // Create or get budget wallet
  const createOrGetBudgetWallet = useCallback(async (walletAddress: string): Promise<string> => {
    try {
      setWalletCreationState({
        isCreating: true,
        step: 'checking',
        error: null,
      });

      // Check if user already has a budget wallet (check both EOA and smart account)
      console.log('Checking for existing wallets...');
      const eoaWallet = await checkExistingBudgetWallet(walletAddress);
      console.log('EOA existing wallet:', eoaWallet);
      
      if (eoaWallet) {
        console.log('✅ Found existing EOA wallet, returning it');
        setWalletCreationState({
          isCreating: false,
          step: 'completed',
          error: null,
        });
        return eoaWallet;
      }
      
      // If using smart account, also check if smart account has a wallet
      if (smartAccountReady && smartAccountClient?.account?.address) {
        console.log('Checking if smart account has existing wallet...');
        const smartAccountWallet = await checkExistingBudgetWallet(smartAccountClient.account.address);
        console.log('Smart account existing wallet:', smartAccountWallet);
        
        if (smartAccountWallet) {
          console.log('✅ Found existing smart account wallet, returning it');
          setWalletCreationState({
            isCreating: false,
            step: 'completed',
            error: null,
          });
          return smartAccountWallet;
        }
      }

      // Get the wallet object from Privy
      if (!wallet) {
        throw new Error('No wallet connected');
      }

      // Set active wallet
      await setActiveWallet(wallet);

      const { createBudgetWallet, waitForWalletCreation } = await import('@/lib/contracts/factory');

      // Create new budget wallet with gas sponsorship if smart account is ready
      setWalletCreationState(prev => ({ ...prev, step: 'creating' }));

      let txHash: `0x${string}`;
      
      // Since we wait for smart account to be ready, this should always use sponsored transaction
      console.log('Creating wallet with gas sponsorship - Smart account ready:', smartAccountReady, 'Client available:', !!smartAccountClient);
      
      if (smartAccountClient) {
        console.log('✅ Using smart account for sponsored wallet creation');
        console.log('Smart account address:', smartAccountClient.account?.address);
        const result = await createBudgetWallet(
          writeContractAsync, 
          walletAddress as `0x${string}`, 
          smartAccountClient
        );
        
        if (result.alreadyExists) {
          console.log('✅ Wallet already exists, no transaction needed');
          // If wallet already exists, skip transaction waiting and return the existing wallet
          setWalletCreationState(prev => ({ ...prev, step: 'syncing' }));
          return result.walletAddress;
        }
        
        if (!result.txHash) {
          throw new Error('Failed to get transaction hash from sponsored wallet creation');
        }
        txHash = result.txHash;
      } else {
        console.warn('⚠️ Smart account client not available, using regular transaction');
        const result = await createBudgetWallet(writeContractAsync, walletAddress as `0x${string}`);
        
        if (result.alreadyExists) {
          console.log('✅ Wallet already exists, no transaction needed');
          // If wallet already exists, skip transaction waiting and return the existing wallet
          setWalletCreationState(prev => ({ ...prev, step: 'syncing' }));
          return result.walletAddress;
        }
        
        if (!result.txHash) {
          throw new Error('Failed to get transaction hash from regular wallet creation');
        }
        txHash = result.txHash;
      }
      
      setWalletCreationState(prev => ({ ...prev, step: 'waiting' }));

      // Wait for transaction to be mined
      const budgetWalletAddress = await waitForWalletCreation(txHash);
      
      if (!budgetWalletAddress) {
        throw new Error('Failed to get budget wallet address from transaction');
      }

      setWalletCreationState(prev => ({ ...prev, step: 'syncing' }));

      // Wait for subgraph indexing
      await new Promise(resolve => setTimeout(resolve, 2000));

      setWalletCreationState({
        isCreating: false,
        step: 'completed',
        error: null,
      });

      return budgetWalletAddress;

    } catch (error) {
      console.error('Error creating budget wallet:', error);
      
      let errorMessage = 'Failed to create budget wallet';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Add some additional context for common errors
        if (error.message.includes('cancelled by user') || error.message.includes('rejected')) {
          errorMessage = 'Transaction was cancelled. Please try again and approve the transaction in your wallet.';
        } else if (error.message.includes('Network error')) {
          errorMessage = error.message + ' Please check your network connection and try again.';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'You need some ETH for gas fees. Please add ETH to your wallet and try again.';
        }
      }
      
      setWalletCreationState({
        isCreating: false,
        step: 'error',
        error: errorMessage,
      });

      throw error;
    }
  }, [wallet, writeContractAsync, setActiveWallet, smartAccountReady, smartAccountClient]);

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
        walletCreation: {
          isCreating: false,
          step: 'checking',
          error: null,
        },
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

  // Sync user to Supabase only after budget wallet is created successfully
  const syncUserToSupabase = useCallback(async (
    walletAddress: string, 
    budgetWalletAddress: string,
    userMetadata: { email?: string; username?: string; avatar_url?: string } = {}
  ) => {
    try {
      setDashboardData(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null,
      }));

      // Check if user exists in Supabase
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();

      let user = existingUser;

      if (!existingUser && !userError) {
        // Create new user with budget wallet address
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            wallet_address: walletAddress.toLowerCase(),
            wallet_contract_address: budgetWalletAddress,
            email: userMetadata.email,
            username: userMetadata.username,
            avatar_url: userMetadata.avatar_url,
          })
          .select()
          .single();

        if (createError) throw createError;
        user = newUser;
      } else if (existingUser && !existingUser.wallet_contract_address) {
        // Update existing user with budget wallet address
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ wallet_contract_address: budgetWalletAddress })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) throw updateError;
        user = updatedUser;
      }

      // Trigger backend sync by calling your API endpoint
      await fetch('/api/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: walletAddress.toLowerCase(),
          userId: user?.id,
          walletContractAddress: budgetWalletAddress
        }),
      });

      return user;
    } catch (error) {
      console.error('Error syncing user:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync user';
      
      setDashboardData(prev => ({ 
        ...prev, 
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  // Complete wallet setup: create budget wallet and sync to Supabase
  const setupWalletAndSync = useCallback(async (
    walletAddress: string,
    userMetadata: { email?: string; username?: string; avatar_url?: string } = {}
  ) => {
    console.log('walletAddress', walletAddress);
    try {
      // Update state to show wallet creation starting
      setWalletCreationState(prev => ({
        ...prev,
        isCreating: true,
        step: 'checking',
        error: null,
      }));

      // Step 1: Create or get budget wallet
      const budgetWalletAddress = await createOrGetBudgetWallet(walletAddress);
      console.log('Budget wallet address obtained:', budgetWalletAddress);

      // Update state to show syncing phase
      setWalletCreationState(prev => ({
        ...prev,
        step: 'syncing',
      }));

      // Step 2: Only sync to Supabase after successful wallet creation
      await syncUserToSupabase(walletAddress, budgetWalletAddress, userMetadata);

      // Update state to show completion
      setWalletCreationState({
        isCreating: false,
        step: 'completed',
        error: null,
      });

      return budgetWalletAddress;
    } catch (error) {
      console.error('Error in wallet setup and sync:', error);
      
      // Update state to show error
      setWalletCreationState({
        isCreating: false,
        step: 'error',
        error: error instanceof Error ? error.message : 'Failed to setup wallet',
      });
      
      throw error;
    }
  }, [createOrGetBudgetWallet, syncUserToSupabase]);

  // Retry wallet creation and sync if it fails
  const retryWalletCreation = useCallback(async (): Promise<void> => {
    if (!user?.wallet?.address) {
      console.error('No wallet address available for retry');
      return;
    }
    
    try {
      // Reset error state before retry
      setWalletCreationState({
        isCreating: false,
        step: 'checking',
        error: null,
      });

      const userMetadata = {
        email: user?.email?.address,
      };
      
      await setupWalletAndSync(user.wallet.address, userMetadata);
      await fetchDashboardData(user.wallet.address);
    } catch (error) {
      console.error('Retry failed:', error);
      // Error is already handled in setupWalletAndSync
    }
  }, [user?.wallet?.address, user?.email?.address, setupWalletAndSync, fetchDashboardData]);

  // Force wallet creation without waiting for smart account (fallback)
  const createWalletWithoutSponsorship = useCallback(async (): Promise<void> => {
    if (!address) {
      console.error('No wallet address available');
      return;
    }
    
    try {
      console.log('🚨 Creating wallet without smart account sponsorship');
      // Force reset the sync state
      syncInProgressRef.current = false;
      lastSyncedAddressRef.current = null;
      
      const userMetadata = {
        email: user?.email?.address,
      };
      
      // Call setupWalletAndSync directly, which will use regular transactions
      await setupWalletAndSync(address, userMetadata);
      await fetchDashboardData(address);
    } catch (error) {
      console.error('Fallback wallet creation failed:', error);
      // Error is already handled in setupWalletAndSync
    }
  }, [address, user?.email?.address, setupWalletAndSync, fetchDashboardData]);

  // Handle wallet connection with Privy - wait for smart account to be ready
  useEffect(() => {
    if (!ready) return; // Wait for Privy to be ready
    
    if (isConnected && address) {
      console.log('Wallet connected, address:', address);
      console.log('Smart account ready:', smartAccountReady);

      // Create a unique key for this connection attempt
      const connectionKey = `${address}-${smartAccountReady}`;
      
      // Prevent duplicate calls for the same address AND smart account readiness state
      if (syncInProgressRef.current || lastSyncedAddressRef.current === connectionKey) {
        console.log('Skipping duplicate call for:', connectionKey);
        return;
      }
      
      // Wait for smart account to be ready before proceeding
      if (!smartAccountReady) {
        console.log('Smart account not ready yet, waiting...');
        // Don't set syncInProgress or lastSynced here, allow retry when smartAccountReady becomes true
        setDashboardData(prev => ({ 
          ...prev, 
          isLoading: true, 
          error: null 
        }));
        setWalletCreationState({
          isCreating: false,
          step: 'waiting-smart-account',
          error: null,
        });
        
        // Log for debugging - smart account should initialize quickly
        console.log('⏳ Waiting for smart account initialization...');
        
        return;
      }
      
      syncInProgressRef.current = true;
      lastSyncedAddressRef.current = connectionKey;
      
      // Smart account is ready, proceed with wallet creation
      console.log('Smart account ready, proceeding with sponsored wallet creation');
      
      // Immediately set loading state for better UX
      setDashboardData(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null 
      }));

      // Start wallet creation process
      setWalletCreationState({
        isCreating: true,
        step: 'checking',
        error: null,
      });
      
      // Setup wallet and sync user with additional Privy user data
      const userMetadata = {
        email: user?.email?.address,
        // Add other Privy user fields as needed
      };
      
      const processWalletConnection = async () => {
        try {
          const budgetWalletAddress = await setupWalletAndSync(address, userMetadata);
          console.log('Budget wallet setup complete:', budgetWalletAddress);
          
          // Fetch dashboard data after wallet setup
          await fetchDashboardData(address);
          
          // Ensure wallet creation state shows completion
          setWalletCreationState({
            isCreating: false,
            step: 'completed',
            error: null,
          });
          
        } catch (error) {
          console.error('Failed to setup wallet and sync user on connection:', error);
          
          // Set error state in dashboard data
          setDashboardData(prev => ({ 
            ...prev, 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to setup wallet'
          }));
          
          // Set error state in wallet creation
          setWalletCreationState({
            isCreating: false,
            step: 'error',
            error: error instanceof Error ? error.message : 'Failed to setup wallet',
          });
        } finally {
          syncInProgressRef.current = false;
        }
      };
      
      processWalletConnection();
      
    } else {
      // Reset data when wallet disconnects
      lastSyncedAddressRef.current = null;
      syncInProgressRef.current = false;
      
      setDashboardData({
        user: null,
        analytics: null,
        realTimeData: null,
        notifications: [],
        isLoading: false,
        error: null,
        walletCreation: {
          isCreating: false,
          step: 'checking',
          error: null,
        },
      });
      
      setWalletCreationState({
        isCreating: false,
        step: 'checking',
        error: null,
      });
    }
  }, [ready, isConnected, address, user?.email?.address, setupWalletAndSync, fetchDashboardData, smartAccountReady]);

  // Immediate UI feedback when connection state changes
  useEffect(() => {
    if (!ready) return;
    
    if (isConnected && address) {
      // Immediately show that we're processing the connection
      setDashboardData(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null 
      }));
    } else if (!isConnected) {
      // Immediately clear loading state when disconnected
      setDashboardData(prev => ({ 
        ...prev, 
        isLoading: false 
      }));
    }
  }, [ready, isConnected, address]);

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
    setupWalletAndSync,
    
    // Computed values
    unreadNotificationsCount: dashboardData.notifications.filter(n => !n.read).length,
    totalBalance: dashboardData.realTimeData?.totalBalance || '0',
    monthlySpent: dashboardData.analytics?.total_spent || '0',
    bucketsCount: dashboardData.realTimeData?.bucketsCount || 0,
    
    // Budget wallet creation state (expose both states for flexibility)
    isCreatingBudgetWallet: walletCreationState.isCreating || dashboardData.walletCreation.isCreating,
    budgetWalletCreationStep: walletCreationState.step !== 'checking' ? walletCreationState.step : dashboardData.walletCreation.step,
    budgetWalletCreationError: walletCreationState.error || dashboardData.walletCreation.error,
    
    // Raw wallet creation state for debugging
    rawWalletCreationState: walletCreationState,
    
    // Retry function for wallet creation
    retryWalletCreation,
    
    // Fallback function for wallet creation without smart account
    createWalletWithoutSponsorship,
  };
}