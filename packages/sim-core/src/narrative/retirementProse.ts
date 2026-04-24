import { pickStableProseVariant, renderStableTemplate } from './stableProse.js';

export type RetirementCapstonePoolId =
  | 'retirement_speech'
  | 'jersey_retirement'
  | 'farewell_tour'
  | 'debut_press';

export type RetirementSpeechBranch =
  | 'champion_retiree'
  | 'star_without_ring'
  | 'hometown_retirement'
  | 'trade_exile_retirement'
  | 'injury_forced_retirement'
  | 'standard_retirement';

export type JerseyRetirementBranch =
  | 'career_on_one_team'
  | 'legend_returns_home'
  | 'posthumous_honor'
  | 'hof_jersey'
  | 'standard_jersey';

export type FarewellTourBranch =
  | 'farewell_on_contender'
  | 'farewell_on_tank'
  | 'quiet_farewell'
  | 'loud_farewell'
  | 'standard_farewell';

export type DebutPressBranch =
  | 'top_prospect_debut'
  | 'international_debut'
  | 'sept_callup'
  | 'veteran_journeyman_debut'
  | 'standard_debut';

export type RetirementCapstoneBranch =
  | RetirementSpeechBranch
  | JerseyRetirementBranch
  | FarewellTourBranch
  | DebutPressBranch;

type RetirementBranchVariants = {
  readonly retirement_speech: Readonly<Record<RetirementSpeechBranch, readonly string[]>>;
  readonly jersey_retirement: Readonly<Record<JerseyRetirementBranch, readonly string[]>>;
  readonly farewell_tour: Readonly<Record<FarewellTourBranch, readonly string[]>>;
  readonly debut_press: Readonly<Record<DebutPressBranch, readonly string[]>>;
};

