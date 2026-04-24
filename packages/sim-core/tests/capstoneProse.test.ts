import { describe, expect, it } from 'vitest';
import {
  AWARD_CAPSTONE_BRANCH_VARIANTS,
  pickAwardCeremonyLine,
  resolveAwardCapstoneBranch,
  type AwardCapstoneBranch,
  type AwardCapstonePoolId,
} from '../src/narrative/awardCeremonyProse.js';
import {
  HOF_CAPSTONE_BRANCH_VARIANTS,
  pickHallOfFameInductionSummary,
  resolveHallOfFameBranch,
  type HallOfFameCapstoneBranch,
} from '../src/narrative/hofProse.js';
import {
  RETIREMENT_CAPSTONE_BRANCH_VARIANTS,
  pickDebutPressLine,
  pickFarewellTourLine,
  pickJerseyRetirementLine,
  pickRetirementSpeechLine,
  resolveDebutPressBranch,
  resolveFarewellTourBranch,
  resolveJerseyRetirementBranch,
  resolveRetirementBranch,
  type RetirementCapstonePoolId,
} from '../src/narrative/retirementProse.js';

const invalidTokenPattern = /\{[a-zA-Z0-9_]+\}|\$[a-zA-Z0-9_]+|undefined|null|NaN/;

function flattenPool<TBranch extends string>(
  variantsByBranch: Readonly<Record<TBranch, readonly string[]>>,
): string[] {
  return Object.values(variantsByBranch).flat() as string[];
}

describe('capstone prose pools', () => {
  it.each([
    ['mvp', 12],
    ['cy_young', 12],
    ['rookie_of_the_year', 10],
  ] as const satisfies readonly [AwardCapstonePoolId, number][])(
    'provides enough award ceremony variants for %s',
    (poolId, expectedMinimum) => {
      const flattened = flattenPool(AWARD_CAPSTONE_BRANCH_VARIANTS[poolId]);

      expect(new Set(flattened).size).toBeGreaterThanOrEqual(expectedMinimum);
      for (const [branch, variants] of Object.entries(AWARD_CAPSTONE_BRANCH_VARIANTS[poolId])) {
        expect(variants, `${poolId}:${branch}`).toHaveLength(2);
      }
    },
  );

  it('provides enough Hall of Fame induction variants by branch', () => {
    const flattened = flattenPool(HOF_CAPSTONE_BRANCH_VARIANTS);

    expect(new Set(flattened).size).toBeGreaterThanOrEqual(12);
    for (const [branch, variants] of Object.entries(HOF_CAPSTONE_BRANCH_VARIANTS)) {
      expect(variants, branch).toHaveLength(2);
    }
  });

  it.each([
    ['retirement_speech', 12],
    ['jersey_retirement', 10],
    ['farewell_tour', 10],
    ['debut_press', 10],
  ] as const satisfies readonly [RetirementCapstonePoolId, number][])(
    'provides enough retirement/debut variants for %s',
    (poolId, expectedMinimum) => {
      const flattened = flattenPool(RETIREMENT_CAPSTONE_BRANCH_VARIANTS[poolId]);

      expect(new Set(flattened).size).toBeGreaterThanOrEqual(expectedMinimum);
      for (const [branch, variants] of Object.entries(RETIREMENT_CAPSTONE_BRANCH_VARIANTS[poolId])) {
        expect(variants, `${poolId}:${branch}`).toHaveLength(2);
      }
    },
  );
});

