import { describe, it, expect } from 'vitest';
import { QualityScaleBar, QUALITY_SCALES } from './QualityScaleBar';

describe('QualityScaleBar', () => {
  it('is a function component', () => {
    expect(typeof QualityScaleBar).toBe('function');
  });

  it('exports preset quality scales', () => {
    expect(QUALITY_SCALES.wOBA).toBeDefined();
    expect(QUALITY_SCALES.OPS).toBeDefined();
    expect(QUALITY_SCALES.ERA).toBeDefined();
    expect(QUALITY_SCALES.FIP).toBeDefined();
    expect(QUALITY_SCALES.AVG).toBeDefined();
    expect(QUALITY_SCALES.WAR).toBeDefined();
  });

  it('wOBA scale has 5 zones in ascending order', () => {
    const zones = QUALITY_SCALES.wOBA;
    expect(zones).toHaveLength(5);
    for (let i = 0; i < zones.length - 1; i++) {
      expect(zones[i]!.max).toBeLessThanOrEqual(zones[i + 1]!.min + 0.001);
    }
  });

  it('ERA scale has 5 zones', () => {
    expect(QUALITY_SCALES.ERA).toHaveLength(5);
    // ERA: lower is better, so Excellent is first with lowest values
    expect(QUALITY_SCALES.ERA[0]!.label).toBe('Excellent');
    expect(QUALITY_SCALES.ERA[0]!.min).toBeLessThan(QUALITY_SCALES.ERA[4]!.min);
  });

  it('WAR scale spans from negative to positive', () => {
    const zones = QUALITY_SCALES.WAR;
    const minVal = Math.min(...zones.map((z) => z.min));
    const maxVal = Math.max(...zones.map((z) => z.max));
    expect(minVal).toBeLessThan(0);
    expect(maxVal).toBeGreaterThan(5);
  });

  it('all scales have non-empty labels and valid colors', () => {
    for (const [, zones] of Object.entries(QUALITY_SCALES)) {
      for (const zone of zones) {
        expect(zone.label.length).toBeGreaterThan(0);
        expect(zone.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(zone.min).toBeLessThan(zone.max);
      }
    }
  });
});
