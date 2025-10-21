import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig, CHAIN_IDS } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';

interface SubscriptionInfo {
  subscriptionId: number;
  bucketName: string;
  amount: string; // formatted USDC amount
  periodInDays: number;
  token: string;
  recipient: string;
  isActive: boolean;
  nextChargeTimestamp: number;
  totalCharged: string; // formatted USDC amount
  chargeCount: number;
  createdAt: number;
  lastProcessedAt: number;
  userConsent: boolean;
  // Raw values
  rawAmount: bigint;
  rawTotalCharged: bigint;
}

export function useUserSubscriptions() {
  const { smartAccountClient } = useSmartAccount();

  return useQuery({
    queryKey: ['user-subscriptions', smartAccountClient?.account?.address],
    queryFn: async (): Promise<SubscriptionInfo[]> => {
      if (!smartAccountClient?.account) {
        throw new Error('Smart account not available');
      }

      const networkConfig = getNetworkConfig(CHAIN_IDS.BASE_SEPOLIA);
      const bucketManagerAddress = networkConfig.EXPENDI_BUCKET_MANAGER_ADDRESS as `0x${string}`;
      
      if (!bucketManagerAddress) {
        throw new Error('ExpendiBucketManager not available on this network');
      }

      // First get all subscription IDs for the user
      const subscriptionIds = await smartAccountClient.readContract({
        address: bucketManagerAddress,
        abi: EXPENDI_BUCKET_MANAGER_ABI,
        functionName: 'getUserSubscriptions',
        args: [smartAccountClient.account.address]
      }) as bigint[];

      // Then get detailed info for each subscription
      const subscriptions: SubscriptionInfo[] = [];
      
      for (const subscriptionId of subscriptionIds) {
        try {
          const subscriptionInfo = await smartAccountClient.readContract({
            address: bucketManagerAddress,
            abi: EXPENDI_BUCKET_MANAGER_ABI,
            functionName: 'getSubscriptionInfo',
            args: [smartAccountClient.account.address, subscriptionId]
          });

          // subscriptionInfo is a tuple with all subscription details
          const [
            id,
            bucketName,
            amount,
            periodInDays,
            token,
            recipient,
            isActive,
            nextChargeTimestamp,
            totalCharged,
            chargeCount,
            createdAt,
            lastProcessedAt,
            userConsent
          ] = subscriptionInfo;

          subscriptions.push({
            subscriptionId: Number(id),
            bucketName,
            amount: formatUnits(amount, 6),
            periodInDays: Number(periodInDays),
            token,
            recipient,
            isActive,
            nextChargeTimestamp: Number(nextChargeTimestamp),
            totalCharged: formatUnits(totalCharged, 6),
            chargeCount: Number(chargeCount),
            createdAt: Number(createdAt),
            lastProcessedAt: Number(lastProcessedAt),
            userConsent,
            rawAmount: amount,
            rawTotalCharged: totalCharged
          });
        } catch (error) {
          console.error(`Error fetching subscription ${subscriptionId}:`, error);
        }
      }

      return subscriptions;
    },
    enabled: !!smartAccountClient?.account,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000 // Consider data stale after 10 seconds
  });
}