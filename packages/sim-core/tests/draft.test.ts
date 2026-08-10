import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  GameRNG,
  generateTeamRoster,
  generateDraftClass,
  type DraftProspect,
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
import {
  aiSelectPickDetailed,
  getOrganizationDraftProfile,
  scoreDraftCandidate,
} from '../src/draft/index.js';
import { aiSelectPick as detailedPathSelect } from '../src/draft/draftAI.js';

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

  it('does not mutate the source prospect records when re-ranking', () => {
    const rng = new GameRNG(52);
    const [first, second, third] = generateDraftClass(rng, 2).prospects.slice(0, 3);
    const prospects: DraftProspect[] = [first!, second!, third!].map((prospect, index) => ({
      ...prospect,
      scoutingGrade: 60,
      positionRank: 0,
      draftRound: 0,
      consensusRank: index + 10,
      player: {
        ...prospect.player,
        id: `rank-prospect-${index + 1}`,
      },
    }));
    const snapshot = prospects.map((prospect) => ({
      ...prospect,
      player: { ...prospect.player },
    }));

    rankProspects(prospects);

    expect(prospects).toEqual(snapshot);
  });

  it('breaks tied scouting grades deterministically regardless of input order', () => {
    const rng = new GameRNG(53);
    const [first, second, third] = generateDraftClass(rng, 3).prospects.slice(0, 3);
    const prospects: DraftProspect[] = [first!, second!, third!].map((prospect, index) => ({
      ...prospect,
      scoutingGrade: 65,
      positionRank: 0,
      draftRound: 0,
      consensusRank: index + 1,
      player: {
        ...prospect.player,
        id: `tied-prospect-${index + 1}`,
      },
    }));

    const forward = rankProspects(prospects);
    const reversed = rankProspects([...prospects].reverse());

    expect(forward.map((prospect) => prospect.player.id)).toEqual(
      reversed.map((prospect) => prospect.player.id),
    );
  });
});

describe('determineDraftOrder', () => {
  it('puts worst team first', () => {
    const records = [
      { teamId: 'NYT', wins: 95, losses: 67 },
      { teamId: 'PIT', wins: 55, losses: 107 },
      { teamId: 'LAX', wins: 100, losses: 62 },
    ];
    const order = determineDraftOrder(records);
    expect(order[0]).toBe('PIT');
    expect(order[order.length - 1]).toBe('LAX');
  });
});

