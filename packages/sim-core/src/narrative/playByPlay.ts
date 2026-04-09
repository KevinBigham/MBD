import type { GameBoxScore } from '../sim/gameSimulator.js';
import type { PAResult } from '../sim/plateAppearance.js';

export interface GameHighlight {
  readonly playerId: string;
  readonly inning: number;
  readonly halfInning: 'top' | 'bottom';
  readonly text: string;
  readonly dramaScore: number;
  readonly type: 'walkoff' | 'homer' | 'clutch_k' | 'comeback' | 'extras';
}

interface BatterGameLine {
  batterId: string;
  hits: number;
  hr: number;
  rbi: number;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash * 31) + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function templateIndex(pa: PAResult, variantCount: number): number {
  return hashString(`${pa.batterId}:${pa.inning}:${pa.outs}:${pa.outcome}`) % variantCount;
}

function teamAtBatName(
  pa: PAResult,
  awayTeamName: string,
  homeTeamName: string,
): string {
  return pa.halfInning === 'top' ? awayTeamName : homeTeamName;
}

function ordinal(inning: number): string {
  const mod100 = inning % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${inning}th`;
  }

  switch (inning % 10) {
    case 1:
      return `${inning}st`;
    case 2:
      return `${inning}nd`;
    case 3:
      return `${inning}rd`;
    default:
      return `${inning}th`;
  }
}

function trimText(value: string): string {
  return value.length <= 120 ? value : `${value.slice(0, 117).trimEnd()}...`;
}

function firstSentence(value: string): string {
  const match = value.match(/^.*?[.!?](?:\s|$)/);
  return match?.[0]?.trim() ?? value.trim();
}

function detectComeback(pa: PAResult): boolean {
  const battingBefore = pa.halfInning === 'top' ? pa.scoreBefore[0] : pa.scoreBefore[1];
  const fieldingBefore = pa.halfInning === 'top' ? pa.scoreBefore[1] : pa.scoreBefore[0];
  const battingAfter = pa.halfInning === 'top' ? pa.scoreAfter[0] : pa.scoreAfter[1];

  return battingBefore < fieldingBefore && battingAfter >= fieldingBefore;
}

function formatFinalScore(boxScore: GameBoxScore, awayTeamName: string, homeTeamName: string): string {
  if (boxScore.awayScore > boxScore.homeScore) {
    return `${awayTeamName} beat ${homeTeamName} ${boxScore.awayScore}-${boxScore.homeScore}`;
  }
  return `${homeTeamName} beat ${awayTeamName} ${boxScore.homeScore}-${boxScore.awayScore}`;
}

function buildBatterLines(paResults: readonly PAResult[]): BatterGameLine[] {
  const lines = new Map<string, BatterGameLine>();
  for (const pa of paResults) {
    const current = lines.get(pa.batterId) ?? {
      batterId: pa.batterId,
      hits: 0,
      hr: 0,
      rbi: 0,
    };

    if (pa.outcome === 'SINGLE' || pa.outcome === 'DOUBLE' || pa.outcome === 'TRIPLE' || pa.outcome === 'HR') {
      current.hits += 1;
    }
    if (pa.outcome === 'HR') {
      current.hr += 1;
    }
    current.rbi += pa.rbiOnPlay;
    lines.set(pa.batterId, current);
  }

  return [...lines.values()];
}

function compareHighlights(left: GameHighlight, right: GameHighlight): number {
  const halfInningDelta = (left.halfInning === 'bottom' ? 1 : 0) - (right.halfInning === 'bottom' ? 1 : 0);
  if (right.dramaScore !== left.dramaScore) {
    return right.dramaScore - left.dramaScore;
  }
  if (right.inning !== left.inning) {
    return right.inning - left.inning;
  }
  if (halfInningDelta !== 0) {
    return halfInningDelta;
  }
  if (left.playerId !== right.playerId) {
    return left.playerId.localeCompare(right.playerId);
  }
  return left.type.localeCompare(right.type);
}

function compareBatterLines(left: BatterGameLine, right: BatterGameLine): number {
  if (right.rbi !== left.rbi) {
    return right.rbi - left.rbi;
  }
  if (right.hr !== left.hr) {
    return right.hr - left.hr;
  }
  if (right.hits !== left.hits) {
    return right.hits - left.hits;
  }
  return left.batterId.localeCompare(right.batterId);
}

export function generatePlayByPlay(
  pa: PAResult,
  batterName: string,
  pitcherName: string,
  awayTeamName: string,
  homeTeamName: string,
): string {
  const battingTeam = teamAtBatName(pa, awayTeamName, homeTeamName);

  if (pa.isWalkOff && pa.outcome === 'HR') {
    const templates = [
      `WALK-OFF HOME RUN! ${batterName} sends ${battingTeam} home a winner.`,
      `${batterName} blasts a walk-off shot! ${battingTeam} win it in the ${ordinal(pa.inning)}.`,
      `Walk-off homer! ${batterName} launches it and ${battingTeam} celebrate.`,
    ];
    return trimText(templates[templateIndex(pa, templates.length)]!);
  }

  if (pa.outcome === 'HR') {
    const homerType = pa.rbiOnPlay >= 3 ? 'A three-run shot' : pa.rbiOnPlay === 2 ? 'A two-run blast' : 'Solo shot';
    const templates = [
      `${batterName} crushes one deep to left, and it's gone. ${homerType}.`,
      `${batterName} drives it out of here. ${homerType} for ${battingTeam}.`,
      `Gone! ${batterName} leaves the yard. ${homerType} in the ${ordinal(pa.inning)}.`,
    ];
    return trimText(templates[templateIndex(pa, templates.length)]!);
  }

  if (pa.outcome === 'SINGLE') {
    const templates = pa.rbiOnPlay > 0
      ? [
          `${batterName} lines a single, and ${pa.rbiOnPlay === 1 ? 'a run scores' : `${pa.rbiOnPlay} runs score`}.`,
          `${batterName} dumps a single in play, plating ${pa.rbiOnPlay === 1 ? 'one' : String(pa.rbiOnPlay)}.`,
          `${batterName} shoots a single through, bringing home ${pa.rbiOnPlay === 1 ? 'a run' : `${pa.rbiOnPlay} runs`}.`,
        ]
      : [
          `${batterName} punches a single into play for ${battingTeam}.`,
          `${batterName} drops a single in front of the outfield.`,
          `${batterName} reaches on a clean single.`,
        ];
    return trimText(templates[templateIndex(pa, templates.length)]!);
  }

  if (pa.outcome === 'DOUBLE') {
    const templates = pa.rbiOnPlay > 0
      ? [
          `${batterName} ropes a double, and ${pa.rbiOnPlay === 1 ? 'a run scores' : `${pa.rbiOnPlay} runs score`}.`,
          `${batterName} drives a double into the gap, cashing in ${pa.rbiOnPlay === 1 ? 'one' : String(pa.rbiOnPlay)}.`,
          `${batterName} hammers a double and clears the bases for ${pa.rbiOnPlay} run${pa.rbiOnPlay === 1 ? '' : 's'}.`,
        ]
      : [
          `${batterName} splits the gap for a stand-up double.`,
          `${batterName} smokes a double off the wall.`,
          `${batterName} races into second with a double.`,
        ];
    return trimText(templates[templateIndex(pa, templates.length)]!);
  }

  if (pa.outcome === 'TRIPLE') {
    const templates = [
      `${batterName} tears into third with a triple for ${battingTeam}.`,
      `${batterName} clears the bases path and slides into third with a triple.`,
      `${batterName} finds the alley and legs out a triple.`,
    ];
    return trimText(templates[templateIndex(pa, templates.length)]!);
  }

  if (pa.outcome === 'BB' || pa.outcome === 'HBP') {
    const forcedRun = pa.rbiOnPlay > 0 && pa.runnersOn === 3;
    const templates = forcedRun
      ? [
          `Ball four to ${batterName}, and that forces in a run.`,
          `${batterName} draws the walk, and ${battingTeam} force one home.`,
          `Free pass for ${batterName}. That'll bring in a run.`,
        ]
      : [
          `${batterName} works the count and reaches on a walk.`,
          `${batterName} takes the free pass.`,
          `${batterName} is aboard after missing just enough from ${pitcherName}.`,
        ];
    return trimText(templates[templateIndex(pa, templates.length)]!);
  }

  if (pa.outcome === 'DOUBLE_PLAY') {
    const templates = [
      `Ground ball, around the horn, double play. ${pitcherName} escapes it.`,
      `${batterName} rolls into a double play, and ${pitcherName} gets out of trouble.`,
      `It's a twin killing behind ${pitcherName}, and the inning turns fast.`,
    ];
    return trimText(templates[templateIndex(pa, templates.length)]!);
  }

  if (pa.outcome === 'K') {
    const templates = pa.outs === 2 && pa.runnersOn > 0
      ? [
          `Swing and a miss! ${pitcherName} fans ${batterName} to strand ${pa.runnersOn}.`,
          `${pitcherName} gets ${batterName} on strikes and strands ${pa.runnersOn} runner${pa.runnersOn === 1 ? '' : 's'}.`,
          `Strike three on ${batterName}! ${pitcherName} ends the threat with ${pa.runnersOn} aboard.`,
        ]
      : [
          `${pitcherName} strikes out ${batterName}.`,
          `${batterName} goes down on strikes against ${pitcherName}.`,
          `Punch-out for ${pitcherName} as ${batterName} can't catch up.`,
        ];
    return trimText(templates[templateIndex(pa, templates.length)]!);
  }

  if (pa.outcome === 'SAC_FLY') {
    return trimText(`${batterName} lifts a sac fly, and ${battingTeam} pick up a run.`);
  }

  const genericTemplates = [
    `${batterName} is retired by ${pitcherName}.`,
    `${pitcherName} records the out against ${batterName}.`,
    `${batterName} can't solve ${pitcherName} on this one.`,
  ];
  return trimText(genericTemplates[templateIndex(pa, genericTemplates.length)]!);
}

