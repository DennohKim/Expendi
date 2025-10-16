import { useState, useEffect, useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { erc20Abi, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { useWalletAddress } from '@/hooks/useWalletAddress';
import { getNetworkConfig } from '@/lib/contracts/config';

// Morpho Vault ABI (simplified for key functions)
const MORPHO_VAULT_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' }
    ],
    outputs: [{ name: 'shares', type: 'uint256' }]
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' }
    ],
    outputs: [{ name: 'shares', type: 'uint256' }]
  },
  {
    name: 'redeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' }
    ],
    outputs: [{ name: 'assets', type: 'uint256' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'convertToAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: 'assets', type: 'uint256' }]
  },
  {
    name: 'asset',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  }
] as const;

// Get USDC address from network config
const networkConfig = getNetworkConfig();
const USDC_ADDRESS = networkConfig.USDC_ADDRESS as `0x${string}`;

interface UseMorphoVaultReturn {
  userShares: bigint | undefined;
  sharePrice: bigint | undefined;
  isLoading: boolean;
  deposit: (amount: bigint) => Promise<void>;
  withdraw: (amount: bigint) => Promise<void>;
  approveUSDC: (amount: bigint) => Promise<void>;
  needsApproval: boolean;
  userUSDCBalance: bigint | undefined;
  estimatedValue: bigint | undefined;
  isApproving: boolean;
  isDepositing: boolean;
  isWithdrawing: boolean;
}

