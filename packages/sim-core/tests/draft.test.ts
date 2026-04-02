import { describe, it, expect } from 'vitest';
import {
  GameRNG,
  generateTeamRoster,
  generateDraftClass,
  rankProspects,
  determineDraftOrder,
  aiSelectPick,
  evaluateTeamNeeds,
  simulateFullDraft,
  DRAFT_CLASS_SIZE,
  DRAFT_ROUNDS,
  NUM_TEAMS,
  ALL_POSITIONS,
  TEAMS,
  scoutDraftProspect,
  resolveDraftSigning,
  createDefaultDraftPickOwnership,
  tradeDraftPickOwnership,
  awardCompensatoryPick,
  buildDraftPickSlots,
  forfeitHighestEligiblePick,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateDraftClass', () => {
  it('creates a 750-player draft and udfa pool seed class', () => {
    const rng = new GameRNG(42);
    const draftClass = generateDraftClass(rng, 1);
    expect(draftClass.prospects.length).toBe(DRAFT_CLASS_SIZE);
    expect(draftClass.season).toBe(1);
  });

  it('all prospects have valid positions and attributes', () => {
    const rng = new GameRNG(99);
    const draftClass = generateDraftClass(rng, 2);
    const validPositions = new Set(ALL_POSITIONS);
    for (const prospect of draftClass.prospects) {
      expect(validPositions.has(prospect.player.position)).toBe(true);
      expect(prospect.scoutingGrade).toBeGreaterThanOrEqual(20);
      expect(prospect.scoutingGrade).toBeLessThanOrEqual(80);
      expect(prospect.signability).toBeGreaterThanOrEqual(0);
      expect(prospect.signability).toBeLessThanOrEqual(1);
      expect(prospect.player.id).toBeTruthy();
    }
  });

  it('uses a realistic pitcher-heavy mix with college and prep demographics', () => {
    const rng = new GameRNG(2026);
    const draftClass = generateDraftClass(rng, 3);
    const pitchers = draftClass.prospects.filter((prospect) => ['SP', 'RP', 'CL'].includes(prospect.player.position));
    const pitcherShare = pitchers.length / draftClass.prospects.length;
    const backgrounds = new Set(draftClass.prospects.map((prospect) => prospect.background));

    expect(pitcherShare).toBeGreaterThan(0.48);
    expect(pitcherShare).toBeLessThan(0.62);
    expect(backgrounds).toEqual(new Set(['college_senior', 'college_underclass', 'high_school']));
    expect(draftClass.prospects.every((prospect) => prospect.background !== 'international')).toBe(true);
  });
});

describe('rankProspects', () => {
  it('sorts by scouting grade descending', () => {
    const rng = new GameRNG(42);
    const draftClass = generateDraftClass(rng, 1);
    const ranked = rankProspects(draftClass.prospects);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.scoutingGrade).toBeGreaterThanOrEqual(ranked[i]!.scoutingGrade);
    }
  });
});

describe('determineDraftOrder', () => {
  it('puts worst team first', () => {
    const records = [
      { teamId: 'NYY', wins: 95, losses: 67 },
      { teamId: 'PIT', wins: 55, losses: 107 },
      { teamId: 'LAD', wins: 100, losses: 62 },
    ];
    const order = determineDraftOrder(records);
    expect(order[0]).toBe('PIT');
    expect(order[order.length - 1]).toBe('LAD');
  });
});

describe('aiSelectPick', () => {
  it('returns a valid prospect from the available pool', () => {
    const rng1 = new GameRNG(42);
    const draftClass = generateDraftClass(rng1, 1);
    const rng2 = new GameRNG(42);
    const teamRoster = generateTeamRoster(rng2, 'NYY');
    const rng3 = new GameRNG(100);
    const pick = aiSelectPick(rng3, 'NYY', draftClass.prospects, teamRoster);
    expect(pick).toBeTruthy();
    expect(pick.player.id).toBeTruthy();
    // Should be one of the available prospects
    const ids = draftClass.prospects.map((p) => p.player.id);
    expect(ids).toContain(pick.player.id);
  });
});

