"use client";
import React, { useState } from "react";
import { usePrivy } from '@privy-io/react-auth';
import { useWalletUser } from '@/hooks/useWalletUser';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu";
import { Wallet, LogOut, User, Mail, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";

export default function WalletDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { isConnected } = useWalletUser();

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  // Loading state
  if (!ready) {
    return (
      <div className="flex items-center justify-center h-11 w-11">
        <div className="">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  // Not authenticated - show connect wallet button
  if (!authenticated || !isConnected) {
    return (
      <Button
        onClick={login}
        variant="primary"
      >
        <Wallet className="h-4 w-4 mr-2" />
        Connect Wallet
      </Button>
    );
  }

  // Authenticated - show user dropdown
  const walletAddress = user?.wallet?.address;
  const shortAddress = walletAddress 
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : 'No wallet';

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          onClick={toggleDropdown} 
          className="flex items-center text-gray-700 dark:text-gray-400 dropdown-toggle hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg px-3 py-2 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{shortAddress}</span>
              {user?.email?.address && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {user.email.address}
                </span>
              )}
            </div>
          </div>

          <svg
            className={`ml-2 stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            width="18"
            height="20"
            viewBox="0 0 18 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        className="absolute right-0 mt-[17px] flex w-[280px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
        side="bottom"
        align="end"
      >
        {/* User Info Section */}
        <div className="pb-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="block font-medium text-gray-700 text-sm dark:text-gray-300">
                {shortAddress}
              </span>
              {user?.email?.address && (
                <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user.email.address}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex flex-col gap-1 pt-4 pb-3">
          <DropdownMenuItem
            onClick={closeDropdown}
            className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 cursor-pointer"
          >
            <User className="h-4 w-4 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
            View Profile
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={closeDropdown}
            className=""
          >
            <Link href="/wallet" className="flex items-center gap-3 px-1 font-medium text-gray-700 rounded-lg group text-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 cursor-pointer">
              <Wallet className="h-4 w-4 " />
              Wallet 
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={closeDropdown}
            className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
            Support
          </DropdownMenuItem>
        </div>
        
        {/* Logout Button */}
        <button
          onClick={() => {
            logout();
            closeDropdown();
          }}
          className="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-red-600 rounded-lg group text-sm hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/10 dark:hover:text-red-300 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Disconnect Wallet
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}