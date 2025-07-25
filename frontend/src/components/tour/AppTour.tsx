"use client";

import React from 'react';
import { TourProvider as ReactTourProvider } from '@reactour/tour';
import { useTour } from '@/context/TourContext';
import { tourSteps } from './tourSteps';
import { useRouter } from 'next/navigation';

interface AppTourProps {
  children: React.ReactNode;
}

export const AppTour: React.FC<AppTourProps> = ({ children }) => {
  const {
    isTourOpen,
    currentStep,
    tourType,
    closeTour,
    completeTour,
    setCurrentStep
  } = useTour();

  const router = useRouter();

  // Get current tour steps based on tour type
  const getCurrentSteps = () => {
    if (!tourType) return [];
    return tourSteps[tourType] || [];
  };

  const steps = getCurrentSteps();

  // Handle step change with navigation
  const handleStepChange = (step: number) => {
    const currentStepData = steps[step];
    
    if (currentStepData?.navigate) {
      router.push(currentStepData.navigate);
      // Small delay to allow navigation to complete
      setTimeout(() => {
        setCurrentStep(step);
      }, 100);
    } else {
      setCurrentStep(step);
    }
  };

  // Handle tour completion
  const handleComplete = () => {
    completeTour();
  };

  // Custom tour styles to match your app theme
  const tourConfig = {
    steps,
    isOpen: isTourOpen,
    currentStep,
    onRequestClose: closeTour,
    onClickMask: ({ setCurrentStep, currentStep, steps }: { setCurrentStep: (step: number) => void; currentStep: number; steps: any[] }) => {
      if (currentStep === steps.length - 1) {
        handleComplete();
      } else {
        setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
      }
    },
    styles: {
      popover: (base: Record<string, unknown>) => ({
        ...base,
        '--reactour-accent': '#3b82f6', // Blue color to match your theme
        borderRadius: '8px',
        backgroundColor: 'white',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        fontSize: '14px',
        maxWidth: '320px',
      }),
      maskArea: (base: Record<string, unknown>) => ({
        ...base,
        rx: 6,
      }),
      badge: (base: Record<string, unknown>) => ({
        ...base,
        left: 'auto',
        right: '-0.8125em',
      }),
      controls: (base: Record<string, unknown>) => ({
        ...base,
        marginTop: '16px',
      }),
      close: (base: Record<string, unknown>) => ({
        ...base,
        right: '16px',
        top: '16px',
      })
    },
    prevButton: ({ 
      currentStep 
    }: {
      currentStep: number;
      setCurrentStep: (step: number) => void;
    }) => {
      if (currentStep === 0) return null;
      
      return (
        <button
          onClick={() => {
            const newStep = currentStep - 1;
            handleStepChange(newStep);
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Previous
        </button>
      );
    },
    nextButton: ({ 
      currentStep, 
      stepsLength 
    }: {
      currentStep: number;
      stepsLength: number;
      setCurrentStep: (step: number) => void;
    }) => {
      const isLastStep = currentStep === stepsLength - 1;
      
      return (
        <button
          onClick={() => {
            if (isLastStep) {
              handleComplete();
            } else {
              const newStep = currentStep + 1;
              handleStepChange(newStep);
            }
          }}
          className="ml-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {isLastStep ? 'Finish' : 'Next'}
        </button>
      );
    },
    badgeContent: ({ currentStep, stepsLength }: { currentStep: number; stepsLength: number }) => 
      `${currentStep + 1} of ${stepsLength}`,
  };

  return (
    <ReactTourProvider {...tourConfig}>
      {children}
    </ReactTourProvider>
  );
};