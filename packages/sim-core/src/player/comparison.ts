import {
  DISPLAY_MAX,
  DISPLAY_MIN,
  toDisplayRating,
  toLetterGrade,
} from './attributes.js';
import type { LetterGrade } from './attributes.js';
import type { GeneratedPlayer } from './generation.js';
import {
  type AttributeDescriptor,
  getAttributeDescriptors,
  getAttributeValue as getInternalAttributeValue,
  isPitcher,
} from './attributeDescriptors.js';
import {
  calculateBattingAverage,
  calculateObp,
  calculateOps,
  calculateSlg,
} from '../stats/advanced.js';
import type { PlayerGameStats } from '../sim/gameSimulator.js';

type ComparisonAdvantage = 'playerA' | 'playerB' | 'even';

export interface AttributeComparison {
  attribute: string;
  label: string;
  playerAValue: number;
  playerBValue: number;
  advantage: ComparisonAdvantage;
  differenceDisplay: number;
  significantGap: boolean;
}

export interface ComparisonResult {
  playerAId: string;
  playerBId: string;
  playerAName: string;
  playerBName: string;
  attributeComparison: AttributeComparison[];
  overallAdvantage: ComparisonAdvantage;
  advantageMargin: number;
  headToHeadSummary: string;
}

export interface StatComparison {
  statName: string;
  playerAValue: string;
  playerBValue: string;
  advantage: ComparisonAdvantage;
}

export interface RankedAttribute {
  attribute: string;
  label: string;
  displayRating: number;
  letterGrade: LetterGrade;
}

const DISPLAY_RANGE = DISPLAY_MAX - DISPLAY_MIN;
const SIGNIFICANT_GAP_THRESHOLD = 10;

function getPlayerName(player: GeneratedPlayer): string {
  return `${player.firstName} ${player.lastName}`;
}

