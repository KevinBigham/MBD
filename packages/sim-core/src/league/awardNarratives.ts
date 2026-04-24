import type { GameRNG } from '../math/prng.js';
import {
  pickAwardCeremonyLine,
  type AwardAcquisitionType,
  type AwardCapstonePoolId,
  type AwardWinnerRole,
} from '../narrative/awardCeremonyProse.js';
import { getTeamById } from './teams.js';

const MVP_HEADLINES = [
  '{winnerName} claims the {awardName} crown with a season that bent the league around him.',
  '{winnerName} takes the {awardName} crown after carrying the sport\'s loudest case.',
  '{winnerName} turns a dominant year into the {awardName} crown.',
] as const;

const CY_YOUNG_HEADLINES = [
  '{winnerName} wins the {awardName} behind an arsenal that left lineups guessing.',
  '{winnerName} seizes the {awardName} with an arsenal that owned every count.',
  '{winnerName} rides a ruthless arsenal to the {awardName}.',
] as const;

const ROY_HEADLINES = [
  '{winnerName} completes a rising star campaign and captures the {awardName}.',
  '{winnerName} turns a rising star season into the {awardName}.',
  '{winnerName} arrives as a rising star and walks away with the {awardName}.',
] as const;

const GOLD_GLOVE_HEADLINES = [
  '{winnerName} turns every inning into a defensive showcase and earns the {awardName}.',
  '{winnerName} makes the {awardName} a referendum on range, instincts, and calm hands.',
  '{winnerName} claims the {awardName} after setting the defensive standard all year.',
] as const;

const SILVER_SLUGGER_HEADLINES = [
  '{winnerName} bludgeons the race open and secures the {awardName}.',
  '{winnerName} turns thunder into hardware with the {awardName}.',
  '{winnerName} powers through the ballot and lands the {awardName}.',
] as const;

const RELIEVER_HEADLINES = [
  '{winnerName} slams the door on the league and wins {awardName}.',
  '{winnerName} turns late innings into a lock and earns {awardName}.',
  '{winnerName} owns the game\'s final outs on the way to {awardName}.',
] as const;

const OPENING_REMARKS = [
  'Season {season} gave the league a full shelf of stars, and tonight is where the hardware finds them.',
  'The ballots are counted for season {season}, and the sport is ready to put names to its defining performances.',
  'Season {season} is on the board, and the game\'s biggest performances are stepping into the spotlight.',
] as const;

const CLOSING_REMARKS = [
  'That closes the book on season {season} awards, with a new set of standards hanging over next year.',
  'Season {season} now has its official winners, and the next chase starts with these names at the front.',
  'The ceremony ends here for season {season}, but the echoes of these races will linger into spring.',
] as const;

const FIRST_AWARD_CONTEXT = [
  '{teamName} finally have a new face carrying this trophy on their side of the ledger.',
  '{winnerName} pushed through for a first major award and changed the shape of his career arc.',
  'This is the first time {winnerName} has reached the top step on award night.',
] as const;

const REPEAT_AWARD_CONTEXT = [
  '{winnerName} added another plaque to a resume that is starting to define an era.',
  'Repeat wins are rare enough, and {winnerName} made this one look earned instead of inherited.',
  '{winnerName} turned an earlier breakthrough into sustained authority with another win.',
] as const;

const AGE_CONTEXT_YOUNG = [
  'At {winnerAge}, the ceiling still feels open-ended.',
  '{winnerAge} years old and already dictating award night, {winnerName} looks far from finished.',
  '{winnerName} is still young enough that the rest of the league has to think about what comes next.',
] as const;

const AGE_CONTEXT_PRIME = [
  '{winnerName} delivered the kind of prime-season statement that tends to anchor a legacy.',
  'This landed squarely in the heart of {winnerName}\'s prime, which made the case feel complete.',
  '{winnerName} met the season at full strength and left no soft edges in the argument.',
] as const;

const AGE_CONTEXT_VETERAN = [
  'There is veteran weight behind this one, the kind that only arrives after years of surviving the grind.',
  '{winnerName} reminded the league that late-career excellence still has room to surprise people.',
  'For a veteran, this award reads like another chapter of stubborn staying power.',
] as const;

const RECORD_CONTEXT_ELITE = [
  '{teamName} backed the case with a powerhouse record, so the award reads like the banner season it was.',
  'The team wins piled up behind {winnerName}, giving the award the feel of a season-long takeover.',
  '{teamName} won big, and that momentum only sharpened the winner\'s case.',
] as const;

const RECORD_CONTEXT_CONTENDER = [
  '{teamName} stayed in the contender lane all year, which kept this candidacy under a bright light.',
  'The team record made sure the performance stayed central to the race from opening day forward.',
  '{winnerName} paired star-level production with meaningful team stakes all season.',
] as const;

const RECORD_CONTEXT_STEADY = [
  'Even without a runaway team record, the individual season kept forcing the conversation back to {winnerName}.',
  '{teamName} stayed competitive enough that every surge from {winnerName} mattered in the standings.',
  'The record was steady rather than overwhelming, which made the individual excellence do even more of the work.',
] as const;

