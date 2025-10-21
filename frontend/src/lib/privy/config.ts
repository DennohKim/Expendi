// Privy configuration for wallet connection
import { baseSepolia } from 'viem/chains';
import type { PrivyClientConfig } from '@privy-io/react-auth';

export const privyConfig: PrivyClientConfig = {
  // Supported login methods - ONLY email, no wallet options
  loginMethods: ['email'],
  
  // Supported chains - Base Sepolia testnet only
  supportedChains: [baseSepolia],
  
  // Default chain
  defaultChain: baseSepolia,
  
  // Appearance customization
  appearance: {
    theme: 'light',
    accentColor: '#ff7e5f',
    logo: '/images/logo/logo.svg',    
    showWalletLoginFirst: false, // Never show wallet login first
    walletChainType: 'ethereum-only',
  },
  
  // Embedded wallet configuration - force embedded wallet creation
  embeddedWallets: {
    createOnLogin: "all-users", // Force embedded wallet for all users
    showWalletUIs: true, // Show embedded wallet UI
    requireUserPasswordOnCreate: false, // Don't require password for wallet creation
    noPromptOnSignature: false, // Prompt for signatures
  },

  // Smart wallet configuration - enable smart accounts with sponsored transactions
  externalWallets: {
    coinbaseWallet: {
      connectionOptions: 'smartWalletOnly', // Use smart wallet only
    },
  },

  // MFA configuration
  mfa: {
    noPromptOnMfaRequired: false,
  },
  
  // Legal configuration
  legal: {
    termsAndConditionsUrl: 'https://yourdomain.com/terms',
    privacyPolicyUrl: 'https://yourdomain.com/privacy',
  },
};