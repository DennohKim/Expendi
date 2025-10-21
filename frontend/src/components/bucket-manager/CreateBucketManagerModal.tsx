import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, Loader2 } from 'lucide-react';
import { useCreateBucketSponsored } from '@/hooks/bucket-manager/useCreateBucketSponsored';

interface CreateBucketManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Predefined bucket templates for quick setup
const BUCKET_TEMPLATES = [
  {
    name: 'Weekly Contributions',
    monthlyLimit: '50',
    description: 'For regular contributions',
    category: 'Education',
    suggestedAmount: '10 USDC/week'
  },
  {
    name: 'Monthly Rent',
    monthlyLimit: '1200',
    description: 'Monthly rent payments',
    category: 'Housing',
    suggestedAmount: '1000-1500 USDC/month'
  },
  {
    name: 'Food Expenses',
    monthlyLimit: '500',
    description: 'Food and dining expenses',
    category: 'Food',
    suggestedAmount: 'Flexible amounts'
  },
  {
    name: 'Transportation',
    monthlyLimit: '300',
    description: 'Gas, public transport, rideshare',
    category: 'Transport',
    suggestedAmount: '200-400 USDC/month'
  },
  {
    name: 'Entertainment',
    monthlyLimit: '200',
    description: 'Movies, games, subscriptions',
    category: 'Lifestyle',
    suggestedAmount: '100-300 USDC/month'
  },
  {
    name: 'Healthcare',
    monthlyLimit: '400',
    description: 'Medical expenses and insurance',
    category: 'Health',
    suggestedAmount: '200-500 USDC/month'
  },
  {
    name: 'Utilities',
    monthlyLimit: '250',
    description: 'Electric, water, internet, phone',
    category: 'Housing',
    suggestedAmount: '150-300 USDC/month'
  },
  {
    name: 'Shopping',
    monthlyLimit: '300',
    description: 'Clothing, electronics, misc purchases',
    category: 'Lifestyle',
    suggestedAmount: 'Variable amounts'
  }
];

export function CreateBucketManagerModal({ open, onOpenChange }: CreateBucketManagerModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<typeof BUCKET_TEMPLATES[0] | null>(null);
  const [customName, setCustomName] = useState('');
  const [customLimit, setCustomLimit] = useState('');
  const [createMode, setCreateMode] = useState<'template' | 'custom'>('template');
  
  // Editable template values
  const [editableName, setEditableName] = useState('');
  const [editableLimit, setEditableLimit] = useState('');

  const createBucket = useCreateBucketSponsored();
  const isWalletReady = createBucket.isReady;

  const handleTemplateSelect = (template: typeof BUCKET_TEMPLATES[0]) => {
    setSelectedTemplate(template);
    setEditableName(template.name);
    setEditableLimit(template.monthlyLimit);
  };

  const handleCreateBucket = async () => {
    let bucketName = '';
    let monthlyLimit = '';

    if (createMode === 'template' && selectedTemplate) {
      bucketName = editableName || selectedTemplate.name;
      monthlyLimit = editableLimit || selectedTemplate.monthlyLimit;
    } else if (createMode === 'custom') {
      bucketName = customName.trim();
      monthlyLimit = customLimit;
    }

    if (!bucketName || !monthlyLimit) {
      alert('Please provide both bucket name and monthly limit');
      return;
    }

    if (parseFloat(monthlyLimit) <= 0) {
      alert('Monthly limit must be greater than 0');
      return;
    }

    try {
      await createBucket.mutateAsync({
        bucketName,
        monthlyLimit
      });
      
      // Reset form and close modal
      setSelectedTemplate(null);
      setCustomName('');
      setCustomLimit('');
      setEditableName('');
      setEditableLimit('');
      setCreateMode('template');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating bucket:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Education': 'bg-blue-100 text-blue-800',
      'Housing': 'bg-green-100 text-green-800',
      'Food': 'bg-orange-100 text-orange-800',
      'Transport': 'bg-purple-100 text-purple-800',
      'Lifestyle': 'bg-pink-100 text-pink-800',
      'Health': 'bg-red-100 text-red-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create New Bucket
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-2">
                    <p className="font-medium">About Buckets</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Buckets help organize your spending by category</li>
                      <li>• Set monthly limits to control your expenses</li>
                      <li>• Fund buckets with USDC to make payments</li>
                      <li>• Create subscriptions for recurring payments</li>
                      <li>• Track spending across all your buckets</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Selection */}
          <div className="flex gap-2">
            <Button
              variant={createMode === 'template' ? 'primary' : 'outline'}
              onClick={() => setCreateMode('template')}
              size="sm"
            >
              Use Template
            </Button>
            <Button
              variant={createMode === 'custom' ? 'primary' : 'outline'}
              onClick={() => setCreateMode('custom')}
              size="sm"
            >
              Custom Bucket
            </Button>
          </div>

          {/* Template Selection */}
          {createMode === 'template' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Choose a Template</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {BUCKET_TEMPLATES.map((template, index) => (
                  <Card
                    key={index}
                    className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate?.name === template.name
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge className={getCategoryColor(template.category)}>
                          {template.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Limit: ${template.monthlyLimit}/month</span>
                        <span className="text-blue-600">{template.suggestedAmount}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {selectedTemplate && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Customize Template: {selectedTemplate.name}</h4>
                    <Badge className={getCategoryColor(selectedTemplate.category)}>
                      {selectedTemplate.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="template-name">Bucket Name</Label>
                      <Input
                        id="template-name"
                        value={editableName}
                        onChange={(e) => setEditableName(e.target.value)}
                        placeholder={selectedTemplate.name}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-limit">Monthly Limit (USDC)</Label>
                      <Input
                        id="template-limit"
                        type="number"
                        value={editableLimit}
                        onChange={(e) => setEditableLimit(e.target.value)}
                        placeholder={selectedTemplate.monthlyLimit}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    <strong>Suggested:</strong> {selectedTemplate.suggestedAmount}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Bucket Form */}
          {createMode === 'custom' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Create Custom Bucket</h3>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="bucket-name">Bucket Name</Label>
                  <Input
                    id="bucket-name"
                    placeholder="e.g., Gym Membership, Office Supplies..."
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="monthly-limit">Monthly Limit (USDC)</Label>
                  <Input
                    id="monthly-limit"
                    type="number"
                    placeholder="e.g., 100"
                    value={customLimit}
                    onChange={(e) => setCustomLimit(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Set a monthly spending limit for this bucket
                  </p>
                </div>
              </div>

              {customName && customLimit && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Preview: {customName}</h4>
                  <div className="text-sm">
                    <span className="font-medium">Monthly Limit: </span>
                    <span className="text-green-600">${customLimit} USDC</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Wallet Status Warning */}
          {!isWalletReady && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
                <span className="text-yellow-800">
                  Initializing smart wallet... Please wait a moment before creating a bucket.
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createBucket.status === 'pending' || createBucket.waiting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBucket}
              variant="primary"
              disabled={
                !isWalletReady ||
                createBucket.status === 'pending' ||
                createBucket.waiting ||
                (createMode === 'template' && (!selectedTemplate || 
                  !(editableName || selectedTemplate.name) || 
                  !(editableLimit || selectedTemplate.monthlyLimit))) ||
                (createMode === 'custom' && (!customName.trim() || !customLimit))
              }
            >
              {!isWalletReady ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Smart Wallet Initializing...
                </>
              ) : createBucket.status === 'pending' || createBucket.waiting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {createBucket.waiting ? 'Confirming...' : 'Creating...'}
                </>
              ) : (
                'Create Bucket'
              )}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}