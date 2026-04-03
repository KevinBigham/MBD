import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  applyDevelopmentSetback,
  checkDevelopmentSetback,
  generatePlayer,
  isDevelopmentSetbackExpired,
  recoverDevelopmentSetback,
} from '../src/index.js';

describe('development setbacks', () => {
  it('generates a deterministic positive hot streak when the seeded roll lands there', () => {
    let result = null;
    for (let seed = 1; seed < 500; seed += 1) {
      const player = generatePlayer(new GameRNG(seed + 1000), 'SS', 'nyy', 'AA');
      const setback = checkDevelopmentSetback(new GameRNG(seed), player, 6, 5);
      if (setback?.type === 'hot_streak') {
        result = setback;
        break;
      }
    }

    expect(result).not.toBeNull();
    expect(result?.overallModifier).toBeGreaterThan(0);
  });

  it('applies and then recovers a negative setback modifier', () => {
    const player = generatePlayer(new GameRNG(71), 'SS', 'nyy', 'AA');
    const setback = {
      playerId: player.id,
      type: 'mental_block' as const,
      overallModifier: -8,
      startSeason: 5,
      startMonth: 5,
      endSeason: 5,
      endMonth: 7,
      summary: 'Player is struggling with consistency.',
      active: true,
    };

    const impacted = applyDevelopmentSetback(player, setback);
    const recovered = recoverDevelopmentSetback(impacted, setback);

    expect(impacted.overallRating).toBe(player.overallRating - 8);
    expect(recovered.overallRating).toBe(player.overallRating);
    expect(isDevelopmentSetbackExpired(setback, 5, 8)).toBe(true);
  });
});