function getPlayerShortName(fullName: string): string {
  const parts = fullName.split(' ');
  return parts[parts.length - 1] ?? fullName;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeDisplayGap(value: number): number {
  return roundTo((value / DISPLAY_RANGE) * 100, 1);
}

function compareNumericValues(
  playerAValue: number,
  playerBValue: number,
  preferLower: boolean = false,
): ComparisonAdvantage {
  if (playerAValue === playerBValue) {
    return 'even';
  }

  if (preferLower) {
    return playerAValue < playerBValue ? 'playerA' : 'playerB';
  }

  return playerAValue > playerBValue ? 'playerA' : 'playerB';
}

function formatBattingRate(value: number): string {
  return value.toFixed(3).replace(/^0(?=\.)/, '');
}

function formatPitchingRate(value: number): string {
  return value.toFixed(3);
}

function formatCount(value: number): string {
  return Math.round(value).toString();
}

function safeInningsPitched(ipOuts: number): number {
  return ipOuts / 3;
}

function calculateEra(stats: Pick<PlayerGameStats, 'ip' | 'earnedRuns'>): number {
  const innings = safeInningsPitched(stats.ip);
  if (innings <= 0) {
    return 0;
  }

  return (stats.earnedRuns * 9) / innings;
}

function calculateWhip(stats: Pick<PlayerGameStats, 'ip' | 'walks' | 'hitsAllowed'>): number {
  const innings = safeInningsPitched(stats.ip);
  if (innings <= 0) {
    return 0;
  }

  return (stats.walks + stats.hitsAllowed) / innings;
}

function getComparisonOutcome(result: ComparisonResult, advantage: Exclude<ComparisonAdvantage, 'even'>): string[] {
  return result.attributeComparison
    .filter((entry) => entry.advantage === advantage)
    .sort((left, right) => {
      if (left.differenceDisplay !== right.differenceDisplay) {
        return right.differenceDisplay - left.differenceDisplay;
      }

      return left.label.localeCompare(right.label);
    })
    .slice(0, 2)
    .map((entry) => entry.label.toLowerCase());
}

function joinLabels(labels: string[]): string {
  if (labels.length === 0) {
    return '';
  }
  if (labels.length === 1) {
    return labels[0]!;
  }
  return `${labels[0]}, and ${labels[1]}`;
}

function buildAttributeComparison(
  playerA: GeneratedPlayer,
  playerB: GeneratedPlayer,
): AttributeComparison[] {
  const descriptors = getAttributeDescriptors(playerA);

  return descriptors.map((descriptor) => {
    const playerAValue = toDisplayRating(getInternalAttributeValue(playerA, descriptor));
    const playerBValue = toDisplayRating(getInternalAttributeValue(playerB, descriptor));
    const differenceDisplay = Math.abs(playerAValue - playerBValue);

    return {
      attribute: descriptor.attribute,
      label: descriptor.label,
      playerAValue,
      playerBValue,
      advantage: compareNumericValues(playerAValue, playerBValue),
      differenceDisplay,
      significantGap: differenceDisplay > SIGNIFICANT_GAP_THRESHOLD,
    };
  });
}

export function comparePlayersHead2Head(
  playerA: GeneratedPlayer,
  playerB: GeneratedPlayer,
): ComparisonResult {
  const sameRole = isPitcher(playerA) === isPitcher(playerB);
  const attributeComparison = sameRole ? buildAttributeComparison(playerA, playerB) : [];
  const playerAOverall = toDisplayRating(playerA.overallRating);
  const playerBOverall = toDisplayRating(playerB.overallRating);
  const overallGap = Math.abs(playerAOverall - playerBOverall);
  const averageAttributeGap = attributeComparison.length === 0
    ? 0
    : attributeComparison.reduce((sum, entry) => sum + entry.differenceDisplay, 0) / attributeComparison.length;
  const advantageMargin = sameRole
    ? normalizeDisplayGap(Math.max(averageAttributeGap, overallGap))
    : normalizeDisplayGap(overallGap);

  const result: ComparisonResult = {
    playerAId: playerA.id,
    playerBId: playerB.id,
    playerAName: getPlayerName(playerA),
    playerBName: getPlayerName(playerB),
    attributeComparison,
    overallAdvantage: compareNumericValues(playerAOverall, playerBOverall),
    advantageMargin,
    headToHeadSummary: '',
  };

  return {
    ...result,
    headToHeadSummary: generateComparisonSummary(result),
  };
}

export function rankPlayerAttributes(player: GeneratedPlayer): RankedAttribute[] {
  return getAttributeDescriptors(player)
    .map((descriptor) => {
      const internalValue = getInternalAttributeValue(player, descriptor);

      return {
        attribute: descriptor.attribute,
        label: descriptor.label,
        displayRating: toDisplayRating(internalValue),
        letterGrade: toLetterGrade(internalValue),
      };
    })
    .sort((left, right) => {
      if (left.displayRating !== right.displayRating) {
        return right.displayRating - left.displayRating;
      }

      const descriptors = getAttributeDescriptors(player);
      return descriptors.findIndex((entry) => entry.attribute === left.attribute)
        - descriptors.findIndex((entry) => entry.attribute === right.attribute);
    });
}

export function comparePlayerStats(
  statsA: PlayerGameStats,
  statsB: PlayerGameStats,
): StatComparison[] {
  const bothPitching = statsA.ip > 0 && statsB.ip > 0;
  const bothBatting = statsA.pa > 0 && statsB.pa > 0;

  if (bothPitching) {
    return [
      {
        statName: 'ERA',
        playerAValue: formatPitchingRate(calculateEra(statsA)),
        playerBValue: formatPitchingRate(calculateEra(statsB)),
        advantage: compareNumericValues(calculateEra(statsA), calculateEra(statsB), true),
      },
      {
        statName: 'WHIP',
        playerAValue: formatPitchingRate(calculateWhip(statsA)),
        playerBValue: formatPitchingRate(calculateWhip(statsB)),
        advantage: compareNumericValues(calculateWhip(statsA), calculateWhip(statsB), true),
      },
      {
        statName: 'IP',
        playerAValue: formatCount(statsA.ip),
        playerBValue: formatCount(statsB.ip),
        advantage: compareNumericValues(statsA.ip, statsB.ip),
      },
      {
        statName: 'K',
        playerAValue: formatCount(statsA.strikeouts),
        playerBValue: formatCount(statsB.strikeouts),
        advantage: compareNumericValues(statsA.strikeouts, statsB.strikeouts),
      },
      {
        statName: 'W',
        playerAValue: formatCount(statsA.wins),
        playerBValue: formatCount(statsB.wins),
        advantage: compareNumericValues(statsA.wins, statsB.wins),
      },
      {
        statName: 'SV',
        playerAValue: formatCount(statsA.saves ?? 0),
        playerBValue: formatCount(statsB.saves ?? 0),
        advantage: compareNumericValues(statsA.saves ?? 0, statsB.saves ?? 0),
      },
    ];
  }

  if (bothBatting) {
    return [
      {
        statName: 'AVG',
        playerAValue: formatBattingRate(calculateBattingAverage(statsA)),
        playerBValue: formatBattingRate(calculateBattingAverage(statsB)),
        advantage: compareNumericValues(calculateBattingAverage(statsA), calculateBattingAverage(statsB)),
      },
      {
        statName: 'OBP',
        playerAValue: formatBattingRate(calculateObp(statsA)),
        playerBValue: formatBattingRate(calculateObp(statsB)),
        advantage: compareNumericValues(calculateObp(statsA), calculateObp(statsB)),
      },
      {
        statName: 'SLG',
        playerAValue: formatBattingRate(calculateSlg(statsA)),
        playerBValue: formatBattingRate(calculateSlg(statsB)),
        advantage: compareNumericValues(calculateSlg(statsA), calculateSlg(statsB)),
      },
      {
        statName: 'OPS',
        playerAValue: formatPitchingRate(calculateOps(statsA)),
        playerBValue: formatPitchingRate(calculateOps(statsB)),
        advantage: compareNumericValues(calculateOps(statsA), calculateOps(statsB)),
      },
      {
        statName: 'H',
        playerAValue: formatCount(statsA.hits),
        playerBValue: formatCount(statsB.hits),
        advantage: compareNumericValues(statsA.hits, statsB.hits),
      },
      {
        statName: 'HR',
        playerAValue: formatCount(statsA.hr),
        playerBValue: formatCount(statsB.hr),
        advantage: compareNumericValues(statsA.hr, statsB.hr),
      },
      {
        statName: 'RBI',
        playerAValue: formatCount(statsA.rbi),
        playerBValue: formatCount(statsB.rbi),
        advantage: compareNumericValues(statsA.rbi, statsB.rbi),
      },
      {
        statName: 'BB',
        playerAValue: formatCount(statsA.bb),
        playerBValue: formatCount(statsB.bb),
        advantage: compareNumericValues(statsA.bb, statsB.bb),
      },
      {
        statName: 'K',
        playerAValue: formatCount(statsA.k),
        playerBValue: formatCount(statsB.k),
        advantage: compareNumericValues(statsA.k, statsB.k, true),
      },
    ];
  }

  return [];
}

export function generateComparisonSummary(result: ComparisonResult): string {
  const playerAShortName = getPlayerShortName(result.playerAName);
  const playerBShortName = getPlayerShortName(result.playerBName);

  if (result.attributeComparison.length === 0) {
    if (result.overallAdvantage === 'even') {
      return `${playerAShortName} and ${playerBShortName} grade out evenly in this overall-only comparison.`;
    }

    const leader = result.overallAdvantage === 'playerA' ? playerAShortName : playerBShortName;
    return `${leader} owns the better overall profile in this cross-role comparison.`;
  }

  const playerAEdges = getComparisonOutcome(result, 'playerA');
  const playerBEdges = getComparisonOutcome(result, 'playerB');

  if (playerAEdges.length > 0 && playerBEdges.length > 0) {
    return `${playerAShortName} holds the edge in ${joinLabels(playerAEdges)}, while ${playerBShortName} answers with ${joinLabels(playerBEdges)}.`;
  }

  if (playerAEdges.length > 0) {
    return `${playerAShortName} has the stronger profile, led by ${joinLabels(playerAEdges)}.`;
  }

  if (playerBEdges.length > 0) {
    return `${playerBShortName} has the stronger profile, led by ${joinLabels(playerBEdges)}.`;
  }

  return `${playerAShortName} and ${playerBShortName} are closely matched across the board.`;
}
