// Wagmi configuration for use with Privy
import { createConfig } from '@privy-io/wagmi';
import { celo } from 'viem/chains';
import { http } from 'viem';

export const config = createConfig({
  chains: [celo],
  transports: {
    [celo.id]: http(),
  },
});