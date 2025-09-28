"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSmartAccount } from '@/context/SmartAccountContext';

interface SelfVerificationState {
  isVerified: boolean;
  isVerifying: boolean;
  verificationStep: 'idle' | 'scanning' | 'verifying' | 'complete';
  userNationality: string | null;
  lastVerified: Date | null;
}

export const useSelfVerification = () => {
  const { address: eoaAddress } = useAccount();
  const { smartAccountAddress, smartAccountReady } = useSmartAccount();
  const [verificationState, setVerificationState] = useState<SelfVerificationState>({
    isVerified: false,
    isVerifying: false,
    verificationStep: 'idle',
    userNationality: null,
    lastVerified: null
  });

  // Use smart account address if available, fallback to EOA
  const verificationAddress = smartAccountReady && smartAccountAddress ? smartAccountAddress : eoaAddress;

  // Check localStorage for existing verification
  useEffect(() => {
    if (verificationAddress) {
      const storedVerification = localStorage.getItem(`self_verification_${verificationAddress}`);
      if (storedVerification) {
        try {
          const parsed = JSON.parse(storedVerification);
          const isExpired = parsed.timestamp && (Date.now() - parsed.timestamp) > (24 * 60 * 60 * 1000); // 24 hours
          
          if (!isExpired) {
            setVerificationState({
              isVerified: true,
              isVerifying: false,
              verificationStep: 'complete',
              userNationality: parsed.nationality,
              lastVerified: new Date(parsed.timestamp)
            });
          } else {
            // Clear expired verification
            localStorage.removeItem(`self_verification_${verificationAddress}`);
          }
        } catch (error) {
          console.error('Error parsing stored verification:', error);
          localStorage.removeItem(`self_verification_${verificationAddress}`);
        }
      }
    }
  }, [verificationAddress]);

  const startVerification = () => {
    setVerificationState(prev => ({
      ...prev,
      isVerifying: true,
      verificationStep: 'scanning'
    }));
  };

  const setVerificationStep = (step: 'idle' | 'scanning' | 'verifying' | 'complete') => {
    setVerificationState(prev => ({
      ...prev,
      verificationStep: step
    }));
  };

  const completeVerification = (nationality: string) => {
    const now = new Date();
    const verificationData = {
      isVerified: true,
      nationality,
      timestamp: now.getTime()
    };

    if (verificationAddress) {
      localStorage.setItem(`self_verification_${verificationAddress}`, JSON.stringify(verificationData));
    }

    setVerificationState({
      isVerified: true,
      isVerifying: false,
      verificationStep: 'complete',
      userNationality: nationality,
      lastVerified: now
    });
  };

  const failVerification = () => {
    setVerificationState(prev => ({
      ...prev,
      isVerified: false,
      isVerifying: false,
      verificationStep: 'idle',
      userNationality: null,
      lastVerified: null
    }));
  };

  const resetVerification = () => {
    if (verificationAddress) {
      localStorage.removeItem(`self_verification_${verificationAddress}`);
    }
    setVerificationState({
      isVerified: false,
      isVerifying: false,
      verificationStep: 'idle',
      userNationality: null,
      lastVerified: null
    });
  };

  return {
    ...verificationState,
    startVerification,
    setVerificationStep,
    completeVerification,
    failVerification,
    resetVerification
  };
};
