'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Calendar as CalendarIcon, Target } from 'lucide-react';
import { Address } from 'viem';
import { useCreateGoal, useGoalzUtils, GoalFormData, AUTOMATION_INTERVALS } from '@/lib/target-savings';
import { toast } from 'sonner';
import { CONTRACTS } from '@/lib/target-savings/config';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreateGoalFormProps {
  userAddress: Address | undefined;
}

export function CreateGoalForm({ userAddress }: CreateGoalFormProps) {
  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    targetAmount: '',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    token: CONTRACTS.USDC,
    vault: CONTRACTS.SPARK_USDC_VAULT,
    enableAutomation: false,
    automationAmount: '',
    automationInterval: AUTOMATION_INTERVALS.WEEKLY,
  });
  
  const { createGoal, isPending, isConfirming, isConfirmed, error } = useCreateGoal();
  const { validateGoalForm, parseAmount } = useGoalzUtils();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userAddress) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    const errors = validateGoalForm(formData);
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }
    
    try {
      const targetAmount = parseAmount(formData.targetAmount);
      const deadlineTimestamp = BigInt(Math.floor(formData.deadline.getTime() / 1000));
      
      createGoal({
        name: formData.name,
        targetAmount,
        deadline: deadlineTimestamp,
        token: formData.token,
        vault: formData.vault,
      });
    } catch {
      toast.error('Failed to create goal');
    }
  };
  
  React.useEffect(() => {
    if (isConfirmed) {
      toast.success('Goal created successfully!');
      setFormData({
        name: '',
        targetAmount: '',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        token: CONTRACTS.USDC,
        vault: CONTRACTS.SPARK_USDC_VAULT,
        enableAutomation: false,
        automationAmount: '',
        automationInterval: AUTOMATION_INTERVALS.WEEKLY,
      });
    }
  }, [isConfirmed]);
  
  React.useEffect(() => {
    if (error) {
      toast.error('Transaction failed. Please try again.');
    }
  }, [error]);

  if (!userAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Create Goal
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Target className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Connect Your Wallet</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              Connect your wallet to start creating savings goals
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Goal Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Goal
            </CardTitle>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Goal Name</Label>
            <Input
              id="name"
              placeholder="e.g., Emergency Fund"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              maxLength={50}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="targetAmount">
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                Target Amount (USDC)
              </div>
            </Label>
            <Input
              id="targetAmount"
              type="number"
              step="0.01"
              min="10"
              placeholder="1000.00"
              value={formData.targetAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deadline">
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                Deadline
              </div>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.deadline && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.deadline ? format(formData.deadline, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.deadline}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, deadline: date }))}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <Button
            type="submit"
            className="w-full"
            variant="primary"
            disabled={isPending || isConfirming || !formData.name || !formData.targetAmount}
          >
            {isPending || isConfirming ? 'Creating...' : 'Create Goal'}
          </Button>
        </CardContent>
      </Card>
      </form>
    </div>
  );
}