export function generateGameHighlights(
  boxScore: GameBoxScore,
  playerNames: Map<string, string>,
  teamNames: Map<string, string>,
): GameHighlight[] {
  const awayTeamName = teamNames.get(boxScore.awayTeamId) ?? boxScore.awayTeamId.toUpperCase();
  const homeTeamName = teamNames.get(boxScore.homeTeamId) ?? boxScore.homeTeamId.toUpperCase();
  const highlights: GameHighlight[] = [];

  for (const pa of boxScore.paResults) {
    const batterName = playerNames.get(pa.batterId) ?? pa.batterId;
    const pitcherName = playerNames.get(pa.pitcherId) ?? pa.pitcherId;
    const text = generatePlayByPlay(pa, batterName, pitcherName, awayTeamName, homeTeamName);

    if (pa.isWalkOff) {
      highlights.push({
        playerId: pa.batterId,
        inning: pa.inning,
        halfInning: pa.halfInning,
        text,
        dramaScore: 100 + (pa.rbiOnPlay * 5),
        type: 'walkoff' as const,
      });
      continue;
    }

    if (pa.outcome === 'HR') {
      highlights.push({
        playerId: pa.batterId,
        inning: pa.inning,
        halfInning: pa.halfInning,
        text,
        dramaScore: 72 + (pa.rbiOnPlay * 8) + (pa.inning >= 8 ? 6 : 0),
        type: 'homer' as const,
      });
      continue;
    }

    if (pa.inning > 9 && pa.rbiOnPlay > 0) {
      highlights.push({
        playerId: pa.batterId,
        inning: pa.inning,
        halfInning: pa.halfInning,
        text,
        dramaScore: 68 + (pa.rbiOnPlay * 6),
        type: 'extras' as const,
      });
      continue;
    }

    if (pa.outcome === 'K' && pa.outs === 2 && pa.runnersOn > 0) {
      highlights.push({
        playerId: pa.batterId,
        inning: pa.inning,
        halfInning: pa.halfInning,
        text,
        dramaScore: 58 + (pa.runnersOn * 5),
        type: 'clutch_k' as const,
      });
      continue;
    }

    if (pa.rbiOnPlay > 0 && detectComeback(pa)) {
      const battingAfter = pa.halfInning === 'top' ? pa.scoreAfter[0] : pa.scoreAfter[1];
      const fieldingAfter = pa.halfInning === 'top' ? pa.scoreAfter[1] : pa.scoreAfter[0];
      highlights.push({
        playerId: pa.batterId,
        inning: pa.inning,
        halfInning: pa.halfInning,
        text,
        dramaScore: 64 + (battingAfter > fieldingAfter ? 8 : 0) + (pa.rbiOnPlay * 6),
        type: 'comeback' as const,
      });
    }
  }

  return highlights
    .sort(compareHighlights)
    .slice(0, 5);
}

