// Wagmi configuration for use with Privy
import { createConfig } from '@privy-io/wagmi';
import { base } from 'viem/chains';
import { http } from 'viem';

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});