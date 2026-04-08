import type { GameRNG } from '../math/prng.js';

const DEADLINE_START_DAY = 80;
const DEADLINE_END_DAY = 100;
const EARLY_WINDOW_END_DAY = 85;
const MID_WINDOW_START_DAY = 86;
const MID_WINDOW_END_DAY = 94;
const LATE_WINDOW_START_DAY = 95;
const LATE_WINDOW_END_DAY = 99;
const MIN_TIMELINE_EVENTS = 8;
const MAX_TIMELINE_EVENTS = 15;
const MIN_EARLY_EVENTS = 2;
const MAX_EARLY_EVENTS = 3;
const MIN_LATE_EVENTS = 3;
const MAX_LATE_EVENTS = 5;
const MIN_BIDDING_ROUNDS = 2;
const MAX_BIDDING_ROUNDS = 4;
const QUIET_MARKET_SIGNAL_THRESHOLD = 3;

const PUBLIC_EVENT_TYPES: ReadonlySet<DeadlineEventType> = new Set([
  'rumor_surfaces',
  'bidding_war',
  'asking_price_drops',
  'deal_falls_through',
  'surprise_seller',
  'deadline_passes_quietly',
]);

const EARLY_EVENT_TYPES: readonly DeadlineEventType[] = [
  'rumor_surfaces',
  'asking_price_drops',
  'surprise_seller',
];

const MID_EVENT_TYPES: readonly DeadlineEventType[] = [
  'rumor_surfaces',
  'asking_price_drops',
  'deal_falls_through',
  'bidding_war',
  'surprise_seller',
];

const LATE_EVENT_TYPES: readonly DeadlineEventType[] = [
  'bidding_war',
  'last_minute_offer',
  'deal_falls_through',
  'asking_price_drops',
];

const EARLY_EVENT_WEIGHTS = [6, 4, 3] as const;
const MID_EVENT_WEIGHTS = [4, 3, 3, 4, 2] as const;
const LATE_EVENT_WEIGHTS = [5, 5, 3, 2] as const;

const EARLY_URGENCY_OPTIONS = [1, 2] as const;
const EARLY_URGENCY_WEIGHTS = [5, 2] as const;
const MID_URGENCY_OPTIONS = [2, 3, 4] as const;
const MID_URGENCY_WEIGHTS = [2, 4, 2] as const;
const LATE_URGENCY_OPTIONS = [4, 5] as const;
const LATE_URGENCY_WEIGHTS = [2, 5] as const;

const RUMOR_TEMPLATES = [
  '{buyer} scouts keep circling {seller} as chatter builds around {player}.',
  '{seller} are hearing from {buyer} while the market tests the price on {player}.',
  '{player} has become a live rumor as {buyer} and {seller} keep checking in.',
] as const;

const BIDDING_WAR_TEMPLATES = [
  '{buyer} are trading calls with {seller} while the market crowds around {player}.',
  '{player} has sparked a bidding war, with {buyer} pushing {seller} for a faster answer.',
  '{seller} are leveraging multiple clubs as {buyer} try to stay in front for {player}.',
] as const;

const ASKING_PRICE_DROP_TEMPLATES = [
  '{seller} have lowered the ask on {player} as the deadline clock tightens.',
  '{seller} are trimming the price on {player} to pull {buyer} back into the room.',
  '{player} is suddenly more attainable after {seller} softened the return demands.',
] as const;

const DEAL_FALLS_THROUGH_TEMPLATES = [
  'Talks between {buyer} and {seller} on {player} broke down over the final prospect ask.',
  '{buyer} walked away from a near-finished framework with {seller} for {player}.',
  '{seller} thought a deal was close, but {buyer} stalled out before {player} could move.',
] as const;

const LAST_MINUTE_OFFER_TEMPLATES = [
  '{buyer} submitted a last-minute push to pry {player} away from {seller}.',
  '{seller} have one more live offer from {buyer} for {player} before the bell.',
  '{buyer} are trying to jam through a final deadline offer for {player}.',
] as const;

const SURPRISE_SELLER_TEMPLATES = [
  '{seller} shifted posture and quietly entered the market with {player} available.',
  '{seller} surprised the league by listening on {player} despite a recent hot stretch.',
  '{seller} have become a surprise seller, putting {player} into play.',
] as const;

const QUIET_DEADLINE_TEMPLATES = [
  'The clock ran out with only minor chatter, and the deadline passed quietly.',
  'Most clubs held their ground and the deadline closed without a signature move.',
  'The market never fully ignited, leaving the deadline to expire in relative silence.',
] as const;