describe('capstone prose branch routing', () => {
  it.each([
    ['mvp unanimous proxy', resolveAwardCapstoneBranch({
      poolId: 'mvp',
      winnerAge: 27,
      isFirstAward: true,
      isRepeatWinner: false,
      voteShare: 1,
    }), 'unanimous_mvp'],
    ['mvp repeat', resolveAwardCapstoneBranch({
      poolId: 'mvp',
      winnerAge: 29,
      isFirstAward: false,
      isRepeatWinner: true,
    }), 'repeat_mvp'],
    ['cy closer', resolveAwardCapstoneBranch({
      poolId: 'cy_young',
      winnerAge: 31,
      isFirstAward: true,
      isRepeatWinner: false,
      winnerRole: 'closer',
      saves: 45,
    }), 'closer_cy'],
    ['cy workload', resolveAwardCapstoneBranch({
      poolId: 'cy_young',
      winnerAge: 30,
      isFirstAward: true,
      isRepeatWinner: false,
      inningsPitched: 246,
    }), '40+_start_cy'],
    ['roy international', resolveAwardCapstoneBranch({
      poolId: 'rookie_of_the_year',
      winnerAge: 22,
      isFirstAward: true,
      isRepeatWinner: false,
      acquisitionType: 'ifa',
    }), 'international_signing'],
    ['roy top pick', resolveAwardCapstoneBranch({
      poolId: 'rookie_of_the_year',
      winnerAge: 21,
      isFirstAward: true,
      isRepeatWinner: false,
      draftPickNumber: 4,
    }), 'top_5_draft_pick'],
  ] as const satisfies readonly [string, AwardCapstoneBranch, AwardCapstoneBranch][])(
    'routes %s to %s',
    (_label, actual, expected) => {
      expect(actual).toBe(expected);
    },
  );

  it.each([
    ['unanimous proxy', resolveHallOfFameBranch({ score: 100, inductionType: 'first_ballot', teamIds: ['nym', 'bos'] }), 'unanimous'],
    ['hometown hero', resolveHallOfFameBranch({ score: 86, inductionType: 'first_ballot', teamIds: ['nym'] }), 'hometown_hero'],
    ['journeyman', resolveHallOfFameBranch({ score: 88, inductionType: 'first_ballot', teamIds: ['nym', 'bos', 'sea', 'por', 'chi'] }), 'journeyman_honor'],
    ['borderline', resolveHallOfFameBranch({ score: 68, inductionType: 'ballot', teamIds: ['nym', 'bos'] }), 'borderline'],
  ] as const satisfies readonly [string, HallOfFameCapstoneBranch, HallOfFameCapstoneBranch][])(
    'routes Hall of Fame %s to %s',
    (_label, actual, expected) => {
      expect(actual).toBe(expected);
    },
  );

  it('routes retirement, jersey, farewell, and debut branches from existing state', () => {
    expect(resolveRetirementBranch({
      championshipRings: 1,
      currentTeamId: 'nym',
      teamIds: ['nym'],
      peakOverall: 72,
      priorSeasonGamesMissed: 0,
    })).toBe('champion_retiree');
    expect(resolveJerseyRetirementBranch({
      inductionType: 'first_ballot',
      teamIds: ['nym', 'bos'],
    })).toBe('hof_jersey');
    expect(resolveFarewellTourBranch({
      wins: 96,
      losses: 62,
      leadership: 82,
      overallRating: 78,
    })).toBe('farewell_on_contender');
    expect(resolveDebutPressBranch({
      age: 29,
      previousLevel: 'AAA',
      callupDay: 40,
    })).toBe('veteran_journeyman_debut');
  });
});

