export type PositionGroupTopicId =
  | 'dominant_rotation'
  | 'bullpen_collapse'
  | 'lineup_of_era';

export interface PositionGroupRenderContext {
  readonly teamLabel: string;
  readonly worstStarterEraPlus?: number;
  readonly bestStarterEraPlus?: number;
  readonly combinedInnings?: number;
  readonly bullpenEraPlus?: number;
  readonly bullpenInnings?: number;
  readonly teamWrcPlus?: number;
  readonly leagueRank?: number;
  readonly leadingHitterName?: string;
}

export const POSITION_GROUP_HEADLINE_VARIANTS: Record<
  PositionGroupTopicId,
  ReadonlyArray<(context: PositionGroupRenderContext) => string>
> = {
  dominant_rotation: [
    ({ teamLabel }) => `${teamLabel} built a rotation without a soft landing.`,
    ({ teamLabel }) => `${teamLabel} let the rotation define the summer.`,
    ({ teamLabel }) => `${teamLabel} turned the rotation into the club identity.`,
  ],
  bullpen_collapse: [
    ({ teamLabel }) => `${teamLabel} watched the bullpen bend the season out of shape.`,
    ({ teamLabel }) => `${teamLabel} carried late-inning damage all year.`,
    ({ teamLabel }) => `${teamLabel} could not hide the bullpen leak.`,
  ],
  lineup_of_era: [
    ({ teamLabel }) => `${teamLabel} put a lineup on the short list.`,
    ({ teamLabel }) => `${teamLabel} made every pitching plan feel temporary.`,
    ({ teamLabel }) => `${teamLabel} turned the lineup card into pressure.`,
  ],
};

export const POSITION_GROUP_BODY_VARIANTS: Record<
  PositionGroupTopicId,
  ReadonlyArray<(context: PositionGroupRenderContext) => string>
> = {
  dominant_rotation: [
    ({ teamLabel, worstStarterEraPlus, bestStarterEraPlus, combinedInnings }) => `The ${teamLabel} rotation banked ${combinedInnings ?? 0} innings with every primary starter at ${worstStarterEraPlus ?? 0} ERA+ or better and the staff peak reaching ${bestStarterEraPlus ?? 0}.`,
    ({ teamLabel, worstStarterEraPlus, combinedInnings }) => `${teamLabel} got ${combinedInnings ?? 0} innings from the rotation's top five and never had the group floor drop below ${worstStarterEraPlus ?? 0} ERA+.`,
    ({ teamLabel, bestStarterEraPlus, worstStarterEraPlus }) => `Even the fifth name in the ${teamLabel} rotation cleared ${worstStarterEraPlus ?? 0} ERA+, giving the club a staff that topped out at ${bestStarterEraPlus ?? 0}.`,
  ],
  bullpen_collapse: [
    ({ teamLabel, bullpenEraPlus, bullpenInnings }) => `The ${teamLabel} bullpen absorbed ${bullpenInnings ?? 0} innings at ${bullpenEraPlus ?? 0} ERA+, turning relief work into the club's defining weakness.`,
    ({ teamLabel, bullpenEraPlus }) => `${teamLabel} kept asking the bullpen for answers and got a ${bullpenEraPlus ?? 0} ERA+ season instead.`,
    ({ teamLabel, bullpenInnings, bullpenEraPlus }) => `Across ${bullpenInnings ?? 0} innings, the ${teamLabel} relief group sat at ${bullpenEraPlus ?? 0} ERA+ and left too many games exposed.`,
  ],
  lineup_of_era: [
    ({ teamLabel, teamWrcPlus, leagueRank, leadingHitterName }) => `${teamLabel} ranked ${leagueRank ?? 0} in the league at ${teamWrcPlus ?? 0} wRC+, with ${leadingHitterName ?? 'the top bat'} setting the pace.`,
    ({ teamLabel, teamWrcPlus, leagueRank }) => `The ${teamLabel} lineup closed at league rank ${leagueRank ?? 0} with a ${teamWrcPlus ?? 0} wRC+ profile that stretched past one hot bat.`,
    ({ teamLabel, leadingHitterName, teamWrcPlus }) => `${leadingHitterName ?? 'The leading hitter'} headlined it, but the full ${teamLabel} lineup carried the real story at ${teamWrcPlus ?? 0} wRC+.`,
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

function stablePositionGroupNarrativeKey(
  teamId: string,
  season: number,
  topicId: PositionGroupTopicId,
): string {
  return [teamId, season, topicId].join(':');
}

function pickStablePositionGroupNarrative(
  variants: ReadonlyArray<(context: PositionGroupRenderContext) => string>,
  renderContext: PositionGroupRenderContext,
  teamId: string,
  season: number,
  topicId: PositionGroupTopicId,
): string {
  if (variants.length === 1) {
    return variants[0]!(renderContext);
  }

  const variantIndex = hashString(
    stablePositionGroupNarrativeKey(teamId, season, topicId),
  ) % variants.length;
  return variants[variantIndex]!(renderContext);
}

export function pickStablePositionGroupHeadline(
  topicId: PositionGroupTopicId,
  renderContext: PositionGroupRenderContext,
  teamId: string,
  season: number,
): string {
  return pickStablePositionGroupNarrative(
    POSITION_GROUP_HEADLINE_VARIANTS[topicId],
    renderContext,
    teamId,
    season,
    topicId,
  );
}

export function pickStablePositionGroupBody(
  topicId: PositionGroupTopicId,
  renderContext: PositionGroupRenderContext,
  teamId: string,
  season: number,
): string {
  return pickStablePositionGroupNarrative(
    POSITION_GROUP_BODY_VARIANTS[topicId],
    renderContext,
    teamId,
    season,
    topicId,
  );
}
