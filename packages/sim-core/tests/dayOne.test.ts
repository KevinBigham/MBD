import { describe, expect, it } from 'vitest';
import {
  buildDayOneOrgReview,
  buildDayOneImpacts,
  buildDayOneNarrativePack,
  buildDayOneTeaser,
  buildDayOneTeamCard,
  buildOpeningDayPlan,
  createGameRNG,
  createSeasonState,
  GameRNG,
  generateLeaguePlayers,
  pickDayOneCrisis,
  simulateDay,
  TEAMS,
} from '../src/index.js';
import type { GeneratedPlayer } from '../src/player/generation.js';

function makePlayer(overrides: Partial<GeneratedPlayer>): GeneratedPlayer {
  return {
    id: overrides.id ?? 'player-1',
    firstName: overrides.firstName ?? 'Player',
    lastName: overrides.lastName ?? 'One',
    age: overrides.age ?? 26,
    position: overrides.position ?? 'CF',
    hitterAttributes: overrides.hitterAttributes ?? {
      contact: 60,
      power: 60,
      eye: 55,
      speed: 50,
      defense: 55,
    },
    pitcherAttributes: overrides.pitcherAttributes ?? null,
    overallRating: overrides.overallRating ?? 330,
    personality: overrides.personality ?? 'captain',
    salaryDemand: overrides.salaryDemand ?? 5,
    teamId: overrides.teamId ?? 'nym',
    rosterStatus: overrides.rosterStatus ?? 'MLB',
    minorLeagueLevel: overrides.minorLeagueLevel ?? null,
    contract: overrides.contract ?? {
      annualSalary: 5,
      years: 2,
      signingBonus: 0,
      teamOption: false,
      noTradeClause: false,
      noTradeTeams: [],
    },
    developmentPhase: overrides.developmentPhase ?? 'prime',
    nationality: overrides.nationality ?? 'american',
    serviceTimeDays: overrides.serviceTimeDays ?? 0,
    optionYearsUsed: overrides.optionYearsUsed ?? 0,
    isOutOfOptions: overrides.isOutOfOptions ?? false,
    rule5EligibleAfterSeason: overrides.rule5EligibleAfterSeason ?? 3,
    ceiling: overrides.ceiling ?? 360,
    floor: overrides.floor ?? 280,
    developmentProgram: overrides.developmentProgram ?? 'mlb_prep',
    developmentTrajectory: overrides.developmentTrajectory ?? 'on_track',
    extensionHistory: overrides.extensionHistory ?? [],
    personalityTraits: overrides.personalityTraits ?? [],
  };
}

