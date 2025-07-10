'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class PrivyErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log non-Privy React 19 compatibility errors
    const errorMessage = error.message || '';
    
    // Check if this is a known Privy React 19 compatibility error
    const isKnownPrivyError = 
      errorMessage.includes('hideAnimations') ||
      errorMessage.includes('centered') ||
      errorMessage.includes('non-boolean attribute');

    if (!isKnownPrivyError) {
      console.error('PrivyErrorBoundary caught an error:', error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <div className="flex items-center justify-center min-h-64 bg-orange-50 rounded-lg">
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold text-orange-800 mb-2">
              Authentication System Loading
            </h3>
            <p className="text-orange-600 mb-4">
              Please wait while we initialize the wallet connection...
            </p>
            <button
              onClick={this.resetError}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Default fallback component
export const DefaultPrivyFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => (
  <div className="flex items-center justify-center min-h-64 bg-gray-50 rounded-lg">
    <div className="text-center p-6 max-w-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        Wallet Connection Issue
      </h3>
      <p className="text-gray-600 mb-4">
        There was an issue loading the wallet connection. This might be a temporary problem.
      </p>
      {error && process.env.NODE_ENV === 'development' && (
        <details className="text-left mb-4 text-sm text-gray-500">
          <summary className="cursor-pointer">Error Details (Dev Mode)</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
            {error.message}
          </pre>
        </details>
      )}
      <button
        onClick={resetError}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);