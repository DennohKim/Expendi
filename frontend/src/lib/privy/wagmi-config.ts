// Wagmi configuration for use with Privy
import { createConfig } from '@privy-io/wagmi';
import { base, baseSepolia } from 'viem/chains';
import { http } from 'viem';

export const config = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
});