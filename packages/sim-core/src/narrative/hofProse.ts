import { pickStableProseVariant, renderStableTemplate } from './stableProse.js';

export type HallOfFameInductionType = 'first_ballot' | 'ballot' | 'not_selected';

export type HallOfFameCapstoneBranch =
  | 'unanimous'
  | 'first_ballot'
  | 'borderline'
  | 'journeyman_honor'
  | 'hometown_hero'
  | 'standard';

export const HOF_CAPSTONE_BRANCH_VARIANTS = {
  unanimous: [
    '{playerName} entered the Hall in season {season} as the rare case with no real daylight between reputation, numbers, and memory.',
    'By season {season}, {playerName} had built the kind of Hall case that made debate feel procedural instead of necessary.',
  ],
  first_ballot: [
    '{playerName} cleared the first-ballot standard in season {season}, turning a full career of production into immediate permanence.',
    'The Hall did not ask {playerName} to wait; season {season} made the career feel complete enough for a first-ballot welcome.',
  ],
  borderline: [
    '{playerName} reached Cooperstown through the narrow lane, a season {season} honor built on longevity, advocates, and a case that held together.',
    'The wait gave {playerName}\'s Hall case sharper edges, but season {season} finally settled the argument in his favor.',
  ],
  journeyman_honor: [
    '{playerName} wore more than one uniform into the Hall conversation, and season {season} honored the full road instead of a single stop.',
    'The plaque belongs to {playerName}, but the route ran through several clubhouses before season {season} made it permanent.',
  ],
  hometown_hero: [
    '{playerName} entered the Hall as a {teamName} story from start to finish, the kind of one-club career that turns memory into civic property.',
    'Season {season} gave {teamName} fans the cleanest kind of Hall celebration: {playerName}, one uniform, and a career that never needed translation.',
  ],
  standard: [
    '{playerName} entered the Hall in season {season}, carrying a career strong enough to stand without extra decoration.',
    'Season {season} put {playerName} where the career had been pointing, among the names that define a generation of the league.',
  ],
} as const satisfies Readonly<Record<HallOfFameCapstoneBranch, readonly string[]>>;

export interface ResolveHallOfFameBranchContext {
  readonly score: number;
  readonly inductionType: HallOfFameInductionType;
  readonly teamIds: readonly string[];
}

export interface PickHallOfFameInductionSummaryContext extends ResolveHallOfFameBranchContext {
  readonly playerId: string;
  readonly playerName: string;
  readonly teamName: string;
  readonly season: number;
  readonly branch?: HallOfFameCapstoneBranch;
}

export function resolveHallOfFameBranch(
  context: ResolveHallOfFameBranchContext,
): HallOfFameCapstoneBranch {
  if (context.score >= 100) return 'unanimous';
  if (context.teamIds.length === 1) return 'hometown_hero';
  if (context.teamIds.length >= 5) return 'journeyman_honor';
  if (context.inductionType === 'ballot' || (context.score >= 60 && context.score <= 75)) return 'borderline';
  if (context.inductionType === 'first_ballot') return 'first_ballot';
  return 'standard';
}

export function pickHallOfFameInductionSummary(
  context: PickHallOfFameInductionSummaryContext,
): string {
  const branch = context.branch ?? resolveHallOfFameBranch(context);
  const template = pickStableProseVariant(HOF_CAPSTONE_BRANCH_VARIANTS[branch], {
    playerId: context.playerId,
    season: context.season,
    ceremonyType: 'hall_of_fame',
    branch,
  });

  return renderStableTemplate(template, {
    playerName: context.playerName,
    teamName: context.teamName,
    season: context.season,
    score: context.score,
  });
}