describe('evaluateTeamNeeds', () => {
  it('returns needs for all positions', () => {
    const rng = new GameRNG(42);
    const roster = generateTeamRoster(rng, 'NYY');
    const needs = evaluateTeamNeeds(roster);
    expect(needs.size).toBeGreaterThan(0);
    for (const [pos, score] of needs) {
      expect(typeof pos).toBe('string');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('simulateFullDraft', () => {
  it('produces 640 standard picks before compensatory supplements', () => {
    const rng1 = new GameRNG(42);
    const draftClass = generateDraftClass(rng1, 1);

    // Build draft order: just use TEAMS in reverse as a simple ordering
    const draftOrder = TEAMS.map((t) => t.id);

    // Build minimal rosters for each team
    const teamRosters = new Map<string, any[]>();
    for (const team of TEAMS) {
      teamRosters.set(team.id, []);
    }

    const rng2 = new GameRNG(99);
    const result = simulateFullDraft(rng2, draftClass, draftOrder, teamRosters, 'NYY');

    expect(result.picks.length).toBe(DRAFT_ROUNDS * NUM_TEAMS);
    expect(result.undrafted.length).toBe(DRAFT_CLASS_SIZE - (DRAFT_ROUNDS * NUM_TEAMS));
  });

  it('all drafted players assigned to teams', () => {
    const rng1 = new GameRNG(42);
    const draftClass = generateDraftClass(rng1, 1);
    const draftOrder = TEAMS.map((t) => t.id);
    const teamRosters = new Map<string, any[]>();
    for (const team of TEAMS) {
      teamRosters.set(team.id, []);
    }
    const rng2 = new GameRNG(99);
    const result = simulateFullDraft(rng2, draftClass, draftOrder, teamRosters, 'NYY');
    for (const pick of result.picks) {
      expect(pick.teamId).toBeTruthy();
      expect(pick.prospect.player.teamId).toBe(pick.teamId);
    }
  });
});

describe('draft determinism', () => {
  it('same seed produces identical draft results', () => {
    const rng1a = new GameRNG(42);
    const dc1 = generateDraftClass(rng1a, 1);
    const rng1b = new GameRNG(42);
    const dc2 = generateDraftClass(rng1b, 1);
    expect(dc1.prospects.length).toBe(dc2.prospects.length);
    for (let i = 0; i < dc1.prospects.length; i++) {
      expect(dc1.prospects[i]!.scoutingGrade).toBe(dc2.prospects[i]!.scoutingGrade);
    }
  });
});

describe('draft scouting', () => {
  it('tightens scouting error after multiple looks', () => {
    const classRng = new GameRNG(44);
    const draftClass = generateDraftClass(classRng, 2);
    const prospect = draftClass.prospects[0]!;
    const scoutRng = new GameRNG(145);

    const firstLook = scoutDraftProspect(scoutRng.fork(), prospect, 0.62);
    const thirdLook = scoutDraftProspect(scoutRng.fork(), prospect, 0.62, firstLook);
    const trueDisplay = Math.round((prospect.player.overallRating / 550) * 60 + 20);

    expect(firstLook.looks).toBe(1);
    expect(thirdLook.looks).toBe(2);
    expect(Math.abs(thirdLook.overallGrade - trueDisplay)).toBeLessThanOrEqual(
      Math.abs(firstLook.overallGrade - trueDisplay),
    );
  });
});

describe('draft signability', () => {
  it('always signs college seniors', () => {
    const rng = new GameRNG(99);
    const draftClass = generateDraftClass(rng, 5);
    const senior = draftClass.prospects.find((prospect) => prospect.background === 'college_senior');
    expect(senior).toBeTruthy();

    const result = resolveDraftSigning(new GameRNG(15), senior!, senior!.slotValue * 0.6);
    expect(result.signed).toBe(true);
  });

  it('allows strong-commitment high schoolers to reject under-slot offers', () => {
    const rng = new GameRNG(121);
    const draftClass = generateDraftClass(rng, 5);
    const prep = draftClass.prospects.find(
      (prospect) => prospect.background === 'high_school' && prospect.commitmentStrength >= 0.75,
    );
    expect(prep).toBeTruthy();

    const result = resolveDraftSigning(new GameRNG(33), prep!, prep!.askBonus * 0.7);
    expect(result.signed).toBe(false);
    expect(result.returnPath).toBe('college');
  });
});

describe('draft pick ownership and compensation', () => {
  it('creates current and next-year ownership for every team and round', () => {
    const ownership = createDefaultDraftPickOwnership(TEAMS.map((team) => team.id), 4);
    expect(ownership.length).toBe(TEAMS.length * DRAFT_ROUNDS * 2);
    expect(
      ownership.some((pick) => pick.season === 4 && pick.round === 1 && pick.originalTeamId === 'nyy'),
    ).toBe(true);
    expect(
      ownership.some((pick) => pick.season === 5 && pick.round === 20 && pick.originalTeamId === 'bos'),
    ).toBe(true);
  });

  it('supports draft-pick trades for current and next-year picks', () => {
    const ownership = createDefaultDraftPickOwnership(TEAMS.map((team) => team.id), 7);
    const traded = tradeDraftPickOwnership(
      ownership,
      { season: 8, round: 2, originalTeamId: 'bos' },
      'nyy',
    );

    expect(
      traded.find((pick) => pick.season === 8 && pick.round === 2 && pick.originalTeamId === 'bos')?.currentTeamId,
    ).toBe('nyy');
  });

  it('inserts compensatory picks between the first and second rounds', () => {
    const ownership = createDefaultDraftPickOwnership(TEAMS.map((team) => team.id), 9);
    const compensatory = awardCompensatoryPick([], {
      season: 9,
      awardedToTeamId: 'pit',
      compensationForPlayerId: 'fa-1',
      compensationFromTeamId: 'nyy',
      order: 1,
    });
    const draftSlots = buildDraftPickSlots(determineDraftOrder([
      { teamId: 'pit', wins: 60, losses: 102 },
      { teamId: 'bos', wins: 70, losses: 92 },
      { teamId: 'nyy', wins: 90, losses: 72 },
      ...TEAMS
        .filter((team) => !['pit', 'bos', 'nyy'].includes(team.id))
        .map((team, index) => ({ teamId: team.id, wins: 71 + index, losses: 91 - index })),
    ]), ownership, compensatory, 9);

    const firstRoundEnd = NUM_TEAMS;
    expect(draftSlots[firstRoundEnd]?.kind).toBe('compensatory');
    expect(draftSlots[firstRoundEnd]?.teamId).toBe('pit');
    expect(draftSlots[firstRoundEnd + 1]?.round).toBe(2);
  });

  it('forfeits the highest eligible non-protected pick when a team signs a qualified free agent', () => {
    const ownership = createDefaultDraftPickOwnership(TEAMS.map((team) => team.id), 11);
    const standingsOrder = determineDraftOrder([
      { teamId: 'pit', wins: 50, losses: 112 },
      { teamId: 'bos', wins: 65, losses: 97 },
      { teamId: 'nyy', wins: 88, losses: 74 },
      ...TEAMS
        .filter((team) => !['pit', 'bos', 'nyy'].includes(team.id))
        .map((team, index) => ({ teamId: team.id, wins: 66 + index, losses: 96 - index })),
    ]);

    const forfeiture = forfeitHighestEligiblePick(ownership, standingsOrder, 'pit', 11);
    expect(forfeiture.forfeitedPick?.round).toBe(2);
    expect(forfeiture.forfeitedPick?.originalTeamId).toBe('pit');
  });
});
