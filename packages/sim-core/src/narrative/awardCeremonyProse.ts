import { pickStableProseVariant, renderStableTemplate } from './stableProse.js';

export type AwardCapstonePoolId = 'mvp' | 'cy_young' | 'rookie_of_the_year';

export type MvpCapstoneBranch =
  | 'unanimous_mvp'
  | 'repeat_mvp'
  | 'oldest_mvp'
  | 'youngest_mvp'
  | 'first_mvp'
  | 'standard_mvp';

export type CyYoungCapstoneBranch =
  | 'unanimous_cy'
  | 'repeat_cy'
  | 'closer_cy'
  | '40+_start_cy'
  | 'first_cy'
  | 'standard_cy';

export type RookieOfTheYearCapstoneBranch =
  | 'international_signing'
  | 'top_5_draft_pick'
  | 'late_round_surprise'
  | 'mid_season_callup'
  | 'standard_roy';

export type AwardCapstoneBranch =
  | MvpCapstoneBranch
  | CyYoungCapstoneBranch
  | RookieOfTheYearCapstoneBranch;

export type AwardWinnerRole = 'position_player' | 'starter' | 'reliever' | 'closer';
export type AwardAcquisitionType = 'draft' | 'ifa';

type AwardBranchVariants = {
  readonly mvp: Readonly<Record<MvpCapstoneBranch, readonly string[]>>;
  readonly cy_young: Readonly<Record<CyYoungCapstoneBranch, readonly string[]>>;
  readonly rookie_of_the_year: Readonly<Record<RookieOfTheYearCapstoneBranch, readonly string[]>>;
};

export const AWARD_CAPSTONE_BRANCH_VARIANTS = {
  mvp: {
    unanimous_mvp: [
      '{playerName} took the {awardName} without leaving a serious counterargument, and {teamName} gets to remember this as a season of complete authority.',
      'The room treated {playerName} like the clear answer for {awardName}, a consensus season built on pressure, production, and no wasted months.',
    ],
    repeat_mvp: [
      '{playerName} added another {awardName} to a resume that is starting to read less like a peak and more like an era.',
      'Winning {awardName} again puts {playerName} in harder company, where the question shifts from breakout to staying power.',
    ],
    oldest_mvp: [
      '{playerName} turned veteran patience into an {awardName} season, proving the league had not aged him out of the center of the stage.',
      'At {winnerAge}, {playerName} made {awardName} feel like a late-career summit instead of a farewell gift.',
    ],
    youngest_mvp: [
      '{playerName} won {awardName} early enough that {teamName} can start dreaming in decades instead of windows.',
      'At {winnerAge}, {playerName} made the {awardName} ceremony feel like the opening chapter of something much larger.',
    ],
    first_mvp: [
      '{playerName} crossed from star to standard-bearer with this first {awardName}, giving {teamName} a new face for the franchise ledger.',
      'The first {awardName} for {playerName} lands like a career hinge, the moment a strong season becomes a defining one.',
    ],
    standard_mvp: [
      '{playerName} made the {awardName} case stick over six months, with enough nightly value that the race kept bending back his way.',
      '{teamName} watched {playerName} turn consistency into ceremony, and the {awardName} now carries that season forward.',
    ],
  },
  cy_young: {
    unanimous_cy: [
      '{playerName} took the {awardName} as the clear standard on the mound, leaving hitters, scouts, and ballot debates in the same place.',
      'There was no real split in the {awardName} conversation once {playerName} kept stacking starts that felt finished by the middle innings.',
    ],
    repeat_cy: [
      '{playerName} claimed {awardName} again, turning one elite year into proof that the league still has not solved him.',
      'Another {awardName} gives {playerName} a pitcher\'s kind of dynasty: command, nerve, and a second season nobody could ignore.',
    ],
    closer_cy: [
      '{playerName} dragged the {awardName} conversation into the ninth inning, where every save felt like a public argument for relief dominance.',
      'A closer winning {awardName} means the end of games became the season\'s loudest stage, and {playerName} owned it.',
    ],
    '40+_start_cy': [
      '{playerName} earned {awardName} the old hard way, taking the ball so often that {teamName} could build whole weeks around him.',
      'The workload behind {playerName}\'s {awardName} gave the ceremony a workhorse edge, all volume with enough quality to hold up.',
    ],
    first_cy: [
      '{playerName} turned a first {awardName} into a staff-wide statement for {teamName}, the kind that changes expectations before spring.',
      'The first {awardName} for {playerName} arrived with the force of a pitcher finding both command and legacy at once.',
    ],
    standard_cy: [
      '{playerName} made the {awardName} case pitch by pitch, stretching one excellent outing into a season the league had to honor.',
      '{teamName} gets the plaque, but {playerName} earned {awardName} by making opposing lineups live on his terms.',
    ],
  },
  rookie_of_the_year: {
    international_signing: [
      '{playerName} turned an international leap into {awardName}, giving {teamName} proof that the long scouting bet had arrived.',
      'The {awardName} ceremony doubled as a welcome for {playerName}, whose first full look at the league already changed his ceiling.',
    ],
    top_5_draft_pick: [
      '{playerName} carried top-pick expectations into the {awardName} spotlight, making the hype feel less like pressure than confirmation.',
      'For {teamName}, {playerName} winning {awardName} means the premium draft investment has already started paying in public.',
    ],
    late_round_surprise: [
      '{playerName} turned a long-shot path into {awardName}, the kind of development win every scouting room keeps chasing.',
      'The {awardName} for {playerName} is a reminder that stars do not always enter the system with a spotlight attached.',
    ],
    mid_season_callup: [
      '{playerName} won {awardName} after forcing the issue midstream, compressing a full arrival into the part of the season that mattered most.',
      'A mid-season jump did not shrink {playerName}\'s {awardName} case; it sharpened it into one long surge for {teamName}.',
    ],
    standard_roy: [
      '{playerName} made the rookie year feel sturdy from the first impression through the final vote, and {awardName} followed.',
      '{teamName} watched {playerName} turn opportunity into permanence, the exact shape a {awardName} season is supposed to take.',
    ],
  },
} as const satisfies AwardBranchVariants;

