import { describe, expect, it } from 'vitest';
import { normalizeProspectReadinessGrade } from './prospectReadiness';

describe('normalizeProspectReadinessGrade', () => {
  it('converts internal ratings to 20-80 display grades', () => {
    expect(normalizeProspectReadinessGrade(410)).toBe(65);
  });

  it('clamps already-display-scale inputs', () => {
    expect(normalizeProspectReadinessGrade(88)).toBe(80);
    expect(normalizeProspectReadinessGrade(18)).toBe(20);
  });
});
