import { describe, expect, it, vi, beforeEach } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes error, warn, and info methods', () => {
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.info).toBe('function');
  });

  it('calls console.error in dev mode', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logger.error('test message', { detail: 1 });
    // In test env, import.meta.env.DEV is true
    expect(spy).toHaveBeenCalledWith('test message', { detail: 1 });
  });

  it('calls console.warn in dev mode', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    logger.warn('warning');
    expect(spy).toHaveBeenCalledWith('warning');
  });

  it('calls console.info in dev mode', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    logger.info('info');
    expect(spy).toHaveBeenCalledWith('info');
  });
});
