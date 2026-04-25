import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { toast } from 'sonner';
import { registerMbdServiceWorker, showServiceWorkerUpdatedToast } from './registerServiceWorker';

vi.mock('sonner', () => ({
  toast: { info: vi.fn() },
}));

describe('registerMbdServiceWorker', () => {
  const serviceWorkerListeners = new Map<string, EventListener[]>();

  beforeEach(() => {
    vi.useFakeTimers();
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    expect(toast.info).toHaveBeenCalledWith(
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
    const toastOptions = vi.mocked(toast.info).mock.calls[0]?.[1];
    const action = toastOptions?.action;

    if (!action || typeof action !== 'object' || !('onClick' in action)) {
      throw new Error('Expected the refresh toast to include an action callback');
    }

    expect(action.label).toBe('Refresh');
    (action.onClick as () => void)();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
