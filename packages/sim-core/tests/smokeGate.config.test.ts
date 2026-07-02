import { describe, expect, it } from 'vitest';
import { shouldCaptureSeasonBoundarySnapshot, shouldSkipSmokeGate } from './smokeGate.config.js';

describe('smokeGate CI configuration', () => {
  it('skips the workspace smoke gate only when explicitly requested', () => {
    expect(shouldSkipSmokeGate({})).toBe(false);
    expect(shouldSkipSmokeGate({ MBD_SKIP_SMOKE_GATE: '0' })).toBe(false);
    expect(shouldSkipSmokeGate({ MBD_SKIP_SMOKE_GATE: '1' })).toBe(true);
  });

  it('captures only the final replay boundary when yearly invariant checks are disabled', () => {
    expect(
      shouldCaptureSeasonBoundarySnapshot({ validateInvariants: true }, { seasonIndex: 0, totalSeasons: 3 }),
    ).toBe(true);
    expect(
      shouldCaptureSeasonBoundarySnapshot({ validateInvariants: true }, { seasonIndex: 1, totalSeasons: 3 }),
    ).toBe(true);
    expect(
      shouldCaptureSeasonBoundarySnapshot({ validateInvariants: false }, { seasonIndex: 0, totalSeasons: 3 }),
    ).toBe(false);
    expect(
      shouldCaptureSeasonBoundarySnapshot({ validateInvariants: false }, { seasonIndex: 2, totalSeasons: 3 }),
    ).toBe(true);
  });
});
