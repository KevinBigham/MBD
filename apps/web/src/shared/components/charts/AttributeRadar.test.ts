import { describe, expect, it } from 'vitest';
import { transformHitterRadarData, transformPitcherRadarData } from './AttributeRadar';

describe('transformHitterRadarData', () => {
  it('returns 6 data points for hitter attributes', () => {
    const attrs = { contact: 275, power: 300, eye: 200, speed: 150, defense: 250, durability: 400 };
    const result = transformHitterRadarData(attrs);
    expect(result).toHaveLength(6);
  });

  it('maps correct attribute labels', () => {
    const attrs = { contact: 275, power: 300, eye: 200, speed: 150, defense: 250, durability: 400 };
    const result = transformHitterRadarData(attrs);
    expect(result.map((d) => d.attribute)).toEqual([
      'Contact', 'Power', 'Eye', 'Speed', 'Defense', 'Durability',
    ]);
  });

  it('converts internal 0-550 to display 20-80 scale', () => {
    const attrs = { contact: 0, power: 275, eye: 550, speed: 275, defense: 275, durability: 275 };
    const result = transformHitterRadarData(attrs);
    expect(result[0]!.value).toBe(20);  // 0 → 20
    expect(result[1]!.value).toBe(50);  // 275 → 50
    expect(result[2]!.value).toBe(80);  // 550 → 80
  });

  it('clamps values to valid range', () => {
    const attrs = { contact: -50, power: 700, eye: 275, speed: 275, defense: 275, durability: 275 };
    const result = transformHitterRadarData(attrs);
    expect(result[0]!.value).toBe(20);  // clamped to 0 → 20
    expect(result[1]!.value).toBe(80);  // clamped to 550 → 80
  });

  it('sets fullMark to 80 for all points', () => {
    const attrs = { contact: 275, power: 275, eye: 275, speed: 275, defense: 275, durability: 275 };
    const result = transformHitterRadarData(attrs);
    expect(result.every((d) => d.fullMark === 80)).toBe(true);
  });
});

describe('transformPitcherRadarData', () => {
  it('returns 5 data points for pitcher attributes', () => {
    const attrs = { stuff: 300, control: 250, stamina: 200, velocity: 350, movement: 275 };
    const result = transformPitcherRadarData(attrs);
    expect(result).toHaveLength(5);
  });

  it('maps correct attribute labels', () => {
    const attrs = { stuff: 300, control: 250, stamina: 200, velocity: 350, movement: 275 };
    const result = transformPitcherRadarData(attrs);
    expect(result.map((d) => d.attribute)).toEqual([
      'Stuff', 'Control', 'Stamina', 'Velocity', 'Movement',
    ]);
  });

  it('converts internal scale to display scale', () => {
    const attrs = { stuff: 550, control: 0, stamina: 275, velocity: 275, movement: 275 };
    const result = transformPitcherRadarData(attrs);
    expect(result[0]!.value).toBe(80);  // 550 → 80
    expect(result[1]!.value).toBe(20);  // 0 → 20
    expect(result[2]!.value).toBe(50);  // 275 → 50
  });
});