export function useMorphoVault(vaultAddress: string): UseMorphoVaultReturn {
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const { smartAccountClient, smartAccountReady } = useSmartAccount();
  const { walletAddress, eoaAddress, smartAccountAddress } = useWalletAddress();

  // Debug logging to understand what's happening
  console.log('🔍 Morpho Vault Debug:', {
    vaultAddress,
    walletAddress,
    eoaAddress,
    smartAccountAddress,
    smartAccountReady,
    usdcAddress: USDC_ADDRESS,
    chainId: base.id
  });

  // Read user's vault shares (using smart account address)
  const { data: userShares, isLoading: sharesLoading, refetch: refetchShares } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: MORPHO_VAULT_ABI,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    chainId: base.id,
  });

  // Read user's USDC balance (using smart account address)
  const { data: userUSDCBalance, isLoading: balanceLoading, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    chainId: base.id,
  });

  // Debug balance result
  console.log('🔍 USDC Balance Debug:', {
    userUSDCBalance: userUSDCBalance?.toString(),
    balanceLoading,
    walletAddress,
    usdcContract: USDC_ADDRESS,
    chainId: base.id
  });

  // Read USDC allowance for the vault (using smart account address)
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: walletAddress ? [walletAddress, vaultAddress as `0x${string}`] : undefined,
    chainId: base.id,
  });

  // Convert shares to estimated USDC value
  const { data: estimatedValue } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: MORPHO_VAULT_ABI,
    functionName: 'convertToAssets',
    args: userShares ? [userShares] : undefined,
    chainId: base.id,
  });

  // Calculate if approval is needed
  useEffect(() => {
    setNeedsApproval(false); // Reset on allowance change
  }, [allowance]);

  const checkApproval = (amount: bigint) => {
    if (!allowance) return true;
    return allowance < amount;
  };

  const approveUSDC = async (amount: bigint) => {
    if (!smartAccountClient || !walletAddress || !smartAccountClient.account) throw new Error('Smart account not ready');
    
    setIsApproving(true);
    try {
      // Use gas-sponsored transaction via sendUserOperation
      const approveCallData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [vaultAddress as `0x${string}`, amount],
      });

      const userOpHash = await smartAccountClient.sendUserOperation({
        calls: [{
          to: USDC_ADDRESS,
          data: approveCallData,
        }],
        account: smartAccountClient.account,
      });

      // Wait for UserOperation confirmation with timeout
      await smartAccountClient.waitForUserOperationReceipt({
        hash: userOpHash,
        timeout: 60_000, // 60 seconds timeout
      });

      await refetchAllowance();
      setNeedsApproval(false);
    } finally {
      setIsApproving(false);
    }
  };

  const deposit = async (amount: bigint) => {
    if (!smartAccountClient || !walletAddress || !smartAccountClient.account) throw new Error('Smart account not ready');
    
    setIsDepositing(true);
    try {
      // Check if approval is needed and batch with deposit for gas efficiency
      if (checkApproval(amount)) {
        // Batch approve + deposit in single user operation
        const approveCallData = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [vaultAddress as `0x${string}`, amount],
        });

        const depositCallData = encodeFunctionData({
          abi: MORPHO_VAULT_ABI,
          functionName: 'deposit',
          args: [amount, walletAddress],
        });

        const batchCalls = [
          {
            to: USDC_ADDRESS,
            data: approveCallData,
          },
          {
            to: vaultAddress as `0x${string}`,
            data: depositCallData,
          }
        ];

        const userOpHash = await smartAccountClient.sendUserOperation({
          calls: batchCalls,
          account: smartAccountClient.account,
        });

        // Wait for UserOperation confirmation with timeout
        await smartAccountClient.waitForUserOperationReceipt({
          hash: userOpHash,
          timeout: 60_000, // 60 seconds timeout
        });
      } else {
        // Only deposit needed
        const depositCallData = encodeFunctionData({
          abi: MORPHO_VAULT_ABI,
          functionName: 'deposit',
          args: [amount, walletAddress],
        });

        const userOpHash = await smartAccountClient.sendUserOperation({
          calls: [{
            to: vaultAddress as `0x${string}`,
            data: depositCallData,
          }],
          account: smartAccountClient.account,
        });

        // Wait for UserOperation confirmation with timeout
        await smartAccountClient.waitForUserOperationReceipt({
          hash: userOpHash,
          timeout: 60_000, // 60 seconds timeout
        });
      }

      // Refresh data after confirmation
      setTimeout(() => {
        Promise.all([refetchShares(), refetchBalance(), refetchAllowance()]);
      }, 1000);
    } finally {
      setIsDepositing(false);
    }
  };

  const withdraw = async (amount: bigint) => {
    if (!smartAccountClient || !walletAddress || !smartAccountClient.account) throw new Error('Smart account not ready');
    
    setIsWithdrawing(true);
    try {
      // Use gas-sponsored transaction via sendUserOperation
      const withdrawCallData = encodeFunctionData({
        abi: MORPHO_VAULT_ABI,
        functionName: 'withdraw',
        args: [amount, walletAddress, walletAddress],
      });

      const userOpHash = await smartAccountClient.sendUserOperation({
        calls: [{
          to: vaultAddress as `0x${string}`,
          data: withdrawCallData,
        }],
        account: smartAccountClient.account,
      });

      // Wait for UserOperation confirmation with timeout
      await smartAccountClient.waitForUserOperationReceipt({
        hash: userOpHash,
        timeout: 60_000, // 60 seconds timeout
      });

      // Refresh data after confirmation
      setTimeout(() => {
        Promise.all([refetchShares(), refetchBalance()]);
      }, 1000);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const sharePrice = useMemo(() => {
    if (!userShares || !estimatedValue || userShares === BigInt(0)) return undefined;
    return (estimatedValue * BigInt(1000000)) / userShares; // Price per share in USDC (6 decimals)
  }, [userShares, estimatedValue]);

  const isLoading = sharesLoading || balanceLoading || isApproving || isDepositing || isWithdrawing || !smartAccountReady;

  return {
    userShares,
    sharePrice,
    isLoading,
    deposit,
    withdraw,
    approveUSDC,
    needsApproval: needsApproval || checkApproval(BigInt(0)),
    userUSDCBalance,
    estimatedValue,
    isApproving,
    isDepositing,
    isWithdrawing,
  };
}