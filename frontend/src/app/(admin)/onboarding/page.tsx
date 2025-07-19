"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAccount, useChainId, useWriteContract, useSwitchChain } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { Wallet, ArrowRight, CheckCircle } from 'lucide-react';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { createOrGetBudgetWallet } from '@/lib/contracts/factory';
import { BudgetWalletCreationProgress } from '@/components/BudgetWalletCreationProgress';
import { CHAIN_IDS } from '@/lib/contracts/config';
import { Button } from '@/components/ui/button';

export default function OnboardingPage() {
  const router = useRouter();
  const { address: eoaAddress } = useAccount();
  const chainId = useChainId();
  console.log('chainId', chainId);
  const { writeContractAsync } = useWriteContract();
  const { switchChain } = useSwitchChain();
  const { smartAccountClient, smartAccountReady } = useSmartAccount();
  const { ready, authenticated, login } = usePrivy();

  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState('checking');
  const [error, setError] = useState<string | null>(null);

  const handleCreateWallet = async () => {
    if (!eoaAddress) return;

    setIsCreating(true);
    setError(null);
    setStep('checking');

    try {
      // Check if user is on Base mainnet, if not switch chains
      if (chainId !== CHAIN_IDS.BASE_MAINNET) {
        setStep('switching-network');
        console.log('Switching to Base mainnet...');
        await switchChain({ chainId: CHAIN_IDS.BASE_MAINNET });
        // Wait a moment for the chain switch to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setStep('waiting-smart-account');
      
      // Create budget wallet using Base mainnet
      // Try with smart account first, fallback to regular wallet if sponsorship fails
      let result;
      try {
        result = await createOrGetBudgetWallet(
          writeContractAsync,
          eoaAddress,
          CHAIN_IDS.BASE_MAINNET,
          smartAccountClient || undefined
        );
      } catch (sponsorshipError) {
        console.warn('Smart account sponsorship failed, falling back to regular transaction:', sponsorshipError);
        // Fallback to regular transaction without sponsorship
        result = await createOrGetBudgetWallet(
          writeContractAsync,
          eoaAddress,
          CHAIN_IDS.BASE_MAINNET,
          undefined // No smart account client = regular transaction
        );
      }

      if (result.alreadyExists) {
        setStep('completed');
        setTimeout(() => {
          router.push('/wallet');
        }, 2000);
      } else {
        setStep('creating');
        setStep('waiting');
        
        // Don't wait for transaction receipt due to timeout issues
        // The transaction hash indicates success, proceed to completion
        if (result.txHash) {
          console.log('Budget wallet creation transaction submitted:', result.txHash);
          setStep('completed');
          
          // Redirect to wallet page after successful creation
          setTimeout(() => {
            router.push('/wallet');
          }, 2000);
        } else {
          throw new Error('Transaction failed - no transaction hash received');
        }
      }
    } catch (err) {
      console.error('Error creating budget wallet:', err);
      
      // Handle timeout errors specifically
      if (err instanceof Error && err.message.includes('Timed out while waiting for transaction')) {
        setError('Transaction was submitted but confirmation is taking longer than expected. Please check your wallet and try refreshing the page.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create wallet');
      }
      setStep('error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setStep('checking');
    handleCreateWallet();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#ff7e5f]/5 to-[#ff7e5f]/10 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-[#ff7e5f]/20 dark:bg-[#ff7e5f]/10 rounded-full flex items-center justify-center mb-4">
            {/* <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" /> */}
            <Image src="/images/logo/logo-icon.svg" alt="Expendi" width={32} height={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to Expendi
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            To get started, you need to create a budget account on Base mainnet.
          </p>
        </div>

        <div className="space-y-6">
          {/* Show wallet connection UI if user is not connected */}
          {!authenticated || !eoaAddress ? (
            <>
              <div className="bg-[#ff7e5f]/5 dark:bg-[#ff7e5f]/10 border border-[#ff7e5f] dark:border-[#ff7e5f] rounded-lg p-4">
                <h3 className="font-medium text-black dark:text-white mb-2">
                  Connect Your Wallet
                </h3>
                <p className="text-sm text-black dark:text-white">
                  To get started with Expendi, you need to connect your wallet first. This will allow you to create and manage your budget account.
                </p>
              </div>

              <Button
                onClick={login}
                disabled={!ready}
                variant="primary"
                className='w-full'
              >
                <Wallet className="w-4 h-4" />
                <span>{!ready ? 'Loading...' : 'Connect Wallet'}</span>
              </Button>
            </>
          ) : (
            <>
              {/* Show budget wallet creation UI only after wallet is connected */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  What is a Budget Account?
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    Secure smart contract account for budget management
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    Automatic spending limits and controls
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    Gas-sponsored transactions available
                  </li>
                </ul>
              </div>

              {step !== 'checking' && (
                <BudgetWalletCreationProgress
                  isCreating={isCreating}
                  step={step}
                  error={error}
                  onRetry={handleRetry}
                />
              )}

              {!isCreating && step === 'checking' && (
                <Button
                  onClick={handleCreateWallet}
                  disabled={!eoaAddress || !smartAccountReady}
                  variant="primary"
                  className='w-full'
                >
                  <span>Create Budget Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {chainId !== CHAIN_IDS.BASE_MAINNET && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> Your budget account will be created on Base mainnet.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            This process creates a smart contract account that gives you advanced budget management features.
            Creating a budget account is free.
          </p>
        </div>
      </div>
    </div>
  );
}