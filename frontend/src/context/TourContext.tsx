"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TourContextType {
  isTourOpen: boolean;
  currentStep: number;
  tourType: 'onboarding' | 'dashboard' | 'buckets' | null;
  startTour: (type: 'onboarding' | 'dashboard' | 'buckets') => void;
  closeTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setCurrentStep: (step: number) => void;
  goToStep: (step: number) => void;
  completeTour: () => void;
  resetTours: () => void;
  isFirstTimeUser: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTour = () => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

interface TourProviderProps {
  children: React.ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourType, setTourType] = useState<'onboarding' | 'dashboard' | 'buckets' | null>(null);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const router = useRouter();

  // Check if user is first time visitor
  useEffect(() => {
    const hasVisited = localStorage.getItem('expendi_has_visited');
    const completedOnboarding = localStorage.getItem('expendi_onboarding_completed');
    
    if (!hasVisited && !completedOnboarding) {
      setIsFirstTimeUser(true);
    }
  }, []);

  // Load tour state from localStorage on mount
  useEffect(() => {
    const savedTourState = localStorage.getItem('expendi_tour_state');
    if (savedTourState) {
      try {
        const { isOpen, step, type } = JSON.parse(savedTourState);
        setIsTourOpen(isOpen);
        setCurrentStep(step);
        setTourType(type);
      } catch (error) {
        console.error('Error loading tour state:', error);
      }
    }
  }, []);

  // Save tour state to localStorage whenever it changes
  useEffect(() => {
    const tourState = {
      isOpen: isTourOpen,
      step: currentStep,
      type: tourType
    };
    localStorage.setItem('expendi_tour_state', JSON.stringify(tourState));
  }, [isTourOpen, currentStep, tourType]);

  const startTour = (type: 'onboarding' | 'dashboard' | 'buckets') => {
    setTourType(type);
    setCurrentStep(0);
    setIsTourOpen(true);
    
    // Navigate to appropriate page based on tour type
    switch (type) {
      case 'onboarding':
        router.push('/');
        break;
      case 'dashboard':
        router.push('/');
        break;
      case 'buckets':
        router.push('/'); // Adjust to your buckets route
        break;
    }
  };

  const closeTour = () => {
    setIsTourOpen(false);
    setCurrentStep(0);
    setTourType(null);
    localStorage.removeItem('expendi_tour_state');
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const completeTour = () => {
    if (tourType === 'onboarding') {
      localStorage.setItem('expendi_onboarding_completed', 'true');
      setIsFirstTimeUser(false);
    }
    
    localStorage.setItem('expendi_has_visited', 'true');
    localStorage.setItem(`expendi_${tourType}_completed`, 'true');
    closeTour();
  };

  const resetTours = () => {
    localStorage.removeItem('expendi_has_visited');
    localStorage.removeItem('expendi_onboarding_completed');
    localStorage.removeItem('expendi_dashboard_completed');
    localStorage.removeItem('expendi_buckets_completed');
    localStorage.removeItem('expendi_tour_state');
    setIsFirstTimeUser(true);
  };

  const value: TourContextType = {
    isTourOpen,
    currentStep,
    tourType,
    startTour,
    closeTour,
    nextStep,
    prevStep,
    setCurrentStep,
    goToStep,
    completeTour,
    resetTours,
    isFirstTimeUser
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
};