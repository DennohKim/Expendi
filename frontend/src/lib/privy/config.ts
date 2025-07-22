// Privy configuration for wallet connection
import { base } from 'viem/chains';
import type { PrivyClientConfig } from '@privy-io/react-auth';

export const privyConfig: PrivyClientConfig = {
  // Supported login methods - ONLY email, no wallet options
  loginMethods: ['email'],
  
  // Supported chains - Base mainnet only
  supportedChains: [base],
  
  // Default chain
  defaultChain: base,
  
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
    noPromptOnSignature: false,
    showWalletUIs: true, // Show embedded wallet UI
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