import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatUnits, isAddress } from 'viem';
import { useSpendFromBucket } from './useSpendFromBucket';
import { useMobilePayment } from './useMobilePayment';
// import { useReceiptGeneration } from './useReceiptGeneration';

interface BucketPaymentRequest {
  // Required data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  smartAccountClient: any; // Smart account client from permissionless
  walletAddress: `0x${string}`;
  userAddress: `0x${string}`;
  bucketName: string;
  amount: string;
  
  // Payment method - either recipient or mobile payment data
  recipient?: string;
  phoneNumber?: string;
  paymentType?: 'MOBILE' | 'PAYBILL' | 'BUY_GOODS';
  mobileNetwork?: 'Safaricom' | 'Airtel';
  
  // Balance validation data
  availableBalance: bigint;
  currentSpent: string;
  monthlyLimit: string;
  exchangeRate?: number | null;
}

interface BucketPaymentResponse {
  txHash: string;
  paymentResult?: Record<string, unknown>;
}

export function useBucketPayment() {
  const spendFromBucket = useSpendFromBucket();
  const mobilePayment = useMobilePayment();
  // const receiptGeneration = useReceiptGeneration();

  const mutation = useMutation({
    mutationFn: async (request: BucketPaymentRequest): Promise<BucketPaymentResponse> => {
      const {
        smartAccountClient,
        walletAddress,
        userAddress,
        bucketName,
        amount,
        recipient,
        phoneNumber,
        paymentType = 'MOBILE',
        mobileNetwork = 'Safaricom',
        availableBalance,
        currentSpent,
        monthlyLimit,
        exchangeRate
      } = request;

      // Validation
      if (!bucketName) {
        throw new Error('Please select a bucket');
      }

      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (!recipient && !phoneNumber) {
        throw new Error('Please enter either a recipient address or phone number');
      }

      if (recipient && !isAddress(recipient)) {
        throw new Error('Please enter a valid recipient address');
      }

      if (!smartAccountClient?.account) {
        throw new Error('Smart account not available');
      }

      // Balance checks
      const availableBalanceFormatted = formatUnits(availableBalance, 6);
      const currentSpentFormatted = formatUnits(BigInt(currentSpent), 6);
      const monthlyLimitFormatted = formatUnits(BigInt(monthlyLimit), 6);
      const remainingBudget = parseFloat(monthlyLimitFormatted) - parseFloat(currentSpentFormatted);

      if (parseFloat(amount) > parseFloat(availableBalanceFormatted)) {
        throw new Error(`Insufficient balance in bucket. Available: ${availableBalanceFormatted} USDC`);
      }

      if (parseFloat(amount) > remainingBudget) {
        throw new Error(`Amount exceeds remaining budget. Remaining: ${remainingBudget.toFixed(2)} USDC`);
      }

      // Show initial loading message
      toast.info(`Spending ${amount} USDC from ${bucketName}...`);

      let finalRecipient: `0x${string}`;
      let txHash: string;

      if (phoneNumber) {
        // Mobile payment flow - send to settlement address first
        const settlementAddress = '0x8005ee53E57aB11E11eAA4EFe07Ee3835Dc02F98';
        finalRecipient = settlementAddress as `0x${string}`;
        
        // Execute blockchain transaction to settlement address
        const spendResult = await spendFromBucket.mutateAsync({
          smartAccountClient,
          walletAddress,
          userAddress,
          bucketName,
          amount,
          recipient: finalRecipient,
        });
        
        txHash = spendResult.txHash;

        // Convert USDC amount to local currency using exchange rate
        const localAmount = exchangeRate ? (parseFloat(amount) * exchangeRate).toString() : amount;

        // Initiate mobile payment
        const paymentResult = await mobilePayment.mutateAsync({
          transaction_hash: txHash,
          amount: localAmount,
          shortcode: phoneNumber,
          type: paymentType,
          mobile_network: mobileNetwork,
          callback_url: "http://localhost:3000/api/pretium/callback",
          chain: "BASE",
        });

        // Generate receipt if transaction_code is available
        // if (paymentResult.transaction_code) {
        //   try {
        //     await receiptGeneration.mutateAsync({
        //       transaction_code: paymentResult.transaction_code,
        //     });
        //   } catch (receiptError) {
        //     console.error('Receipt generation failed:', receiptError);
        //     // Don't fail the entire payment flow for receipt generation
        //   }
        // }

        toast.success(`Successfully initiated mobile payment of ${amount} USDC to ${phoneNumber}!`);
        
        return { txHash, paymentResult };
      } else {
        // Regular wallet transfer
        finalRecipient = recipient as `0x${string}`;
        
        const spendResult = await spendFromBucket.mutateAsync({
          smartAccountClient,
          walletAddress,
          userAddress,
          bucketName,
          amount,
          recipient: finalRecipient,
        });
        
        txHash = spendResult.txHash;
        
        toast.success(`Successfully spent ${amount} USDC from ${bucketName}!`);
        
        return { txHash };
      }
    },
    onError: (error) => {
      console.error('Bucket payment error:', error);
      // Error toasts are handled in individual hooks, but we can add a general fallback
      if (!error.message.includes('bucket') && !error.message.includes('payment')) {
        toast.error('Payment failed');
      }
    },
  });

  return {
    ...mutation,
    isProcessing: mutation.isPending || spendFromBucket.isPending || mobilePayment.isPending,
  };
}