describe('aiSelectPick', () => {
  it('keeps the compact worker selector in parity with the public policy selector', () => {
    const prospects = generateDraftClass(new GameRNG(2041), 12).prospects.slice(0, 24);
    const roster = generateTeamRoster(new GameRNG(2042), 'NYT');
    for (const [seed, teamId] of [[2043, 'NYT'], [2044, 'PIT'], [2045, 'SFB']] as const) {
      expect(aiSelectPick(new GameRNG(seed), teamId, prospects, roster).player.id)
        .toBe(detailedPathSelect(new GameRNG(seed), teamId, prospects, roster).player.id);
    }
  });

  it('returns a valid prospect from the available pool', () => {
    const rng1 = new GameRNG(42);
    const draftClass = generateDraftClass(rng1, 1);
    const rng2 = new GameRNG(42);
    const teamRoster = generateTeamRoster(rng2, 'NYT');
    const rng3 = new GameRNG(100);
    const pick = aiSelectPick(rng3, 'NYT', draftClass.prospects, teamRoster);
    expect(pick).toBeTruthy();
    expect(pick.player.id).toBeTruthy();
    // Should be one of the available prospects
    const ids = draftClass.prospects.map((p) => p.player.id);
    expect(ids).toContain(pick.player.id);
  });

  it('breaks equal-score choices deterministically regardless of available order', () => {
    const prospects = generateDraftClass(new GameRNG(143), 6).prospects.slice(0, 4)
      .map((prospect, index) => ({
        ...prospect,
        scoutingGrade: 60,
        signability: 0.7,
        player: {
          ...prospect.player,
          id: `equal-score-prospect-${index + 1}`,
          position: 'SS' as const,
        },
      }));
    const teamRoster = generateTeamRoster(new GameRNG(144), 'NYT')
      .filter((player) => player.position !== 'SS');

    const forwardPick = aiSelectPick(new GameRNG(145), 'NYT', prospects, teamRoster);
    const reversePick = aiSelectPick(new GameRNG(145), 'NYT', [...prospects].reverse(), teamRoster);

    expect(reversePick.player.id).toBe(forwardPick.player.id);
  });

  it('uses deterministic organization draft tendencies without changing the prospect pool', () => {
    const prospects = generateDraftClass(new GameRNG(2031), 12).prospects.slice(0, 3)
      .map((prospect, index) => {
        const profiles = [
          {
            id: 'safe-college-shortstop',
            background: 'college_senior' as const,
            scoutingGrade: 60,
            signability: 0.95,
            overallRating: 260,
            ceiling: 315,
          },
          {
            id: 'upside-prep-shortstop',
            background: 'high_school' as const,
            scoutingGrade: 61,
            signability: 0.45,
            overallRating: 235,
            ceiling: 405,
          },
          {
            id: 'balanced-underclass-shortstop',
            background: 'college_underclass' as const,
            scoutingGrade: 60,
            signability: 0.7,
            overallRating: 250,
            ceiling: 350,
          },
        ] as const;
        const profile = profiles[index]!;
        return {
          ...prospect,
          background: profile.background,
          collegeOrHS: profile.background,
          commitmentStrength: profile.background === 'high_school' ? 0.85 : 0.25,
          scoutingGrade: profile.scoutingGrade,
          signability: profile.signability,
          player: {
            ...prospect.player,
            id: profile.id,
            position: 'SS' as const,
            overallRating: profile.overallRating,
            ceiling: profile.ceiling,
            potentialRating: profile.ceiling,
          },
        };
      });
    const originalProspects = prospects.map((prospect) => ({
      id: prospect.player.id,
      scoutingGrade: prospect.scoutingGrade,
      signability: prospect.signability,
      background: prospect.background,
      ceiling: prospect.player.ceiling,
    }));
    const teamRoster = generateTeamRoster(new GameRNG(2032), 'pit')
      .filter((player) => player.position !== 'SS');

    const upsidePick = aiSelectPick(new GameRNG(2033), 'pit', prospects, teamRoster);
    const safePick = aiSelectPick(new GameRNG(2033), 'sfb', prospects, teamRoster);

    expect(upsidePick.player.id).toBe('upside-prep-shortstop');
    expect(safePick.player.id).toBe('safe-college-shortstop');
    expect(prospects.map((prospect) => ({
      id: prospect.player.id,
      scoutingGrade: prospect.scoutingGrade,
      signability: prospect.signability,
      background: prospect.background,
      ceiling: prospect.player.ceiling,
    }))).toEqual(originalProspects);
  });

  it('does not change semantic scoring or selection when hidden talent changes', () => {
    const prospects = generateDraftClass(new GameRNG(2034), 12).prospects.slice(0, 3).map((prospect, index) => ({
      ...prospect,
      player: { ...prospect.player, id: `visible-only-${index}`, position: 'SS' as const },
      scoutingGrade: 60 + index,
      signability: 0.7,
    }));
    const hiddenChanged = prospects.map((prospect, index) => ({
      ...prospect,
      player: { ...prospect.player, overallRating: 100 + index * 100, potentialRating: 550 - index * 100, ceiling: index === 0 ? 20 : 550 },
    }));
    const roster = generateTeamRoster(new GameRNG(2035), 'pit').filter((player) => player.position !== 'SS');
    const first = aiSelectPickDetailed(new GameRNG(2036), 'pit', prospects, roster);
    const second = aiSelectPickDetailed(new GameRNG(2036), 'pit', hiddenChanged, roster);
    expect(second.prospect.player.id).toBe(first.prospect.player.id);
    expect(second.breakdown).toEqual(first.breakdown);
  });

  it('exposes bounded, finite, pure visible scoring with a deterministic fallback profile', () => {
    const profile = getOrganizationDraftProfile('unknown-team');
    const candidate = {
      playerId: 'candidate', position: 'SS' as const, age: 18, scoutingGrade: 80,
      signability: 0, background: 'high_school' as const,
    };
    const before = { ...candidate };
    const breakdown = scoreDraftCandidate(profile, candidate, new Map([['SS', 100]]));
    expect(profile.id).toBe('balanced');
    expect(Number.isFinite(breakdown.scoreBeforeTiebreak)).toBe(true);
    expect(Math.abs(breakdown.profileAdjustment)).toBeLessThanOrEqual(8);
    expect(candidate).toEqual(before);
  });

  it('keeps visible score components finite and profile adjustment bounded for generated boards', () => {
    const profile = getOrganizationDraftProfile('pit');
    const positionArbitrary = fc.constantFrom(...ALL_POSITIONS);
    const backgroundArbitrary = fc.constantFrom('college_senior' as const, 'college_underclass' as const, 'high_school' as const);
    fc.assert(fc.property(
      fc.record({
        playerId: fc.string({ minLength: 1, maxLength: 20 }),
        position: positionArbitrary,
        age: fc.integer({ min: 17, max: 24 }),
        scoutingGrade: fc.integer({ min: 20, max: 80 }),
        signability: fc.double({ min: 0, max: 1, noNaN: true }),
        background: backgroundArbitrary,
      }),
      (candidate) => {
        const result = scoreDraftCandidate(profile, candidate, new Map([['SS', 70], ['SP', 40]]));
        return Object.values(result).every((value) => typeof value !== 'number' || Number.isFinite(value))
          && Math.abs(result.profileAdjustment) <= 8;
      },
    ));
  });
});

