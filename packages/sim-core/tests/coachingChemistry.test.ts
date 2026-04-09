import { describe, expect, it } from 'vitest';
import type { Coach, GeneratedPlayer } from '../src/index.js';
import {
  calculateCoachPlayerAffinity,
  calculateCoachSynergy,
  calculateStaffHarmony,
  getCoachDevelopmentBonus,
  identifyChemistryIssues,
} from '../src/index.js';

type CoachWithTraits = Coach & { personalityTraits?: string[] };

function makeCoach(overrides: Partial<CoachWithTraits> = {}): CoachWithTraits {
  return {
    id: 'coach-1',
    firstName: 'Sam',
    lastName: 'Porter',
    role: 'hitting_coach',
    specialty: 'power',
    teachingAbility: 0.78,
    developmentBonus: 0.12,
    personalityFit: 0.82,
    experienceYears: 8,
    contractYears: 2,
    annualSalary: 2.1,
    teamId: 'kc',
    personalityTraits: ['Leader', 'Hard Worker'],
    ...overrides,
  };
}

function makePlayer(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  return {
    id: 'player-1',
    firstName: 'Eli',
    lastName: 'Vargas',
    age: 23,
    position: 'RF',
    hitterAttributes: {
      contact: 245,
      power: 280,
      eye: 220,
      speed: 205,
      defense: 210,
      durability: 240,
    },
    pitcherAttributes: null,
    personality: {
      workEthic: 82,
      mentalToughness: 70,
      leadership: 58,
      competitiveness: 74,
    },
    contract: {
      years: 1,
      annualSalary: 0.8,
      totalValue: 0.8,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    rosterStatus: 'AA',
    developmentPhase: 'Ascent',
    teamId: 'kc',
    nationality: 'american',
    overallRating: 285,
    rule5EligibleAfterSeason: 4,
    serviceTimeDays: 0,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: 'AA',
    ceiling: 360,
    floor: 240,
    developmentProgram: 'power',
    developmentTrajectory: 'on_track',
    extensionHistory: [],
    personalityTraits: ['Hard Worker', 'Leader'],
    potentialRating: 335,
    ...overrides,
  };
}

describe('coaching chemistry', () => {
  it('scores complementary specialties above overlapping specialties', () => {
    const baseCoach = makeCoach({ id: 'coach-a', specialty: 'power' });
    const complementary = calculateCoachSynergy(
      baseCoach,
      makeCoach({ id: 'coach-b', role: 'first_base_coach', specialty: 'speed' }),
    );
    const overlap = calculateCoachSynergy(
      baseCoach,
      makeCoach({ id: 'coach-c', role: 'bench_coach', specialty: 'power' }),
    );

    expect(complementary.synergyScore).toBeGreaterThan(overlap.synergyScore);
  });

  it('rewards similar teaching profiles', () => {
    const aligned = calculateCoachSynergy(
      makeCoach({ id: 'coach-a', teachingAbility: 0.74 }),
      makeCoach({ id: 'coach-b', teachingAbility: 0.81 }),
    );
    const misaligned = calculateCoachSynergy(
      makeCoach({ id: 'coach-c', teachingAbility: 0.35 }),
      makeCoach({ id: 'coach-d', teachingAbility: 0.95 }),
    );

    expect(aligned.synergyScore).toBeGreaterThan(misaligned.synergyScore);
  });

  it('returns the same synergy regardless of coach argument order', () => {
    const left = makeCoach({ id: 'coach-a', personalityTraits: ['Leader', 'Hard Worker'] });
    const right = makeCoach({ id: 'coach-b', personalityTraits: ['Leader', 'Team First'] });

    const forward = calculateCoachSynergy(left, right);
    const reverse = calculateCoachSynergy(right, left);

    expect(forward.synergyScore).toBe(reverse.synergyScore);
    expect(forward.factors).toEqual(reverse.factors);
  });

  it('rewards shared positive personality traits', () => {
    const synergy = calculateCoachSynergy(
      makeCoach({ id: 'coach-a', personalityTraits: ['Leader', 'Hard Worker'] }),
      makeCoach({ id: 'coach-b', personalityTraits: ['Leader', 'Team First'] }),
    );

    expect(synergy.factors.join(' ')).toMatch(/shared/i);
    expect(synergy.synergyScore).toBeGreaterThan(50);
  });

  it('penalizes trait conflicts like leader and diva', () => {
    const conflict = calculateCoachSynergy(
      makeCoach({ id: 'coach-a', personalityTraits: ['Leader'] }),
      makeCoach({ id: 'coach-b', personalityTraits: ['Diva'] }),
    );
    const neutral = calculateCoachSynergy(
      makeCoach({ id: 'coach-c', personalityTraits: ['Leader'] }),
      makeCoach({ id: 'coach-d', personalityTraits: ['Quiet Professional'] }),
    );

    expect(conflict.synergyScore).toBeLessThan(neutral.synergyScore);
  });

  it('boosts compatible role pairings like pitching and bullpen', () => {
    const compatible = calculateCoachSynergy(
      makeCoach({ id: 'coach-a', role: 'pitching_coach', specialty: 'stuff' }),
      makeCoach({ id: 'coach-b', role: 'bullpen_coach', specialty: 'control' }),
    );
    const generic = calculateCoachSynergy(
      makeCoach({ id: 'coach-c', role: 'pitching_coach', specialty: 'stuff' }),
      makeCoach({
        id: 'coach-d',
        role: 'aaa_coordinator',
        specialty: 'mlb_prep',
        teachingAbility: 0.25,
        personalityFit: 0.35,
        teamId: 'sea',
        personalityTraits: ['Moody'],
      }),
    );

    expect(compatible.synergyScore).toBeGreaterThan(generic.synergyScore);
  });

  it('rates a pitching coach and pitcher above a hitter pairing', () => {
    const pitcher = makePlayer({
      id: 'pitcher-1',
      position: 'SP',
      pitcherAttributes: {
        stuff: 295,
        control: 255,
        stamina: 280,
        velocity: 285,
        movement: 265,
      },
      hitterAttributes: {
        contact: 0,
        power: 0,
        eye: 0,
        speed: 0,
        defense: 0,
        durability: 0,
      },
      developmentProgram: 'velocity',
    });

    const pitchingAffinity = calculateCoachPlayerAffinity(
      makeCoach({ id: 'coach-a', role: 'pitching_coach', specialty: 'velocity' }),
      pitcher,
    );
    const hittingAffinity = calculateCoachPlayerAffinity(
      makeCoach({ id: 'coach-b', role: 'hitting_coach', specialty: 'power' }),
      pitcher,
    );

    expect(pitchingAffinity.affinityScore).toBeGreaterThan(hittingAffinity.affinityScore);
  });

  it('raises affinity when coach and player share traits', () => {
    const shared = calculateCoachPlayerAffinity(
      makeCoach({ id: 'coach-a', personalityTraits: ['Leader', 'Hard Worker'] }),
      makePlayer({ personalityTraits: ['Leader', 'Hard Worker'] }),
    );
    const separate = calculateCoachPlayerAffinity(
      makeCoach({ id: 'coach-b', personalityTraits: ['Leader'] }),
      makePlayer({ personalityTraits: ['Moody'] }),
    );

    expect(shared.affinityScore).toBeGreaterThan(separate.affinityScore);
  });

  it('rewards work ethic alignment with demanding coaches', () => {
    const aligned = calculateCoachPlayerAffinity(
      makeCoach({ id: 'coach-a', teachingAbility: 0.92 }),
      makePlayer({ personality: { workEthic: 88, mentalToughness: 70, leadership: 58, competitiveness: 74 } }),
    );
    const misaligned = calculateCoachPlayerAffinity(
      makeCoach({ id: 'coach-b', teachingAbility: 0.92 }),
      makePlayer({ personality: { workEthic: 35, mentalToughness: 70, leadership: 58, competitiveness: 74 } }),
    );

    expect(aligned.affinityScore).toBeGreaterThan(misaligned.affinityScore);
  });

  it('averages staff harmony across all coach pairs', () => {
    const coaches = [
      makeCoach({ id: 'coach-a', role: 'hitting_coach', specialty: 'power' }),
      makeCoach({ id: 'coach-b', role: 'first_base_coach', specialty: 'speed' }),
      makeCoach({ id: 'coach-c', role: 'bench_coach', specialty: 'leadership' }),
    ];

    const harmony = calculateStaffHarmony(coaches);
    const pairAverage = harmony.synergies.reduce((sum, synergy) => sum + synergy.synergyScore, 0)
      / harmony.synergies.length;

    expect(harmony.synergies).toHaveLength(3);
    expect(harmony.overallScore).toBe(Math.round(pairAverage));
    expect(harmony.strongestBond).not.toBeNull();
    expect(harmony.weakestLink).not.toBeNull();
  });

  it('returns neutral harmony for an empty staff', () => {
    const harmony = calculateStaffHarmony([]);

    expect(harmony.overallScore).toBe(50);
    expect(harmony.synergies).toEqual([]);
    expect(harmony.weakestLink).toBeNull();
    expect(harmony.strongestBond).toBeNull();
  });

  it('clamps development bonus to the minimum and maximum bounds', () => {
    const lowBonus = getCoachDevelopmentBonus(
      makeCoach({ id: 'coach-a', role: 'pitching_coach', specialty: 'control', personalityTraits: ['Diva'] }),
      makePlayer({ personalityTraits: ['Leader'] }),
    );
    const highBonus = getCoachDevelopmentBonus(
      makeCoach({ id: 'coach-b', specialty: 'power', teachingAbility: 0.95, personalityTraits: ['Leader', 'Hard Worker'] }),
      makePlayer({ personalityTraits: ['Leader', 'Hard Worker'] }),
    );

    expect(lowBonus).toBeGreaterThanOrEqual(0.8);
    expect(highBonus).toBeLessThanOrEqual(1.3);
    expect(highBonus).toBeGreaterThan(lowBonus);
  });

  it('reports missing pitching coverage as a chemistry issue', () => {
    const issues = identifyChemistryIssues(
      [makeCoach({ id: 'coach-a', role: 'hitting_coach', specialty: 'power' })],
      [makePlayer({
        id: 'pitcher-1',
        position: 'SP',
        pitcherAttributes: {
          stuff: 280,
          control: 250,
          stamina: 275,
          velocity: 285,
          movement: 260,
        },
      })],
    );

    expect(issues.some((issue) => issue.description.toLowerCase().includes('pitching coach'))).toBe(true);
  });

  it('reports low-synergy staff pairings', () => {
    const issues = identifyChemistryIssues(
      [
        makeCoach({ id: 'coach-a', personalityTraits: ['Leader'], teachingAbility: 0.95 }),
        makeCoach({ id: 'coach-b', personalityTraits: ['Diva'], teachingAbility: 0.1 }),
      ],
      [makePlayer()],
    );

    expect(issues.some((issue) => issue.description.toLowerCase().includes('low synergy'))).toBe(true);
  });

  it('reports players without a matching development coach', () => {
    const issues = identifyChemistryIssues(
      [makeCoach({ id: 'coach-a', role: 'pitching_coach', specialty: 'velocity' })],
      [makePlayer({ id: 'hitter-1', position: 'RF' })],
    );

    expect(issues.some((issue) => issue.description.toLowerCase().includes('without a matching coach'))).toBe(true);
  });
});
