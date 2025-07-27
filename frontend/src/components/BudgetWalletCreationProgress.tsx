// Component to show budget wallet creation progress
import React from 'react';
import { CheckCircle, Clock, Loader2, XCircle, Wallet } from 'lucide-react';

interface BudgetWalletCreationProgressProps {
  isCreating: boolean;
  step: string;
  error: string | null;
  className?: string;
  onRetry?: () => void;
}

export function BudgetWalletCreationProgress({ 
  isCreating, 
  step, 
  error, 
  className = '',
  onRetry 
}: BudgetWalletCreationProgressProps) {
  if (!isCreating && step === 'checking') {
    return null; // Don't show anything in initial state
  }

  const steps = [
    { id: 'checking', label: 'Checking existing account', icon: Clock },
    { id: 'switching-network', label: 'Switching to Base mainnet', icon: Loader2 },
    { id: 'waiting-smart-account', label: 'Preparing transaction', icon: Loader2 },
    { id: 'creating', label: 'Creating budget account', icon: Wallet },
    { id: 'waiting', label: 'Submitting transaction', icon: Loader2 },
    { id: 'completed', label: 'Wallet ready!', icon: CheckCircle },
    { id: 'error', label: 'Creation failed', icon: XCircle },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  if (step === 'completed') {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <h3 className="text-sm font-medium text-green-800">Budget Account Created!</h3>
            <p className="text-xs text-green-600">Your budget account is ready to use.</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between space-x-3">
          <div className="flex items-center space-x-3">
            <XCircle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Account Creation Failed</h3>
              <p className="text-xs text-red-600 mt-1">{error || 'An error occurred'}</p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 rounded transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">Creating Budget Account</h3>
            <p className="text-xs text-blue-600">This may take a few moments...</p>
          </div>
        </div>
        
        <div className="space-y-2">
          {steps.slice(0, -2).map((stepItem, index) => {
            const StepIcon = stepItem.icon;
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            // const isPending = index > currentStepIndex;

            return (
              <div key={stepItem.id} className="flex items-center space-x-3">
                <div className={`flex-shrink-0 ${
                  isCompleted ? 'text-green-600' :
                  isCurrent ? 'text-blue-600' :
                  'text-gray-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : isCurrent ? (
                    <StepIcon className={`h-4 w-4 ${stepItem.icon === Loader2 ? 'animate-spin' : ''}`} />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>
                <span className={`text-xs ${
                  isCompleted ? 'text-green-700' :
                  isCurrent ? 'text-blue-700' :
                  'text-gray-500'
                }`}>
                  {stepItem.label}
                  {isCurrent && stepItem.icon === Loader2 && '...'}
                </span>
              </div>
            );
          })}
        </div>

        
        {step === 'creating' && (
          <div className="text-xs text-blue-600 bg-blue-100 rounded p-2 mt-3">
            <strong>Note:</strong> You&apos;ll need to confirm this transaction in your wallet.
          </div>
        )}
        

      </div>
    </div>
  );
}

// Simpler version for inline display
export function BudgetWalletCreationStatus({ 
  isCreating, 
  step, 
  onRetry
}: Omit<BudgetWalletCreationProgressProps, 'error'>) {
  if (!isCreating && step === 'checking') {
    return null;
  }

  if (step === 'completed') {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">Budget Account ready</span>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2 text-red-600">
          <XCircle className="h-4 w-4" />
          <span className="text-sm">Account creation failed</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 rounded transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }
  

  return (
    <div className="flex items-center space-x-2 text-blue-600">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">
        {step === 'checking' && 'Checking wallet...'}
        {step === 'switching-network' && 'Switching network...'}
        {step === 'waiting-smart-account' && 'Preparing transaction...'}
        {step === 'creating' && 'Creating wallet...'}
        {step === 'waiting' && 'Submitting transaction...'}
      </span>
    </div>
  );
}