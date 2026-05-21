import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { dynasty } from '@mbd/design-tokens';
import { SaveLoadErrorBoundary, SaveRecoveryProvider } from '@/features/save-recovery';
import { AppBootGate } from './boot/AppBootGate';
import { AppRoutes } from './routes';
import { usePreferencesStore } from '@/shared/hooks/usePreferencesStore';

const HC_BASE = '#020617'; // slate-950, high-contrast mode base

// Vite serves the app under `base: '/MBD/'` in production (GitHub Pages) and dev.
// BrowserRouter needs the matching basename so hard-reloads on nested routes
// (e.g. /MBD/dashboard) resolve to the right route table.
// Strips trailing slash because react-router expects no trailing slash.
// The cast matches the existing TeamLogo pattern — tsconfig does not include vite/client.
const BASE_URL = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL;
const ROUTER_BASENAME = BASE_URL.replace(/\/$/, '') || undefined;

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
        <AppBootGate>
          <BrowserRouter basename={ROUTER_BASENAME}>
            <AppRoutes />
          </BrowserRouter>
        </AppBootGate>
        <Toaster
          position="bottom-right"
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
      </SaveLoadErrorBoundary>
    </SaveRecoveryProvider>
  );
}
