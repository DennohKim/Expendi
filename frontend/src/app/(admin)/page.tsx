"use client"

// import { BucketWalletMetrics } from "@/components/buckets/BucketWalletMetrics";
import React from "react";
// import WalletBalance from "@/components/buckets/WalletBalance";
// import SpendingSummaryChart from "@/components/buckets/SpendingSummaryChart";
// import TransactionHistory from "@/components/buckets/TransactionHistory";
import { useAccount } from "wagmi";
// import { TestGasSponsorship } from "@/components/test-gas-sponsorship";
// import { CreateBucketButton } from "@/components/buckets/CreateBucketButton";
import { BucketsGrid } from "@/components/buckets/BucketsGrid";
import QuickSpendTab from "@/components/buckets/QuickSpendTab";
import { useSmartAccount } from "@/context/SmartAccountContext";
import { useUserBuckets } from "@/hooks/subgraph-queries/getUserBuckets";




export default function DashboardPage() {
  const {address: eoaAddress} = useAccount()
  const { smartAccountAddress, smartAccountReady } = useSmartAccount();
  
  // Use smart account address if available, fallback to EOA address
  const queryAddress = React.useMemo(() => 
    smartAccountReady && smartAccountAddress ? smartAccountAddress : eoaAddress,
    [smartAccountReady, smartAccountAddress, eoaAddress]
  );
  


  const { data, loading, error } = useUserBuckets(queryAddress);
  
  React.useEffect(() => {
    if (error) {
      console.error('Dashboard page - getUserBuckets error:', error);
    }
  }, [error]);
  
  const buckets = data?.user?.buckets || [];

  
  // Only show loading when we have no data AND we're actually loading
  const isInitialLoading = loading && !data;

  // console.log("buckets", buckets);

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* <div className="col-span-12 flex justify-end">
        <CreateBucketButton />
      </div> */}
      
      {/* Quick Spend Tab - Above buckets on small/medium, right side on large */}
      <div className="col-span-12 h-auto mb-4 w-full overflow-y-auto xl:col-span-4 xl:order-2 xl:h-[calc(100vh-120px)] xl:mb-0">
        <QuickSpendTab bucket={buckets} />
      </div>
      
      {/* User Buckets Grid - Below QuickSpend on small/medium, left side on large */}
      <div className="col-span-12 h-[calc(100vh-120px)] overflow-y-auto pr-2 xl:col-span-8 xl:order-1">
        <div className="mb-1 pb-4 sticky top-0 bg-white dark:bg-gray-900 z-10 pr-2">
          <h2 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">Buckets</h2>
        </div>
        <BucketsGrid buckets={buckets} loading={isInitialLoading} error={error || null} />
      </div>
      
      {/* TODO: This will be an overview of the budget wallet */}
      {/* <div className="col-span-12 space-y-6 xl:col-span-7">
        <BucketWalletMetrics />

      </div> */}


{/* Wallet balance showing unallocated funds and total balance */}
      {/* <div className="col-span-12 xl:col-span-5">
        <WalletBalance />
      </div> */}

{/* TODO: This will be spending summary pie chart in different buckets */}
      {/* <div className="col-span-12">
        <SpendingSummaryChart />
      </div> */}

     

      <div className="col-span-12 xl:col-span-7">
        {/* TODO: This will be transactions table */}
        {/* <TransactionHistory /> */}

        {/* <TestGasSponsorship /> */}

        

      </div>
    </div>
  );
}
