import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface BudgetWalletState {
  // Wallet status cache by address
  walletStatusCache: Record<string, {
    hasBudgetWallet: boolean;
    lastChecked: number;
    expiresAt: number;
  }>;
  
  // Actions
  setWalletStatus: (address: string, hasBudgetWallet: boolean) => void;
  getWalletStatus: (address: string) => boolean | null;
  isStatusExpired: (address: string) => boolean;
  clearWalletStatus: (address: string) => void;
  clearAllWalletStatus: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useBudgetWalletStore = create<BudgetWalletState>()(
  persist(
    (set, get) => ({
      walletStatusCache: {},
      
      setWalletStatus: (address: string, hasBudgetWallet: boolean) => {
        const now = Date.now();
        set((state) => ({
          walletStatusCache: {
            ...state.walletStatusCache,
            [address.toLowerCase()]: {
              hasBudgetWallet,
              lastChecked: now,
              expiresAt: now + CACHE_DURATION,
            },
          },
        }));
      },
      
      getWalletStatus: (address: string) => {
        const cache = get().walletStatusCache[address.toLowerCase()];
        if (!cache) return null;
        
        // Check if cache has expired
        if (Date.now() > cache.expiresAt) {
          // Remove expired cache entry
          set((state) => {
            const newCache = { ...state.walletStatusCache };
            delete newCache[address.toLowerCase()];
            return { walletStatusCache: newCache };
          });
          return null;
        }
        
        return cache.hasBudgetWallet;
      },
      
      isStatusExpired: (address: string) => {
        const cache = get().walletStatusCache[address.toLowerCase()];
        if (!cache) return true;
        return Date.now() > cache.expiresAt;
      },
      
      clearWalletStatus: (address: string) => {
        set((state) => {
          const newCache = { ...state.walletStatusCache };
          delete newCache[address.toLowerCase()];
          return { walletStatusCache: newCache };
        });
      },
      
      clearAllWalletStatus: () => {
        set({ walletStatusCache: {} });
      },
    }),
    {
      name: 'budget-wallet-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);