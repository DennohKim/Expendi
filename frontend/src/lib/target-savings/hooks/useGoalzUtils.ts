import { useCallback } from 'react';
import { Address, formatUnits, parseUnits } from 'viem';
import { Goal, GoalFormData, TokenInfo, VaultInfo } from '../types';
import { SUPPORTED_TOKENS, SUPPORTED_VAULTS, UI_CONFIG, FORMATTING } from '../config';

// Utility hook for formatting and validation
export function useGoalzUtils() {

  // Format amount with proper decimals
  const formatAmount = useCallback((amount: bigint, decimals: number = 6): string => {
    const formatted = formatUnits(amount, decimals);
    const num = parseFloat(formatted);
    
    if (num >= FORMATTING.COMPACT_THRESHOLD) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    
    return num.toFixed(FORMATTING.DECIMAL_PLACES);
  }, []);

  // Parse amount from string to bigint
  const parseAmount = useCallback((amount: string, decimals: number = 6): bigint => {
    try {
      return parseUnits(amount, decimals);
    } catch {
      return BigInt(0);
    }
  }, []);

  // Format date
  const formatDate = useCallback((timestamp: bigint): string => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString();
  }, []);

  // Format progress percentage
  const formatProgress = useCallback((progressBigInt: bigint): number => {
    return Math.min(Number(progressBigInt), 100);
  }, []);

  // Calculate days remaining
  const getDaysRemaining = useCallback((deadline: bigint): number => {
    const now = Math.floor(Date.now() / 1000);
    const deadlineSeconds = Number(deadline);
    const secondsRemaining = deadlineSeconds - now;
    return Math.max(0, Math.floor(secondsRemaining / 86400));
  }, []);

  // Validate goal form data
  const validateGoalForm = useCallback((formData: GoalFormData): string[] => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push('Goal name is required');
    }

    if (formData.name.length > 50) {
      errors.push('Goal name must be 50 characters or less');
    }

    const targetAmount = parseAmount(formData.targetAmount);
    if (targetAmount < UI_CONFIG.MIN_TARGET_AMOUNT) {
      errors.push(`Target amount must be at least ${formatAmount(UI_CONFIG.MIN_TARGET_AMOUNT)} USDC`);
    }

    if (targetAmount > UI_CONFIG.MAX_TARGET_AMOUNT) {
      errors.push(`Target amount cannot exceed ${formatAmount(UI_CONFIG.MAX_TARGET_AMOUNT)} USDC`);
    }

    const deadlineDate = new Date(formData.deadline);
    const now = new Date();
    const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < UI_CONFIG.DEADLINE_MIN_DAYS) {
      errors.push(`Deadline must be at least ${UI_CONFIG.DEADLINE_MIN_DAYS} day(s) from now`);
    }

    if (diffDays > UI_CONFIG.DEADLINE_MAX_DAYS) {
      errors.push(`Deadline cannot be more than ${UI_CONFIG.DEADLINE_MAX_DAYS} days from now`);
    }

    if (formData.enableAutomation) {
      if (!formData.automationAmount) {
        errors.push('Automation amount is required when automation is enabled');
      } else {
        const automationAmount = parseAmount(formData.automationAmount);
        if (automationAmount < UI_CONFIG.MIN_DEPOSIT_AMOUNT) {
          errors.push(`Automation amount must be at least ${formatAmount(UI_CONFIG.MIN_DEPOSIT_AMOUNT)} USDC`);
        }
      }

      if (!formData.automationInterval) {
        errors.push('Automation interval is required when automation is enabled');
      }
    }

    return errors;
  }, [parseAmount, formatAmount]);

  // Get token info by address
  const getTokenInfo = useCallback((tokenAddress: Address): TokenInfo | undefined => {
    return SUPPORTED_TOKENS.find(token => token.address.toLowerCase() === tokenAddress.toLowerCase());
  }, []);

  // Get vault info by address
  const getVaultInfo = useCallback((vaultAddress: Address): VaultInfo | undefined => {
    return SUPPORTED_VAULTS.find(vault => vault.address.toLowerCase() === vaultAddress.toLowerCase());
  }, []);

  // Check if user needs to approve tokens (placeholder - would need allowance data)
  const checkApprovalNeeded = useCallback(() => {
    // This would need to be implemented with allowance data passed in
    return true; // Placeholder
  }, []);

  // Calculate goal status
  const getGoalStatus = useCallback((goal: Goal, progress: { progressPercentage: bigint; isExpired: boolean }) => {
    if (!goal.isActive) return 'deleted';
    if (progress.progressPercentage >= BigInt(100)) return 'completed';
    if (progress.isExpired) return 'expired';
    return 'active';
  }, []);

  // Format currency amount
  const formatCurrency = useCallback((amount: bigint, decimals: number = 6): string => {
    const formatted = formatAmount(amount, decimals);
    return `$${formatted}`;
  }, [formatAmount]);

  // Calculate APY estimate (placeholder - would need real vault data)
  const estimateAPY = useCallback((): number => {
    // This would typically fetch real APY data from the vault
    // For now, returning a placeholder value
    return 5.2; // 5.2% APY
  }, []);

  return {
    formatAmount,
    parseAmount,
    formatDate,
    formatProgress,
    getDaysRemaining,
    validateGoalForm,
    getTokenInfo,
    getVaultInfo,
    checkApprovalNeeded,
    getGoalStatus,
    formatCurrency,
    estimateAPY,
  };
}