"use client"

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, XCircle, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import Lottie from "lottie-react";
import successAnimation from "../../../public/Success.json";

interface PaymentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionCode: string | null;
  currency?: string;
}

const getStatusIcon = (status: string) => {
  switch (status.toUpperCase()) {
    case 'COMPLETE':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'PENDING':
      return <Clock className="h-5 w-5 text-yellow-500" />;
    case 'FAILED':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'COMPLETE':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'FAILED':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function PaymentStatusModal({ 
  isOpen, 
  onClose, 
  transactionCode, 
  currency 
}: PaymentStatusModalProps) {
  const paymentStatus = usePaymentStatus();

  useEffect(() => {
    if (isOpen && transactionCode) {
      paymentStatus.mutate({ transaction_code: transactionCode, currency });
    }
  }, [isOpen, transactionCode, currency]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleViewTransaction = (txHash: string) => {
    const url = `https://basescan.org/tx/${txHash}`;
    window.open(url, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAmount = (amount: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(parseFloat(amount));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
       
      <DialogContent className="max-w-[90%] mx-auto max-h-[90vh] overflow-y-auto px-4 sm:px-6">
      <DialogHeader>
        <DialogTitle>
            {
            paymentStatus.data && (
            <>
            {/* Header with Success Icon */}
            <div className="text-center space-y-4">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="w-24 h-24">
                  <Lottie 
                    animationData={successAnimation} 
                    loop={false}
                    autoplay={true}
                  />
                </div>
              </div>
              
              {/* Title */}
              <div>
                <h3 className="text-2xl font-bold" style={{ color: '#111827' }}>
                  Payment Success!
                </h3>
              </div>
            </div>

            {/* Main Amount Display */}
            <div className="text-center space-y-2">
              <p className="text-3xl font-bold" style={{ color: '#111827' }}>
                {formatAmount(paymentStatus.data.data.amount, paymentStatus.data.data.currency_code)}
              </p>
            </div>
            </>
            )
        }
            </DialogTitle>
        </DialogHeader>
        {paymentStatus.isPending && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading payment status...</span>
          </div>
        )}

        {paymentStatus.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">
              Failed to load payment status: {paymentStatus.error.message}
            </p>
            <Button 
              onClick={() => paymentStatus.mutate({ transaction_code: transactionCode!, currency })}
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {paymentStatus.data && (
          <div className="space-y-6" style={{ color: '#374151', backgroundColor: '#ffffff' }}>
            {/* Transaction Details */}
            <div className="space-y-4">
              {/* Dashed line separator */}
              <div className="border-t border-dashed" style={{ borderColor: '#d1d5db' }}></div>
              
              {/* Transaction Details Grid */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6b7280' }}>Receipt Number</span>
                  <span className="text-sm font-semibold" style={{ color: '#111827' }}>
                    {paymentStatus.data.data.receipt_number}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6b7280' }}>Recipient Name</span>
                  <span className="text-sm font-semibold" style={{ color: '#111827' }}>
                    {paymentStatus.data.data.public_name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6b7280' }}>Shortcode</span>
                  <span className="text-sm font-semibold" style={{ color: '#111827' }}>
                    {paymentStatus.data.data.shortcode}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6b7280' }}>Payment Time</span>
                  <span className="text-sm font-semibold" style={{ color: '#111827' }}>
                    {formatDate(paymentStatus.data.data.created_at)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6b7280' }}>Payment Method</span>
                  <span className="text-sm font-semibold" style={{ color: '#111827' }}>
                    {paymentStatus.data.data.type}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6b7280' }}>Chain</span>
                  <span className="text-sm font-semibold" style={{ color: '#111827' }}>
                    {paymentStatus.data.data.chain}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6b7280' }}>Asset</span>
                  <span className="text-sm font-semibold" style={{ color: '#111827' }}>
                    {paymentStatus.data.data.asset}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6b7280' }}>Transaction Hash</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold font-mono" style={{ color: '#111827' }}>
                      {paymentStatus.data.data.transaction_hash.slice(0, 8)}...{paymentStatus.data.data.transaction_hash.slice(-6)}
                    </span>
                    <button
                      onClick={() => handleCopy(paymentStatus.data.data.transaction_hash, 'Transaction hash')}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Copy transaction hash"
                    >
                      <Copy className="w-3 h-3" style={{ color: '#6b7280' }} />
                    </button>
                    <a
                      href={`https://basescan.org/tx/${paymentStatus.data.data.transaction_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="View on BaseScan"
                    >
                      <ExternalLink className="w-3 h-3" style={{ color: '#6b7280' }} />
                    </a>
                  </div>
                </div>
                
               
              </div>
              
              {/* Dashed line separator */}
              <div className="border-t border-dashed" style={{ borderColor: '#d1d5db' }}></div>
              
              {/* Final Summary */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6b7280' }}>Amount</span>
                  <span className="text-sm font-semibold" style={{ color: '#111827' }}>
                    {formatAmount(paymentStatus.data.data.amount, paymentStatus.data.data.currency_code)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

                <div className="flex justify-center pt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-8 py-2 bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