const BUZZER_BEATER_TEMPLATES = [
  '{buyer} beat the buzzer and landed a last-second deal with {seller}.',
  '{seller} sent the paperwork through just in time, completing a buzzer-beater trade with {buyer}.',
  '{buyer} and {seller} forced through one final deadline swap before the window slammed shut.',
] as const;

const BIDDING_ROUND_OPENERS = [
  'opened with a measured prospect package',
  'floated a clean two-player framework',
  'leaned on upside and draft-pick value',
] as const;

const BIDDING_ROUND_MIDDLES = [
  'upped the prospect tier to stay in the mix',
  'expanded the package with MLB-ready depth',
  'sweetened the deal with an upper-level arm',
] as const;

const BIDDING_ROUND_FINALS = [
  'made the all-in call with its best remaining offer',
  'pushed every movable chip into the center',
  'delivered a final premium offer before the room closed',
] as const;

export type DeadlineEventType =
  | 'rumor_surfaces'
  | 'bidding_war'
  | 'asking_price_drops'
  | 'deal_falls_through'
  | 'last_minute_offer'
  | 'buzzer_beater_trade'
  | 'surprise_seller'
  | 'deadline_passes_quietly';

export interface DeadlineEvent {
  id: string;
  type: DeadlineEventType;
  day: number;
  description: string;
  involvedTeamIds: string[];
  involvedPlayerIds: string[];
  urgency: 1 | 2 | 3 | 4 | 5;
  isPublic: boolean;
}

export interface DeadlineContext {
  season: number;
  day: number;
  standings: Array<{
    teamId: string;
    wins: number;
    losses: number;
  }>;
  contenderTeamIds: string[];
  sellerTeamIds: string[];
  topTargetPlayerIds: string[];
}

export interface BiddingRound {
  teamId: string;
  offerDescription: string;
  round: number;
}

export interface BiddingWar {
  targetPlayerId: string;
  rounds: BiddingRound[];
  winnerId: string | null;
  settled: boolean;
}

