"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface OnboardingStep {
  id: string;
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface OnboardingContextType {
  isActive: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  startOnboarding: (steps: OnboardingStep[]) => void;
  completeStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  isCompleted: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STORAGE_KEY = "fatiha_onboarding_completed";

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    // Check if onboarding was completed
    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCompleted(true);
    }
  }, []);

  const startOnboarding = (newSteps: OnboardingStep[]) => {
    setSteps(newSteps);
    setCurrentStep(0);
    setIsActive(true);
  };

  const completeStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Onboarding completed
      setIsActive(false);
      setIsCompleted(true);
      localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    setIsActive(false);
    setIsCompleted(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const resetOnboarding = () => {
    setIsCompleted(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStep,
        steps,
        startOnboarding,
        completeStep,
        previousStep,
        skipOnboarding,
        resetOnboarding,
        isCompleted,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
