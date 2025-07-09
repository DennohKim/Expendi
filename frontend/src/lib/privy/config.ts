// Privy configuration for wallet connection
import { base, baseSepolia } from 'viem/chains';
import type { PrivyClientConfig } from '@privy-io/react-auth';

export const privyConfig: PrivyClientConfig = {
  // Supported login methods
  loginMethods: ['wallet', 'email', 'sms'],
  
  // Wallet configuration
  walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  
  // Supported chains
  supportedChains: [baseSepolia, base],
  
  // Default chain
  defaultChain: baseSepolia,
  
  // Appearance customization
  appearance: {
    theme: 'light',
    accentColor: '#ff7e5f',
    logo: '/images/logo/logo.svg',
    walletList: ['metamask', 'coinbase_wallet', 'wallet_connect'],
    showWalletLoginFirst: true,
  },
  
  // Embedded wallet configuration
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
    requireUserPasswordOnCreate: false,
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