export function generateGameRecap(
  boxScore: GameBoxScore,
  highlights: GameHighlight[],
  playerNames: Map<string, string>,
  teamNames: Map<string, string>,
): string {
  const awayTeamName = teamNames.get(boxScore.awayTeamId) ?? boxScore.awayTeamId.toUpperCase();
  const homeTeamName = teamNames.get(boxScore.homeTeamId) ?? boxScore.homeTeamId.toUpperCase();
  const scoreSentence = `${formatFinalScore(boxScore, awayTeamName, homeTeamName)} in ${boxScore.innings} innings.`;

  const topHighlight = highlights[0] ? firstSentence(highlights[0].text) : `The game turns on ${scoreSentence}`;
  const batterLines = buildBatterLines(boxScore.paResults)
    .sort(compareBatterLines);
  const topBatter = batterLines[0] ?? null;
  const topBatterName = topBatter ? (playerNames.get(topBatter.batterId) ?? topBatter.batterId) : null;
  const winningPitcherName = boxScore.winningPitcherId ? (playerNames.get(boxScore.winningPitcherId) ?? boxScore.winningPitcherId) : null;
  const losingPitcherName = boxScore.losingPitcherId ? (playerNames.get(boxScore.losingPitcherId) ?? boxScore.losingPitcherId) : null;

  const sentences = [topHighlight, scoreSentence];
  if (topBatter && topBatterName) {
    sentences.push(`${topBatterName} leads the way with ${topBatter.hits} hit${topBatter.hits === 1 ? '' : 's'} and ${topBatter.rbi} RBI.`);
  } else if (winningPitcherName && losingPitcherName) {
    sentences.push(`${winningPitcherName} gets the win, while ${losingPitcherName} takes the loss.`);
  }

  return sentences.slice(0, 3).join(' ');
}
