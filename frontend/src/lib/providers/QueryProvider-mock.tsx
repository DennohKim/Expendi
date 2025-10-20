'use client';

import React from 'react';

// Mock QueryProvider for when TanStack Query is not installed
interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  console.warn('TanStack Query is not installed. Install it with: npm install @tanstack/react-query');
  return <>{children}</>;
}