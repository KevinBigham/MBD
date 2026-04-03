import { describe, expect, it, vi } from 'vitest';
import { registerMbdServiceWorker } from './registerServiceWorker';

describe('registerMbdServiceWorker', () => {
  it('registers the service worker with immediate updates enabled', () => {
    const register = vi.fn().mockResolvedValue(undefined);

    registerMbdServiceWorker(register);

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('/MBD/sw.js', { scope: '/MBD/' });
  });
});