export const RETIREMENT_CAPSTONE_BRANCH_VARIANTS = {
  retirement_speech: {
    champion_retiree: [
      '{playerName} left with a ring in the story, giving {teamName} a retirement speech that sounded more like a victory lap than an ending.',
      'The farewell for {playerName} carried championship weight, the kind that lets a career close with proof instead of only applause.',
    ],
    star_without_ring: [
      '{playerName} retired without the final October answer, but the speech made clear how much of the league still had to account for him.',
      'There was no ring to frame it, so {playerName} let the career stand on craft, volume, and every season opponents planned around him.',
    ],
    hometown_retirement: [
      '{playerName} closed the book with {teamName}, keeping the whole arc in one place from first cheers to final ovation.',
      'For {teamName}, the retirement of {playerName} felt local in the deepest way: one uniform, one city, and a career fans could age with.',
    ],
    trade_exile_retirement: [
      '{playerName} retired after a winding final chapter, and the speech carried the ache of a star who had to finish away from old familiar walls.',
      'The last stop was not the whole story for {playerName}; retirement stitched the traded years back into the larger career.',
    ],
    injury_forced_retirement: [
      '{playerName} stepped away with the body making part of the decision, turning the speech into equal parts gratitude and unfinished business.',
      'Injuries narrowed the ending for {playerName}, but the retirement room still sounded like a career being honored on its own terms.',
    ],
    standard_retirement: [
      '{playerName} retired with a steady speech, thanking {teamName} and leaving behind the kind of career that rewards a second look.',
      'The final words from {playerName} were measured, but the meaning was plain: the game had taken years, and given a legacy back.',
    ],
  },
  jersey_retirement: {
    career_on_one_team: [
      '{teamName} lifted {playerName} into franchise permanence because one uniform had carried the whole argument.',
      'The number stayed home with {playerName}, a one-team career now hanging where every future prospect can see it.',
    ],
    legend_returns_home: [
      '{playerName} came back to {teamName} for the honor that made the old bond official, even after the road had taken him elsewhere.',
      'The ceremony gave {playerName} a way back home, turning years of distance into one clean franchise salute.',
    ],
    posthumous_honor: [
      '{teamName} retired the number with memory doing the speaking, honoring {playerName} as a legacy still present in the ballpark.',
      'The tribute for {playerName} carried a quieter weight, placing the number beyond use and the story beyond the season.',
    ],
    hof_jersey: [
      '{teamName} tied the retired number to a Hall-level career, making {playerName} part of the franchise architecture.',
      'With the Hall case secured, {playerName} received the kind of number ceremony that turns excellence into permanent signage.',
    ],
    standard_jersey: [
      '{teamName} retired the number because {playerName} meant more than the stat line, and the crowd understood the difference.',
      'The jersey ceremony for {playerName} made the franchise memory physical, one number pulled out of circulation for good.',
    ],
  },
  farewell_tour: {
    farewell_on_contender: [
      '{playerName} is taking a final lap with {teamName} still playing meaningful baseball, so every ovation comes with standings pressure attached.',
      'The farewell for {playerName} has contender noise underneath it, a last-season tour that still has work to do.',
    ],
    farewell_on_tank: [
      '{playerName} is getting the long goodbye while {teamName} looks toward the future, giving fans a reason to stay with a hard season.',
      'The standings may be thin, but {playerName} gives {teamName} one last appointment viewing stretch before the rebuild fully takes over.',
    ],
    quiet_farewell: [
      '{playerName} is letting the final season move softly, accepting smaller ovations from the people who watched the details.',
      'There is no spectacle around {playerName}, just a quiet farewell for a career that does not need to shout at the end.',
    ],
    loud_farewell: [
      '{playerName} is getting the full-volume goodbye, with every stop treating the last season like an event of its own.',
      'The farewell for {playerName} is impossible to miss, a loud public accounting of everything the league is about to lose.',
    ],
    standard_farewell: [
      '{playerName} began the farewell stretch with {teamName}, turning ordinary series into smaller ceremonies along the way.',
      'The final season for {playerName} now has a frame, and {teamName} will carry that emotion from city to city.',
    ],
  },
  debut_press: {
    top_prospect_debut: [
      '{playerName} met the cameras as a premium prospect, with {teamName} making it clear the future is no longer theoretical.',
      'The debut room around {playerName} had top-prospect voltage, every answer measured against what {teamName} believes is coming.',
    ],
    international_debut: [
      '{playerName} turned an international path into a major-league podium, giving {teamName} a debut story with distance behind it.',
      'The first press conference for {playerName} carried a global arc, from scouting conviction to a {teamName} uniform.',
    ],
    sept_callup: [
      '{playerName} arrived in the late-season window, where a debut can be both reward and audition for {teamName}.',
      'The September call gave {playerName} a first taste of the room, and {teamName} will spend the winter deciding how much it means.',
    ],
    veteran_journeyman_debut: [
      '{playerName} finally reached the podium after enough bus rides to make the moment feel earned before the first question.',
      'This was not a prospect-script debut for {playerName}; it was a veteran arrival, late enough to carry real gratitude.',
    ],
    standard_debut: [
      '{playerName} handled the first {teamName} press conference like the start of a job, not the end of a chase.',
      'The debut for {playerName} gave {teamName} a clean first look, with the larger story still waiting on the field.',
    ],
  },
} as const satisfies RetirementBranchVariants;

export interface ResolveRetirementBranchContext {
  readonly championshipRings?: number;
  readonly currentTeamId?: string;
  readonly teamIds?: readonly string[];
  readonly peakOverall?: number;
  readonly priorSeasonGamesMissed?: number;
}

export interface ResolveJerseyRetirementBranchContext {
  readonly inductionType?: 'first_ballot' | 'ballot' | 'not_selected';
  readonly hallOfFame?: boolean;
  readonly posthumous?: boolean;
  readonly currentTeamId?: string;
  readonly teamIds?: readonly string[];
}

export interface ResolveFarewellTourBranchContext {
  readonly wins?: number;
  readonly losses?: number;
  readonly leadership?: number;
  readonly overallRating?: number;
}

export interface ResolveDebutPressBranchContext {
  readonly age?: number;
  readonly previousLevel?: string;
  readonly acquisitionType?: 'draft' | 'ifa';
  readonly draftRound?: number | null;
  readonly draftPickNumber?: number | null;
  readonly callupDay?: number | null;
  readonly topProspect?: boolean;
}

interface BaseRetirementPickContext {
  readonly playerId: string;
  readonly playerName: string;
  readonly teamName: string;
  readonly season: number;
}

export interface PickRetirementSpeechLineContext extends BaseRetirementPickContext, ResolveRetirementBranchContext {
  readonly branch?: RetirementSpeechBranch;
}

export interface PickJerseyRetirementLineContext extends BaseRetirementPickContext, ResolveJerseyRetirementBranchContext {
  readonly branch?: JerseyRetirementBranch;
}