export interface BuzzerBeaterResult {
  buyerTeamId: string;
  sellerTeamId: string;
  completed: boolean;
  urgency: 5;
  description: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function choose<T>(rng: GameRNG, items: readonly T[], weights?: readonly number[]): T {
  if (items.length === 1) {
    return items[0]!;
  }
  return rng.weightedPick(items, weights ?? items.map(() => 1));
}

function fillTemplate(
  template: string,
  values: Record<'buyer' | 'seller' | 'player', string>,
): string {
  return template
    .replaceAll('{buyer}', values.buyer)
    .replaceAll('{seller}', values.seller)
    .replaceAll('{player}', values.player);
}

function marketSignal(context: DeadlineContext): number {
  return context.contenderTeamIds.length + context.sellerTeamIds.length + context.topTargetPlayerIds.length;
}

function computeEventCount(rng: GameRNG, context: DeadlineContext): number {
  const signalBonus = Math.floor(marketSignal(context) / 2);
  return clamp(MIN_TIMELINE_EVENTS + signalBonus + rng.nextInt(0, 2), MIN_TIMELINE_EVENTS, MAX_TIMELINE_EVENTS);
}

function chooseTeamIds(rng: GameRNG, context: DeadlineContext): { buyerTeamId: string; sellerTeamId: string } {
  const contenderPool = context.contenderTeamIds.length > 0
    ? context.contenderTeamIds
    : context.standings
      .slice()
      .sort((left, right) => (right.wins - right.losses) - (left.wins - left.losses))
      .slice(0, 3)
      .map((entry) => entry.teamId);

  const sellerPool = context.sellerTeamIds.length > 0
    ? context.sellerTeamIds
    : context.standings
      .slice()
      .sort((left, right) => (left.wins - left.losses) - (right.wins - right.losses))
      .slice(0, 3)
      .map((entry) => entry.teamId);

  const buyerTeamId = choose(rng, contenderPool);
  const sellerFallback = sellerPool.find((teamId) => teamId !== buyerTeamId) ?? sellerPool[0] ?? buyerTeamId;
  const sellerTeamId = sellerFallback === buyerTeamId
    ? context.standings.find((entry) => entry.teamId !== buyerTeamId)?.teamId ?? sellerFallback
    : sellerFallback;

  return {
    buyerTeamId,
    sellerTeamId,
  };
}

function chooseTargetPlayerId(rng: GameRNG, context: DeadlineContext): string {
  return choose(rng, context.topTargetPlayerIds.length > 0 ? context.topTargetPlayerIds : ['market-anchor']);
}

function urgencyForPhase(
  rng: GameRNG,
  phase: 'early' | 'mid' | 'late',
): 1 | 2 | 3 | 4 | 5 {
  if (phase === 'early') {
    return choose(rng, EARLY_URGENCY_OPTIONS, EARLY_URGENCY_WEIGHTS);
  }
  if (phase === 'mid') {
    return choose(rng, MID_URGENCY_OPTIONS, MID_URGENCY_WEIGHTS);
  }
  return choose(rng, LATE_URGENCY_OPTIONS, LATE_URGENCY_WEIGHTS);
}

function dayForPhase(rng: GameRNG, phase: 'early' | 'mid' | 'late'): number {
  if (phase === 'early') {
    return rng.nextInt(DEADLINE_START_DAY, EARLY_WINDOW_END_DAY);
  }
  if (phase === 'mid') {
    return rng.nextInt(MID_WINDOW_START_DAY, MID_WINDOW_END_DAY);
  }
  return rng.nextInt(LATE_WINDOW_START_DAY, LATE_WINDOW_END_DAY);
}

function createEventDescription(
  rng: GameRNG,
  type: DeadlineEventType,
  buyerTeamId: string,
  sellerTeamId: string,
  playerId: string,
): string {
  switch (type) {
    case 'rumor_surfaces':
      return fillTemplate(choose(rng, RUMOR_TEMPLATES), { buyer: buyerTeamId, seller: sellerTeamId, player: playerId });
    case 'bidding_war':
      return fillTemplate(choose(rng, BIDDING_WAR_TEMPLATES), { buyer: buyerTeamId, seller: sellerTeamId, player: playerId });
    case 'asking_price_drops':
      return fillTemplate(choose(rng, ASKING_PRICE_DROP_TEMPLATES), { buyer: buyerTeamId, seller: sellerTeamId, player: playerId });
    case 'deal_falls_through':
      return fillTemplate(choose(rng, DEAL_FALLS_THROUGH_TEMPLATES), { buyer: buyerTeamId, seller: sellerTeamId, player: playerId });
    case 'last_minute_offer':
      return fillTemplate(choose(rng, LAST_MINUTE_OFFER_TEMPLATES), { buyer: buyerTeamId, seller: sellerTeamId, player: playerId });
    case 'surprise_seller':
      return fillTemplate(choose(rng, SURPRISE_SELLER_TEMPLATES), { buyer: buyerTeamId, seller: sellerTeamId, player: playerId });
    case 'deadline_passes_quietly':
      return choose(rng, QUIET_DEADLINE_TEMPLATES);
    case 'buzzer_beater_trade':
      return fillTemplate(choose(rng, BUZZER_BEATER_TEMPLATES), { buyer: buyerTeamId, seller: sellerTeamId, player: playerId });
    default:
      return `${buyerTeamId} and ${sellerTeamId} revisited ${playerId} before the deadline.`;
  }
}

function createEvent(
  rng: GameRNG,
  context: DeadlineContext,
  phase: 'early' | 'mid' | 'late',
  index: number,
): DeadlineEvent {
  const typePool = phase === 'early'
    ? EARLY_EVENT_TYPES
    : phase === 'mid'
      ? MID_EVENT_TYPES
      : LATE_EVENT_TYPES;
  const weightPool = phase === 'early'
    ? EARLY_EVENT_WEIGHTS
    : phase === 'mid'
      ? MID_EVENT_WEIGHTS
      : LATE_EVENT_WEIGHTS;

  const type = choose(rng, typePool, weightPool);
  const { buyerTeamId, sellerTeamId } = chooseTeamIds(rng, context);
  const playerId = chooseTargetPlayerId(rng, context);
  const day = dayForPhase(rng, phase);
  const involvedTeamIds = type === 'deadline_passes_quietly'
    ? []
    : dedupe([buyerTeamId, sellerTeamId].filter(Boolean));
  const involvedPlayerIds = type === 'deadline_passes_quietly' ? [] : [playerId];

  return {
    id: `deadline-${context.season}-${phase}-${index}-${type}-${day}`,
    type,
    day,
    description: createEventDescription(rng, type, buyerTeamId, sellerTeamId, playerId),
    involvedTeamIds,
    involvedPlayerIds,
    urgency: urgencyForPhase(rng, phase),
    isPublic: PUBLIC_EVENT_TYPES.has(type),
  };
}

function createTerminalEvent(rng: GameRNG, context: DeadlineContext, index: number): DeadlineEvent {
  const quietMarket = marketSignal(context) <= QUIET_MARKET_SIGNAL_THRESHOLD;
  const type: DeadlineEventType = quietMarket ? 'deadline_passes_quietly' : 'buzzer_beater_trade';
  const { buyerTeamId, sellerTeamId } = chooseTeamIds(rng, context);
  const playerId = quietMarket ? 'market-anchor' : chooseTargetPlayerId(rng, context);

  return {
    id: `deadline-${context.season}-final-${index}-${type}-${DEADLINE_END_DAY}`,
    type,
    day: DEADLINE_END_DAY,
    description: createEventDescription(rng, type, buyerTeamId, sellerTeamId, playerId),
    involvedTeamIds: quietMarket ? [] : dedupe([buyerTeamId, sellerTeamId]),
    involvedPlayerIds: quietMarket ? [] : [playerId],
    urgency: 5,
    isPublic: true,
  };
}

export function generateDeadlineTimeline(rng: GameRNG, context: DeadlineContext): DeadlineEvent[] {
  const totalEvents = computeEventCount(rng, context);
  const preTerminalEvents = totalEvents - 1;
  const earlyEvents = clamp(rng.nextInt(MIN_EARLY_EVENTS, MAX_EARLY_EVENTS), MIN_EARLY_EVENTS, preTerminalEvents - MIN_LATE_EVENTS);
  const remainingAfterEarly = preTerminalEvents - earlyEvents;
  const lateEvents = clamp(
    rng.nextInt(MIN_LATE_EVENTS, Math.min(MAX_LATE_EVENTS, remainingAfterEarly)),
    MIN_LATE_EVENTS,
    remainingAfterEarly,
  );
  const midEvents = preTerminalEvents - earlyEvents - lateEvents;

  const timeline: DeadlineEvent[] = [];

  for (let index = 0; index < earlyEvents; index++) {
    timeline.push(createEvent(rng, context, 'early', index));
  }

  for (let index = 0; index < midEvents; index++) {
    timeline.push(createEvent(rng, context, 'mid', index));
  }

  for (let index = 0; index < lateEvents; index++) {
    timeline.push(createEvent(rng, context, 'late', index));
  }

  timeline.push(createTerminalEvent(rng, context, totalEvents - 1));

  return timeline.sort((left, right) => {
    if (left.day !== right.day) {
      return left.day - right.day;
    }
    if (left.urgency !== right.urgency) {
      return left.urgency - right.urgency;
    }
    return left.id.localeCompare(right.id);
  });
}

export function getDeadlineEventsForDay(timeline: DeadlineEvent[], day: number): DeadlineEvent[] {
  return timeline.filter((event) => event.day === day);
}

function offerPhraseForRound(rng: GameRNG, round: number): string {
  if (round <= 1) {
    return choose(rng, BIDDING_ROUND_OPENERS);
  }
  if (round < MAX_BIDDING_ROUNDS) {
    return choose(rng, BIDDING_ROUND_MIDDLES);
  }
  return choose(rng, BIDDING_ROUND_FINALS);
}

export function generateBiddingWar(
  rng: GameRNG,
  targetPlayerId: string,
  biddingTeamIds: string[],
): BiddingWar {
  const uniqueTeamIds = dedupe(biddingTeamIds);
  if (uniqueTeamIds.length < 2) {
    return {
      targetPlayerId,
      rounds: [],
      winnerId: null,
      settled: false,
    };
  }

  const roundsToPlay = rng.nextInt(MIN_BIDDING_ROUNDS, MAX_BIDDING_ROUNDS);
  const rounds: BiddingRound[] = [];
  const winnerWeights: number[] = [];

  for (const teamId of uniqueTeamIds) {
    winnerWeights.push(10 + rng.nextInt(0, 8));
  }

  for (let round = 1; round <= roundsToPlay; round++) {
    for (const [index, teamId] of uniqueTeamIds.entries()) {
      winnerWeights[index] = winnerWeights[index]! + round;
      rounds.push({
        teamId,
        round,
        offerDescription: `${teamId} ${offerPhraseForRound(rng, round)} for ${targetPlayerId}.`,
      });
    }
  }

  return {
    targetPlayerId,
    rounds,
    winnerId: choose(rng, uniqueTeamIds, winnerWeights),
    settled: true,
  };
}

export function resolveDeadlineBuzzerBeater(
  rng: GameRNG,
  buyerTeamId: string,
  sellerTeamId: string,
): BuzzerBeaterResult {
  const description = fillTemplate(
    choose(rng, BUZZER_BEATER_TEMPLATES),
    { buyer: buyerTeamId, seller: sellerTeamId, player: 'a headline target' },
  );

  return {
    buyerTeamId,
    sellerTeamId,
    completed: true,
    urgency: 5,
    description,
  };
}
