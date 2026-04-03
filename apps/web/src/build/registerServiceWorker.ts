interface ServiceWorkerRegisterOptions {
  scope?: string;
}

type RegisterServiceWorker = (
  scriptUrl: string,
  options?: ServiceWorkerRegisterOptions,
) => Promise<unknown>;

export function registerMbdServiceWorker(
  register?: RegisterServiceWorker,
) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return;
  }

  const performRegister = register ?? (
    'serviceWorker' in navigator
      ? ((scriptUrl, options) => navigator.serviceWorker.register(scriptUrl, options))
      : null
  );

  if (!performRegister) {
    return;
  }

  void performRegister('/MBD/sw.js', { scope: '/MBD/' }).catch((error) => {
      console.error('Failed to register the Mr. Baseball Dynasty service worker:', error);
  });
}
