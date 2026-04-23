export type PlayerMicroArcTopicId =
  | 'injury_return_hero'
  | 'trade_deadline_spark'
  | 'september_callup_hero';

export interface PlayerMicroArcRenderContext {
  readonly playerName: string;
  readonly injuryLabel?: string;
  readonly returnOpsPlusOrEraPlus?: number;
  readonly daysOnIl?: number;
  readonly teamLabel?: string;
  readonly acquiringTeamLabel?: string;
  readonly priorTeamLabel?: string;
  readonly postTradeOpsPlusOrEraPlus?: number;
  readonly tradeDayLabel?: string;
  readonly callupDayLabel?: string;
  readonly callupOpsPlusOrEraPlus?: number;
  readonly ageAtCallup?: number;
}

export const PLAYER_MICRO_ARC_HEADLINE_VARIANTS: Record<
  PlayerMicroArcTopicId,
  ReadonlyArray<(context: PlayerMicroArcRenderContext) => string>
> = {
  injury_return_hero: [
    ({ playerName, injuryLabel }) => `${playerName} turned the ${injuryLabel ?? 'injury'} layoff into a fresh burst.`,
    ({ playerName, daysOnIl }) => `${playerName} made ${daysOnIl ?? 0} quiet days feel like stored energy.`,
    ({ playerName, injuryLabel, teamLabel }) => `${playerName} put the ${injuryLabel ?? 'injury'} return back on ${teamLabel ?? 'the club'}'s front page.`,
  ],
  trade_deadline_spark: [
    ({ playerName, acquiringTeamLabel }) => `${playerName} gave ${acquiringTeamLabel ?? 'the new club'} an immediate deadline answer.`,
    ({ playerName, priorTeamLabel, acquiringTeamLabel }) => `${playerName} left ${priorTeamLabel ?? 'his old club'} and landed hot with ${acquiringTeamLabel ?? 'the buyer'}.`,
    ({ playerName, priorTeamLabel, acquiringTeamLabel, tradeDayLabel }) => `${playerName} made the ${tradeDayLabel ?? 'deadline'} jump from ${priorTeamLabel ?? 'his old club'} to ${acquiringTeamLabel ?? 'the buyer'} look sharp.`,
  ],
  september_callup_hero: [
    ({ playerName, callupDayLabel }) => `${playerName} made ${callupDayLabel ?? 'September'} feel like a real arrival.`,
    ({ playerName, teamLabel, callupDayLabel }) => `${playerName} gave ${teamLabel ?? 'the club'} a late-season rookie pulse from ${callupDayLabel ?? 'September'}.`,
    ({ playerName, ageAtCallup, callupDayLabel }) => `${playerName} turned age ${ageAtCallup ?? 0} into a ${callupDayLabel ?? 'September'} footnote.`,
  ],
};

export const PLAYER_MICRO_ARC_BODY_VARIANTS: Record<
  PlayerMicroArcTopicId,
  ReadonlyArray<(context: PlayerMicroArcRenderContext) => string>
> = {
  injury_return_hero: [
    ({ playerName, teamLabel, injuryLabel, returnOpsPlusOrEraPlus, daysOnIl }) => `After ${daysOnIl ?? 0} days down with the ${injuryLabel ?? 'injury'}, ${playerName} gave ${teamLabel ?? 'the club'} a ${returnOpsPlusOrEraPlus ?? 0}+ first window back.`,
    ({ playerName, injuryLabel, returnOpsPlusOrEraPlus }) => `${playerName} came off the ${injuryLabel ?? 'injury'} and hit the first three weeks back at a ${returnOpsPlusOrEraPlus ?? 0}+ pace.`,
    ({ playerName, teamLabel, injuryLabel, returnOpsPlusOrEraPlus }) => `${teamLabel ?? 'The club'} got more than a ${injuryLabel ?? 'injury'} return date from ${playerName}: a ${returnOpsPlusOrEraPlus ?? 0}+ burst.`,
  ],
  trade_deadline_spark: [
    ({ playerName, priorTeamLabel, acquiringTeamLabel, postTradeOpsPlusOrEraPlus, tradeDayLabel }) => `The ${tradeDayLabel ?? 'deadline'} move from ${priorTeamLabel ?? 'his old club'} to ${acquiringTeamLabel ?? 'his new club'} paid fast, with ${playerName} posting a ${postTradeOpsPlusOrEraPlus ?? 0}+ month.`,
    ({ playerName, priorTeamLabel, acquiringTeamLabel, postTradeOpsPlusOrEraPlus }) => `${acquiringTeamLabel ?? 'The acquiring club'} needed the bat from ${priorTeamLabel ?? 'his old club'}, and ${playerName} opened with a ${postTradeOpsPlusOrEraPlus ?? 0}+ run.`,
    ({ playerName, priorTeamLabel, acquiringTeamLabel }) => `${playerName} changed uniforms from ${priorTeamLabel ?? 'one clubhouse'} to ${acquiringTeamLabel ?? 'another'} and turned the first month into evidence.`,
  ],
  september_callup_hero: [
    ({ playerName, teamLabel, callupDayLabel, callupOpsPlusOrEraPlus, ageAtCallup }) => `${teamLabel ?? 'The club'} called on ${playerName} on ${callupDayLabel ?? 'September 1'} at age ${ageAtCallup ?? 0}, and the first month came back at ${callupOpsPlusOrEraPlus ?? 0}+.`,
    ({ playerName, ageAtCallup, callupOpsPlusOrEraPlus }) => `At ${ageAtCallup ?? 0}, ${playerName} reached the majors and made the small sample count with a ${callupOpsPlusOrEraPlus ?? 0}+ first look.`,
    ({ playerName, teamLabel, callupDayLabel, callupOpsPlusOrEraPlus, ageAtCallup }) => `${playerName} gave ${teamLabel ?? 'the club'} a ${callupDayLabel ?? 'September'} jolt at ${callupOpsPlusOrEraPlus ?? 0}+ for age ${ageAtCallup ?? 0}.`,
  ],
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stablePlayerMicroArcNarrativeKey(
  playerId: string,
  season: number,
  topicId: PlayerMicroArcTopicId,
): string {
  return [playerId, season, topicId].join(':');
}

function pickStablePlayerMicroArcNarrative(
  variants: ReadonlyArray<(context: PlayerMicroArcRenderContext) => string>,
  renderContext: PlayerMicroArcRenderContext,
  playerId: string,
  season: number,
  topicId: PlayerMicroArcTopicId,
): string {
  if (variants.length === 1) {
    return variants[0]!(renderContext);
  }

  const variantIndex = hashString(
    stablePlayerMicroArcNarrativeKey(playerId, season, topicId),
  ) % variants.length;
  return variants[variantIndex]!(renderContext);
}

export function pickStablePlayerMicroArcHeadline(
  topicId: PlayerMicroArcTopicId,
  renderContext: PlayerMicroArcRenderContext,
  playerId: string,
  season: number,
): string {
  return pickStablePlayerMicroArcNarrative(
    PLAYER_MICRO_ARC_HEADLINE_VARIANTS[topicId],
    renderContext,
    playerId,
    season,
    topicId,
  );
}

export function pickStablePlayerMicroArcBody(
  topicId: PlayerMicroArcTopicId,
  renderContext: PlayerMicroArcRenderContext,
  playerId: string,
  season: number,
): string {
  return pickStablePlayerMicroArcNarrative(
    PLAYER_MICRO_ARC_BODY_VARIANTS[topicId],
    renderContext,
    playerId,
    season,
    topicId,
  );
}
