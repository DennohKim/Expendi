import { useState, useEffect } from "react";
import { parseUnits } from "viem";
import { useReadContract, useWriteContract, useConfig, useChainId } from "wagmi";
import { useWallets } from "@privy-io/react-auth";
import { base } from "wagmi/chains";
import { ERC20_ABI, ERC4626_ABI } from "./ABIs";
import { createTxStatusMessage, formatErrorMessage } from "../utils";
import { useQueryClient } from "@tanstack/react-query";

interface VaultInfo {
  address: string;
  asset: {
    address: string;
    symbol: string;
    decimals: number;
  };
}

export function   useVaultOperations(
  address: string | undefined,
  vaultInfo: VaultInfo | null
) {
  const [amount, setAmount] = useState("");
  const [txStatus, setTxStatus] = useState("");
  const [pendingDeposit, setPendingDeposit] = useState(false);
  const queryClient = useQueryClient();
  
  // Privy wallet management
  const { wallets } = useWallets();
  const config = useConfig();
  const chainId = useChainId();
  
  // Check if wallet is properly connected
  const [isWalletReady, setIsWalletReady] = useState(false);
  
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (wallets.length > 0 && address) {
        const wallet = wallets[0];
        // Check if wallet is connected and matches the current address
        if (wallet.address?.toLowerCase() === address.toLowerCase()) {
          setIsWalletReady(true);
        } else {
          setIsWalletReady(false);
        }
      } else {
        setIsWalletReady(false);
      }
    };
    
    checkWalletConnection();
  }, [wallets, address]);

  // Function to refetch all relevant data after transaction success
  const refetchData = () => {
    // Invalidate all queries to trigger refetch
    queryClient.invalidateQueries();
  };

  // Read asset balance
  const { data: assetBalance } = useReadContract({
    address: vaultInfo?.asset.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!vaultInfo?.asset.address },
  });

  // Read vault share balance
  const { data: vaultBalance } = useReadContract({
    address: vaultInfo?.address as `0x${string}`,
    abi: ERC4626_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!vaultInfo?.address },
  });

  // Read user's deposited assets (convert shares to assets)
  const { data: depositedAssets } = useReadContract({
    address: vaultInfo?.address as `0x${string}`,
    abi: ERC4626_ABI,
    functionName: "convertToAssets",
    args: vaultBalance ? [vaultBalance] : undefined,
    query: { enabled: !!vaultInfo?.address && !!vaultBalance },
  });

  // Read max withdraw to validate withdrawal amounts
  const { data: maxWithdrawAmount } = useReadContract({
    address: vaultInfo?.address as `0x${string}`,
    abi: ERC4626_ABI,
    functionName: "maxWithdraw",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!vaultInfo?.address },
  });

  // Preview deposit - see how many shares user will get
  const { data: previewDepositShares } = useReadContract({
    address: vaultInfo?.address as `0x${string}`,
    abi: ERC4626_ABI,
    functionName: "previewDeposit",
    args:
      amount && vaultInfo?.asset.decimals
        ? [parseUnits(amount || "0", vaultInfo.asset.decimals)]
        : undefined,
    query: {
      enabled:
        !!vaultInfo?.address &&
        !!amount &&
        parseFloat(amount) > 0 &&
        !!vaultInfo?.asset.decimals,
    },
  });

  // Preview withdraw - see how many shares will be burned
  const { data: previewWithdrawShares } = useReadContract({
    address: vaultInfo?.address as `0x${string}`,
    abi: ERC4626_ABI,
    functionName: "previewWithdraw",
    args:
      amount && vaultInfo?.asset.decimals
        ? [parseUnits(amount || "0", vaultInfo.asset.decimals)]
        : undefined,
    query: {
      enabled:
        !!vaultInfo?.address &&
        !!amount &&
        parseFloat(amount) > 0 &&
        !!vaultInfo?.asset.decimals,
    },
  });

  // Convert withdrawal amount to shares for accurate redemption
  const { data: convertToSharesAmount } = useReadContract({
    address: vaultInfo?.address as `0x${string}`,
    abi: ERC4626_ABI,
    functionName: "convertToShares",
    args:
      amount && vaultInfo?.asset.decimals
        ? [parseUnits(amount || "0", vaultInfo.asset.decimals)]
        : undefined,
    query: {
      enabled:
        !!vaultInfo?.address &&
        !!amount &&
        parseFloat(amount) > 0 &&
        !!vaultInfo?.asset.decimals,
    },
  });

  // Read allowance
  const { data: allowance } = useReadContract({
    address: vaultInfo?.asset.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && vaultInfo?.asset.address && vaultInfo?.address
        ? [address, vaultInfo.address]
        : undefined,
    query: {
      enabled: !!address && !!vaultInfo?.asset.address && !!vaultInfo?.address,
    },
  });

  // Approve asset
  const {
    writeContract: writeApprove,
    isPending: isApproving,
    error: approveError,
  } = useWriteContract({
    mutation: {
      onSuccess: () => {
        setTxStatus(createTxStatusMessage("Approval", true));
        refetchData();

        // If there's a pending deposit, automatically trigger it
        if (pendingDeposit && vaultInfo && address) {
          setTimeout(() => {
            handleDepositAfterApproval();
          }, 1000); // Small delay to ensure approval is processed
        }
      },
      onError: (error) => {
        setTxStatus(
          createTxStatusMessage("Approval", false, formatErrorMessage(error))
        );
        setPendingDeposit(false);
      },
    },
  });

  // Deposit
  const {
    writeContract: writeDeposit,
    isPending: isDepositing,
    error: depositError,
  } = useWriteContract({
    mutation: {
      onSuccess: () => {
        setTxStatus(createTxStatusMessage("Deposit", true));
        refetchData();
        setPendingDeposit(false);
      },
      onError: (error) => {
        setTxStatus(
          createTxStatusMessage("Deposit", false, formatErrorMessage(error))
        );
        setPendingDeposit(false);
      },
    },
  });

  // Withdraw
  const {
    writeContract: writeWithdraw,
    isPending: isWithdrawing,
    error: withdrawError,
  } = useWriteContract({
    mutation: {
      onSuccess: () => {
        setTxStatus(createTxStatusMessage("Withdraw", true));
        refetchData();
      },
      onError: (error) => {
        setTxStatus(
          createTxStatusMessage("Withdraw", false, formatErrorMessage(error))
        );
      },
    },
  });

  // Redeem (alternative to withdraw, more accurate for share-based withdrawals)
  const {
    writeContract: writeRedeem,
    isPending: isRedeeming,
  } = useWriteContract({
    mutation: {
      onSuccess: () => {
        setTxStatus(createTxStatusMessage("Withdraw", true));
        refetchData();
      },
      onError: (error) => {
        setTxStatus(
          createTxStatusMessage("Withdraw", false, formatErrorMessage(error))
        );
      },
    },
  });

  const handleDepositAfterApproval = async () => {
    if (!vaultInfo?.address || !address) return;
    
    // Check wallet connection before proceeding
    if (!isWalletReady) {
      setTxStatus(
        createTxStatusMessage(
          "Deposit",
          false,
          "Wallet not connected. Please ensure your wallet is connected."
        )
      );
      setPendingDeposit(false);
      return;
    }
    
    // Check if on correct chain
    if (!chainId || chainId !== base.id) { // Base mainnet
      setTxStatus(
        createTxStatusMessage(
          "Deposit",
          false,
          "Please switch to Base network in your wallet."
        )
      );
      setPendingDeposit(false);
      return;
    }

    try {
      await writeDeposit({
        address: vaultInfo.address as `0x${string}`,
        abi: ERC4626_ABI,
        functionName: "deposit",
        args: [parseUnits(amount, vaultInfo.asset.decimals), address],
      });
    } catch (e: unknown) {
      setTxStatus(
        createTxStatusMessage("Deposit", false, formatErrorMessage(e))
      );
      setPendingDeposit(false);
    }
  };

  const handleApprove = async () => {
    if (!vaultInfo?.asset.address || !vaultInfo?.address) return;
    
    // Check wallet connection before proceeding
    if (!isWalletReady) {
      setTxStatus(
        createTxStatusMessage(
          "Approval",
          false,
          "Wallet not connected. Please ensure your wallet is connected."
        )
      );
      return;
    }
    
    // Check if on correct chain
    if (!chainId || chainId !== base.id) { // Base mainnet
      setTxStatus(
        createTxStatusMessage(
          "Approval",
          false,
          "Please switch to Base network in your wallet."
        )
      );
      return;
    }

    setTxStatus("");
    setPendingDeposit(true); // Mark that we want to deposit after approval
    try {
      await writeApprove({
        address: vaultInfo.asset.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [vaultInfo.address, parseUnits(amount, vaultInfo.asset.decimals)],
      });
    } catch (e: unknown) {
      setTxStatus(
        createTxStatusMessage("Approval", false, formatErrorMessage(e))
      );
      setPendingDeposit(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    if (!vaultInfo?.address || !address) return;

    e.preventDefault();
    
    // Check wallet connection before proceeding
    if (!isWalletReady) {
      setTxStatus(
        createTxStatusMessage(
          "Deposit",
          false,
          "Wallet not connected. Please ensure your wallet is connected."
        )
      );
      return;
    }
    
    // Check if on correct chain
    if (!chainId || chainId !== base.id) { // Base mainnet
      setTxStatus(
        createTxStatusMessage(
          "Deposit",
          false,
          "Please switch to Base network in your wallet."
        )
      );
      return;
    }
    
    setTxStatus("");
    try {
      await writeDeposit({
        address: vaultInfo.address as `0x${string}`,
        abi: ERC4626_ABI,
        functionName: "deposit",
        args: [parseUnits(amount, vaultInfo.asset.decimals), address],
      });
    } catch (e: unknown) {
      setTxStatus(
        createTxStatusMessage("Deposit", false, formatErrorMessage(e))
      );
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    if (!vaultInfo?.address || !address) return;

    e.preventDefault();
    
    // Check wallet connection before proceeding
    if (!isWalletReady) {
      setTxStatus(
        createTxStatusMessage(
          "Withdraw",
          false,
          "Wallet not connected. Please ensure your wallet is connected."
        )
      );
      return;
    }
    
    // Check if on correct chain
    if (!chainId || chainId !== base.id) { // Base mainnet
      setTxStatus(
        createTxStatusMessage(
          "Withdraw",
          false,
          "Please switch to Base network in your wallet."
        )
      );
      return;
    }
    
    // Validate withdrawal amount doesn't exceed max
    const withdrawAmount = parseUnits(amount, vaultInfo.asset.decimals);
    if (maxWithdrawAmount && withdrawAmount > (maxWithdrawAmount as bigint)) {
      setTxStatus(
        createTxStatusMessage(
          "Withdraw",
          false,
          "Withdrawal amount exceeds maximum available. Please reduce the amount."
        )
      );
      return;
    }
    
    setTxStatus("");
    try {
      // Use redeem instead of withdraw for more accurate amounts
      // Convert assets to shares and burn those shares
      if (convertToSharesAmount && vaultBalance) {
        const sharesToRedeem = convertToSharesAmount as bigint;
        const userShares = vaultBalance as bigint;
        
        // Cap to user's actual share balance to avoid exceeding
        const actualSharesToRedeem = sharesToRedeem > userShares ? userShares : sharesToRedeem;
        
        await writeRedeem({
          address: vaultInfo.address as `0x${string}`,
          abi: ERC4626_ABI,
          functionName: "redeem",
          args: [actualSharesToRedeem, address, address],
        });
      } else {
        // Fallback to withdraw if conversion not available
        await writeWithdraw({
          address: vaultInfo.address as `0x${string}`,
          abi: ERC4626_ABI,
          functionName: "withdraw",
          args: [withdrawAmount, address, address],
        });
      }
    } catch (e: unknown) {
      setTxStatus(
        createTxStatusMessage("Withdraw", false, formatErrorMessage(e))
      );
    }
  };

  const needsApproval =
    (allowance !== undefined &&
      vaultInfo?.asset.decimals &&
      parseUnits(amount || "0", vaultInfo.asset.decimals) >
        (allowance as bigint)) ||
    false;

  return {
    amount,
    setAmount,
    txStatus,
    setTxStatus,
    pendingDeposit,
    assetBalance,
    vaultBalance,
    depositedAssets,
    allowance,
    maxWithdrawAmount,
    previewDepositShares,
    previewWithdrawShares,
    convertToSharesAmount,
    isApproving,
    isDepositing,
    isWithdrawing: isWithdrawing || isRedeeming,
    approveError,
    depositError,
    withdrawError,
    handleApprove,
    handleDeposit,
    handleWithdraw,
    needsApproval,
    isWalletReady,
  };
}
