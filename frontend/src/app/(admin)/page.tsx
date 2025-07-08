import type { Metadata } from "next";
import { BucketWalletMetrics } from "@/components/buckets/BucketWalletMetrics";
import React from "react";
import WalletBalance from "@/components/buckets/WalletBalance";
import SpendingSummaryChart from "@/components/buckets/SpendingSummaryChart";
import TransactionHistory from "@/components/buckets/TransactionHistory";

export const metadata: Metadata = {
  title:
    "Next.js E-commerce Dashboard | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Home for TailAdmin Dashboard Template",
};

export default function Ecommerce() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* TODO: This will be an overview of the budget wallet */}
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <BucketWalletMetrics />

      </div>

{/* Wallet balance showing unallocated funds and total balance */}
      <div className="col-span-12 xl:col-span-5">
        <WalletBalance />
      </div>

{/* TODO: This will be spending summary pie chart in different buckets */}
      <div className="col-span-12">
        <SpendingSummaryChart />
      </div>

     

      <div className="col-span-12 xl:col-span-7">
        {/* TODO: This will be transactions table */}
        <TransactionHistory />
      </div>
    </div>
  );
}
