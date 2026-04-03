import { useEffect, useState } from 'react';
import { usePreferencesStore } from './usePreferencesStore';

function getInitialReducedMotionPreference(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useEffectiveReducedMotion(): boolean {
  const explicitReducedMotion = usePreferencesStore((state) => state.reducedMotion);
  const [reducedMotion, setReducedMotion] = useState<boolean>(getInitialReducedMotionPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => {
      setReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener?.('change', updatePreference);
    mediaQuery.addListener?.(updatePreference);

    return () => {
      mediaQuery.removeEventListener?.('change', updatePreference);
      mediaQuery.removeListener?.(updatePreference);
    };
  }, []);

  return reducedMotion || explicitReducedMotion;
}