export interface ResolveAwardCapstoneBranchContext {
  readonly poolId: AwardCapstonePoolId;
  readonly winnerAge?: number;
  readonly isFirstAward?: boolean;
  readonly isRepeatWinner?: boolean;
  readonly voteShare?: number;
  readonly winnerRole?: AwardWinnerRole;
  readonly saves?: number;
  readonly inningsPitched?: number;
  readonly starts?: number;
  readonly acquisitionType?: AwardAcquisitionType;
  readonly draftRound?: number | null;
  readonly draftPickNumber?: number | null;
  readonly callupDay?: number | null;
}

export interface PickAwardCeremonyLineContext extends ResolveAwardCapstoneBranchContext {
  readonly playerId: string;
  readonly playerName: string;
  readonly teamName: string;
  readonly awardName: string;
  readonly season: number;
  readonly branch?: AwardCapstoneBranch;
}

export function resolveAwardCapstoneBranch(
  context: ResolveAwardCapstoneBranchContext,
): AwardCapstoneBranch {
  switch (context.poolId) {
    case 'mvp':
      if ((context.voteShare ?? 0) >= 1) return 'unanimous_mvp';
      if (context.isRepeatWinner) return 'repeat_mvp';
      if ((context.winnerAge ?? 0) >= 36) return 'oldest_mvp';
      if ((context.winnerAge ?? 99) <= 23) return 'youngest_mvp';
      if (context.isFirstAward !== false) return 'first_mvp';
      return 'standard_mvp';
    case 'cy_young':
      if ((context.voteShare ?? 0) >= 1) return 'unanimous_cy';
      if (context.isRepeatWinner) return 'repeat_cy';
      if (context.winnerRole === 'closer' || (context.saves ?? 0) >= 35) return 'closer_cy';
      if ((context.starts ?? 0) >= 40 || (context.inningsPitched ?? 0) >= 240) return '40+_start_cy';
      if (context.isFirstAward !== false) return 'first_cy';
      return 'standard_cy';
    case 'rookie_of_the_year':
      if (context.acquisitionType === 'ifa') return 'international_signing';
      if (context.draftPickNumber != null && context.draftPickNumber <= 5) return 'top_5_draft_pick';
      if ((context.draftRound ?? 0) >= 8 || (context.draftPickNumber ?? 0) >= 200) return 'late_round_surprise';
      if ((context.callupDay ?? 0) >= 80) return 'mid_season_callup';
      return 'standard_roy';
  }
}

function variantsForAwardBranch(
  poolId: AwardCapstonePoolId,
  branch: AwardCapstoneBranch,
): readonly string[] {
  const variants = AWARD_CAPSTONE_BRANCH_VARIANTS[poolId] as Readonly<Record<string, readonly string[]>>;
  return variants[branch] ?? variants[`standard_${poolId === 'rookie_of_the_year' ? 'roy' : poolId === 'cy_young' ? 'cy' : 'mvp'}`] ?? [];
}

export function pickAwardCeremonyLine(context: PickAwardCeremonyLineContext): string {
  const branch = context.branch ?? resolveAwardCapstoneBranch(context);
  const template = pickStableProseVariant(variantsForAwardBranch(context.poolId, branch), {
    playerId: context.playerId,
    season: context.season,
    ceremonyType: `award:${context.poolId}`,
    branch,
  });

  return renderStableTemplate(template, {
    playerName: context.playerName,
    teamName: context.teamName,
    awardName: context.awardName,
    winnerAge: context.winnerAge,
    season: context.season,
  });
}
