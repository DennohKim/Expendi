// Wagmi configuration for use with Privy
import { createConfig } from '@privy-io/wagmi';
import { scroll } from 'viem/chains';
import { http } from 'viem';

export const config = createConfig({
  chains: [scroll],
  transports: {
    [scroll.id]: http(),
  },
});