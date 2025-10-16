import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAddress } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';
import { isAddress } from 'viem';

// Types
export interface BaseENSValidation {
  isValid: boolean;
  type: 'address' | 'basename' | 'phone' | 'invalid';
}

export interface BaseENSResolution {
  address: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseBaseENSResolutionReturn {
  data: string | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UseRecipientResolutionReturn {
  validation: BaseENSValidation;
  isValid: boolean;
  recipientType: 'address' | 'basename' | 'phone' | 'invalid';
  resolvedAddress: string | null;
  isResolving: boolean;
  resolutionError: Error | null;
  getPlaceholderText: () => string;
  getHelperText: (currentRecipient: string) => string;
  isBasename: boolean;
  isAddress: boolean;
  canProceed: boolean;
}

// Validation functions
export function isValidBasename(name: string): boolean {
  if (!name || name.length === 0) return false;
  
  // Check if it's a valid Base ENS format
  // Can be "name.base.eth" or just "name" (which will be normalized)
  const baseNameRegex = /^[a-zA-Z0-9-]+(\.base\.eth)?$/;
  return baseNameRegex.test(name) && name.length <= 63;
}

export function normalizeBasename(name: string): string {
  if (!name) return '';
  // Add .base.eth suffix if not present
  return name.endsWith('.base.eth') ? name : `${name}.base.eth`;
}

export function validateRecipient(recipient: string): BaseENSValidation {
  if (!recipient || recipient.trim().length === 0) {
    return { isValid: false, type: 'invalid' };
  }

  const trimmedRecipient = recipient.trim();

  // Check if it's a valid Ethereum address
  if (isAddress(trimmedRecipient)) {
    return { isValid: true, type: 'address' };
  }

  // Check if it's a valid Base ENS name
  if (isValidBasename(trimmedRecipient)) {
    return { isValid: true, type: 'basename' };
  }

  // Check if it's a phone number (basic validation)
  const phoneRegex = /^\+?[\d\s\-\(\)]{7,}$/;
  if (phoneRegex.test(trimmedRecipient)) {
    return { isValid: true, type: 'phone' };
  }

  return { isValid: false, type: 'invalid' };
}

// Custom hook for Base ENS resolution with debouncing
export function useBaseENSResolution(basename: string | null, debounceMs: number = 500) {
  const [debouncedBasename, setDebouncedBasename] = useState<string | null>(null);

  // Debounce the basename input
  useEffect(() => {
    if (!basename || basename.length < 3) {
      setDebouncedBasename(null);
      return;
    }

    // For addresses, resolve immediately (no need to wait)
    if (isAddress(basename)) {
      setDebouncedBasename(basename);
      return;
    }

    // For Base ENS names, wait for complete domain or reasonable length
    const timer = setTimeout(() => {
      if (isValidBasename(basename)) {
        setDebouncedBasename(normalizeBasename(basename));
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [basename, debounceMs]);

  return useQuery({
    queryKey: ['base-ens-resolution', debouncedBasename],
    queryFn: async () => {
      if (!debouncedBasename) return null;
      
      // If it's already an address, return it
      if (isAddress(debouncedBasename)) {
        return debouncedBasename;
      }

      try {
        // Use OnchainKit to resolve the address
        const resolvedAddress = await getAddress({ 
          name: debouncedBasename,
          chain: base,
        });
        
        return resolvedAddress || null;
      } catch (error) {
        console.error('Error resolving Base ENS name:', error);
        throw new Error('Failed to resolve Base ENS name');
      }
    },
    enabled: !!debouncedBasename,
    staleTime: 5 * 60 * 1000, // 5 minutes - ENS resolution results rarely change
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory longer
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry if it's a resolution error (name doesn't exist)
      if (error?.message?.includes('Failed to resolve')) {
        return false;
      }
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Combined hook for recipient validation and resolution
export function useRecipientResolution(recipient: string) {
  const validation = validateRecipient(recipient);
  const resolution = useBaseENSResolution(
    validation.type === 'basename' ? recipient : null
  );

  const getPlaceholderText = useCallback((): string => {
    return 'Enter wallet address or Base ENS name (e.g., alice.base.eth)';
  }, []);

  const getHelperText = useCallback((currentRecipient: string): string => {
    if (!currentRecipient) return '';
    
    const currentValidation = validateRecipient(currentRecipient);
    
    if (!currentValidation.isValid) {
      return 'Please enter a valid wallet address or Base ENS name';
    }

    switch (currentValidation.type) {
      case 'address':
        return 'Valid wallet address';
      case 'basename':
        if (resolution.isLoading) {
          return 'Resolving Base ENS name...';
        }
        if (resolution.error) {
          return 'Base ENS name could not be resolved';
        }
        if (resolution.data) {
          return `Resolves to ${resolution.data.slice(0, 6)}...${resolution.data.slice(-4)}`;
        }
        return 'Valid Base ENS name format';
      case 'phone':
        return 'Valid phone number (use Cash tab for mobile payments)';
      default:
        return '';
    }
  }, [resolution.isLoading, resolution.error, resolution.data]);

  return {
    // Validation
    validation,
    isValid: validation.isValid,
    recipientType: validation.type,

    // Resolution (only for Base ENS names)
    resolvedAddress: resolution.data,
    isResolving: resolution.isLoading,
    resolutionError: resolution.error,

    // Helper functions
    getPlaceholderText,
    getHelperText,

    // Computed states
    isBasename: validation.type === 'basename',
    isAddress: validation.type === 'address',
    canProceed: validation.isValid && (
      validation.type === 'address' || 
      (validation.type === 'basename' && resolution.data && !resolution.isLoading)
    ),
  };
}

// Function to get final address for payment (resolves Base ENS if needed)
export async function getFinalRecipientAddress(recipient: string): Promise<string | null> {
  const validation = validateRecipient(recipient);
  
  if (!validation.isValid) {
    return null;
  }

  // If it's already an address, return it
  if (validation.type === 'address') {
    return recipient;
  }

  // If it's a Base ENS name, resolve it
  if (validation.type === 'basename') {
    try {
      const normalizedName = normalizeBasename(recipient);
      const resolvedAddress = await getAddress({ 
        name: normalizedName,
        chain: base,
      });
      return resolvedAddress || null;
    } catch (error) {
      console.error('Error resolving Base ENS name for payment:', error);
      return null;
    }
  }

  return null;
}