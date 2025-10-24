import { usePrivy } from '@privy-io/react-auth';
import { useCallback } from 'react';

export interface TransactionEmailData {
  transactionType: 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'investment' | 'lending';
  amount: string | number;
  currency?: string;
  transactionHash?: string;
  status?: 'success' | 'pending' | 'failed';
  timestamp?: string;
  shortcode?: string;
  receiptNumber?: string;
  publicName?: string;
  accountNumber?: string;
}

export const useTransactionEmail = () => {
  const { user } = usePrivy();
  console.log('user:', user);

  const sendTransactionEmail = useCallback(async (transactionData: TransactionEmailData) => {
    if (!user?.email?.address) {
      console.warn('User email not available, cannot send transaction email');
      return { success: false, error: 'User email not available' };
    }

    try {
      const response = await fetch('/api/send-transaction-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user.email.address,
          userName: user.email.address.split('@')[0], // Simple name extraction
          ...transactionData,
          timestamp: transactionData.timestamp || new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      const result = await response.json();
      console.log('Transaction email sent successfully:', result);
      return { success: true, emailId: result.emailId };
    } catch (error) {
      console.error('Error sending transaction email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, [user?.email?.address]);

  return {
    sendTransactionEmail,
    isEmailAvailable: !!user?.email?.address,
    userEmail: user?.email?.address,
  };
};