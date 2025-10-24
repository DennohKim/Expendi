"use client";

import Image from "next/image";
import { TrendingUp } from "lucide-react";

interface VaultImageProps {
  imageUrl?: string;
  vaultName: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function VaultImage({ 
  imageUrl, 
  vaultName, 
  className = "",
  size = "md" 
}: VaultImageProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  if (imageUrl) {
    return (
      <div className={`${sizeClasses[size]} relative overflow-hidden ${className}`}>
        <Image
          src={imageUrl}
          alt={vaultName}
          fill
          className="object-cover"
          sizes={size === "sm" ? "24px" : size === "md" ? "48px" : "72px"}
        />
      </div>
    );
  }

  // Fallback to gradient icon
  return (
    <div className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center ${className}`}>
      <TrendingUp className={`${iconSizes[size]} text-white`} />
    </div>
  );
}

