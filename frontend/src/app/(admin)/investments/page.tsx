"use client";

import React from "react";
import { MorphoProvider } from "@/context/MorphoContext";
import InvestmentDashboard from "@/components/investments/InvestmentDashboard";

export default function InvestmentsPage() {
  return (
    <MorphoProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Investments
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Earn interest on your funds using Morpho protocol
          </p>
        </div>
        
        <InvestmentDashboard />
      </div>
    </MorphoProvider>
  );
}