/**
 * TourProvider — Context + engine for the guided tutorial tour.
 * Wraps AppLayout. Auto-starts for new games on /dashboard.
 * Persists completion to localStorage.
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { TOUR_STEPS, TOUR_LOCALSTORAGE_KEY, TOUR_TOTAL_STEPS } from '../lib/tourDefinition.js';
import { TourStep } from './TourStep.js';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface TourContextValue {
  /** Whether the tour is currently active */
  active: boolean;
  /** Current step index */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Start the tour from step 0 */
  startTour: () => void;
  /** Advance to the next step */
  nextStep: () => void;
  /** Go back to the previous step */
  prevStep: () => void;
  /** Skip / dismiss the tour */
  skipTour: () => void;
  /** Reset completion flag and restart */
  restartTour: () => void;
  /** Whether the tour has been completed before */
  completed: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTour must be used within TourProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function isTourCompleted(): boolean {
  try {
    return localStorage.getItem(TOUR_LOCALSTORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markTourCompleted(): void {
  try {
    localStorage.setItem(TOUR_LOCALSTORAGE_KEY, 'true');
  } catch {
    // localStorage unavailable — silently ignore
  }
}

function clearTourCompleted(): void {
  try {
    localStorage.removeItem(TOUR_LOCALSTORAGE_KEY);
  } catch {
    // silently ignore
  }
}

/** Check if a blocking overlay (MonthlyPulse, MomentCard) is currently visible */
function hasBlockingOverlay(): boolean {
  return !!(
    document.querySelector('[data-overlay="monthly-pulse"]') ||
    document.querySelector('[data-overlay="moment-card"]')
  );
}

interface TourProviderProps {
  children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(isTourCompleted);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const autoStartAttempted = useRef(false);

  // Auto-start for new games on /dashboard
  useEffect(() => {
    if (autoStartAttempted.current || completed || active) return;
    if (location.pathname !== '/dashboard') return;

    autoStartAttempted.current = true;

    // Wait for the dashboard to render and welcome briefing to potentially show
    const timer = setTimeout(() => {
      // Don't start if a blocking overlay is showing
      if (hasBlockingOverlay()) return;

      // Check if the tour-ready signal is present (welcome briefing dismissed)
      const readyEl = document.querySelector('[data-tour-ready="true"]');
      if (readyEl) {
        setActive(true);
        setCurrentStep(0);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [location.pathname, completed, active]);

  // Pause/resume when blocking overlays appear/disappear
  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      const blocked = hasBlockingOverlay();
      setPaused(blocked);
    }, 500);

    return () => clearInterval(interval);
  }, [active]);

  // Navigate to the correct route when step changes
  useEffect(() => {
    if (!active || paused) return;
    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [active, currentStep, paused, navigate, location.pathname]);

  const completeTour = useCallback(() => {
    setActive(false);
    setCurrentStep(0);
    markTourCompleted();
    setCompleted(true);
    // Navigate back to dashboard on completion
    navigate('/dashboard');
  }, [navigate]);

  const startTour = useCallback(() => {
    setActive(true);
    setCurrentStep(0);
    navigate('/dashboard');
  }, [navigate]);

  const nextStep = useCallback(() => {
    if (currentStep >= TOUR_TOTAL_STEPS - 1) {
      completeTour();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, completeTour]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  const restartTour = useCallback(() => {
    clearTourCompleted();
    setCompleted(false);
    setActive(true);
    setCurrentStep(0);
    navigate('/dashboard');
  }, [navigate]);

  const value: TourContextValue = {
    active,
    currentStep,
    totalSteps: TOUR_TOTAL_STEPS,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    restartTour,
    completed,
  };

  const step = active && !paused ? TOUR_STEPS[currentStep] : null;

  return (
    <TourContext.Provider value={value}>
      {children}
      {step &&
        createPortal(
          <TourStep
            step={step}
            stepIndex={currentStep}
            totalSteps={TOUR_TOTAL_STEPS}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={skipTour}
          />,
          document.body,
        )}
    </TourContext.Provider>
  );
}
