'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { SubscriptionStatus, STATUS_COLORS } from '@/types/subscription';

interface SubscriptionStatusBadgeProps {
  status: SubscriptionStatus;
  className?: string;
}

export const SubscriptionStatusBadge: React.FC<SubscriptionStatusBadgeProps> = ({
  status,
  className,
}) => {
  const getStatusIcon = (status: SubscriptionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return '●';
      case 'PAUSED':
        return '⏸';
      case 'CANCELLED':
        return '✕';
      case 'EXPIRED':
        return '⚠';
      case 'FAILED':
        return '⚠';
      default:
        return '';
    }
  };

  const getStatusText = (status: SubscriptionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'PAUSED':
        return 'Paused';
      case 'CANCELLED':
        return 'Cancelled';
      case 'EXPIRED':
        return 'Expired';
      case 'FAILED':
        return 'Failed';
      default:
        return status;
    }
  };

  return (
    <Badge 
      className={`${STATUS_COLORS[status]} ${className}`}
      variant="secondary"
    >
      <span className="mr-1">{getStatusIcon(status)}</span>
      {getStatusText(status)}
    </Badge>
  );
};