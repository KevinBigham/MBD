import { describe, expect, it } from 'vitest';
import { classifyOriginStorageEstimate, formatOriginStoragePercentage } from './storagePressure';

describe('classifyOriginStorageEstimate', () => {
  it('keeps missing, malformed, and rejected-adapter values unavailable', () => {
    expect(classifyOriginStorageEstimate(undefined).pressure).toBe('unavailable');
    expect(classifyOriginStorageEstimate({ usage: -1, quota: 100 }).status).toBe('unavailable');
    expect(classifyOriginStorageEstimate({ usage: 1, quota: 0 }).status).toBe('unavailable');
    expect(classifyOriginStorageEstimate({ usage: Number.NaN, quota: 100 }).status).toBe('unavailable');
  });

  it('uses the fixed 80/90 presentation policy without clamping overrun evidence', () => {
    expect(classifyOriginStorageEstimate({ usage: 79.99, quota: 100 }).pressure).toBe('normal');
    expect(classifyOriginStorageEstimate({ usage: 80, quota: 100 }).pressure).toBe('warning');
    expect(classifyOriginStorageEstimate({ usage: 89.99, quota: 100 }).pressure).toBe('warning');
    expect(classifyOriginStorageEstimate({ usage: 90, quota: 100 }).pressure).toBe('critical');
    expect(classifyOriginStorageEstimate({ usage: 120, quota: 100 }).percentage).toBe(120);
  });

  it('lets an observed quota write failure override an optimistic estimate', () => {
    expect(classifyOriginStorageEstimate({ usage: 1, quota: 100 }, 'quota').pressure).toBe('critical');
  });

  it.each([
    [79.99, '79.99'],
    [80, '80.00'],
    [89.99, '89.99'],
    [90, '90.00'],
    [79.999, '<80.00'],
    [89.999, '<90.00'],
  ])('formats %s without rounding across a policy boundary', (percentage, expected) => {
    expect(formatOriginStoragePercentage(percentage)).toBe(expected);
  });
});
