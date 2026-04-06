import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { registerMbdServiceWorker } from './registerServiceWorker';

vi.mock('sonner', () => ({
  toast: { info: vi.fn() },
}));

describe('registerMbdServiceWorker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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
});
