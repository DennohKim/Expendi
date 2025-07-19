"use client";
import React, { useState } from "react";
import { useSwitchChain, useChainId } from "wagmi";
import { base, baseSepolia, celoAlfajores, celo } from "viem/chains";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Network } from "lucide-react";

const supportedChains = [
  {
    ...baseSepolia,
    name: "Base Sepolia",
    isTestnet: true,
  },
  {
    ...base,
    name: "Base",
    isTestnet: false,
  },
  // {
  //   ...celoAlfajores,
  //   name: "Celo Alfajores",
  //   isTestnet: true,
  // },
  // {
  //   ...celo,
  //   name: "Celo",
  //   isTestnet: false,
  // }
];

export default function ChainSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { switchChain } = useSwitchChain();
  const currentChainId = useChainId();
  
  const currentChain = supportedChains.find(chain => chain.id === currentChainId) || supportedChains[0];

  const handleChainSwitch = async (chainId: number) => {
    try {
      await switchChain({ chainId });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to switch chain:", error);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-lg transition-colors "
          aria-label="Switch Chain"
        >
          <Network className="h-4 w-4" />
          <span className="hidden sm:inline">{currentChain.name}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-48 p-1 border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900"
        align="end"
      >
        {supportedChains.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            onClick={() => handleChainSwitch(chain.id)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors
              ${currentChain.id === chain.id 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              chain.isTestnet ? 'bg-orange-500' : 'bg-green-500'
            }`} />
            <span className="font-medium">{chain.name}</span>
            {currentChain.id === chain.id && (
              <div className="ml-auto w-2 h-2 rounded-full bg-blue-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}