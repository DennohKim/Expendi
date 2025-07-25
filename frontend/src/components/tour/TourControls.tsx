"use client";

import React, { useState, useEffect } from 'react';
import { useTour } from '@/context/TourContext';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { HelpCircle, Play, RotateCcw } from 'lucide-react';

export const TourControls: React.FC = () => {
  const { 
    startTour, 
    resetTours, 
    isFirstTimeUser,
    isTourOpen 
  } = useTour();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Auto-start onboarding tour for first-time users
  useEffect(() => {
    if (isFirstTimeUser && !isTourOpen) {
      // Small delay to allow page to load
      const timer = setTimeout(() => {
        startTour('onboarding');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isFirstTimeUser, isTourOpen, startTour]);

  const handleStartTour = (tourType: 'onboarding' | 'dashboard' | 'buckets') => {
    startTour(tourType);
    setIsDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <HelpCircle className="h-4 w-4" />
            Help
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>App Tour</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Take a guided tour to learn how to use Expendi effectively.
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={() => handleStartTour('onboarding')}
                className="w-full justify-start"
                variant="outline"
              >
                <Play className="h-4 w-4 mr-2" />
                Complete Onboarding Tour
              </Button>
              
              <Button
                onClick={() => handleStartTour('dashboard')}
                className="w-full justify-start"
                variant="outline"
              >
                <Play className="h-4 w-4 mr-2" />
                Dashboard Features Tour
              </Button>
              
              <Button
                onClick={() => handleStartTour('buckets')}
                className="w-full justify-start"
                variant="outline"
              >
                <Play className="h-4 w-4 mr-2" />
                Budget Buckets Tour
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <Button
                onClick={() => {
                  resetTours();
                  setIsDialogOpen(false);
                }}
                className="w-full justify-start"
                variant="outline"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset All Tours
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                This will mark you as a new user and restart the onboarding process.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Quick tour starter for development/testing
export const QuickTourButton: React.FC<{ 
  tourType: 'onboarding' | 'dashboard' | 'buckets';
  label?: string;
}> = ({ tourType, label }) => {
  const { startTour } = useTour();

  return (
    <Button
      onClick={() => startTour(tourType)}
      variant="outline"
      size="sm"
    >
      {label || `Start ${tourType} tour`}
    </Button>
  );
};