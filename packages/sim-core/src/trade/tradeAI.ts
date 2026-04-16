/**
 * @module tradeAI
 * AI trade behavior: GM personalities, proposal evaluation, counter-offers,
 * and autonomous trade generation.
 *
 * All randomness uses GameRNG; the JS global random API is never used.
 */

import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import { isTradeDeadlineModeDay } from '../sim/calendar.js';
import { evaluatePlayerTradeValue, comparePackages } from './valuation.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** GM personality types governing trade behavior. */
const GM_PERSONALITIES = ['aggressive', 'conservative', 'analytical', 'prospect_hugger', 'win_now'] as const;
export type GMPersonality = (typeof GM_PERSONALITIES)[number];

/** Fairness thresholds by personality (minimum fairness to accept). */
const ACCEPTANCE_THRESHOLDS: Record<GMPersonality, number> = {
  aggressive: -15,
  conservative: 10,
  analytical: -5,
  prospect_hugger: 0,
  win_now: -10,
};

/** Bonus fairness when a trade fills a key positional need. */
const NEED_BONUS = 20;

/** Age below which prospect_hugger applies a penalty to trading away youth. */
const YOUNG_PLAYER_AGE_THRESHOLD = 26;

/** Prospect-hugger multiplier for young-player perceived value. */
const PROSPECT_HUGGER_MULTIPLIER = 2;

/** Counter-offer eligibility window: reject but close enough to counter. */
const COUNTER_LOWER_BOUND = -30;

/** Counter-offers aim to improve fairness by this range. */
const COUNTER_IMPROVEMENT_MIN = 10;
const COUNTER_IMPROVEMENT_MAX = 20;

/** Maximum number of trade proposals an AI generates per evaluation cycle. */
const MAX_AI_PROPOSALS = 3;
const DEADLINE_MAX_AI_PROPOSALS = 7;

/** Minimum overall trade value to be considered "tradeable" by AI. */
const MIN_TRADEABLE_VALUE = 15;

/** Trade ID hex segment length. */
const TRADE_ID_SEGMENTS = 3;
const TOP_PROSPECT_POTENTIAL_THRESHOLD = 320;
const TOP_PROSPECT_AGE_THRESHOLD = 24;
const MAX_PROPOSAL_FAIRNESS_ABS = 22;
const RENTAL_PLAYER_AGE_THRESHOLD = 28;
const DEADLINE_UPGRADE_MARGIN = 0;
const STANDARD_UPGRADE_MARGIN = 10;
const DEADLINE_BALANCED_PROPOSAL_ABS = 35;
const DEADLINE_ACCEPTANCE_BONUS = 8;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TradeStatus = 'proposed' | 'countered' | 'accepted' | 'rejected';

export interface TradeProposal {
  id: string;
  fromTeamId: string;
  toTeamId: string;
  playersOffered: string[];
  playersRequested: string[];
  status: TradeStatus;
  counterOffer?: TradeProposal;
  reason: string;
}

export interface TradeResult {
  proposal: TradeProposal;
  executed: boolean;
  playersMoved: Array<{ playerId: string; fromTeam: string; toTeam: string }>;
}

