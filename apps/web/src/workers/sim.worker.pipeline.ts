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
    organizationalDepth: number;
  };
  prospects: Array<{
    playerId: string;
    playerName: string;
    position: string;
    level: string;
    age: number;
    overallRating: number;
    ceiling: number;
    prospectTier: 'impact' | 'ready_depth' | 'future' | 'organizational_depth';
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
  isOrganizationalDepth: boolean,
): string {
  if (isOrganizationalDepth) {
    return 'Depth option';
  }

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

function prospectTierFor(age: number, overallRating: number, ceiling: number, eta: string): ProspectPipelineView['prospects'][number]['prospectTier'] {
  if (age >= 28 && ceiling < 68 && overallRating < 62) {
    return 'organizational_depth';
  }
  if (ceiling >= 72) {
    return 'impact';
  }
  if (eta === 'Ready now' || overallRating >= 60) {
    return 'ready_depth';
  }
  return 'future';
}

function healthLabel(score: number): string {
  if (score >= 75) return 'surging';
  if (score >= 58) return 'stable';
  return 'fragile';
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
  ['Depth option', 6],
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
      const isOrganizationalDepth = player.age >= 28 && ceiling < 68 && player.overallRating < 62;
      const eta = etaForProspect(
        player.rosterStatus,
        player.age,
        player.overallRating,
        ceiling,
        setback,
        isOrganizationalDepth,
      );
      const prospectTier = prospectTierFor(player.age, player.overallRating, ceiling, eta);

      return {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        level: player.rosterStatus,
        age: player.age,
        overallRating: player.overallRating,
        ceiling,
        prospectTier,
        bondStrength: bond?.bondStrength ?? 0,
        eta,
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
      Number(left.prospectTier === 'organizational_depth') - Number(right.prospectTier === 'organizational_depth')
      ||
      (ETA_ORDER.get(left.eta) ?? 99) - (ETA_ORDER.get(right.eta) ?? 99)
      || right.ceiling - left.ceiling
      || right.overallRating - left.overallRating
      || left.playerName.localeCompare(right.playerName),
    );

  const prospectOnly = prospects.filter((prospect) => prospect.prospectTier !== 'organizational_depth');
  const readyNow = prospectOnly.filter((prospect) => prospect.eta === 'Ready now').length;
  const nextWave = prospectOnly.filter((prospect) =>
    prospect.eta === 'This season' || prospect.eta === 'Next season',
  ).length;
  const longTerm = prospectOnly.length - readyNow - nextWave;
  const organizationalDepth = prospects.length - prospectOnly.length;
  const averageCeiling = prospectOnly.length > 0
    ? prospectOnly.reduce((total, prospect) => total + prospect.ceiling, 0) / prospectOnly.length
    : 0;
  const activeSetbacks = prospectOnly.filter((prospect) => prospect.activeSetback != null && prospect.activeSetback.type !== 'hot_streak').length;
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
      organizationalDepth,
    },
    prospects,
  };
}
