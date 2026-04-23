export type DynastyMarkerTopicId =
  | 'three_peat'
  | 'era_ending_collapse'
  | 'perennial_contender';

export interface DynastyMarkerRenderContext {
  readonly teamLabel: string;
  readonly startingSeason?: number;
  readonly endingSeason?: number;
  readonly priorWins?: number;
  readonly currentWins?: number;
  readonly priorSeason?: number;
  readonly streakLength?: number;
  readonly streakStartSeason?: number;
  readonly currentSeason?: number;
}

export const DYNASTY_MARKER_HEADLINE_VARIANTS: Record<
  DynastyMarkerTopicId,
  ReadonlyArray<(context: DynastyMarkerRenderContext) => string>
> = {
  three_peat: [
    ({ teamLabel }) => `${teamLabel} turned three Octobers into one era.`,
    ({ teamLabel }) => `${teamLabel} closed the book on a third straight title.`,
    ({ teamLabel }) => `${teamLabel} finished a three-championship run without a break.`,
  ],
  era_ending_collapse: [
    ({ teamLabel }) => `${teamLabel} went from October certainty to a losing record.`,
    ({ teamLabel }) => `${teamLabel} lost the shape of a contender in one year.`,
    ({ teamLabel }) => `${teamLabel} came apart a season after a playoff run.`,
  ],
  perennial_contender: [
    ({ teamLabel }) => `${teamLabel} made a fifth straight October reservation.`,
    ({ teamLabel }) => `${teamLabel} turned contention into the annual schedule.`,
    ({ teamLabel }) => `${teamLabel} kept the playoff streak alive for year five.`,
  ],
};

export const DYNASTY_MARKER_BODY_VARIANTS: Record<
  DynastyMarkerTopicId,
  ReadonlyArray<(context: DynastyMarkerRenderContext) => string>
> = {
  three_peat: [
    ({ teamLabel, startingSeason, endingSeason }) => `${teamLabel} ended the ${startingSeason ?? 0}-${endingSeason ?? 0} span with three straight championships, leaving the decade under one set of colors.`,
    ({ teamLabel, startingSeason, endingSeason }) => `From ${startingSeason ?? 0} through ${endingSeason ?? 0}, ${teamLabel} kept ending the season on top and made the title path feel familiar.`,
    ({ teamLabel, startingSeason, endingSeason }) => `The ${startingSeason ?? 0}-${endingSeason ?? 0} run belongs to ${teamLabel}, which stacked three consecutive championships without handing the crown away.`,
  ],
  era_ending_collapse: [
    ({ teamLabel, priorWins, currentWins, priorSeason }) => `After winning ${priorWins ?? 0} games and reaching the playoffs in ${priorSeason ?? 0}, ${teamLabel} fell to ${currentWins ?? 0} wins and changed the franchise temperature overnight.`,
    ({ teamLabel, priorWins, currentWins, priorSeason }) => `One year removed from a ${priorWins ?? 0}-win playoff season in ${priorSeason ?? 0}, ${teamLabel} closed at ${currentWins ?? 0} wins and forced a harder conversation about the window.`,
    ({ teamLabel, priorWins, currentWins, priorSeason }) => `${teamLabel} followed a playoff berth in ${priorSeason ?? 0} with ${currentWins ?? 0} wins after reaching ${priorWins ?? 0} the year before, the kind of drop that ends an era.`,
  ],
  perennial_contender: [
    ({ teamLabel, streakLength, streakStartSeason }) => `${teamLabel} reached the postseason for the ${streakLength ?? 0}th straight year, a run that started in ${streakStartSeason ?? 0} and now defines the franchise.`,
    ({ teamLabel, streakLength, streakStartSeason }) => `Since ${streakStartSeason ?? 0}, ${teamLabel} has kept October on the calendar every year, and year ${streakLength ?? 0} confirmed the club as a permanent fixture.`,
    ({ teamLabel, streakLength, streakStartSeason }) => `The playoffs opened again for ${teamLabel}, whose ${streakLength ?? 0}-season streak now stretches back to ${streakStartSeason ?? 0}.`,
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

function stableDynastyMarkerNarrativeKey(
  teamId: string,
  season: number,
  topicId: DynastyMarkerTopicId,
): string {
  return [teamId, season, topicId].join(':');
}

function pickStableDynastyMarkerNarrative(
  variants: ReadonlyArray<(context: DynastyMarkerRenderContext) => string>,
  renderContext: DynastyMarkerRenderContext,
  teamId: string,
  season: number,
  topicId: DynastyMarkerTopicId,
): string {
  if (variants.length === 1) {
    return variants[0]!(renderContext);
  }

  const variantIndex = hashString(
    stableDynastyMarkerNarrativeKey(teamId, season, topicId),
  ) % variants.length;
  return variants[variantIndex]!(renderContext);
}

export function pickStableDynastyMarkerHeadline(
  topicId: DynastyMarkerTopicId,
  renderContext: DynastyMarkerRenderContext,
  teamId: string,
  season: number,
): string {
  return pickStableDynastyMarkerNarrative(
    DYNASTY_MARKER_HEADLINE_VARIANTS[topicId],
    renderContext,
    teamId,
    season,
    topicId,
  );
}

export function pickStableDynastyMarkerBody(
  topicId: DynastyMarkerTopicId,
  renderContext: DynastyMarkerRenderContext,
  teamId: string,
  season: number,
): string {
  return pickStableDynastyMarkerNarrative(
    DYNASTY_MARKER_BODY_VARIANTS[topicId],
    renderContext,
    teamId,
    season,
    topicId,
  );
}