export interface TradeGenerationContext {
  currentDay?: number;
  contenderTeamIds?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function playerById(players: GeneratedPlayer[], id: string): GeneratedPlayer | undefined {
  return players.find((p) => p.id === id);
}

function playersById(allPlayers: GeneratedPlayer[], ids: string[]): GeneratedPlayer[] {
  const result: GeneratedPlayer[] = [];
  for (const id of ids) {
    const p = playerById(allPlayers, id);
    if (p) result.push(p);
  }
  return result;
}

function prospectPotential(player: GeneratedPlayer): number {
  return player.potentialRating ?? player.ceiling ?? player.overallRating;
}

function isProtectedProspect(player: GeneratedPlayer): boolean {
  return player.rosterStatus !== 'MLB'
    && player.age <= TOP_PROSPECT_AGE_THRESHOLD
    && prospectPotential(player) >= TOP_PROSPECT_POTENTIAL_THRESHOLD;
}

function isFutureValueTarget(player: GeneratedPlayer): boolean {
  return player.rosterStatus !== 'MLB'
    && player.age <= 25
    && prospectPotential(player) >= 260
    && !isProtectedProspect(player);
}

function isRentalPlayer(player: GeneratedPlayer): boolean {
  return player.rosterStatus === 'MLB'
    && player.contract.years <= 1
    && player.age >= RENTAL_PLAYER_AGE_THRESHOLD;
}

function isBalancedProposal(fairness: number, atDeadline: boolean = false): boolean {
  return Math.abs(fairness) <= (atDeadline ? DEADLINE_BALANCED_PROPOSAL_ABS : MAX_PROPOSAL_FAIRNESS_ABS);
}

function proposalFairnessCap(atDeadline: boolean, isContender: boolean): number {
  return atDeadline && isContender ? 35 : MAX_PROPOSAL_FAIRNESS_ABS;
}

function isDeadlineBuyerProposal(reason: string): boolean {
  return reason.startsWith('Deadline buyer mode:');
}

/**
 * Compute personality-adjusted fairness.
 * Positive result means the deal looks acceptable to the evaluating team.
 */
function adjustedFairness(
  baseFairness: number,
  personality: GMPersonality,
  offeredPlayers: GeneratedPlayer[],
  requestedPlayers: GeneratedPlayer[],
  isContender: boolean,
): number {
  let adjusted = baseFairness;

  // Prospect hugger: penalize losing young talent
  if (personality === 'prospect_hugger') {
    const youngOffered = requestedPlayers.filter((p) => p.age < YOUNG_PLAYER_AGE_THRESHOLD);
    adjusted -= youngOffered.length * 10;
  }

  // Win-now: bonus for acquiring older established players
  if (personality === 'win_now') {
    const veteransAcquired = offeredPlayers.filter((p) => p.age >= 28);
    adjusted += veteransAcquired.length * 5;
  }

  const protectedProspects = requestedPlayers.filter(isProtectedProspect);
  adjusted -= protectedProspects.length * 28;

  if (!isContender) {
    const futureValueAcquired = offeredPlayers.filter(isFutureValueTarget);
    const rentalsMoved = requestedPlayers.filter(isRentalPlayer);
    const veteransAcquired = offeredPlayers.filter(isRentalPlayer);
    adjusted += futureValueAcquired.length * 12;
    adjusted += rentalsMoved.length * 8;
    adjusted -= veteransAcquired.length * 12;
  }

  // Contending teams are more aggressive at deadline
  if (isContender) {
    adjusted += 5;
  }

  return adjusted;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Generate a deterministic unique trade ID. */
export function generateTradeId(rng: GameRNG): string {
  const hex = () => rng.nextInt(0, 0xffff).toString(16).padStart(4, '0');
  const segments: string[] = [];
  for (let i = 0; i < TRADE_ID_SEGMENTS; i++) {
    segments.push(hex());
  }
  return `trade-${segments.join('-')}`;
}

/** Assign a random GM personality to a team (deterministic via RNG). */
export function assignGMPersonality(rng: GameRNG, _teamId: string): GMPersonality {
  const idx = rng.nextInt(0, GM_PERSONALITIES.length - 1);
  return GM_PERSONALITIES[idx]!;
}

/**
 * AI evaluates a trade proposal from another team.
 *
 * The evaluating team is `toTeam` (the one being asked to accept).
 * Returns a decision, optional counter-offer, and a human-readable reason.
 */
export function evaluateTradeProposal(
  rng: GameRNG,
  proposal: TradeProposal,
  fromTeamPlayers: GeneratedPlayer[],
  toTeamPlayers: GeneratedPlayer[],
  gmPersonality: GMPersonality,
  isContender: boolean,
): { decision: TradeStatus; counter?: TradeProposal; reason: string } {
  // Resolve player objects
  const offered = playersById(fromTeamPlayers, proposal.playersOffered);
  const requested = playersById(toTeamPlayers, proposal.playersRequested);

  if (offered.length === 0 || requested.length === 0) {
    return { decision: 'rejected', reason: 'Invalid trade: missing players.' };
  }

  // No-trade clause check: if any requested player has one, reject
  const ntcPlayer = requested.find((p) => p.contract.noTradeClause);
  if (ntcPlayer) {
    return {
      decision: 'rejected',
      reason: `${ntcPlayer.firstName} ${ntcPlayer.lastName} has a no-trade clause.`,
    };
  }

  // Base fairness from the perspective of the receiving team.
  // comparePackages: positive = favors offering team, so negate for receiver.
  const { fairness: rawFairness } = comparePackages(offered, requested);
  const fairnessForReceiver = -rawFairness;

  // Check if trade fills a positional need for receiver
  const receiverPositions = new Set(toTeamPlayers.map((p) => p.position));
  const offeredPositions = offered.map((p) => p.position);
  const fillsNeed = offeredPositions.some((pos) => {
    const count = toTeamPlayers.filter((p) => p.position === pos && p.rosterStatus === 'MLB').length;
    return count <= 1; // thin at this position
  });

  let effective = adjustedFairness(
    fairnessForReceiver,
    gmPersonality,
    offered,
    requested,
    isContender,
  );

  if (fillsNeed) {
    effective += NEED_BONUS;
  }
  if (isDeadlineBuyerProposal(proposal.reason)) {
    effective += DEADLINE_ACCEPTANCE_BONUS;
  }

  const threshold = ACCEPTANCE_THRESHOLDS[gmPersonality];

  // Accept
  if (effective >= threshold) {
    return {
      decision: 'accepted',
      reason: `Deal looks ${effective > 10 ? 'great' : 'fair enough'} for us.`,
    };
  }

  // Counter-offer zone: reject is close, try to counter
  if (effective >= COUNTER_LOWER_BOUND && effective < threshold) {
    const counter = buildCounterOffer(rng, proposal, offered, requested, toTeamPlayers);
    if (counter) {
      return {
        decision: 'countered',
        counter,
        reason: 'Close, but we need a bit more to make this work.',
      };
    }
  }

  // Hard reject
  return {
    decision: 'rejected',
    reason: 'The value gap is too wide for us.',
  };
}

/**
 * AI generates trade proposals it wants to make.
 *
 * Scans other teams' players for upgrades and builds up to MAX_AI_PROPOSALS
 * proposals that the AI GM finds appealing.
 */
export function generateAITradeOffers(
  rng: GameRNG,
  teamId: string,
  teamPlayers: GeneratedPlayer[],
  allPlayers: GeneratedPlayer[],
  gmPersonality: GMPersonality,
  isContender: boolean,
  context: TradeGenerationContext = {},
): TradeProposal[] {
  const deadlineMode = isTradeDeadlineModeDay(context.currentDay ?? 1);
  const contenderTeamIds = new Set(context.contenderTeamIds ?? []);

  if (!isContender && deadlineMode) {
    const sellerProposals = generateSellerTradeOffers(
      rng,
      teamId,
      teamPlayers,
      allPlayers,
      contenderTeamIds,
    );
    if (sellerProposals.length > 0) {
      return sellerProposals;
    }
  }

  const proposals: TradeProposal[] = [];
  const proposalLimit = deadlineMode ? DEADLINE_MAX_AI_PROPOSALS : MAX_AI_PROPOSALS;
  const upgradeMargin = deadlineMode ? DEADLINE_UPGRADE_MARGIN : STANDARD_UPGRADE_MARGIN;

  // Identify team weaknesses: positions with lowest-rated MLB starters
  const mlbPlayers = teamPlayers.filter((p) => p.rosterStatus === 'MLB');
  const positionValues = new Map<string, { player: GeneratedPlayer; value: number }>();

  for (const p of mlbPlayers) {
    const val = evaluatePlayerTradeValue(p);
    const existing = positionValues.get(p.position);
    if (!existing || val.overall < existing.value) {
      positionValues.set(p.position, { player: p, value: val.overall });
    }
  }

  // Sort positions by weakness (lowest value first) to prioritize upgrades
  const weakPositions = [...positionValues.entries()]
    .sort((a, b) => a[1].value - b[1].value)
    .slice(0, 3);

  // Identify tradeable surplus players on our team
  const tradeableOwn = teamPlayers
    .filter((p) => {
      if (p.contract.noTradeClause) return false;
      const val = evaluatePlayerTradeValue(p);
      if (val.overall < MIN_TRADEABLE_VALUE) return false;
      if (isProtectedProspect(p)) return false;
      // Prospect huggers won't offer young talent
      if (gmPersonality === 'prospect_hugger' && p.age < YOUNG_PLAYER_AGE_THRESHOLD) return false;
      return true;
    });

  if (tradeableOwn.length === 0) return proposals;

  // Look at other teams' players for targets
  const otherTeamPlayers = allPlayers.filter((p) => p.teamId !== teamId && p.rosterStatus === 'MLB');

  // Group targets by team
  const playersByTeam = new Map<string, GeneratedPlayer[]>();
  for (const p of otherTeamPlayers) {
    const existing = playersByTeam.get(p.teamId) ?? [];
    existing.push(p);
    playersByTeam.set(p.teamId, existing);
  }

  for (const [weakPos, weakInfo] of weakPositions) {
    if (proposals.length >= proposalLimit) break;

    // Find targets at this position on other teams that would be upgrades
    const targets = otherTeamPlayers
      .filter((p) => {
        if (p.position !== weakPos) return false;
        if (p.contract.noTradeClause) return false;
        if (deadlineMode && isContender) {
          if (contenderTeamIds.has(p.teamId)) return false;
          if (!isRentalPlayer(p) && p.contract.years > 2) return false;
        }
        const val = evaluatePlayerTradeValue(p);
        return val.overall > weakInfo.value + upgradeMargin; // meaningful upgrade
      })
      .sort((a, b) => evaluatePlayerTradeValue(b).overall - evaluatePlayerTradeValue(a).overall);

    if (targets.length === 0) continue;

    // Pick a target (some randomness)
    const targetIdx = rng.nextInt(0, Math.min(targets.length - 1, 2));
    const target = targets[targetIdx]!;
    const targetValue = evaluatePlayerTradeValue(target).overall;

    // Build a package from our tradeable players that approximates the target's value
    const shuffledOwn = rng.shuffle(tradeableOwn);
    const offerPackage: GeneratedPlayer[] = [];
    let packageValue = 0;

    for (const candidate of shuffledOwn) {
      if (packageValue >= targetValue) break;
      // Don't offer the player we're trying to upgrade from
      if (candidate.id === weakInfo.player.id) continue;
      offerPackage.push(candidate);
      packageValue += evaluatePlayerTradeValue(candidate).overall;
    }

    if (offerPackage.length === 0) continue;

    if (deadlineMode && isContender && packageValue < targetValue) {
      const prospectSweetener = teamPlayers
        .filter((player) =>
          !player.contract.noTradeClause
          && !offerPackage.some((candidate) => candidate.id === player.id)
          && player.rosterStatus !== 'MLB'
          && isFutureValueTarget(player),
        )
        .sort((left, right) =>
          evaluatePlayerTradeValue(right).overall - evaluatePlayerTradeValue(left).overall
          || left.id.localeCompare(right.id),
        )[0];

      if (prospectSweetener) {
        offerPackage.push(prospectSweetener);
        packageValue += evaluatePlayerTradeValue(prospectSweetener).overall;
      }
    }

    // Check if AI itself thinks this is reasonable
    const { fairness } = comparePackages(offerPackage, [target]);
    const selfThreshold = ACCEPTANCE_THRESHOLDS[gmPersonality];
    const fairnessCap = proposalFairnessCap(deadlineMode, isContender);

    // AI won't propose trades it wouldn't accept itself (but in reverse)
    if (fairness < selfThreshold || Math.abs(fairness) > fairnessCap) continue;

    const reason = buildTradeReason(weakPos, isContender, gmPersonality, deadlineMode);

    proposals.push({
      id: generateTradeId(rng),
      fromTeamId: teamId,
      toTeamId: target.teamId,
      playersOffered: offerPackage.map((p) => p.id),
      playersRequested: [target.id],
      status: 'proposed',
      reason,
    });
  }

  return proposals;
}

function generateSellerTradeOffers(
  rng: GameRNG,
  teamId: string,
  teamPlayers: GeneratedPlayer[],
  allPlayers: GeneratedPlayer[],
  contenderTeamIds: Set<string>,
): TradeProposal[] {
  const proposals: TradeProposal[] = [];
  const rentals = teamPlayers
    .filter((player) => !player.contract.noTradeClause && isRentalPlayer(player))
    .sort((left, right) =>
      evaluatePlayerTradeValue(right).overall - evaluatePlayerTradeValue(left).overall
      || left.id.localeCompare(right.id),
    )
    .slice(0, DEADLINE_MAX_AI_PROPOSALS);

  for (const rental of rentals) {
    if (proposals.length >= DEADLINE_MAX_AI_PROPOSALS) break;

    for (const contenderTeamId of contenderTeamIds) {
      if (contenderTeamId === teamId) continue;
      const contenderPlayers = allPlayers.filter((player) => player.teamId === contenderTeamId);
      const futureValueCandidates = contenderPlayers
        .filter((player) => !player.contract.noTradeClause && isFutureValueTarget(player))
        .sort((left, right) =>
          Math.abs(comparePackages([rental], [left]).fairness) - Math.abs(comparePackages([rental], [right]).fairness)
          || prospectPotential(left) - prospectPotential(right)
          || left.id.localeCompare(right.id),
        );
      const returnPiece = futureValueCandidates.find((candidate) =>
        isBalancedProposal(comparePackages([rental], [candidate]).fairness, true),
      );

      if (!returnPiece) {
        continue;
      }

      proposals.push({
        id: generateTradeId(rng),
        fromTeamId: teamId,
        toTeamId: contenderTeamId,
        playersOffered: [rental.id],
        playersRequested: [returnPiece.id],
        status: 'proposed',
        reason: 'Moving an expiring piece for controllable future value.',
      });
      break;
    }
  }

  return proposals;
}

/**
 * Execute a trade: move players between teams.
 *
 * Mutates the `teamId` field on each affected player in `allPlayers`.
 * Returns a TradeResult describing what happened.
 */
export function executeTrade(
  proposal: TradeProposal,
  allPlayers: GeneratedPlayer[],
): TradeResult {
  const playersMoved: TradeResult['playersMoved'] = [];

  // Move offered players: fromTeam -> toTeam
  for (const playerId of proposal.playersOffered) {
    const player = playerById(allPlayers, playerId);
    if (player) {
      const fromTeam = player.teamId;
      player.teamId = proposal.toTeamId;
      playersMoved.push({ playerId, fromTeam, toTeam: proposal.toTeamId });
    }
  }

  // Move requested players: toTeam -> fromTeam
  for (const playerId of proposal.playersRequested) {
    const player = playerById(allPlayers, playerId);
    if (player) {
      const fromTeam = player.teamId;
      player.teamId = proposal.fromTeamId;
      playersMoved.push({ playerId, fromTeam, toTeam: proposal.fromTeamId });
    }
  }

  return {
    proposal: { ...proposal, status: 'accepted' },
    executed: playersMoved.length > 0,
    playersMoved,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to build a counter-offer by adjusting the requested package.
 *
 * Strategy: find an additional player the AI could ask for to balance value,
 * or remove a requested player to narrow the gap.
 */
function buildCounterOffer(
  rng: GameRNG,
  original: TradeProposal,
  offeredPlayers: GeneratedPlayer[],
  requestedPlayers: GeneratedPlayer[],
  toTeamAllPlayers: GeneratedPlayer[],
): TradeProposal | undefined {
  const { fairness: currentFairness } = comparePackages(offeredPlayers, requestedPlayers);

  // If receiving team feels they're giving up too much,
  // ask for an additional player from the offering team's roster.
  // We don't have access to the full fromTeam roster here, so instead
  // try removing the least-valuable requested player to balance.
  if (requestedPlayers.length > 1) {
    // Find the least valuable requested player to drop from the request
    const sorted = [...requestedPlayers].sort(
      (a, b) => evaluatePlayerTradeValue(a).overall - evaluatePlayerTradeValue(b).overall,
    );
    const dropped = sorted[0]!;
    const reducedRequest = requestedPlayers.filter((p) => p.id !== dropped.id);
    const { fairness: newFairness } = comparePackages(offeredPlayers, reducedRequest);

    const improvement = newFairness - currentFairness;
    if (improvement >= COUNTER_IMPROVEMENT_MIN && improvement <= COUNTER_IMPROVEMENT_MAX + 10) {
      return {
        id: generateTradeId(rng),
        fromTeamId: original.toTeamId,
        toTeamId: original.fromTeamId,
        playersOffered: reducedRequest.map((p) => p.id),
        playersRequested: original.playersOffered,
        status: 'proposed',
        reason: 'How about this instead?',
      };
    }
  }

  // Alternative: ask for the same players but offer a lower-value player addition
  // from our own roster as a sweetener
  const nonRequestedOwn = toTeamAllPlayers.filter(
    (p) =>
      !requestedPlayers.some((r) => r.id === p.id) &&
      p.rosterStatus !== 'MLB' &&
      !p.contract.noTradeClause,
  );

  if (nonRequestedOwn.length > 0) {
    const sweetener = nonRequestedOwn[rng.nextInt(0, Math.min(nonRequestedOwn.length - 1, 4))]!;
    const expandedOffer = [...requestedPlayers, sweetener];
    const { fairness: newFairness } = comparePackages(offeredPlayers, expandedOffer);

    if (newFairness > currentFairness) {
      return {
        id: generateTradeId(rng),
        fromTeamId: original.toTeamId,
        toTeamId: original.fromTeamId,
        playersOffered: expandedOffer.map((p) => p.id),
        playersRequested: original.playersOffered,
        status: 'proposed',
        reason: "We'll add a piece to sweeten it.",
      };
    }
  }

  return undefined;
}

/** Build a human-readable reason string for an AI-initiated trade. */
function buildTradeReason(
  targetPosition: string,
  isContender: boolean,
  personality: GMPersonality,
  atDeadline: boolean,
): string {
  const posNames: Record<string, string> = {
    C: 'catching', '1B': 'first base', '2B': 'second base', '3B': 'third base',
    SS: 'shortstop', LF: 'left field', CF: 'center field', RF: 'right field',
    DH: 'designated hitter', SP: 'starting pitching', RP: 'relief pitching', CL: 'closer',
  };
  const posLabel = posNames[targetPosition] ?? targetPosition;

  if (isContender && personality === 'win_now') {
    return `Pushing for a championship — need to upgrade ${posLabel}.`;
  }
  if (isContender && atDeadline) {
    return `Deadline buyer mode: upgrading ${posLabel} for the stretch run.`;
  }
  if (isContender) {
    return `Looking to strengthen ${posLabel} for a playoff push.`;
  }
  if (personality === 'analytical') {
    return `Value opportunity at ${posLabel} — numbers say this is a fit.`;
  }
  return `Exploring an upgrade at ${posLabel}.`;
}
