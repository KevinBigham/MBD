import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { dynasty } from '@mbd/design-tokens';
import { SaveLoadErrorBoundary, SaveRecoveryProvider } from '@/features/save-recovery';
import { AppRoutes } from './routes';
import { usePreferencesStore } from '@/shared/hooks/usePreferencesStore';

const HC_BASE = '#020617'; // slate-950, high-contrast mode base

export function App() {
  const highContrast = usePreferencesStore((state) => state.highContrast);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.dataset.contrast = highContrast ? 'high' : 'standard';
  }, [highContrast]);

  return (
    <SaveRecoveryProvider>
      <SaveLoadErrorBoundary>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            closeButton
            position="bottom-right"
            mobileOffset={{
              bottom: 'calc(env(safe-area-inset-bottom) + 16rem)',
              left: '0.75rem',
              right: '0.75rem',
            }}
            toastOptions={{
              style: {
                background: highContrast ? HC_BASE : dynasty.surface,
                border: `1px solid ${highContrast ? dynasty.textBright : dynasty.border}`,
                color: highContrast ? dynasty.textBright : dynasty.text,
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '0.875rem',
              },
            }}
          />
        </BrowserRouter>
      </SaveLoadErrorBoundary>
    </SaveRecoveryProvider>
  );
}
