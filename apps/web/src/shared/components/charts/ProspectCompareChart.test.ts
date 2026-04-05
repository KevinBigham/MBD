import { describe, expect, it } from 'vitest';
import { transformProspectCompareData } from './ProspectCompareChart';
import type { ProspectInput } from './ProspectCompareChart';

describe('transformProspectCompareData', () => {
  it('returns empty array for null input', () => {
    expect(transformProspectCompareData(null)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(transformProspectCompareData([])).toEqual([]);
  });

  it('returns empty array when prospect has no attributes', () => {
    const prospects: ProspectInput[] = [{ name: 'Player A', attributes: {} }];
    expect(transformProspectCompareData(prospects)).toEqual([]);
  });

  it('creates one entry per attribute with prospect name keys', () => {
    const prospects: ProspectInput[] = [
      { name: 'Smith', attributes: { Contact: 60, Power: 55 } },
      { name: 'Jones', attributes: { Contact: 50, Power: 70 } },
    ];
    const result = transformProspectCompareData(prospects);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ attribute: 'Contact', Smith: 60, Jones: 50 });
    expect(result[1]).toEqual({ attribute: 'Power', Smith: 55, Jones: 70 });
  });

  it('handles missing attributes with zero fallback', () => {
    const prospects: ProspectInput[] = [
      { name: 'A', attributes: { Contact: 60, Power: 55 } },
      { name: 'B', attributes: { Contact: 50 } }, // no Power
    ];
    const result = transformProspectCompareData(prospects);
    expect(result[1]).toEqual({ attribute: 'Power', A: 55, B: 0 });
  });

  it('works with three prospects', () => {
    const prospects: ProspectInput[] = [
      { name: 'A', attributes: { Stuff: 70 } },
      { name: 'B', attributes: { Stuff: 60 } },
      { name: 'C', attributes: { Stuff: 50 } },
    ];
    const result = transformProspectCompareData(prospects);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ attribute: 'Stuff', A: 70, B: 60, C: 50 });
  });
});
