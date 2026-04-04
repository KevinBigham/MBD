import type { GameRNG } from '../math/prng.js';
import type { GMPersonality } from '../trade/tradeAI.js';

export type TradeDeadlineMode = 'buyer' | 'seller' | 'standing_pat';
export type TradeNegotiationType = 'proposal' | 'counter' | 'offer';

export interface TradeDialogue {
  readonly mode: TradeDeadlineMode;
  readonly urgency: 'low' | 'medium' | 'high';
  readonly headline: string;
  readonly lines: string[];
}

export interface TradeChatterItem {
  readonly id: string;
  readonly headline: string;
  readonly detail: string;
  readonly mode: TradeDeadlineMode;
  readonly teamId: string | null;
}

function pickOne<T>(rng: GameRNG, values: readonly T[]): T {
  return values[Math.floor(rng.nextFloat() * values.length)]!;
}

export function deriveTradeDeadlineMode(context: {
  readonly winPct: number;
  readonly gamesBack: number;
  readonly daysUntilDeadline: number | null;
  readonly gmPersonality: GMPersonality;
}): TradeDeadlineMode {
  const daysUntilDeadline = context.daysUntilDeadline ?? 99;

  if (
    context.winPct >= 0.54
    || (daysUntilDeadline <= 10 && context.gamesBack <= 3)
    || (context.gmPersonality === 'win_now' && context.winPct >= 0.5 && daysUntilDeadline <= 14)
  ) {
    return 'buyer';
  }

  if (
    context.winPct <= 0.46
    && (context.gamesBack >= 5 || daysUntilDeadline <= 10)
  ) {
    return 'seller';
  }

  if (context.gmPersonality === 'prospect_hugger' || context.gmPersonality === 'conservative') {
    return 'standing_pat';
  }

  return 'standing_pat';
}

function urgencyForDialogue(mode: TradeDeadlineMode, daysUntilDeadline: number | null): TradeDialogue['urgency'] {
  if (daysUntilDeadline != null && daysUntilDeadline <= 2) {
    return 'high';
  }
  if (mode !== 'standing_pat' && daysUntilDeadline != null && daysUntilDeadline <= 7) {
    return 'high';
  }
  if (daysUntilDeadline != null && daysUntilDeadline <= 14) {
    return 'medium';
  }
  return 'low';
}

function leverageBucket(offerValue: number, requestValue: number): 'favorable' | 'balanced' | 'thin' {
  const gap = offerValue - requestValue;
  if (gap >= 8) {
    return 'favorable';
  }
  if (gap <= -8) {
    return 'thin';
  }
  return 'balanced';
}

export function generateTradeDialogue(
  rng: GameRNG,
  context: {
    readonly teamName: string;
    readonly gmPersonality: GMPersonality;
    readonly mode: TradeDeadlineMode;
    readonly daysUntilDeadline: number | null;
    readonly offerValue: number;
    readonly requestValue: number;
    readonly negotiationType: TradeNegotiationType;
  },
): TradeDialogue {
  const urgency = urgencyForDialogue(context.mode, context.daysUntilDeadline);
  const leverage = leverageBucket(context.offerValue, context.requestValue);
  const headline = context.negotiationType === 'counter'
    ? `${context.teamName} push back on the frame`
    : context.negotiationType === 'offer'
      ? `${context.teamName} bring a live deadline call`
      : `${context.teamName} weigh the proposal`;

  const postureLine = context.mode === 'buyer'
    ? pickOne(rng, [
        'We are buying wins, not moving bodies for the sake of motion.',
        'If this deal helps the stretch run, we can talk. If not, we move on.',
      ])
    : context.mode === 'seller'
      ? pickOne(rng, [
          'We are open for business, but the prospect return has to justify it.',
          'Veterans are available here, but we are not discounting the market.',
        ])
      : pickOne(rng, [
          'We can live with this roster if the board never moves.',
          'Nothing has to happen on our side unless the value gets loud.',
        ]);

  const personalityLine = context.gmPersonality === 'aggressive'
    ? 'Our room wants a clean yes-or-no fast, because hesitation kills deadline leverage.'
    : context.gmPersonality === 'analytical'
      ? 'The model is simple: match the surplus value and we can keep talking.'
      : context.gmPersonality === 'prospect_hugger'
        ? 'Young talent is the line here, so any ask touching that tier needs to be real.'
        : context.gmPersonality === 'win_now'
          ? 'If this helps October, we will pay, but not for a sidegrade.'
          : 'We are not chasing noise; the fit and the price both need to hold.';

  const leverageLine = leverage === 'favorable'
    ? pickOne(rng, [
        'This shape works for us as written, so the conversation can stay alive.',
        'The value tilt is finally pointed our way, and that gets our attention.',
      ])
    : leverage === 'thin'
      ? pickOne(rng, [
          'Right now the offer is light for what you are asking us to surrender.',
          'The framework is not there yet; the outgoing value is still too rich on our side.',
        ])
      : pickOne(rng, [
          'The framework is in range, but we would still need one clean push to close it.',
          'The bones are workable, even if the finish is not there yet.',
        ]);

  return {
    mode: context.mode,
    urgency,
    headline,
    lines: [postureLine, personalityLine, leverageLine],
  };
}

