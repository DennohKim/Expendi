"use client"

import { useSmartAccount } from '@/context/SmartAccountContext';
import { useWalletUser } from '@/hooks/useWalletUser';
import { useState } from 'react';
import { Account } from 'viem';

export const TestGasSponsorship = () => {
  const { smartAccountClient, smartAccountReady, smartAccountAddress } = useSmartAccount();
  const { isConnected, address } = useWalletUser();
  const [testResult, setTestResult] = useState<string>('');

  const testSponsoredTransaction = async () => {
    try {
      setTestResult('Testing gas sponsorship...');
      
      if (!smartAccountClient || !smartAccountReady) {
        setTestResult('Smart account not ready');
        return;
      }

      // Simple test transaction to zero address with sponsored gas
      const txHash = await smartAccountClient.writeContract({
        address: '0x0000000000000000000000000000000000000000',
        abi: [{
          inputs: [],
          name: 'nonExistentFunction',
          outputs: [],
          stateMutability: 'view',
          type: 'function'
        }],
        functionName: 'nonExistentFunction',
        account: smartAccountClient.account as Account,
        chain: smartAccountClient.chain,
        value: BigInt(0)
      });

      setTestResult(`Sponsored transaction sent: ${txHash}`);
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!isConnected) {
    return <div>Please connect your wallet first</div>;
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-4">Gas Sponsorship Test</h3>
      
      <div className="space-y-2 mb-4">
        <p>Connected Address: {address}</p>
        <p>Smart Account Address: {smartAccountAddress}</p>
        <p>Smart Account Ready: {smartAccountReady ? 'Yes' : 'No'}</p>
      </div>
      
      <button
        onClick={testSponsoredTransaction}
        disabled={!smartAccountReady}
        className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
      >
        Test Sponsored Transaction
      </button>
      
      {testResult && (
        <div className="mt-4 p-2 bg-gray-100 rounded">
          {testResult}
        </div>
      )}
    </div>
  );
};