describe('capstone prose selection', () => {
  it('keeps the same key on the same variant', () => {
    const context = {
      playerId: 'player-1',
      playerName: 'Jordan Vale',
      teamName: 'New York Tycoons',
      awardName: 'American League MVP',
      season: 12,
      poolId: 'mvp' as const,
      branch: 'first_mvp' as const,
    };

    expect(pickAwardCeremonyLine(context)).toBe(pickAwardCeremonyLine(context));
  });

  it.each([
    ['award', () => pickAwardCeremonyLine({
      playerId: 'p',
      playerName: 'Jordan Vale',
      teamName: 'New York Tycoons',
      awardName: 'American League MVP',
      season: 12,
      poolId: 'mvp',
      branch: 'first_mvp',
    })],
    ['hof', () => pickHallOfFameInductionSummary({
      playerId: 'p',
      playerName: 'Jordan Vale',
      teamName: 'New York Tycoons',
      season: 20,
      score: 92,
      inductionType: 'first_ballot',
      teamIds: ['nym'],
      branch: 'hometown_hero',
    })],
    ['retirement', () => pickRetirementSpeechLine({
      playerId: 'p',
      playerName: 'Jordan Vale',
      teamName: 'New York Tycoons',
      season: 20,
      branch: 'champion_retiree',
    })],
    ['jersey', () => pickJerseyRetirementLine({
      playerId: 'p',
      playerName: 'Jordan Vale',
      teamName: 'New York Tycoons',
      season: 20,
      branch: 'career_on_one_team',
    })],
    ['farewell', () => pickFarewellTourLine({
      playerId: 'p',
      playerName: 'Jordan Vale',
      teamName: 'New York Tycoons',
      season: 20,
      branch: 'loud_farewell',
    })],
    ['debut', () => pickDebutPressLine({
      playerId: 'p',
      playerName: 'Jordan Vale',
      teamName: 'New York Tycoons',
      season: 20,
      branch: 'top_prospect_debut',
    })],
  ] as const)('does not leave unresolved placeholders in %s copy', (_label, render) => {
    expect(render()).not.toMatch(invalidTokenPattern);
  });

  it.each([
    ['mvp', ['first_mvp', 'repeat_mvp', 'unanimous_mvp', 'oldest_mvp', 'youngest_mvp', 'standard_mvp']],
    ['cy_young', ['first_cy', 'repeat_cy', 'unanimous_cy', 'closer_cy', '40+_start_cy', 'standard_cy']],
    ['rookie_of_the_year', ['international_signing', 'top_5_draft_pick', 'late_round_surprise', 'mid_season_callup', 'standard_roy']],
  ] as const satisfies readonly [AwardCapstonePoolId, readonly AwardCapstoneBranch[]][])(
    'spreads %s variants across synthetic stable keys',
    (poolId, branches) => {
      const outputs = new Set(
        Array.from({ length: 100 }, (_, index) => pickAwardCeremonyLine({
          playerId: `player-${index}`,
          playerName: `Player ${index}`,
          teamName: 'New York Tycoons',
          awardName: poolId,
          season: 20 + (index % 10),
          poolId,
          branch: branches[index % branches.length]!,
        })),
      );

      expect(outputs.size).toBeGreaterThanOrEqual(8);
    },
  );

  it.each([
    ['hall of fame', (index: number) => pickHallOfFameInductionSummary({
      playerId: `player-${index}`,
      playerName: `Player ${index}`,
      teamName: 'New York Tycoons',
      season: 20 + (index % 10),
      score: 88 + (index % 13),
      inductionType: index % 4 === 0 ? 'ballot' : 'first_ballot',
      teamIds: index % 5 === 0 ? ['nym'] : ['nym', 'bos', 'sea', 'por', 'chi'].slice(0, 1 + (index % 5)),
      branch: (['hometown_hero', 'first_ballot', 'journeyman_honor', 'borderline', 'unanimous', 'standard'] as const)[index % 6]!,
    })],
    ['retirement', (index: number) => pickRetirementSpeechLine({
      playerId: `player-${index}`,
      playerName: `Player ${index}`,
      teamName: 'New York Tycoons',
      season: 20 + (index % 10),
      branch: (['champion_retiree', 'star_without_ring', 'hometown_retirement', 'trade_exile_retirement', 'injury_forced_retirement', 'standard_retirement'] as const)[index % 6]!,
    })],
    ['jersey retirement', (index: number) => pickJerseyRetirementLine({
      playerId: `player-${index}`,
      playerName: `Player ${index}`,
      teamName: 'New York Tycoons',
      season: 20 + (index % 10),
      branch: (['career_on_one_team', 'legend_returns_home', 'posthumous_honor', 'hof_jersey', 'standard_jersey'] as const)[index % 5]!,
    })],
    ['farewell tour', (index: number) => pickFarewellTourLine({
      playerId: `player-${index}`,
      playerName: `Player ${index}`,
      teamName: 'New York Tycoons',
      season: 20 + (index % 10),
      branch: (['farewell_on_contender', 'farewell_on_tank', 'quiet_farewell', 'loud_farewell', 'standard_farewell'] as const)[index % 5]!,
    })],
    ['debut press', (index: number) => pickDebutPressLine({
      playerId: `player-${index}`,
      playerName: `Player ${index}`,
      teamName: 'New York Tycoons',
      season: 20 + (index % 10),
      branch: (['top_prospect_debut', 'international_debut', 'sept_callup', 'veteran_journeyman_debut', 'standard_debut'] as const)[index % 5]!,
    })],
  ] as const)('spreads %s variants across synthetic stable keys', (_label, render) => {
    const outputs = new Set(Array.from({ length: 100 }, (_, index) => render(index)));

    expect(outputs.size).toBeGreaterThanOrEqual(8);
  });
});