export function generateTradeChatter(
  rng: GameRNG,
  context: {
    readonly userTeamName: string;
    readonly userMode: TradeDeadlineMode;
    readonly daysUntilDeadline: number | null;
    readonly activeTeams: Array<{
      teamId: string;
      teamName: string;
      mode: TradeDeadlineMode;
    }>;
    readonly recentTradeSummaries: string[];
  },
): TradeChatterItem[] {
  const chatter: TradeChatterItem[] = [];

  chatter.push({
    id: `user-mode-${context.userMode}`,
    headline: context.userMode === 'buyer'
      ? `${context.userTeamName} are flagged as buyers`
      : context.userMode === 'seller'
        ? `${context.userTeamName} are fielding seller calls`
        : `${context.userTeamName} are holding a middle posture`,
    detail: context.userMode === 'buyer'
      ? 'The room is reading urgency around upgrades that move the playoff needle.'
      : context.userMode === 'seller'
        ? 'Clubs are assuming veterans can be pried loose for future value.'
        : 'Other front offices think it will take a decisive overpay to shake this roster loose.',
    mode: context.userMode,
    teamId: null,
  });

  const hottestTeam = context.activeTeams[0] ?? null;
  if (hottestTeam) {
    chatter.push({
      id: `active-${hottestTeam.teamId}`,
      headline: `${hottestTeam.teamName} are one of the louder clubs in the market`,
      detail: hottestTeam.mode === 'buyer'
        ? pickOne(rng, [
            'Scouts see them hunting impact pieces before the clock gets tighter.',
            'Their posture reads like a club that wants one more major move.',
          ])
        : hottestTeam.mode === 'seller'
          ? pickOne(rng, [
              'Executives expect them to keep converting present value into future value.',
              'Their veterans are getting real traction with rivals.',
            ])
          : pickOne(rng, [
              'They are talking, but nobody is sure they actually need to act.',
              'The signal is mixed enough that rival rooms are still guessing.',
            ]),
      mode: hottestTeam.mode,
      teamId: hottestTeam.teamId,
    });
  }

  if (context.recentTradeSummaries[0]) {
    chatter.push({
      id: 'market-last-move',
      headline: 'Latest market shockwave',
      detail: context.recentTradeSummaries[0],
      mode: 'standing_pat',
      teamId: null,
    });
  }

  if (context.daysUntilDeadline != null) {
    chatter.push({
      id: 'countdown',
      headline: context.daysUntilDeadline <= 1 ? 'Deadline pressure is peaking' : 'The window is narrowing',
      detail: `${context.daysUntilDeadline} day${context.daysUntilDeadline === 1 ? '' : 's'} remain for clubs to show their hand.`,
      mode: 'standing_pat',
      teamId: null,
    });
  }

  return chatter.slice(0, 4);
}
