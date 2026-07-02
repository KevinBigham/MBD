import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const sonnerMock = vi.hoisted(() => ({
  toastInfo: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { info: sonnerMock.toastInfo },
}));

describe('registerMbdServiceWorker', () => {
  const serviceWorkerListeners = new Map<string, EventListener[]>();
  let registerMbdServiceWorker: typeof import('./registerServiceWorker')['registerMbdServiceWorker'];
  let showServiceWorkerUpdatedToast: typeof import('./registerServiceWorker')['showServiceWorkerUpdatedToast'];

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    sonnerMock.toastInfo.mockReset();
    serviceWorkerListeners.clear();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        addEventListener: vi.fn((eventName: string, listener: EventListener) => {
          const listeners = serviceWorkerListeners.get(eventName) ?? [];
          listeners.push(listener);
          serviceWorkerListeners.set(eventName, listeners);
        }),
      },
    });
    ({ registerMbdServiceWorker, showServiceWorkerUpdatedToast } = await import('./registerServiceWorker'));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('registers the service worker at the correct path and scope', () => {
    const mockRegistration = { update: vi.fn().mockResolvedValue(undefined) };
    const register = vi.fn().mockResolvedValue(mockRegistration);

    registerMbdServiceWorker(register);

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('/MBD/sw.js', { scope: '/MBD/' });
  });

  it('skips service worker registration while running under the Vite dev server', () => {
    const register = vi.fn().mockResolvedValue({ update: vi.fn() });

    registerMbdServiceWorker(register, { mode: 'development' });

    expect(register).not.toHaveBeenCalled();
    expect(navigator.serviceWorker.addEventListener).not.toHaveBeenCalled();
  });

  it('polls for SW updates on an interval after registration', async () => {
    const mockRegistration = { update: vi.fn().mockResolvedValue(undefined) };
    const register = vi.fn().mockResolvedValue(mockRegistration);

    registerMbdServiceWorker(register);
    await vi.advanceTimersByTimeAsync(0); // resolve the register promise

    expect(mockRegistration.update).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000); // 1 hour
    expect(mockRegistration.update).toHaveBeenCalledTimes(1);
  });

  it('does not throw when registration fails', () => {
    const register = vi.fn().mockRejectedValue(new Error('SW failed'));

    expect(() => registerMbdServiceWorker(register)).not.toThrow();
  });

  it('shows the refresh toast when the service worker controller changes', () => {
    const mockRegistration = { update: vi.fn().mockResolvedValue(undefined) };
    const register = vi.fn().mockResolvedValue(mockRegistration);

    registerMbdServiceWorker(register);
    const listeners = serviceWorkerListeners.get('controllerchange') ?? [];
    expect(listeners).toHaveLength(1);

    listeners[0]?.(new Event('controllerchange'));

    expect(sonnerMock.toastInfo).toHaveBeenCalledWith(
      'App updated — refresh for the latest version.',
      expect.objectContaining({
        duration: Infinity,
        action: expect.objectContaining({ label: 'Refresh' }),
      }),
    );
  });

  it('wires the refresh toast action to a page reload', () => {
    const reload = vi.fn();

    showServiceWorkerUpdatedToast(reload);
    const toastOptions = sonnerMock.toastInfo.mock.calls[0]?.[1];
    const action = toastOptions?.action;

    if (!action || typeof action !== 'object' || !('onClick' in action)) {
      throw new Error('Expected the refresh toast to include an action callback');
    }

    expect(action.label).toBe('Refresh');
    (action.onClick as () => void)();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
