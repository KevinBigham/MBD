import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  deriveTradeDeadlineMode,
  generateTradeChatter,
  generateTradeDialogue,
} from '../src/index.js';

describe('trade theatre narrative builders', () => {
  it('derives buyer, seller, and standing-pat deadline modes', () => {
    expect(deriveTradeDeadlineMode({
      winPct: 0.586,
      gamesBack: 1.5,
      daysUntilDeadline: 6,
      gmPersonality: 'win_now',
    })).toBe('buyer');

    expect(deriveTradeDeadlineMode({
      winPct: 0.414,
      gamesBack: 9,
      daysUntilDeadline: 5,
      gmPersonality: 'aggressive',
    })).toBe('seller');

    expect(deriveTradeDeadlineMode({
      winPct: 0.5,
      gamesBack: 4,
      daysUntilDeadline: 18,
      gmPersonality: 'prospect_hugger',
    })).toBe('standing_pat');
  });

  it('generates deterministic dialogue and chatter from stable seeds', () => {
    const build = () => ({
      dialogue: generateTradeDialogue(new GameRNG(71), {
        teamName: 'Boston Red Sox',
        gmPersonality: 'analytical',
        mode: 'buyer',
        daysUntilDeadline: 4,
        offerValue: 54,
        requestValue: 61,
        negotiationType: 'proposal',
      }),
      chatter: generateTradeChatter(new GameRNG(71), {
        userTeamName: 'New York Yankees',
        userMode: 'buyer',
        daysUntilDeadline: 4,
        activeTeams: [
          { teamId: 'bos', teamName: 'Boston Red Sox', mode: 'buyer' },
          { teamId: 'sea', teamName: 'Seattle Mariners', mode: 'seller' },
        ],
        recentTradeSummaries: [
          'Seattle Mariners sent Drew Heater to San Diego Padres for Miguel Prospect.',
        ],
      }),
    });

    const first = build();
    const second = build();

    expect(second).toEqual(first);
    expect(first.dialogue.headline).toContain('Boston Red Sox');
    expect(first.dialogue.lines.length).toBe(3);
    expect(first.chatter[0]?.headline).toContain('New York Yankees');
    expect(first.chatter.some((item) => item.detail.includes('Seattle Mariners'))).toBe(true);
  });
});
