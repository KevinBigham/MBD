import { describe, expect, it } from 'vitest';
import type { GameBoxScore } from '../src/sim/gameSimulator.js';
import type { PAResult } from '../src/sim/plateAppearance.js';
import {
  generateGameHighlights,
  generateGameRecap,
  generatePlayByPlay,
} from '../src/narrative/playByPlay.js';

function buildPAResult(overrides: Partial<PAResult> = {}): PAResult {
  return {
    outcome: 'SINGLE',
    batterId: 'batter-1',
    pitcherId: 'pitcher-1',
    inning: 1,
    halfInning: 'top',
    outs: 0,
    runnersOn: 0,
    scoreBefore: [0, 0],
    scoreAfter: [0, 0],
    rbiOnPlay: 0,
    isWalkOff: false,
    ...overrides,
  };
}

function buildBoxScore(paResults: PAResult[]): GameBoxScore {
  return {
    homeTeamId: 'bos',
    awayTeamId: 'nym',
    homeScore: 4,
    awayScore: 5,
    innings: 10,
    homeHits: 8,
    awayHits: 9,
    paResults,
    date: 'S3D120',
    isPlayoff: false,
  };
}

describe('play-by-play narrative engine', () => {
  it('generates contextual play-by-play text for each outcome type', () => {
    const singleText = generatePlayByPlay(
      buildPAResult({
        batterId: 'batter-single',
        outcome: 'SINGLE',
        inning: 3,
        runnersOn: 2,
        scoreBefore: [1, 0],
        scoreAfter: [2, 0],
        rbiOnPlay: 1,
      }),
      'Mason Cruz',
      'Eli Warren',
      'Tycoons',
      "Noreasters",
    );
    expect(singleText).toContain('Mason Cruz');
    expect(singleText.toLowerCase()).toMatch(/single|scores|scoring/);

    const homerText = generatePlayByPlay(
      buildPAResult({
        batterId: 'batter-homer',
        outcome: 'HR',
        inning: 10,
        halfInning: 'bottom',
        scoreBefore: [4, 4],
        scoreAfter: [4, 5],
        rbiOnPlay: 1,
        isWalkOff: true,
      }),
      'Theo Thompson',
      'Victor Lane',
      'Tycoons',
      "Noreasters",
    );
    expect(homerText).toContain('Theo Thompson');
    expect(homerText).toContain("Noreasters");
    expect(homerText.toLowerCase()).toMatch(/walk-off|gone|home run/);

    const strikeoutText = generatePlayByPlay(
      buildPAResult({
        batterId: 'batter-k',
        outcome: 'K',
        inning: 7,
        outs: 2,
        runnersOn: 2,
      }),
      'Luis Vega',
      'Cal Foster',
      'Tycoons',
      "Noreasters",
    );
    expect(strikeoutText).toContain('Luis Vega');
    expect(strikeoutText.toLowerCase()).toMatch(/strike|threat|strand/);

    const doublePlayText = generatePlayByPlay(
      buildPAResult({
        batterId: 'batter-dp',
        outcome: 'DOUBLE_PLAY',
        inning: 6,
        outs: 1,
        runnersOn: 2,
      }),
      'Noah Price',
      'Cal Foster',
      'Tycoons',
      "Noreasters",
    );
    expect(doublePlayText).toContain('Cal Foster');
    expect(doublePlayText.toLowerCase()).toMatch(/double play|around the horn/);

    const walkText = generatePlayByPlay(
      buildPAResult({
        batterId: 'batter-bb',
        outcome: 'BB',
        inning: 4,
        outs: 2,
        runnersOn: 3,
        scoreBefore: [1, 1],
        scoreAfter: [2, 1],
        rbiOnPlay: 1,
      }),
      'Evan Cole',
      'Riley Stone',
      'Tycoons',
      "Noreasters",
    );
    expect(walkText).toContain('Evan Cole');
    expect(walkText.toLowerCase()).toMatch(/ball four|force/);
  });

  it('template selection is deterministic given same batterId and context', () => {
    const pa = buildPAResult({
      batterId: 'stable-batter',
      outcome: 'HR',
      inning: 5,
      outs: 1,
      runnersOn: 1,
      scoreBefore: [2, 1],
      scoreAfter: [4, 1],
      rbiOnPlay: 2,
    });

    const first = generatePlayByPlay(pa, 'Theo Thompson', 'Victor Lane', 'Tycoons', "Noreasters");
    const second = generatePlayByPlay(pa, 'Theo Thompson', 'Victor Lane', 'Tycoons', "Noreasters");

    expect(first).toBe(second);
  });

  it('produces 3-5 highlights per game sorted by drama score', () => {
    const boxScore = buildBoxScore([
      buildPAResult({
        batterId: 'clutch-k',
        pitcherId: 'pitcher-k',
        outcome: 'K',
        inning: 8,
        halfInning: 'top',
        outs: 2,
        runnersOn: 2,
      }),
      buildPAResult({
        batterId: 'comeback-hit',
        pitcherId: 'pitcher-hit',
        outcome: 'DOUBLE',
        inning: 8,
        halfInning: 'bottom',
        outs: 1,
        runnersOn: 2,
        scoreBefore: [4, 2],
        scoreAfter: [4, 4],
        rbiOnPlay: 2,
      }),
      buildPAResult({
        batterId: 'extras-hit',
        pitcherId: 'pitcher-extras',
        outcome: 'SINGLE',
        inning: 10,
        halfInning: 'top',
        scoreBefore: [4, 4],
        scoreAfter: [5, 4],
        rbiOnPlay: 1,
      }),
      buildPAResult({
        batterId: 'walkoff',
        pitcherId: 'pitcher-walkoff',
        outcome: 'HR',
        inning: 10,
        halfInning: 'bottom',
        scoreBefore: [5, 4],
        scoreAfter: [5, 6],
        rbiOnPlay: 2,
        isWalkOff: true,
      }),
    ]);

    const playerNames = new Map<string, string>([
      ['clutch-k', 'Cal Foster'],
      ['pitcher-k', 'Luis Vega'],
      ['comeback-hit', 'Mason Cruz'],
      ['pitcher-hit', 'Riley Stone'],
      ['extras-hit', 'Theo Thompson'],
      ['pitcher-extras', 'Victor Lane'],
      ['walkoff', 'Jake Johnson'],
      ['pitcher-walkoff', 'Owen Hale'],
    ]);
    const teamNames = new Map<string, string>([
      ['nym', 'Tycoons'],
      ['bos', "Noreasters"],
    ]);

    const highlights = generateGameHighlights(boxScore, playerNames, teamNames);

    expect(highlights.length).toBeGreaterThanOrEqual(3);
    expect(highlights.length).toBeLessThanOrEqual(5);
    expect(highlights[0]?.type).toBe('walkoff');
    expect(highlights[0]?.dramaScore).toBeGreaterThanOrEqual(highlights[1]?.dramaScore ?? 0);
  });

  it('generates a 2-3 sentence game recap', () => {
    const boxScore = buildBoxScore([
      buildPAResult({
        batterId: 'walkoff',
        pitcherId: 'pitcher-walkoff',
        outcome: 'HR',
        inning: 10,
        halfInning: 'bottom',
        scoreBefore: [4, 4],
        scoreAfter: [4, 5],
        rbiOnPlay: 1,
        isWalkOff: true,
      }),
    ]);
    const playerNames = new Map<string, string>([
      ['walkoff', 'Jake Johnson'],
      ['pitcher-walkoff', 'Owen Hale'],
    ]);
    const teamNames = new Map<string, string>([
      ['nym', 'Tycoons'],
      ['bos', "Noreasters"],
    ]);

    const highlights = generateGameHighlights(boxScore, playerNames, teamNames);
    const recap = generateGameRecap(boxScore, highlights, playerNames, teamNames);
    const sentenceCount = recap.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean).length;

    expect(recap).toContain('Tycoons');
    expect(recap).toContain("Noreasters");
    expect(recap).toMatch(/5-4|4-5/);
    expect(sentenceCount).toBeGreaterThanOrEqual(2);
    expect(sentenceCount).toBeLessThanOrEqual(3);
  });

  it('chooses a tied top batter deterministically regardless of plate appearance order', () => {
    const firstOrder = buildBoxScore([
      buildPAResult({
        batterId: 'batter-b',
        pitcherId: 'pitcher-1',
        outcome: 'SINGLE',
        inning: 2,
        rbiOnPlay: 1,
      }),
      buildPAResult({
        batterId: 'batter-a',
        pitcherId: 'pitcher-1',
        outcome: 'SINGLE',
        inning: 3,
        rbiOnPlay: 1,
      }),
    ]);
    const secondOrder = buildBoxScore([...firstOrder.paResults].reverse());
    const playerNames = new Map<string, string>([
      ['batter-a', 'Aaron Ace'],
      ['batter-b', 'Bruno Bat'],
      ['pitcher-1', 'Cal Mound'],
    ]);
    const teamNames = new Map<string, string>([
      ['nym', 'Tycoons'],
      ['bos', 'Noreasters'],
    ]);

    const firstRecap = generateGameRecap(firstOrder, [], playerNames, teamNames);
    const secondRecap = generateGameRecap(secondOrder, [], playerNames, teamNames);

    expect(firstRecap).toContain('Aaron Ace');
    expect(secondRecap).toContain('Aaron Ace');
    expect(firstRecap).toBe(secondRecap);
  });

  it('handles extra-inning games', () => {
    const boxScore = buildBoxScore([
      buildPAResult({
        batterId: 'extras-hit',
        pitcherId: 'pitcher-extras',
        outcome: 'DOUBLE',
        inning: 11,
        halfInning: 'top',
        scoreBefore: [4, 4],
        scoreAfter: [6, 4],
        rbiOnPlay: 2,
      }),
    ]);

    const highlights = generateGameHighlights(
      boxScore,
      new Map([
        ['extras-hit', 'Theo Thompson'],
        ['pitcher-extras', 'Victor Lane'],
      ]),
      new Map([
        ['nym', 'Tycoons'],
        ['bos', "Noreasters"],
      ]),
    );

    expect(highlights.some((highlight) => highlight.type === 'extras')).toBe(true);
  });
});
