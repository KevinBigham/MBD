import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './providers/ErrorBoundary';
import { AppRoutes } from './routes';
import { usePreferencesStore } from '@/shared/hooks/usePreferencesStore';

export function App() {
  const highContrast = usePreferencesStore((state) => state.highContrast);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.dataset.contrast = highContrast ? 'high' : 'standard';
  }, [highContrast]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: highContrast ? '#020617' : '#0F1930',
              border: highContrast ? '1px solid #F8FAFC' : '1px solid #1E3A6E',
              color: highContrast ? '#F8FAFC' : '#E2E8F0',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '0.875rem',
            },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
