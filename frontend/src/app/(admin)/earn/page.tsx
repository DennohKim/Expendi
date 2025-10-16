"use client";

import React from "react";
import { MorphoVaultGrid } from "@/components/earn/MorphoVaultGrid";

export default function EarnPage() {
  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Earn Interest
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Earn competitive yields on your USDC using Morpho protocol&apos;s optimized lending markets
          </p>
        </div>
        
        <MorphoVaultGrid />
      </div>
  );
}