export interface PickFarewellTourLineContext extends BaseRetirementPickContext, ResolveFarewellTourBranchContext {
  readonly branch?: FarewellTourBranch;
}

export interface PickDebutPressLineContext extends BaseRetirementPickContext, ResolveDebutPressBranchContext {
  readonly branch?: DebutPressBranch;
}

export function resolveRetirementBranch(context: ResolveRetirementBranchContext): RetirementSpeechBranch {
  const teamIds = context.teamIds ?? [];
  if ((context.championshipRings ?? 0) > 0) return 'champion_retiree';
  if ((context.priorSeasonGamesMissed ?? 0) >= 70) return 'injury_forced_retirement';
  if (teamIds.length === 1 && (!context.currentTeamId || teamIds[0] === context.currentTeamId)) return 'hometown_retirement';
  if (teamIds.length >= 3) return 'trade_exile_retirement';
  if ((context.peakOverall ?? 0) >= 75) return 'star_without_ring';
  return 'standard_retirement';
}

export function resolveJerseyRetirementBranch(context: ResolveJerseyRetirementBranchContext): JerseyRetirementBranch {
  const teamIds = context.teamIds ?? [];
  if (context.posthumous) return 'posthumous_honor';
  if (context.hallOfFame || context.inductionType === 'first_ballot' || context.inductionType === 'ballot') return 'hof_jersey';
  if (teamIds.length === 1) return 'career_on_one_team';
  if (context.currentTeamId && teamIds[0] === context.currentTeamId && teamIds.length > 1) return 'legend_returns_home';
  return 'standard_jersey';
}

export function resolveFarewellTourBranch(context: ResolveFarewellTourBranchContext): FarewellTourBranch {
  if ((context.wins ?? 0) >= 90 && (context.overallRating ?? 0) >= 70) return 'farewell_on_contender';
  if ((context.losses ?? 0) >= 90 || (context.wins ?? 162) <= 70) return 'farewell_on_tank';
  if ((context.leadership ?? 100) < 55 && (context.overallRating ?? 100) < 70) return 'quiet_farewell';
  if ((context.leadership ?? 0) >= 80 || (context.overallRating ?? 0) >= 80) return 'loud_farewell';
  return 'standard_farewell';
}

export function resolveDebutPressBranch(context: ResolveDebutPressBranchContext): DebutPressBranch {
  if ((context.age ?? 0) >= 28 && context.previousLevel === 'AAA') return 'veteran_journeyman_debut';
  if (context.topProspect || (context.draftPickNumber ?? 999) <= 5 || (context.draftRound ?? 999) === 1) return 'top_prospect_debut';
  if (context.acquisitionType === 'ifa') return 'international_debut';
  if ((context.callupDay ?? 0) >= 140) return 'sept_callup';
  return 'standard_debut';
}

function pickRetirementLine(
  poolId: RetirementCapstonePoolId,
  branch: RetirementCapstoneBranch,
  context: BaseRetirementPickContext,
): string {
  const variantsByBranch = RETIREMENT_CAPSTONE_BRANCH_VARIANTS[poolId] as Readonly<Record<string, readonly string[]>>;
  const template = pickStableProseVariant(variantsByBranch[branch] ?? [], {
    playerId: context.playerId,
    season: context.season,
    ceremonyType: poolId,
    branch,
  });

  return renderStableTemplate(template, {
    playerName: context.playerName,
    teamName: context.teamName,
    season: context.season,
  });
}

export function pickRetirementSpeechLine(context: PickRetirementSpeechLineContext): string {
  return pickRetirementLine(
    'retirement_speech',
    context.branch ?? resolveRetirementBranch(context),
    context,
  );
}

export function pickJerseyRetirementLine(context: PickJerseyRetirementLineContext): string {
  return pickRetirementLine(
    'jersey_retirement',
    context.branch ?? resolveJerseyRetirementBranch(context),
    context,
  );
}

export function pickFarewellTourLine(context: PickFarewellTourLineContext): string {
  return pickRetirementLine(
    'farewell_tour',
    context.branch ?? resolveFarewellTourBranch(context),
    context,
  );
}

export function pickDebutPressLine(context: PickDebutPressLineContext): string {
  return pickRetirementLine(
    'debut_press',
    context.branch ?? resolveDebutPressBranch(context),
    context,
  );
}
