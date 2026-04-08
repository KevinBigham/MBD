import { describe, expect, it } from 'vitest';
import type { GeneratedPlayer } from '../src/index.js';
import {
  GameRNG,
  advanceMentorship,
  findMentorCandidates,
  findProtegeeCandidates,
  fromMentorRelationship,
  getMentorshipDevelopmentBonus,
  pairMentors,
  toMentorRelationship,
  type MentorshipPairing,
} from '../src/index.js';

function makePlayer(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  return {
    id: 'player-1',
    firstName: 'Nate',
    lastName: 'Harper',
    age: 24,
    position: 'RF',
    hitterAttributes: {
      contact: 250,
      power: 275,
      eye: 225,
      speed: 235,
      defense: 215,
      durability: 245,
    },
    pitcherAttributes: null,
    personality: {
      workEthic: 76,
      mentalToughness: 68,
      leadership: 55,
      competitiveness: 74,
    },
    contract: {
      years: 1,
      annualSalary: 0.7,
      totalValue: 0.7,
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
    overallRating: 280,
    rule5EligibleAfterSeason: 4,
    serviceTimeDays: 0,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: 'AA',
    ceiling: 355,
    floor: 235,
    developmentProgram: 'power',
    developmentTrajectory: 'on_track',
    extensionHistory: [],
    personalityTraits: ['Hard Worker'],
    potentialRating: 330,
    ...overrides,
  };
}

function makeMentor(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  return makePlayer({
    id: 'mentor-1',
    age: 32,
    rosterStatus: 'MLB',
    developmentPhase: 'Prime',
    personality: {
      workEthic: 85,
      mentalToughness: 80,
      leadership: 75,
      competitiveness: 70,
    },
    personalityTraits: ['Leader', 'Mentor', 'Hard Worker'],
    ...overrides,
  });
}

describe('mentorship', () => {
  it('finds only eligible veteran mentors', () => {
    const players = [
      makeMentor({ id: 'mentor-ok' }),
      makeMentor({ id: 'mentor-young', age: 28 }),
      makeMentor({ id: 'mentor-low-leadership', personality: { workEthic: 80, mentalToughness: 70, leadership: 50, competitiveness: 70 } }),
      makeMentor({ id: 'mentor-no-traits', personalityTraits: ['Flashy'] }),
    ];

    const mentors = findMentorCandidates(players);

    expect(mentors.map((player) => player.id)).toEqual(['mentor-ok']);
  });

  it('finds only young developing protegees on active upper levels', () => {
    const players = [
      makePlayer({ id: 'protegee-ok', rosterStatus: 'AAA', developmentPhase: 'Prospect', age: 21 }),
      makePlayer({ id: 'protegee-old', age: 27 }),
      makePlayer({ id: 'protegee-low-level', rosterStatus: 'A' }),
      makePlayer({ id: 'protegee-prime', developmentPhase: 'Prime' }),
    ];

    const protegees = findProtegeeCandidates(players);

    expect(protegees.map((player) => player.id)).toEqual(['protegee-ok']);
  });

  it('enforces hitter and pitcher position-group matching', () => {
    const hitterMentor = makeMentor({ id: 'mentor-hitter', position: 'RF', pitcherAttributes: null });
    const pitcherProtegee = makePlayer({
      id: 'protegee-pitcher',
      position: 'SP',
      pitcherAttributes: {
        stuff: 275,
        control: 255,
        stamina: 280,
        velocity: 285,
        movement: 260,
      },
      hitterAttributes: {
        contact: 0,
        power: 0,
        eye: 0,
        speed: 0,
        defense: 0,
        durability: 0,
      },
    });

    const pairings = pairMentors(new GameRNG(19), [hitterMentor], [pitcherProtegee]);

    expect(pairings).toEqual([]);
  });

  it('limits each mentor to at most two protegees', () => {
    const mentor = makeMentor({ id: 'mentor-a' });
    const protegees = [
      makePlayer({ id: 'protegee-1' }),
      makePlayer({ id: 'protegee-2', age: 22 }),
      makePlayer({ id: 'protegee-3', age: 23 }),
    ];

    const pairings = pairMentors(new GameRNG(11), [mentor], protegees);

    expect(pairings).toHaveLength(2);
    expect(pairings.every((pairing) => pairing.mentorId === mentor.id)).toBe(true);
  });

  it('prefers mentors with shared traits and same-team context', () => {
    const bestMentor = makeMentor({ id: 'mentor-best', personalityTraits: ['Leader', 'Hard Worker'], teamId: 'kc' });
    const fallbackMentor = makeMentor({ id: 'mentor-fallback', personalityTraits: ['Leader'], teamId: 'sea' });
    const protegee = makePlayer({ id: 'protegee-a', personalityTraits: ['Leader', 'Hard Worker'], teamId: 'kc' });

    const pairings = pairMentors(new GameRNG(7), [fallbackMentor, bestMentor], [protegee]);

    expect(pairings[0]?.mentorId).toBe('mentor-best');
  });

  it('is deterministic for the same seed', () => {
    const mentors = [makeMentor({ id: 'mentor-a' }), makeMentor({ id: 'mentor-b', teamId: 'sea' })];
    const protegees = [makePlayer({ id: 'protegee-a' }), makePlayer({ id: 'protegee-b', age: 22 })];

    const first = pairMentors(new GameRNG(55), mentors, protegees);
    const second = pairMentors(new GameRNG(55), mentors, protegees);

    expect(second).toEqual(first);
  });

  it('caps aggregate mentorship bonus at 0.20', () => {
    const pairings: MentorshipPairing[] = [
      { mentorId: 'mentor-a', protegeeId: 'protegee-a', quality: 90, compatibilityFactors: ['fit'], developmentBonus: 0.12 },
      { mentorId: 'mentor-b', protegeeId: 'protegee-a', quality: 88, compatibilityFactors: ['fit'], developmentBonus: 0.11 },
    ];

    expect(getMentorshipDevelopmentBonus(pairings, 'protegee-a')).toBe(0.2);
  });

  it('round-trips pairings through the mentor relationship adapter', () => {
    const pairing: MentorshipPairing = {
      mentorId: 'mentor-a',
      protegeeId: 'protegee-a',
      quality: 84,
      compatibilityFactors: ['Shared traits', 'Same team'],
      developmentBonus: 0.13,
    };

    const relationship = toMentorRelationship(pairing, 'kc', 6);
    const restored = fromMentorRelationship(relationship);

    expect(relationship.veteranPlayerId).toBe(pairing.mentorId);
    expect(relationship.rookiePlayerId).toBe(pairing.protegeeId);
    expect(restored.mentorId).toBe(pairing.mentorId);
    expect(restored.protegeeId).toBe(pairing.protegeeId);
    expect(restored.quality).toBe(pairing.quality);
  });

  it('is deterministic for the same seed when advancing events', () => {
    const pairing: MentorshipPairing = {
      mentorId: 'mentor-a',
      protegeeId: 'protegee-a',
      quality: 82,
      compatibilityFactors: ['Shared traits'],
      developmentBonus: 0.1,
    };

    const first = advanceMentorship(new GameRNG(91), pairing, 7);
    const second = advanceMentorship(new GameRNG(91), pairing, 7);

    expect(second).toEqual(first);
  });

  it('does not allow graduated events before six months', () => {
    const pairing: MentorshipPairing = {
      mentorId: 'mentor-a',
      protegeeId: 'protegee-a',
      quality: 82,
      compatibilityFactors: ['Shared traits'],
      developmentBonus: 0.1,
    };

    for (let seed = 1; seed <= 250; seed += 1) {
      const event = advanceMentorship(new GameRNG(seed), pairing, 5);
      expect(event?.type).not.toBe('graduated');
    }
  });

  it('can produce a graduated event after six months', () => {
    const pairing: MentorshipPairing = {
      mentorId: 'mentor-a',
      protegeeId: 'protegee-a',
      quality: 82,
      compatibilityFactors: ['Shared traits'],
      developmentBonus: 0.1,
    };

    let graduatedSeed: number | null = null;
    for (let seed = 1; seed <= 1000; seed += 1) {
      const event = advanceMentorship(new GameRNG(seed), pairing, 7);
      if (event?.type === 'graduated') {
        graduatedSeed = seed;
        break;
      }
    }

    expect(graduatedSeed).not.toBeNull();
  });

  it('fires events at roughly the expected monthly rate', () => {
    const pairing: MentorshipPairing = {
      mentorId: 'mentor-a',
      protegeeId: 'protegee-a',
      quality: 82,
      compatibilityFactors: ['Shared traits'],
      developmentBonus: 0.1,
    };

    let events = 0;
    const iterations = 400;
    for (let seed = 1; seed <= iterations; seed += 1) {
      if (advanceMentorship(new GameRNG(seed), pairing, 4)) {
        events += 1;
      }
    }

    expect(events).toBeGreaterThanOrEqual(35);
    expect(events).toBeLessThanOrEqual(85);
  });

  it('returns event descriptions tied to the mentor pair', () => {
    const pairing: MentorshipPairing = {
      mentorId: 'mentor-a',
      protegeeId: 'protegee-a',
      quality: 82,
      compatibilityFactors: ['Shared traits'],
      developmentBonus: 0.1,
    };

    let foundSeed: number | null = null;
    let eventType: string | null = null;
    for (let seed = 1; seed <= 400; seed += 1) {
      const event = advanceMentorship(new GameRNG(seed), pairing, 7);
      if (event) {
        foundSeed = seed;
        eventType = event.type;
        expect(event.description).toContain(pairing.mentorId);
        expect(event.description).toContain(pairing.protegeeId);
        break;
      }
    }

    expect(foundSeed).not.toBeNull();
    expect(eventType).not.toBeNull();
  });
});
