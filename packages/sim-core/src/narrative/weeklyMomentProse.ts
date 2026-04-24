export type WeeklyMomentTopicId =
  | 'hot_streak_week'
  | 'cold_snap_week'
  | 'closer_lights_out'
  | 'closer_meltdown_week'
  | 'bench_clutch_week'
  | 'bullpen_overwork_warning';

export interface WeeklyMomentRenderContext {
  readonly teamLabel?: string;
  readonly playerName?: string;
  readonly wins?: number;
  readonly losses?: number;
  readonly runDifferential?: number;
  readonly saves?: number;
  readonly earnedRuns?: number;
  readonly blownSaves?: number;
  readonly outings?: number;
  readonly rbi?: number;
  readonly homeRuns?: number;
  readonly bullpenInnings?: number;
  readonly consecutiveDays?: number;
}

export interface WeeklyMomentStableKey {
  readonly teamId?: string;
  readonly playerId?: string;
  readonly season: number;
  readonly weekStartDay: number;
}

type WeeklyMomentVariant = (context: WeeklyMomentRenderContext) => string;
type WeeklyMomentTemplateMap = Record<WeeklyMomentTopicId, readonly string[]>;

const team = (context: WeeklyMomentRenderContext): string => context.teamLabel ?? 'The club';
const closer = (context: WeeklyMomentRenderContext): string => context.playerName ?? 'The closer';
const stat = (value: number | undefined): string => `${value ?? 0}`;
const signed = (value: number | undefined): string => (value != null && value > 0 ? `+${value}` : stat(value));

function renderTemplate(template: string, context: WeeklyMomentRenderContext): string {
  return template
    .replaceAll('$team', team(context))
    .replaceAll('$closer', closer(context))
    .replaceAll('$wins', stat(context.wins))
    .replaceAll('$losses', stat(context.losses))
    .replaceAll('$rd', signed(context.runDifferential))
    .replaceAll('$saves', stat(context.saves))
    .replaceAll('$er', stat(context.earnedRuns))
    .replaceAll('$bs', stat(context.blownSaves))
    .replaceAll('$outings', stat(context.outings))
    .replaceAll('$rbi', stat(context.rbi))
    .replaceAll('$hr', stat(context.homeRuns))
    .replaceAll('$ip', stat(context.bullpenInnings))
    .replaceAll('$days', stat(context.consecutiveDays));
}

function buildVariants(templatesByTopic: WeeklyMomentTemplateMap): Record<
  WeeklyMomentTopicId,
  ReadonlyArray<WeeklyMomentVariant>
> {
  return {
    hot_streak_week: templatesByTopic.hot_streak_week.map((template) => (context) => renderTemplate(template, context)),
    cold_snap_week: templatesByTopic.cold_snap_week.map((template) => (context) => renderTemplate(template, context)),
    closer_lights_out: templatesByTopic.closer_lights_out.map((template) => (context) => renderTemplate(template, context)),
    closer_meltdown_week: templatesByTopic.closer_meltdown_week.map((template) => (context) => renderTemplate(template, context)),
    bench_clutch_week: templatesByTopic.bench_clutch_week.map((template) => (context) => renderTemplate(template, context)),
    bullpen_overwork_warning: templatesByTopic.bullpen_overwork_warning.map((template) => (context) => renderTemplate(template, context)),
  };
}

export const WEEKLY_MOMENT_HEADLINE_VARIANTS = buildVariants({
  hot_streak_week: [
    '$team got hot.',
    '$team kept rolling.',
    '$team owned the week.',
    '$team found lift.',
    '$team made noise.',
    '$team stacked wins.',
  ],
  cold_snap_week: [
    '$team went cold.',
    '$team hit a skid.',
    '$team lost traction.',
    '$team needs a reset.',
    '$team absorbed a rough week.',
    '$team stalled hard.',
  ],
  closer_lights_out: [
    '$closer slammed the door.',
    '$closer owned the ninth.',
    '$closer looked automatic.',
    '$closer made leads hold.',
    '$closer kept it clean.',
    '$closer ruled the week.',
  ],
  closer_meltdown_week: [
    '$closer lost the edge.',
    '$closer shook the ninth.',
    '$closer reopened late leads.',
    '$closer hit turbulence.',
    '$closer raised alarms.',
    '$closer forced a review.',
  ],
  bench_clutch_week: [
    '$team got bench thunder.',
    '$team found role-player runs.',
    '$team got lift below the lineup.',
    '$team saw the bench answer.',
    '$team used every bat.',
    '$team found depth swings.',
  ],
  bullpen_overwork_warning: [
    '$team taxed the bullpen.',
    '$team leaned hard on relief.',
    '$team flashed a fatigue warning.',
    '$team spent bullpen depth.',
    '$team stretched the relief group.',
    '$team pushed late-inning volume.',
  ],
});