describe('day one helpers', () => {
  it('builds a team card with archetype and authored hook metadata', () => {
    const teamCard = buildDayOneTeamCard({
      teamId: 'nym',
      projectedRecord: '89-73',
      payrollTier: 'Premier',
      farmSystemRating: 'B+',
      strengths: ['middle-of-order thump'],
      weaknesses: ['rotation depth'],
      topPlayers: [],
      divisionRivals: [],
    });

    expect(teamCard.archetype).toBeTruthy();
    expect(teamCard.franchiseHook.length).toBeGreaterThan(10);
    expect(teamCard.whyNow.length).toBeGreaterThan(10);
  });

  it('derives a deterministic opening day plan from the current MLB roster', () => {
    const players = [
      makePlayer({ id: 'h1', position: 'CF', overallRating: 360 }),
      makePlayer({ id: 'h2', position: 'SS', overallRating: 355 }),
      makePlayer({ id: 'h3', position: '1B', overallRating: 350 }),
      makePlayer({ id: 'h4', position: 'LF', overallRating: 345 }),
      makePlayer({ id: 'h5', position: 'RF', overallRating: 340 }),
      makePlayer({ id: 'h6', position: '2B', overallRating: 335 }),
      makePlayer({ id: 'h7', position: '3B', overallRating: 330 }),
      makePlayer({ id: 'h8', position: 'C', overallRating: 325 }),
      makePlayer({ id: 'h9', position: 'DH', overallRating: 320 }),
      makePlayer({
        id: 'sp1',
        position: 'SP',
        overallRating: 360,
        pitcherAttributes: { stuff: 65, movement: 60, control: 58, stamina: 70 },
      }),
      makePlayer({
        id: 'sp2',
        position: 'SP',
        overallRating: 350,
        pitcherAttributes: { stuff: 62, movement: 59, control: 55, stamina: 68 },
      }),
      makePlayer({
        id: 'sp3',
        position: 'SP',
        overallRating: 340,
        pitcherAttributes: { stuff: 60, movement: 57, control: 54, stamina: 66 },
      }),
      makePlayer({
        id: 'sp4',
        position: 'SP',
        overallRating: 330,
        pitcherAttributes: { stuff: 58, movement: 56, control: 53, stamina: 64 },
      }),
      makePlayer({
        id: 'sp5',
        position: 'SP',
        overallRating: 320,
        pitcherAttributes: { stuff: 56, movement: 54, control: 52, stamina: 62 },
      }),
      makePlayer({
        id: 'rp1',
        position: 'CL',
        overallRating: 340,
        pitcherAttributes: { stuff: 65, movement: 60, control: 62, stamina: 28 },
      }),
      makePlayer({
        id: 'rp2',
        position: 'RP',
        overallRating: 332,
        pitcherAttributes: { stuff: 61, movement: 58, control: 57, stamina: 32 },
      }),
      makePlayer({
        id: 'rp3',
        position: 'RP',
        overallRating: 328,
        pitcherAttributes: { stuff: 60, movement: 56, control: 58, stamina: 34 },
      }),
      makePlayer({
        id: 'rp4',
        position: 'RP',
        overallRating: 321,
        pitcherAttributes: { stuff: 58, movement: 55, control: 54, stamina: 40 },
      }),
    ];

    const plan = buildOpeningDayPlan(players, {
      seasonGoal: 'playoff',
      budgetAllocation: 'future_flex',
      developmentStyle: 'patient',
      promotionStance: 'measured',
    });

    expect(plan.lineupPlayerIds).toHaveLength(9);
    expect(plan.rotationPlayerIds).toEqual(['sp1', 'sp2', 'sp3', 'sp4', 'sp5']);
    expect(plan.bullpen?.closerId).toBe('rp1');
  });

  it('picks a roster crisis from the team pressure point and builds projected impacts', () => {
    const crisis = pickDayOneCrisis({
      teamId: 'nym',
      projectedWins: 88,
      biggestWeakness: 'shallow bullpen',
      topProspectName: 'Rafael Reyes',
      agmId: 'marcus_chen',
      seasonGoal: 'playoff',
      budgetAllocation: 'future_flex',
      developmentStyle: 'patient',
      promotionStance: 'measured',
    });

    const impacts = buildDayOneImpacts({
      teamId: 'nym',
      seasonGoal: 'playoff',
      budgetAllocation: 'future_flex',
      developmentStyle: 'patient',
      promotionStance: 'measured',
      crisisType: crisis.type,
      agmId: 'marcus_chen',
    });

    expect(crisis.type).toBe('bullpen_instability');
    expect(crisis.responseOptions.length).toBeGreaterThan(1);
    expect(impacts.map((impact) => impact.label)).toContain('Deadline Flexibility');
    expect(impacts.some((impact) => /April|room|market|deadline/i.test(impact.summary))).toBe(true);
  });

  it('builds bespoke flagship narrative packs and systemic fallback packs deterministically', () => {
    const flagshipPack = buildDayOneNarrativePack({
      teamId: 'nym',
      teamName: 'New York Tycoons',
      marketSize: 'large',
      archetype: 'Empire Under Pressure',
      projectedWins: 91,
      topWeakness: 'bullpen stability',
      topProspectName: 'Rafael Reyes',
      agmId: 'marcus_chen',
      seasonGoal: 'playoff',
      budgetAllocation: 'balanced',
      developmentStyle: 'balanced',
      promotionStance: 'measured',
      crisisType: 'bullpen_instability',
    });
    const fallbackPack = buildDayOneNarrativePack({
      teamId: 'phi',
      teamName: 'Philadelphia Liberty Bells',
      marketSize: 'large',
      archetype: 'Blue-Collar Contender',
      projectedWins: 86,
      topWeakness: 'rotation depth',
      topProspectName: 'Dario Soto',
      agmId: 'walt_kowalski',
      seasonGoal: 'playoff',
      budgetAllocation: 'spend_now',
      developmentStyle: 'aggressive',
      promotionStance: 'aggressive',
      crisisType: 'rotation_hole',
    });

    expect(flagshipPack.owner.summary).toMatch(/pressure|city|October/i);
    expect(flagshipPack.agmPitches.marcus_chen).toMatch(/market|numbers|October|pressure/i);
    expect(flagshipPack.crisis.title).toBeTruthy();
    expect(fallbackPack.owner.summary).toMatch(/Liberty Bells|club|franchise/i);
    expect(fallbackPack.agmPitches.walt_kowalski).toBeTruthy();
    expect(fallbackPack.teaser.aprilWatchItems).toHaveLength(3);
  });

  it('projects a zero-sum 32-team win distribution for Day One org reviews', () => {
    const players = generateLeaguePlayers(new GameRNG(2124), TEAMS.map((team) => team.id));
    const wins = TEAMS.map((team) => buildDayOneOrgReview(players, team.id).projectedWins);

    expect(wins.reduce((sum, value) => sum + value, 0)).toBe(TEAMS.length * 81);
    expect(Math.max(...wins)).toBeGreaterThanOrEqual(94);
    expect(Math.min(...wins)).toBeLessThanOrEqual(70);
    expect(wins.filter((winTotal) => winTotal > 81).length).toBeGreaterThanOrEqual(10);
    expect(wins.filter((winTotal) => winTotal < 81).length).toBeGreaterThanOrEqual(10);
  });

  it('builds deterministic teaser copy from the same team and Day One choices', () => {
    const context = {
      teamId: 'hou',
      teamName: 'Houston Space Cowboys',
      marketSize: 'large' as const,
      archetype: 'Win-Now Machine',
      projectedWins: 94,
      topWeakness: 'bullpen stability',
      topProspectName: 'Emilio Pena',
      agmId: 'elena_vargas' as const,
      seasonGoal: 'championship' as const,
      budgetAllocation: 'spend_now' as const,
      developmentStyle: 'balanced' as const,
      promotionStance: 'measured' as const,
      crisisType: 'bullpen_instability' as const,
      crisisResponseId: 'lock_closer',
    };

    const first = buildDayOneTeaser(context);
    const second = buildDayOneTeaser(context);

    expect(first).toEqual(second);
    expect(first.headline).toBeTruthy();
    expect(first.agmReaction).toMatch(/April|room|season|club/i);
    expect(first.aprilWatchItems).toHaveLength(3);
    expect(first.openingDayPrompt).toBeTruthy();
  });

  it('applies the persisted opening day plan to the live season simulation', () => {
    const homePlayers = [
      makePlayer({ id: 'h1', teamId: 'nym', position: 'C', overallRating: 360 }),
      makePlayer({ id: 'h2', teamId: 'nym', position: '1B', overallRating: 355 }),
      makePlayer({ id: 'h3', teamId: 'nym', position: '2B', overallRating: 350 }),
      makePlayer({ id: 'h4', teamId: 'nym', position: '3B', overallRating: 345 }),
      makePlayer({ id: 'h5', teamId: 'nym', position: 'SS', overallRating: 340 }),
      makePlayer({ id: 'h6', teamId: 'nym', position: 'LF', overallRating: 335 }),
      makePlayer({ id: 'h7', teamId: 'nym', position: 'CF', overallRating: 330 }),
      makePlayer({ id: 'h8', teamId: 'nym', position: 'RF', overallRating: 325 }),
      makePlayer({ id: 'h9', teamId: 'nym', position: 'DH', overallRating: 320 }),
      makePlayer({ id: 'h10', teamId: 'nym', position: 'LF', overallRating: 280 }),
      makePlayer({
        id: 'sp1',
        teamId: 'nym',
        position: 'SP',
        overallRating: 360,
        pitcherAttributes: { stuff: 64, movement: 60, control: 58, stamina: 71 },
      }),
      makePlayer({
        id: 'sp2',
        teamId: 'nym',
        position: 'SP',
        overallRating: 350,
        pitcherAttributes: { stuff: 62, movement: 58, control: 56, stamina: 69 },
      }),
      makePlayer({
        id: 'sp3',
        teamId: 'nym',
        position: 'SP',
        overallRating: 340,
        pitcherAttributes: { stuff: 60, movement: 57, control: 55, stamina: 67 },
      }),
      makePlayer({
        id: 'sp4',
        teamId: 'nym',
        position: 'SP',
        overallRating: 330,
        pitcherAttributes: { stuff: 58, movement: 55, control: 54, stamina: 65 },
      }),
      makePlayer({
        id: 'sp5',
        teamId: 'nym',
        position: 'SP',
        overallRating: 290,
        pitcherAttributes: { stuff: 54, movement: 52, control: 51, stamina: 63 },
      }),
      makePlayer({
        id: 'rp1',
        teamId: 'nym',
        position: 'CL',
        overallRating: 325,
        pitcherAttributes: { stuff: 60, movement: 57, control: 58, stamina: 28 },
      }),
      makePlayer({
        id: 'rp2',
        teamId: 'nym',
        position: 'RP',
        overallRating: 320,
        pitcherAttributes: { stuff: 58, movement: 56, control: 54, stamina: 32 },
      }),
      makePlayer({
        id: 'rp3',
        teamId: 'nym',
        position: 'RP',
        overallRating: 315,
        pitcherAttributes: { stuff: 57, movement: 55, control: 53, stamina: 34 },
      }),
    ];
    const awayPlayers = [
      makePlayer({ id: 'a1', teamId: 'bos', position: 'C', overallRating: 340 }),
      makePlayer({ id: 'a2', teamId: 'bos', position: '1B', overallRating: 338 }),
      makePlayer({ id: 'a3', teamId: 'bos', position: '2B', overallRating: 336 }),
      makePlayer({ id: 'a4', teamId: 'bos', position: '3B', overallRating: 334 }),
      makePlayer({ id: 'a5', teamId: 'bos', position: 'SS', overallRating: 332 }),
      makePlayer({ id: 'a6', teamId: 'bos', position: 'LF', overallRating: 330 }),
      makePlayer({ id: 'a7', teamId: 'bos', position: 'CF', overallRating: 328 }),
      makePlayer({ id: 'a8', teamId: 'bos', position: 'RF', overallRating: 326 }),
      makePlayer({ id: 'a9', teamId: 'bos', position: 'DH', overallRating: 324 }),
      makePlayer({
        id: 'asp1',
        teamId: 'bos',
        position: 'SP',
        overallRating: 345,
        pitcherAttributes: { stuff: 62, movement: 58, control: 56, stamina: 69 },
      }),
      makePlayer({
        id: 'arp1',
        teamId: 'bos',
        position: 'CL',
        overallRating: 320,
        pitcherAttributes: { stuff: 59, movement: 56, control: 55, stamina: 27 },
      }),
      makePlayer({
        id: 'arp2',
        teamId: 'bos',
        position: 'RP',
        overallRating: 318,
        pitcherAttributes: { stuff: 57, movement: 55, control: 54, stamina: 31 },
      }),
    ];

    const plan = {
      lineupPlayerIds: ['h1', 'h10', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9'],
      rotationPlayerIds: ['sp5', 'sp1', 'sp2', 'sp3', 'sp4'],
      bullpen: {
        closerId: 'rp1',
        setupIds: ['rp2'],
        longReliefId: 'rp3',
      },
    };

    const { newState } = simulateDay(
      createGameRNG(17),
      createSeasonState(1, ['nym', 'bos']),
      [{ day: 1, homeTeamId: 'nym', awayTeamId: 'bos' }],
      [...homePlayers, ...awayPlayers],
      {
        openingDayPlans: new Map([['nym', plan]]),
      },
    );

    expect(newState.playerSeasonStats.has('sp5')).toBe(true);
    expect(newState.playerSeasonStats.has('h10')).toBe(true);
    expect(newState.playerSeasonStats.has('h2')).toBe(false);
  });
});
