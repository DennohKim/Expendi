"use client"

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
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



export function PaymentStatusModal({ 
  isOpen, 
  onClose, 
  transactionCode, 
  currency 
}: PaymentStatusModalProps) {
  // Early return if modal is not open
  if (!isOpen) {
    return null;
  }

  const paymentStatus = usePaymentStatus();

  useEffect(() => {
    if (transactionCode) {
      console.log('PaymentStatusModal useEffect triggered:', { isOpen, transactionCode, currency });
      console.log('Triggering payment status mutation with:', { transaction_code: transactionCode, currency });
      paymentStatus.mutate({ transaction_code: transactionCode, currency });
    }
  }, [transactionCode, currency, paymentStatus.mutate]);

  useEffect(() => {
    console.log('Payment Status Mutation State:', {
      isPending: paymentStatus.isPending,
      isError: paymentStatus.isError,
      error: paymentStatus.error,
      data: paymentStatus.data
    });
    
    if (paymentStatus.data) {
      console.log('Payment Status Data:', paymentStatus.data);
      console.log('Payment Status:', paymentStatus.data.data.status);
    }
  }, [paymentStatus.data, paymentStatus.isPending, paymentStatus.isError, paymentStatus.error]);

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
            <p className="text-2xl font-bold hidden">
              {paymentStatus.data && paymentStatus.data.data.status === 'COMPLETE' ? 'Payment Success!' : 'Payment Status'}
            </p>
          </DialogTitle>
        </DialogHeader>
        
        {paymentStatus.data && paymentStatus.data.data.status === 'COMPLETE' && (
          <>
            {/* Header with Success Icon */}
            <div className="text-center space-y-4 mb-6">
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
              <p className="text-2xl font-bold">
              Payment Success!
            </p>
              
              {/* Main Amount Display */}
              <div className="text-center space-y-2">
                <p className="text-3xl font-bold" style={{ color: '#111827' }}>
                  {formatAmount(paymentStatus.data.data.amount, paymentStatus.data.data.currency_code)}
                </p>
              </div>
            </div>
          </>
        )}
        {paymentStatus.isPending && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading payment status...</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-700">Processing Payment</h3>
          </div>
        )}

        {paymentStatus.error && (
          <div className="text-center py-8">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
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
            <h3 className="text-xl font-semibold text-gray-700">Payment Status Error</h3>
          </div>
        )}

        {paymentStatus.data && paymentStatus.data.data.status !== 'COMPLETE' && (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              {getStatusIcon(paymentStatus.data.data.status)}
            </div>
            <h3 className="text-xl font-semibold text-gray-700">
              Payment {paymentStatus.data.data.status}
            </h3>
            <p className="text-gray-600 mt-2">
              Your payment is currently {paymentStatus.data.data.status.toLowerCase()}. Please wait for confirmation.
            </p>
          </div>
        )}

        {paymentStatus.data && paymentStatus.data.data.status === 'COMPLETE' && (
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