describe('evaluateTeamNeeds', () => {
  it('returns needs for all positions', () => {
    const rng = new GameRNG(42);
    const roster = generateTeamRoster(rng, 'NYT');
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
    const result = simulateFullDraft(rng2, draftClass, draftOrder, teamRosters, 'NYT');

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
    const result = simulateFullDraft(rng2, draftClass, draftOrder, teamRosters, 'NYT');
    for (const pick of result.picks) {
      expect(pick.teamId).toBeTruthy();
      expect(pick.prospect.player.teamId).toBe(pick.teamId);
    }
  });

  it('does not mutate the source draft class prospects when teams make picks', () => {
    const rng = new GameRNG(142);
    const draftClass = generateDraftClass(rng, 6);
    const teamIds = TEAMS.map((team) => team.id);
    const draftOrder = [...teamIds];
    const teamRosters = new Map<string, any[]>();

    for (const teamId of teamIds) {
      teamRosters.set(teamId, []);
    }

    const originalTeamIds = new Map(
      draftClass.prospects.slice(0, 10).map((prospect) => [prospect.player.id, prospect.player.teamId]),
    );

    simulateFullDraft(new GameRNG(143), draftClass, draftOrder, teamRosters, 'nym');

    for (const prospect of draftClass.prospects.slice(0, 10)) {
      expect(prospect.player.teamId).toBe(originalTeamIds.get(prospect.player.id));
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
      ownership.some((pick) => pick.season === 4 && pick.round === 1 && pick.originalTeamId === 'nym'),
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
      'nym',
    );

    expect(
      traded.find((pick) => pick.season === 8 && pick.round === 2 && pick.originalTeamId === 'bos')?.currentTeamId,
    ).toBe('nym');
  });

  it('inserts compensatory picks between the first and second rounds', () => {
    const ownership = createDefaultDraftPickOwnership(TEAMS.map((team) => team.id), 9);
    const compensatory = awardCompensatoryPick([], {
      season: 9,
      awardedToTeamId: 'pit',
      compensationForPlayerId: 'fa-1',
      compensationFromTeamId: 'nym',
      order: 1,
    });
    const draftSlots = buildDraftPickSlots(determineDraftOrder([
      { teamId: 'pit', wins: 60, losses: 102 },
      { teamId: 'bos', wins: 70, losses: 92 },
      { teamId: 'nym', wins: 90, losses: 72 },
      ...TEAMS
        .filter((team) => !['pit', 'bos', 'nym'].includes(team.id))
        .map((team, index) => ({ teamId: team.id, wins: 71 + index, losses: 91 - index })),
    ]), ownership, compensatory, 9);

    const firstRoundEnd = NUM_TEAMS;
    expect(draftSlots[firstRoundEnd]?.kind).toBe('compensatory');
    expect(draftSlots[firstRoundEnd]?.teamId).toBe('pit');
    expect(draftSlots[firstRoundEnd + 1]?.round).toBe(2);
  });

  it('orders premium compensatory picks ahead of standard compensatory picks', () => {
    const compensatory = awardCompensatoryPick([
      {
        id: 'comp-standard',
        season: 9,
        awardedToTeamId: 'bos',
        compensationForPlayerId: 'fa-standard',
        compensationFromTeamId: 'nym',
        order: 100,
      },
    ], {
      season: 9,
      awardedToTeamId: 'pit',
      compensationForPlayerId: 'fa-premium',
      compensationFromTeamId: 'lax',
      priorityGroup: 'premium',
    });

    expect(compensatory[0]?.compensationForPlayerId).toBe('fa-premium');
    expect(compensatory[1]?.compensationForPlayerId).toBe('fa-standard');
  });

  it('forfeits the highest eligible non-protected pick when a team signs a qualified free agent', () => {
    const ownership = createDefaultDraftPickOwnership(TEAMS.map((team) => team.id), 11);
    const standingsOrder = determineDraftOrder([
      { teamId: 'pit', wins: 50, losses: 112 },
      { teamId: 'bos', wins: 65, losses: 97 },
      { teamId: 'nym', wins: 88, losses: 74 },
      ...TEAMS
        .filter((team) => !['pit', 'bos', 'nym'].includes(team.id))
        .map((team, index) => ({ teamId: team.id, wins: 66 + index, losses: 96 - index })),
    ]);

    const forfeiture = forfeitHighestEligiblePick(ownership, standingsOrder, 'pit', 11);
    expect(forfeiture.forfeitedPick?.round).toBe(2);
    expect(forfeiture.forfeitedPick?.originalTeamId).toBe('pit');
  });

  it('forfeits an acquired unprotected first-round pick before the signing club own second-round pick', () => {
    const standingsOrder = determineDraftOrder([
      { teamId: 'pit', wins: 50, losses: 112 },
      ...TEAMS
        .filter((team) => !['pit', 'wsh'].includes(team.id))
        .map((team, index) => ({ teamId: team.id, wins: 55 + index, losses: 107 - index })),
      { teamId: 'wsh', wins: 104, losses: 58 },
    ]);
    const ownership = tradeDraftPickOwnership(
      createDefaultDraftPickOwnership(TEAMS.map((team) => team.id), 12),
      { season: 12, round: 1, originalTeamId: 'wsh' },
      'pit',
    );

    const forfeiture = forfeitHighestEligiblePick(ownership, standingsOrder, 'pit', 12);

    expect(forfeiture.forfeitedPick).toMatchObject({
      round: 1,
      originalTeamId: 'wsh',
      currentTeamId: 'pit',
    });
    expect(forfeiture.pickOwnership.find((pick) => (
      pick.season === 12 && pick.round === 2 && pick.originalTeamId === 'pit'
    ))?.forfeited).toBe(false);
  });
});
