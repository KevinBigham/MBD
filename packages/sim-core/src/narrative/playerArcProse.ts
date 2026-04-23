export type PlayerArcTopicId =
  | 'redemption_arc'
  | 'late_career_peak'
  | 'rookie_breakout';

export interface PlayerArcRenderContext {
  readonly playerName: string;
  readonly teamLabel: string;
  readonly priorWar?: number;
  readonly currentWar?: number;
  readonly age?: number;
  readonly careerWar?: number;
}

export const PLAYER_ARC_HEADLINE_VARIANTS: Record<
  PlayerArcTopicId,
  ReadonlyArray<(context: PlayerArcRenderContext) => string>
> = {
  redemption_arc: [
    ({ playerName }) => `${playerName} turned last season's fade into a real rebound.`,
    ({ playerName }) => `${playerName} forced a rewrite of last year's report.`,
    ({ playerName }) => `${playerName} found the season that was missing a year ago.`,
  ],
  late_career_peak: [
    ({ playerName, age }) => `${playerName} kept the clock from settling the argument at ${age ?? 0}.`,
    ({ playerName }) => `${playerName} found another peak in the late innings of the career.`,
    ({ playerName, age }) => `${playerName} made age ${age ?? 0} look like background noise.`,
  ],
  rookie_breakout: [
    ({ playerName }) => `${playerName} skipped the adjustment year.`,
    ({ playerName }) => `${playerName} turned a first season into a fixture role.`,
    ({ playerName }) => `${playerName} arrived playing like the league already knew the name.`,
  ],
};

export const PLAYER_ARC_BODY_VARIANTS: Record<
  PlayerArcTopicId,
  ReadonlyArray<(context: PlayerArcRenderContext) => string>
> = {
  redemption_arc: [
    ({ playerName, teamLabel, priorWar, currentWar }) => `${playerName} gave ${teamLabel} a hard bounce back, moving from ${priorWar ?? 0} WAR last year to ${currentWar ?? 0} this season.`,
    ({ playerName, teamLabel, priorWar, currentWar }) => `After a ${priorWar ?? 0} WAR season a year ago, ${playerName} answered with ${currentWar ?? 0} WAR for ${teamLabel}.`,
    ({ playerName, teamLabel, priorWar, currentWar }) => `${teamLabel} got a genuine recovery season when ${playerName} climbed from ${priorWar ?? 0} WAR to ${currentWar ?? 0} WAR.`,
  ],
  late_career_peak: [
    ({ playerName, teamLabel, age, careerWar, currentWar }) => `${playerName} reached age ${age ?? 0} with ${careerWar ?? 0} career WAR already banked, then added another ${currentWar ?? 0} WAR season for ${teamLabel}.`,
    ({ playerName, teamLabel, age, careerWar, currentWar }) => `${teamLabel} kept getting star-level work from ${playerName}, who carried ${careerWar ?? 0} career WAR into age ${age ?? 0} and still posted ${currentWar ?? 0} WAR.`,
    ({ playerName, teamLabel, age, careerWar, currentWar }) => `${playerName} entered the year with ${careerWar ?? 0} career WAR and still gave ${teamLabel} ${currentWar ?? 0} WAR at age ${age ?? 0}.`,
  ],
  rookie_breakout: [
    ({ playerName, teamLabel, currentWar }) => `${playerName} gave ${teamLabel} a first-year jolt, clearing ${currentWar ?? 0} WAR before the league could settle on a scouting report.`,
    ({ playerName, teamLabel, currentWar }) => `${teamLabel} got a fast answer from ${playerName}, whose rookie season finished at ${currentWar ?? 0} WAR.`,
    ({ playerName, teamLabel, currentWar }) => `${playerName} never played like a first-year regular, giving ${teamLabel} ${currentWar ?? 0} WAR right out of the gate.`,
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

function stablePlayerArcNarrativeKey(
  playerId: string,
  season: number,
  topicId: PlayerArcTopicId,
): string {
  return [playerId, season, topicId].join(':');
}

function pickStablePlayerArcNarrative(
  variants: ReadonlyArray<(context: PlayerArcRenderContext) => string>,
  renderContext: PlayerArcRenderContext,
  playerId: string,
  season: number,
  topicId: PlayerArcTopicId,
): string {
  if (variants.length === 1) {
    return variants[0]!(renderContext);
  }

  const variantIndex = hashString(
    stablePlayerArcNarrativeKey(playerId, season, topicId),
  ) % variants.length;
  return variants[variantIndex]!(renderContext);
}

export function pickStablePlayerArcHeadline(
  topicId: PlayerArcTopicId,
  renderContext: PlayerArcRenderContext,
  playerId: string,
  season: number,
): string {
  return pickStablePlayerArcNarrative(
    PLAYER_ARC_HEADLINE_VARIANTS[topicId],
    renderContext,
    playerId,
    season,
    topicId,
  );
}

export function pickStablePlayerArcBody(
  topicId: PlayerArcTopicId,
  renderContext: PlayerArcRenderContext,
  playerId: string,
  season: number,
): string {
  return pickStablePlayerArcNarrative(
    PLAYER_ARC_BODY_VARIANTS[topicId],
    renderContext,
    playerId,
    season,
    topicId,
  );
}
