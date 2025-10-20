'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SubscriptionForm } from './SubscriptionForm';
import { useAccount } from 'wagmi';
import { PlusIcon } from '@heroicons/react/24/outline';

interface SubscriptionButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'lg'; // Remove 'md' as it's not valid for Button component
  className?: string;
  children?: React.ReactNode;
}

export const SubscriptionButton: React.FC<SubscriptionButtonProps> = ({
  variant = 'default',
  size = 'sm',
  className,
  children,
}) => {
  const [showForm, setShowForm] = useState(false);
  const { isConnected } = useAccount();

  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS === 'true';

  if (!isEnabled || !isConnected) {
    return null;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setShowForm(true)}
      >
        {children || (
          <>
            <PlusIcon className="w-4 h-4 mr-2" />
            New Subscription
          </>
        )}
      </Button>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <SubscriptionForm
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};