const RECORD_CONTEXT_UPHILL = [
  '{winnerName} won without the cushion of a dominant club record, which gave the case extra resistance to fight through.',
  'The award landed even though {teamName} never offered the easy backdrop of a juggernaut season.',
  'This one reads as individual force more than team momentum, and that made the win stand out.',
] as const;

const HUMBLE_QUOTES = [
  'This belongs to the people who dragged me through every hard patch and every long flight.',
  'I know my name is on it, but there were too many teammates in the middle of this for me to act alone.',
  'You do not hold onto a season like this without a clubhouse carrying you.',
] as const;

const CONFIDENT_QUOTES = [
  'I knew the standard I played to, and I was not going to apologize for it when the ballots showed up.',
  'If you dominate the work every day, this is what the room looks like at the end.',
  'I did not chase the trophy, I chased the level, and the trophy usually follows that.',
] as const;

const MEASURED_QUOTES = [
  'The award is meaningful, but the part I will remember is how complete the season felt from start to finish.',
  'Recognition matters because it says the daily process held up under a full season of scrutiny.',
  'I respect the vote because the game asked for consistency, and that is what I tried to deliver.',
] as const;

export const AWARD_NAMES: Record<string, string> = {
  MVP_AL: 'American League MVP',
  MVP_NL: 'National League MVP',
  CY_YOUNG_AL: 'American League Cy Young',
  CY_YOUNG_NL: 'National League Cy Young',
  ROY_AL: 'American League Rookie of the Year',
  ROY_NL: 'National League Rookie of the Year',
  GOLD_GLOVE: 'Gold Glove',
  SILVER_SLUGGER: 'Silver Slugger',
  RELIEVER_OF_YEAR: 'Reliever of the Year',
};

export type AwardReactionTone = 'confident' | 'humble' | 'measured';

export interface AwardNarrativeContext {
  awardId: keyof typeof AWARD_NAMES;
  winnerId: string;
  winnerName: string;
  winnerTeamId: string;
  winnerStatLine: string;
  runnerUpNames: string[];
  winnerAge: number;
  isFirstAward: boolean;
  isRepeatWinner: boolean;
  reactionTone: AwardReactionTone;
  teamRecord: {
    wins: number;
    losses: number;
  };
  season?: number;
  voteShare?: number;
  winnerRole?: AwardWinnerRole;
  saves?: number;
  inningsPitched?: number;
  starts?: number;
  acquisitionType?: AwardAcquisitionType;
  draftRound?: number | null;
  draftPickNumber?: number | null;
  callupDay?: number | null;
}

export interface AwardNarrative {
  awardId: string;
  awardName: string;
  winnerId: string;
  winnerName: string;
  headline: string;
  votingSummary: string;
  historicalContext: string;
  reactionQuote: string;
  runnerUpNames: string[];
}

export interface AwardCeremonyScript {
  season: number;
  awards: AwardNarrative[];
  openingRemarks: string;
  closingRemarks: string;
}

function choose<T>(rng: GameRNG, items: readonly T[]): T {
  return rng.weightedPick(items, items.map(() => 1));
}

function fillTemplate(
  template: string,
  context: Record<'winnerName' | 'awardName' | 'winnerAge' | 'teamName' | 'season', string>,
): string {
  return template
    .replaceAll('{winnerName}', context.winnerName)
    .replaceAll('{awardName}', context.awardName)
    .replaceAll('{winnerAge}', context.winnerAge)
    .replaceAll('{teamName}', context.teamName)
    .replaceAll('{season}', context.season);
}

function awardHeadlineTemplates(awardId: string): readonly string[] {
  if (awardId.startsWith('MVP')) return MVP_HEADLINES;
  if (awardId.startsWith('CY_YOUNG')) return CY_YOUNG_HEADLINES;
  if (awardId.startsWith('ROY')) return ROY_HEADLINES;
  if (awardId === 'GOLD_GLOVE') return GOLD_GLOVE_HEADLINES;
  if (awardId === 'SILVER_SLUGGER') return SILVER_SLUGGER_HEADLINES;
  return RELIEVER_HEADLINES;
}

function awardCapstonePoolId(awardId: string): AwardCapstonePoolId | null {
  if (awardId.startsWith('MVP')) return 'mvp';
  if (awardId.startsWith('CY_YOUNG')) return 'cy_young';
  if (awardId.startsWith('ROY')) return 'rookie_of_the_year';
  return null;
}

function quoteTemplates(tone: AwardReactionTone): readonly string[] {
  switch (tone) {
    case 'confident':
      return CONFIDENT_QUOTES;
    case 'measured':
      return MEASURED_QUOTES;
    case 'humble':
    default:
      return HUMBLE_QUOTES;
  }
}

function teamDisplayName(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId;
}

