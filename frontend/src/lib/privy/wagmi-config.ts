// Wagmi configuration for use with Privy
import { createConfig } from '@privy-io/wagmi';
import { baseSepolia } from 'viem/chains';
import { http } from 'viem';

export const config = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
});