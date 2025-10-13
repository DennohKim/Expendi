import type { Address } from "viem";
import { mainnet, base, arbitrum } from "viem/chains";
import type { MorphoConfig } from "./types";

// Morpho Blue addresses - these are the official contract addresses
export const MORPHO_ADDRESSES: Record<number, Address> = {
  [mainnet.id]: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
  [base.id]: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb", 
  [arbitrum.id]: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
};

// Bundler addresses - these handle batched operations
export const BUNDLER_ADDRESSES: Record<number, Address> = {
  [mainnet.id]: "0x4095F064B8d3c3548A3bebfd0Bbfd04750E30077",
  [base.id]: "0x4095F064B8d3c3548A3bebfd0Bbfd04750E30077",
  [arbitrum.id]: "0x4095F064B8d3c3548A3bebfd0Bbfd04750E30077",
};

// Default slippage tolerance (0.5%)
export const DEFAULT_SLIPPAGE = 0.005;

// Supported networks
export const SUPPORTED_CHAINS = [mainnet.id, base.id, arbitrum.id];

export function getMorphoConfig(chainId: number): MorphoConfig {
  if (!SUPPORTED_CHAINS.includes(chainId)) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return {
    morphoAddress: MORPHO_ADDRESSES[chainId],
    bundlerAddress: BUNDLER_ADDRESSES[chainId],
    chainId,
    defaultSlippage: DEFAULT_SLIPPAGE,
  };
}

// Common token addresses for major markets
export const COMMON_TOKENS: Record<number, Record<string, Address>> = {
  [mainnet.id]: {
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    USDC: "0xA0b86a33E6416c47D3A0D3BFA29B6A7E6c0b8B2C",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  },
  [base.id]: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
  },
  [arbitrum.id]: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548",
  },
};

export function getTokenAddress(chainId: number, symbol: string): Address | undefined {
  return COMMON_TOKENS[chainId]?.[symbol];
}