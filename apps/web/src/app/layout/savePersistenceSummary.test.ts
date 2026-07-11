import { describe, expect, it } from 'vitest';
import { formatSavePersistenceSummary } from './savePersistenceSummary';

const deterministicFormat = {
  locale: 'en-US',
  timeZone: 'UTC',
} as const;

describe('formatSavePersistenceSummary', () => {
  it('formats the exact durable record time and a clean logical queue', () => {
    expect(formatSavePersistenceSummary(
      '2026-04-02T19:42:03.000Z',
      0,
      deterministicFormat,
    )).toBe('Last saved 7:42:03 PM · 0 pending writes');
  });

  it('uses singular copy for one pending write and plural copy otherwise', () => {
    expect(formatSavePersistenceSummary(null, 1, deterministicFormat))
      .toBe('Not saved yet · 1 pending write');
    expect(formatSavePersistenceSummary(null, 3, deterministicFormat))
      .toBe('Not saved yet · 3 pending writes');
  });

  it('does not present invalid or epoch fallback metadata as a real save time', () => {
    expect(formatSavePersistenceSummary('not-a-date', 0, deterministicFormat))
      .toBe('Not saved yet · 0 pending writes');
    expect(formatSavePersistenceSummary('1970-01-01T00:00:00.000Z', 0, deterministicFormat))
      .toBe('Not saved yet · 0 pending writes');
  });

  it('defensively normalizes impossible queue values', () => {
    expect(formatSavePersistenceSummary(null, -2, deterministicFormat))
      .toBe('Not saved yet · 0 pending writes');
    expect(formatSavePersistenceSummary(null, 2.9, deterministicFormat))
      .toBe('Not saved yet · 2 pending writes');
  });
});
