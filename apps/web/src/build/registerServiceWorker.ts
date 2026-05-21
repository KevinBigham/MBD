import { toast } from 'sonner';
import { logger } from '@/shared/lib/logger';

const SW_UPDATE_POLL_MS = 60 * 60 * 1000; // 1 hour

interface ServiceWorkerRegisterOptions {
  scope?: string;
}

interface RegisterMbdServiceWorkerOptions {
  mode?: string;
}

type RegisterServiceWorker = (
  scriptUrl: string,
  options?: ServiceWorkerRegisterOptions,
) => Promise<ServiceWorkerRegistration>;

function viteMode() {
  return (import.meta as unknown as { env?: { MODE?: string } }).env?.MODE;
}

export function showServiceWorkerUpdatedToast(
  reload: () => void = () => window.location.reload(),
) {
  toast.info('App updated — refresh for the latest version.', {
    duration: Infinity,
    action: {
      label: 'Refresh',
      onClick: reload,
    },
  });
}

export function registerMbdServiceWorker(
  register?: RegisterServiceWorker,
  options: RegisterMbdServiceWorkerOptions = {},
) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return;
  }

  if ((options.mode ?? viteMode()) === 'development') {
    return;
  }

  const performRegister = register ?? (
    'serviceWorker' in navigator
      ? ((scriptUrl: string, options?: ServiceWorkerRegisterOptions) =>
          navigator.serviceWorker.register(scriptUrl, options))
      : null
  );

  if (!performRegister) {
    return;
  }

  void performRegister('/MBD/sw.js', { scope: '/MBD/' })
    .then((registration) => {
      // Poll for updates so long-lived tabs notice new deploys
      setInterval(() => {
        void registration.update().catch(() => {
          // Silently ignore — network may be offline
        });
      }, SW_UPDATE_POLL_MS);
    })
    .catch((error) => {
      logger.error('Failed to register the Mr. Baseball Dynasty service worker:', error);
    });

  // When a new SW activates and takes control, prompt the user to reload
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      showServiceWorkerUpdatedToast();
    });
  }
}