export const WEEKLY_MOMENT_BODY_VARIANTS = buildVariants({
  hot_streak_week: [
    '$wins wins, $rd runs.',
    'Seven days closed at $rd.',
    '$team banked $wins wins.',
    'The week produced a $rd margin.',
    '$wins wins changed the pace.',
    '$team turned form into pressure.',
  ],
  cold_snap_week: [
    '$losses losses, $rd runs.',
    '$team left the window at $rd.',
    '$losses losses forced a reset.',
    'The skid put roles under review.',
    '$team could not steady the week.',
    '$losses losses followed them home.',
  ],
  closer_lights_out: [
    '$saves saves, $er earned runs.',
    '$closer converted every chance.',
    '$saves clean saves steadied the pen.',
    'Late leads became routine.',
    '$closer gave nothing back.',
    'The final inning stayed quiet.',
  ],
  closer_meltdown_week: [
    '$bs blown saves, $er earned runs.',
    '$er runs crossed in $outings outings.',
    '$closer let late leads slip.',
    'The next save now carries heat.',
    '$outings outings changed the conversation.',
    '$team has a ninth-inning question.',
  ],
  bench_clutch_week: [
    '$rbi RBI came from projected bench bats.',
    '$hr bench homers supplied the spark.',
    '$rbi RBI and $hr HR changed games.',
    'Depth bats gave $team leverage.',
    '$team found runs outside the starting nine.',
    'Role players turned usage into value.',
  ],
  bullpen_overwork_warning: [
    '$ip relief innings in seven days.',
    '$days straight days hit the warning line.',
    '$ip innings strained tomorrow choices.',
    'The relief calendar got tight.',
    '$team spent bullpen inventory fast.',
    'Volume made the next series harder.',
  ],
});

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableWeeklyMomentNarrativeKey(
  topicId: WeeklyMomentTopicId,
  stableKey: WeeklyMomentStableKey,
): string {
  return [
    stableKey.teamId ?? '',
    stableKey.playerId ?? '',
    stableKey.season,
    stableKey.weekStartDay,
    topicId,
  ].join('|');
}

function pickStableWeeklyMomentNarrative(
  variants: ReadonlyArray<WeeklyMomentVariant>,
  topicId: WeeklyMomentTopicId,
  renderContext: WeeklyMomentRenderContext,
  stableKey: WeeklyMomentStableKey,
): string {
  if (variants.length === 1) {
    return variants[0]!(renderContext);
  }

  const variantIndex = hashString(stableWeeklyMomentNarrativeKey(topicId, stableKey)) % variants.length;
  return variants[variantIndex]!(renderContext);
}

export function pickStableWeeklyMomentHeadline(
  topicId: WeeklyMomentTopicId,
  renderContext: WeeklyMomentRenderContext,
  stableKey: WeeklyMomentStableKey,
): string {
  return pickStableWeeklyMomentNarrative(
    WEEKLY_MOMENT_HEADLINE_VARIANTS[topicId],
    topicId,
    renderContext,
    stableKey,
  );
}

export function pickStableWeeklyMomentBody(
  topicId: WeeklyMomentTopicId,
  renderContext: WeeklyMomentRenderContext,
  stableKey: WeeklyMomentStableKey,
): string {
  return pickStableWeeklyMomentNarrative(
    WEEKLY_MOMENT_BODY_VARIANTS[topicId],
    topicId,
    renderContext,
    stableKey,
  );
}
