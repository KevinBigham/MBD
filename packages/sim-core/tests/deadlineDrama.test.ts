import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import {
  generateBiddingWar,
  generateDeadlineTimeline,
  getDeadlineEventsForDay,
  resolveDeadlineBuzzerBeater,
  type DeadlineContext,
} from '../src/trade/deadlineDrama.js';

function createContext(overrides: Partial<DeadlineContext> = {}): DeadlineContext {
  return {
    season: 8,
    day: 84,
    standings: [
      { teamId: 'nym', wins: 58, losses: 42 },
      { teamId: 'bos', wins: 55, losses: 45 },
      { teamId: 'lax', wins: 61, losses: 39 },
      { teamId: 'pit', wins: 43, losses: 57 },
      { teamId: 'por', wins: 40, losses: 60 },
      { teamId: 'cha', wins: 46, losses: 54 },
    ],
    contenderTeamIds: ['nym', 'bos', 'lax'],
    sellerTeamIds: ['pit', 'por', 'cha'],
    topTargetPlayerIds: ['p-target-1', 'p-target-2', 'p-target-3'],
    ...overrides,
  };
}

function averageUrgency(events: Array<{ urgency: number }>): number {
  return events.reduce((total, event) => total + event.urgency, 0) / Math.max(1, events.length);
}

describe('deadline drama timeline', () => {
  it('generates 8-15 events inside the deadline window', () => {
    const timeline = generateDeadlineTimeline(new GameRNG(101), createContext());

    expect(timeline.length).toBeGreaterThanOrEqual(8);
    expect(timeline.length).toBeLessThanOrEqual(15);
    expect(timeline.every((event) => event.day >= 80 && event.day <= 100)).toBe(true);
  });

  it('escalates urgency near the deadline', () => {
    const timeline = generateDeadlineTimeline(new GameRNG(102), createContext());

    const early = timeline.filter((event) => event.day >= 80 && event.day <= 85);
    const late = timeline.filter((event) => event.day >= 95 && event.day <= 100);

    expect(early.length).toBeGreaterThan(0);
    expect(late.length).toBeGreaterThan(0);
    expect(averageUrgency(late)).toBeGreaterThan(averageUrgency(early));
  });

  it('filters events by day', () => {
    const timeline = generateDeadlineTimeline(new GameRNG(103), createContext());
    const selectedDay = timeline[2]!.day;

    const dailyEvents = getDeadlineEventsForDay(timeline, selectedDay);

    expect(dailyEvents.length).toBeGreaterThan(0);
    expect(dailyEvents.every((event) => event.day === selectedDay)).toBe(true);
  });

  it('is deterministic for the same seed and context', () => {
    const context = createContext();

    const first = generateDeadlineTimeline(new GameRNG(104), context);
    const second = generateDeadlineTimeline(new GameRNG(104), context);

    expect(second).toEqual(first);
  });

  it('assigns unique event ids', () => {
    const timeline = generateDeadlineTimeline(new GameRNG(105), createContext());
    const ids = new Set(timeline.map((event) => event.id));

    expect(ids.size).toBe(timeline.length);
  });

  it('always includes a terminal day-100 event', () => {
    const timeline = generateDeadlineTimeline(new GameRNG(106), createContext());
    const finalDayEvents = timeline.filter((event) => event.day === 100);

    expect(finalDayEvents.length).toBeGreaterThan(0);
    expect(
      finalDayEvents.some((event) => event.type === 'deadline_passes_quietly' || event.type === 'buzzer_beater_trade'),
    ).toBe(true);
  });

  it('can produce a quiet deadline in low-intensity contexts', () => {
    const quietTimeline = generateDeadlineTimeline(
      new GameRNG(107),
      createContext({
        contenderTeamIds: [],
        sellerTeamIds: [],
        topTargetPlayerIds: [],
      }),
    );

    expect(quietTimeline.some((event) => event.type === 'deadline_passes_quietly')).toBe(true);
  });

  it('uses contender and seller team ids in generated public events', () => {
    const timeline = generateDeadlineTimeline(new GameRNG(108), createContext());
    const teamIds = new Set(timeline.flatMap((event) => event.involvedTeamIds));

    expect(teamIds.has('nym')).toBe(true);
    expect(teamIds.has('pit')).toBe(true);
  });
});

describe('generateBiddingWar', () => {
  it('creates a settled bidding war with at least two rounds', () => {
    const war = generateBiddingWar(new GameRNG(109), 'p-target-9', ['nym', 'bos', 'lax']);

    expect(war.rounds.length).toBeGreaterThanOrEqual(6);
    expect(new Set(war.rounds.map((round) => round.round)).size).toBeGreaterThanOrEqual(2);
    expect(war.settled).toBe(true);
    expect(war.winnerId).not.toBeNull();
  });

  it('returns an unsettled result for invalid single-team wars', () => {
    const war = generateBiddingWar(new GameRNG(110), 'p-target-9', ['nym']);

    expect(war.settled).toBe(false);
    expect(war.winnerId).toBeNull();
    expect(war.rounds).toEqual([]);
  });

  it('is deterministic for the same seed', () => {
    const first = generateBiddingWar(new GameRNG(111), 'p-target-9', ['nym', 'bos', 'lax']);
    const second = generateBiddingWar(new GameRNG(111), 'p-target-9', ['nym', 'bos', 'lax']);

    expect(second).toEqual(first);
  });
});

describe('resolveDeadlineBuzzerBeater', () => {
  it('returns a high-urgency result that preserves both team ids', () => {
    const result = resolveDeadlineBuzzerBeater(new GameRNG(112), 'nym', 'pit');

    expect(result.buyerTeamId).toBe('nym');
    expect(result.sellerTeamId).toBe('pit');
    expect(result.urgency).toBe(5);
    expect(result.description).toContain('nym');
    expect(result.description).toContain('pit');
  });

  it('is deterministic for the same seed', () => {
    const first = resolveDeadlineBuzzerBeater(new GameRNG(113), 'nym', 'pit');
    const second = resolveDeadlineBuzzerBeater(new GameRNG(113), 'nym', 'pit');

    expect(second).toEqual(first);
  });
});