function recordContextTemplates(teamRecord: AwardNarrativeContext['teamRecord']): readonly string[] {
  if (teamRecord.wins >= 95) return RECORD_CONTEXT_ELITE;
  if (teamRecord.wins >= 88) return RECORD_CONTEXT_CONTENDER;
  if (teamRecord.wins >= 81) return RECORD_CONTEXT_STEADY;
  return RECORD_CONTEXT_UPHILL;
}

function ageContextTemplates(winnerAge: number): readonly string[] {
  if (winnerAge <= 24) return AGE_CONTEXT_YOUNG;
  if (winnerAge <= 31) return AGE_CONTEXT_PRIME;
  return AGE_CONTEXT_VETERAN;
}

function buildHistoricalContext(rng: GameRNG, context: AwardNarrativeContext, awardName: string): string {
  const teamName = teamDisplayName(context.winnerTeamId);
  const statusTemplates = context.isRepeatWinner ? REPEAT_AWARD_CONTEXT : FIRST_AWARD_CONTEXT;

  const statusLine = fillTemplate(choose(rng, statusTemplates), {
    winnerName: context.winnerName,
    awardName,
    winnerAge: String(context.winnerAge),
    teamName,
    season: '',
  });
  const ageLine = fillTemplate(choose(rng, ageContextTemplates(context.winnerAge)), {
    winnerName: context.winnerName,
    awardName,
    winnerAge: String(context.winnerAge),
    teamName,
    season: '',
  });
  const recordLine = fillTemplate(choose(rng, recordContextTemplates(context.teamRecord)), {
    winnerName: context.winnerName,
    awardName,
    winnerAge: String(context.winnerAge),
    teamName,
    season: '',
  });

  return `${statusLine} ${ageLine} ${recordLine}`;
}

function buildCapstoneContextLine(context: AwardNarrativeContext, awardName: string): string | null {
  const poolId = awardCapstonePoolId(context.awardId);
  if (!poolId || context.season == null) {
    return null;
  }

  return pickAwardCeremonyLine({
    playerId: context.winnerId,
    playerName: context.winnerName,
    teamName: teamDisplayName(context.winnerTeamId),
    awardName,
    season: context.season,
    poolId,
    winnerAge: context.winnerAge,
    isFirstAward: context.isFirstAward,
    isRepeatWinner: context.isRepeatWinner,
    voteShare: context.voteShare,
    winnerRole: context.winnerRole,
    saves: context.saves,
    inningsPitched: context.inningsPitched,
    starts: context.starts,
    acquisitionType: context.acquisitionType,
    draftRound: context.draftRound,
    draftPickNumber: context.draftPickNumber,
    callupDay: context.callupDay,
  });
}

function buildVotingSummary(context: AwardNarrativeContext, awardName: string): string {
  const runnerUpSummary = context.runnerUpNames.length > 0
    ? `Runner-up pressure came from ${context.runnerUpNames.join(', ')}.`
    : 'The winner separated from a thin field.';

  return `${context.winnerName} carried the ${awardName} vote with ${context.winnerStatLine}. ${runnerUpSummary}`;
}

function buildReactionQuote(rng: GameRNG, context: AwardNarrativeContext): string {
  const quote = choose(rng, quoteTemplates(context.reactionTone));
  return context.isRepeatWinner ? `${quote} Doing it again matters because the standard gets harder.` : quote;
}

export function generateAwardNarrative(
  rng: GameRNG,
  context: AwardNarrativeContext,
): AwardNarrative {
  const awardName = AWARD_NAMES[context.awardId] ?? context.awardId;
  const teamName = teamDisplayName(context.winnerTeamId);
  const historicalContext = buildHistoricalContext(rng, context, awardName);
  const capstoneContextLine = buildCapstoneContextLine(context, awardName);

  return {
    awardId: context.awardId,
    awardName,
    winnerId: context.winnerId,
    winnerName: context.winnerName,
    headline: fillTemplate(choose(rng, awardHeadlineTemplates(context.awardId)), {
      winnerName: context.winnerName,
      awardName,
      winnerAge: String(context.winnerAge),
      teamName,
      season: '',
    }),
    votingSummary: buildVotingSummary(context, awardName),
    historicalContext: capstoneContextLine
      ? `${capstoneContextLine} ${historicalContext}`
      : historicalContext,
    reactionQuote: buildReactionQuote(rng, context),
    runnerUpNames: [...context.runnerUpNames],
  };
}

export function generateAwardCeremony(
  rng: GameRNG,
  awardContexts: AwardNarrativeContext[],
  season: number,
): AwardCeremonyScript {
  return {
    season,
    awards: awardContexts.map((context) => generateAwardNarrative(rng.fork(), context)),
    openingRemarks: fillTemplate(choose(rng, OPENING_REMARKS), {
      winnerName: '',
      awardName: '',
      winnerAge: '',
      teamName: '',
      season: String(season),
    }),
    closingRemarks: fillTemplate(choose(rng, CLOSING_REMARKS), {
      winnerName: '',
      awardName: '',
      winnerAge: '',
      teamName: '',
      season: String(season),
    }),
  };
}
