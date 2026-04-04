import { AFFILIATE_LEVELS } from '@mbd/sim-core';
import type { DevelopmentSetback, MinorLeagueSeasonLine, ProspectBond } from '@mbd/contracts';
import type { FullGameState } from './sim.worker.helpers';
import {
  getActiveDevelopmentSetbackView,
  getMinorLeagueProgressionView,
  getProspectBondView,
} from './sim.worker.farm.js';

export interface ProspectPipelineView {
  health: {
    score: number;
    label: string;
    readyNow: number;
    nextWave: number;
    longTerm: number;
    summary: string;
  };
  prospects: Array<{
    playerId: string;
    playerName: string;
    position: string;
    level: string;
    levelLabel: string;
    age: number;
    overallRating: number;
    ceiling: number;
    bondStrength: number;
    eta: string;
    trend: 'surging' | 'steady' | 'setback';
    latestLineSummary: string | null;
    activeSetback: {
      type: string;
      summary: string;
    } | null;
    milestones: string[];
  }>;
}

function formatMinorLevel(level: string): string {
  switch (level) {
    case 'A_PLUS':
      return 'A+';
    case 'ROOKIE':
      return 'Rookie';
    default:
      return level;
  }
}

function buildMinorLeagueLineSummary(
  pitcher: boolean,
  line: MinorLeagueSeasonLine | null,
): string | null {
  if (!line) {
    return null;
  }

  if (pitcher) {
    return `${line.ip.toFixed(1)} IP · ${line.era.toFixed(2)} ERA · ${line.k} K`;
  }

  return `${line.avg.toFixed(3).replace(/^0/, '')} AVG · ${line.hits} H · ${line.hr} HR · ${line.rbi} RBI`;
}

function trendForSetback(setback: DevelopmentSetback | null): 'surging' | 'steady' | 'setback' {
  if (setback?.type === 'hot_streak') {
    return 'surging';
  }
  if (setback) {
    return 'setback';
  }
  return 'steady';
}

function etaForProspect(
  level: string,
  age: number,
  overallRating: number,
  ceiling: number,
  setback: DevelopmentSetback | null,
): string {
  const delayed = setback != null && setback.type !== 'hot_streak';
  const accelerated = setback?.type === 'hot_streak';

  if (level === 'AAA' && overallRating >= 60 && !delayed) {
    return 'Ready now';
  }
  if (level === 'AAA') {
    return accelerated ? 'Ready now' : 'This season';
  }
  if (level === 'AA' && (overallRating >= 55 || ceiling >= 67)) {
    return accelerated ? 'This season' : 'Next season';
  }
  if ((level === 'A_PLUS' || level === 'A') && (age <= 20 || ceiling >= 70)) {
    return delayed ? '3 seasons' : '2 seasons';
  }
  if (level === 'ROOKIE') {
    return '3+ seasons';
  }
  return delayed ? '3+ seasons' : '3 seasons';
}

function healthLabel(score: number): string {
  if (score >= 75) return 'surging';
  if (score >= 58) return 'stable';
  return 'fragile';
}

function healthSummary(readyNow: number, nextWave: number, longTerm: number): string {
  return `${readyNow} near-term option${readyNow === 1 ? '' : 's'}, ${nextWave} in the next wave, ${longTerm} long-view prospect${longTerm === 1 ? '' : 's'}.`;
}

function bondMilestones(bond: ProspectBond | null): string[] {
  return bond?.milestones.slice(-2) ?? [];
}

const ETA_ORDER = new Map([
  ['Ready now', 0],
  ['This season', 1],
  ['Next season', 2],
  ['2 seasons', 3],
  ['3 seasons', 4],
  ['3+ seasons', 5],
]);

export function buildProspectPipelineView(
  state: FullGameState,
  teamId: string = state.userTeamId,
): ProspectPipelineView {
  const prospects = state.players
    .filter((player) =>
      player.teamId === teamId
      && AFFILIATE_LEVELS.includes(player.rosterStatus as typeof AFFILIATE_LEVELS[number]),
    )
    .map((player) => {
      const bond = getProspectBondView(state, player.id);
      const setback = getActiveDevelopmentSetbackView(state, player.id);
      const progression = getMinorLeagueProgressionView(state, player.id);
      const latestLine = progression.at(-1) ?? null;
      const ceiling = player.ceiling ?? player.overallRating;

      return {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        level: player.rosterStatus,
        levelLabel: formatMinorLevel(player.rosterStatus),
        age: player.age,
        overallRating: player.overallRating,
        ceiling,
        bondStrength: bond?.bondStrength ?? 0,
        eta: etaForProspect(
          player.rosterStatus,
          player.age,
          player.overallRating,
          ceiling,
          setback,
        ),
        trend: trendForSetback(setback),
        latestLineSummary: buildMinorLeagueLineSummary(Boolean(player.pitcherAttributes), latestLine),
        activeSetback: setback
          ? {
            type: setback.type,
            summary: setback.summary,
          }
          : null,
        milestones: bondMilestones(bond),
      };
    })
    .sort((left, right) =>
      (ETA_ORDER.get(left.eta) ?? 99) - (ETA_ORDER.get(right.eta) ?? 99)
      || right.ceiling - left.ceiling
      || right.overallRating - left.overallRating
      || left.playerName.localeCompare(right.playerName),
    );

  const readyNow = prospects.filter((prospect) => prospect.eta === 'Ready now').length;
  const nextWave = prospects.filter((prospect) =>
    prospect.eta === 'This season' || prospect.eta === 'Next season',
  ).length;
  const longTerm = prospects.length - readyNow - nextWave;
  const averageCeiling = prospects.length > 0
    ? prospects.reduce((total, prospect) => total + prospect.ceiling, 0) / prospects.length
    : 0;
  const activeSetbacks = prospects.filter((prospect) => prospect.activeSetback != null && prospect.activeSetback.type !== 'hot_streak').length;
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round((averageCeiling - 20) + (readyNow * 10) + (nextWave * 5) - (activeSetbacks * 6)),
    ),
  );

  return {
    health: {
      score,
      label: healthLabel(score),
      readyNow,
      nextWave,
      longTerm,
      summary: healthSummary(readyNow, nextWave, longTerm),
    },
    prospects,
  };
}
