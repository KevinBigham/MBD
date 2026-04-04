import { useEffect, useState } from 'react';
import { usePreferencesStore } from './usePreferencesStore';

function getInitialReducedMotionPreference(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery?.matches ?? false;
}

export function useEffectiveReducedMotion(): boolean {
  const explicitReducedMotion = usePreferencesStore((state) => state.reducedMotion);
  const [reducedMotion, setReducedMotion] = useState<boolean>(getInitialReducedMotionPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mediaQuery) {
      return;
    }

    const updatePreference = () => {
      setReducedMotion(mediaQuery.matches ?? false);
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
