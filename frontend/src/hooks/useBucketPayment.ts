import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatUnits, isAddress } from 'viem';
import { useSpendFromBucket } from './useSpendFromBucket';
import { useMobilePayment } from './useMobilePayment';
import { calculateUSDCAmountWithFee } from '@/utils/feeCalculation';
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
  accountNumber?: string; // Required for PAYBILL type in KES
  paymentType?: 'MOBILE' | 'PAYBILL' | 'BUY_GOODS';
  mobileNetwork?: string; // Updated to allow any network based on country
  selectedCountry?: 'KES' | 'UGX' | 'GHS' | 'CDF' | 'ETB';
  
  // Balance validation data
  availableBalance: bigint;
  currentSpent: string;
  monthlyLimit: string;
  exchangeRate?: number | null;
  usdcEquivalent?: number | null;
}

interface BucketPaymentResponse {
  txHash: string;
  paymentResult?: Record<string, unknown>;
  transactionCode?: string;
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
        accountNumber,
        paymentType = 'MOBILE',
        mobileNetwork,
        selectedCountry = 'KES',
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

      // Mobile money countries validation
      if (!recipient && !phoneNumber) {
        throw new Error('Please enter either a recipient address or phone number');
      }
      
      if (recipient && !isAddress(recipient)) {
        throw new Error('Please enter a valid recipient address');
      }
      
      if (selectedCountry === 'KES' && paymentType === 'PAYBILL' && !accountNumber) {
        throw new Error('Account number is required for Paybill payments');
      }
      
      if (phoneNumber && !mobileNetwork) {
        throw new Error('Please select a mobile network');
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
      toast.info(`Spending ${parseFloat(amount).toFixed(2)} USDC from ${bucketName}...`);

      let finalRecipient: `0x${string}`;
      let txHash: string;

      if (phoneNumber || accountNumber) {
        // Mobile money, Paybill, or Buy Goods payment flow - send to settlement address first
        const settlementAddress = '0x8005ee53E57aB11E11eAA4EFe07Ee3835Dc02F98';
        finalRecipient = settlementAddress as `0x${string}`;
        
        // Convert USDC amount to local currency using exchange rate
        const localAmount = exchangeRate ? (parseFloat(amount) * exchangeRate) : parseFloat(amount);
        
        // Calculate fee based on B2C tiers for ALL payment types (MOBILE, PAYBILL, BUY_GOODS)
        const feeCalculation = calculateUSDCAmountWithFee(localAmount, exchangeRate || 1);
        
        // Round local amount to nearest whole number with no decimals
        const totalLocalAmount = Math.round(feeCalculation.totalLocal).toString();
        
        // Use the calculated USDC amount that includes the fee
        const usdcAmountToSpend = feeCalculation.totalUSDC.toString();
        
        // Execute blockchain transaction to settlement address
        const spendResult = await spendFromBucket.mutateAsync({
          smartAccountClient,
          walletAddress,
          userAddress,
          bucketName,
          amount: usdcAmountToSpend,
          recipient: finalRecipient,
        });
        
        txHash = spendResult.txHash;

        // Initiate payment (mobile money, paybill, or buy goods)
        const paymentResult = await mobilePayment.mutateAsync({
          transaction_hash: txHash,
          amount: totalLocalAmount,
          shortcode: phoneNumber || accountNumber || '',
          fee: feeCalculation.feeLocal.toString(), 
          ...(accountNumber && { account_number: accountNumber }),
          type: paymentType,
          mobile_network: mobileNetwork || '',
          callback_url: "http://localhost:3000/api/pretium/callback",
          chain: "BASE",
          selectedCountry,
        });

        // Enhanced logging for production debugging
        console.log('Mobile payment result:', paymentResult);
        console.log('Payment result keys:', Object.keys(paymentResult));
        console.log('Full payment result structure:', JSON.stringify(paymentResult, null, 2));
        
        // Try multiple ways to extract transaction code for production compatibility
        let transactionCode = (paymentResult as { transaction_code?: string }).transaction_code;
        
        if (!transactionCode) {
          console.warn('⚠️ Transaction code not found in primary location, trying alternatives...');
          
          // Try alternative extraction methods for production
          transactionCode = 
            (paymentResult as { data?: { transaction_code?: string } }).data?.transaction_code ||
            (paymentResult as { code?: string }).code ||
            (paymentResult as { id?: string }).id;
            
          if (transactionCode) {
            console.log('Found transaction code via alternative method:', transactionCode);
          } else {
            console.error('❌ Transaction code not found in any expected location!');
          }
        } else {
          console.log('Found transaction code in primary location:', transactionCode);
        }

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

        const recipientDisplay = phoneNumber || accountNumber || 'recipient';
        const paymentTypeDisplay = paymentType === 'MOBILE' ? 'mobile payment' : 
                                  paymentType === 'PAYBILL' ? 'paybill payment' : 
                                  paymentType === 'BUY_GOODS' ? 'buy goods payment' : 'payment';
        
        toast.success(`Successfully initiated ${paymentTypeDisplay} of ${parseFloat(amount).toFixed(2)} USDC to ${recipientDisplay}!`);
        
        return { 
          txHash, 
          paymentResult,
          transactionCode: transactionCode as string
        };
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
        
        toast.success(`Successfully spent ${parseFloat(amount).toFixed(2)} USDC from ${bucketName}!`);
        
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