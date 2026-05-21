import type {
  AwardHistoryEntry,
  DevelopmentSetback,
  FranchiseState,
  MinorLeagueSeasonLine,
  PlayerOrigin,
  ProspectBond,
  TickerEntry,
} from '@mbd/contracts';
import {
  GameRNG,
  applyDevelopmentSetback,
  checkDevelopmentSetback,
  createProspectBond,
  getMinorLeagueProgression,
  getProspectLoyaltyModifier,
  isDevelopmentSetbackExpired,
  pruneTickerFeed,
  recordMinorLeagueStats,
  recoverDevelopmentSetback,
  toDisplayRating,
  updateProspectBonds,
  type AffiliatePlayerStats,
  type GeneratedPlayer,
  type NewsItem,
  type PlayerGameStats,
} from '@mbd/sim-core';
import type { MinorLeagueState } from '@mbd/contracts';
import { adjustDevelopmentSetbackForIdentity } from './sim.worker.frontOfficeIdentity.js';

interface ProspectFarmState {
  season: number;
  day: number;
  players: GeneratedPlayer[];
  seasonStats?: Map<string, PlayerGameStats>;
  seasonState?: {
    playerSeasonStats: Map<string, PlayerGameStats>;
  };
  minorLeagueState: MinorLeagueState;
  userTeamId?: string;
  franchise?: FranchiseState;
  prospectBonds: ProspectBond[];
  playerOrigins: Map<string, PlayerOrigin>;
  awardHistory: AwardHistoryEntry[];
  news: NewsItem[];
  tickerFeed: TickerEntry[];
}

function getSeasonStats(state: Pick<ProspectFarmState, 'seasonStats' | 'seasonState'>): Map<string, PlayerGameStats> {
  return state.seasonStats ?? state.seasonState?.playerSeasonStats ?? new Map();
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash * 31) + value.charCodeAt(index)) | 0;
  }
  return hash;
}

function createScopedRng(seed: number, scope: string): GameRNG {
  return new GameRNG((seed ^ hashString(scope)) | 0);
}

function absoluteDay(season: number, day: number): number {
  return (season * 1000) + day;
}

function sortTupleEntries<T>(entries: Array<[string, T]>): Array<[string, T]> {
  return [...entries].sort((left, right) => left[0].localeCompare(right[0]));
}

function sortBonds(bonds: ProspectBond[]): ProspectBond[] {
  return [...bonds].sort((left, right) => left.prospectId.localeCompare(right.prospectId));
}

function upsertBond(
  bonds: ProspectBond[],
  nextBond: ProspectBond,
): ProspectBond[] {
  const filtered = bonds.filter((bond) => bond.prospectId !== nextBond.prospectId);
  filtered.push(nextBond);
  return sortBonds(filtered);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatLevel(level: string): string {
  return level === 'A_PLUS' ? 'A+' : level;
}

function withMilestone(
  bond: ProspectBond,
  milestone: string,
): ProspectBond {
  return bond.milestones.includes(milestone)
    ? bond
    : {
      ...bond,
      milestones: [...bond.milestones, milestone],
    };
}

export function registerDraftedProspectAcquisition(
  state: Pick<ProspectFarmState, 'season' | 'players' | 'prospectBonds' | 'playerOrigins'>,
  playerId: string,
  teamId: string,
  round: number,
  pickNumber: number,
  originalGrade: number,
  bonusAmount: number,
) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    return;
  }

  state.playerOrigins.set(playerId, {
    playerId,
    originTeamId: teamId,
    acquisitionType: 'draft',
    acquiredSeason: state.season,
    draftSeason: state.season,
    draftRound: round,
    draftPickNumber: pickNumber,
    originalGrade,
    bonusAmount,
  });

  const currentBond = state.prospectBonds.find((bond) => bond.prospectId === playerId);
  const nextBond = currentBond
    ? {
      ...withMilestone(currentBond, `Drafted Round ${round}, ${state.season}`),
      currentLevel: player.rosterStatus,
    }
    : createProspectBond(playerId, state.season, player.rosterStatus, `Drafted Round ${round}, ${state.season}`);
  state.prospectBonds = upsertBond(state.prospectBonds, {
    ...nextBond,
    currentLevel: player.rosterStatus,
    loyaltyModifier: getProspectLoyaltyModifier(nextBond),
  });
}

export function registerInternationalProspectAcquisition(
  state: Pick<ProspectFarmState, 'season' | 'players' | 'prospectBonds' | 'playerOrigins'>,
  playerId: string,
  teamId: string,
  bonusAmount: number,
) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    return;
  }

  state.playerOrigins.set(playerId, {
    playerId,
    originTeamId: teamId,
    acquisitionType: 'ifa',
    acquiredSeason: state.season,
    draftSeason: null,
    draftRound: null,
    draftPickNumber: null,
    originalGrade: toDisplayRating(player.potentialRating ?? player.overallRating),
    bonusAmount,
  });

  const currentBond = state.prospectBonds.find((bond) => bond.prospectId === playerId);
  const nextBond = currentBond
    ? {
      ...withMilestone(currentBond, `IFA Signing, ${state.season}`),
      currentLevel: player.rosterStatus,
    }
    : createProspectBond(playerId, state.season, player.rosterStatus, `IFA Signing, ${state.season}`);
  state.prospectBonds = upsertBond(state.prospectBonds, {
    ...nextBond,
    currentLevel: player.rosterStatus,
    loyaltyModifier: getProspectLoyaltyModifier(nextBond),
  });
}

export function syncMinorLeagueStatHistory(
  state: Pick<ProspectFarmState, 'season' | 'minorLeagueState'>,
) {
  let history = new Map(state.minorLeagueState.minorLeagueStatHistory);

  for (const affiliate of state.minorLeagueState.affiliateStates) {
    for (const [playerId, stats] of affiliate.playerStats) {
      history = recordMinorLeagueStats(
        history,
        playerId,
        state.season,
        affiliate.level,
        stats as AffiliatePlayerStats,
      );
    }
  }

  state.minorLeagueState = {
    ...state.minorLeagueState,
    minorLeagueStatHistory: sortTupleEntries(Array.from(history.entries())),
  };
}

export function recordProspectBondDebuts(
  state: Pick<ProspectFarmState, 'season' | 'players' | 'seasonStats' | 'seasonState' | 'prospectBonds'>,
) {
  const seasonStats = getSeasonStats(state);
  const debutedPlayerIds: string[] = [];
  state.prospectBonds = sortBonds(state.prospectBonds.map((bond) => {
    if (bond.debutSeason != null) {
      return bond;
    }
    const player = state.players.find((candidate) => candidate.id === bond.prospectId);
    const statLine = seasonStats.get(bond.prospectId);
    if (!player || player.rosterStatus !== 'MLB' || ((statLine?.pa ?? 0) <= 0 && (statLine?.ip ?? 0) <= 0)) {
      return bond;
    }

    const nextBond = withMilestone({
      ...bond,
      currentLevel: 'MLB',
      debutSeason: state.season,
      bondStrength: clamp(bond.bondStrength + 15, 0, 100),
    }, `MLB Debut, ${state.season}`);
    debutedPlayerIds.push(player.id);
    return {
      ...nextBond,
      loyaltyModifier: getProspectLoyaltyModifier(nextBond),
    };
  }));
  return debutedPlayerIds;
}

export function applySeasonEndProspectBondUpdates(
  state: Pick<ProspectFarmState, 'season' | 'players' | 'seasonStats' | 'seasonState' | 'prospectBonds' | 'awardHistory' | 'playerOrigins'>,
) {
  state.prospectBonds = sortBonds(updateProspectBonds({
    season: state.season,
    players: state.players,
    prospectBonds: state.prospectBonds,
    seasonStats: getSeasonStats(state),
    awardHistory: state.awardHistory,
    playerOrigins: state.playerOrigins,
  }));
}

function buildSetbackNews(
  state: Pick<ProspectFarmState, 'season' | 'day'>,
  player: GeneratedPlayer,
  setback: DevelopmentSetback,
): NewsItem {
  return {
    id: `development-setback-${setback.type}-${player.id}-${state.season}-${state.day}`,
    headline: setback.type === 'hot_streak'
      ? `${player.firstName} ${player.lastName} is heating up`
      : `${player.firstName} ${player.lastName} hits a development snag`,
    body: setback.summary,
    priority: setback.type === 'hot_streak' ? 3 : 2,
    category: 'development',
    tag: 'ANALYSIS',
    timestamp: `S${state.season}D${state.day}`,
    relatedPlayerIds: [player.id],
    relatedTeamIds: [player.teamId],
    read: false,
  };
}

function buildSetbackTicker(
  state: Pick<ProspectFarmState, 'season' | 'day'>,
  player: GeneratedPlayer,
  setback: DevelopmentSetback,
): TickerEntry {
  return {
    id: `ticker-development-${setback.type}-${player.id}-${state.season}-${state.day}`,
    timestamp: `S${state.season}D${state.day}`,
    category: 'prospect',
    text: setback.summary,
    priority: setback.type === 'hot_streak' ? 4 : 3,
    relatedTeamIds: [player.teamId],
    relatedPlayerIds: [player.id],
    expiresDay: absoluteDay(state.season, state.day) + 30,
  };
}

export function applyDevelopmentSetbackCheckpoint(
  state: ProspectFarmState,
  month: number,
) {
  const playerMap = new Map(state.players.map((player) => [player.id, player]));
  const carriedSetbacks: DevelopmentSetback[] = [];

  for (const setback of state.minorLeagueState.activeDevelopmentSetbacks) {
    const player = playerMap.get(setback.playerId);
    if (!player) {
      continue;
    }

    if (isDevelopmentSetbackExpired(setback, state.season, month)) {
      playerMap.set(player.id, recoverDevelopmentSetback(player, setback));
      continue;
    }

    carriedSetbacks.push(setback);
  }

  const nextNews: NewsItem[] = [];
  const nextTicker: TickerEntry[] = [];
  const activeSetbackIds = new Set(carriedSetbacks.map((setback) => setback.playerId));

  for (const player of playerMap.values()) {
    if (player.rosterStatus === 'MLB' || player.rosterStatus === 'INTERNATIONAL' || activeSetbackIds.has(player.id)) {
      continue;
    }

    const setback = checkDevelopmentSetback(
      createScopedRng(state.season, `development-setback:${month}:${player.id}`),
      player,
      month,
      state.season,
    );
    if (!setback) {
      continue;
    }
    const adjustedSetback = state.userTeamId && state.franchise
      ? adjustDevelopmentSetbackForIdentity(
        state as ProspectFarmState & { userTeamId: string; franchise: FranchiseState },
        player,
        setback,
        month,
      )
      : setback;
    if (!adjustedSetback) {
      continue;
    }

    carriedSetbacks.push(adjustedSetback);
    activeSetbackIds.add(player.id);
    playerMap.set(player.id, applyDevelopmentSetback(player, adjustedSetback));
    nextNews.push(buildSetbackNews(state, player, adjustedSetback));
    nextTicker.push(buildSetbackTicker(state, player, adjustedSetback));
  }

  state.players.splice(0, state.players.length, ...state.players.map((player) => playerMap.get(player.id) ?? player));
  state.minorLeagueState = {
    ...state.minorLeagueState,
    activeDevelopmentSetbacks: [...carriedSetbacks].sort((left, right) => left.playerId.localeCompare(right.playerId)),
  };
  for (const item of nextNews.reverse()) {
    state.news.unshift(item);
  }
  state.tickerFeed = pruneTickerFeed(
    [...nextTicker, ...state.tickerFeed],
    200,
    absoluteDay(state.season, state.day),
  );
}

export function getLoyaltyAdjustedAppeal(
  state: Pick<ProspectFarmState, 'prospectBonds' | 'playerOrigins'>,
  teamId: string,
  playerId: string,
  baseAppeal: number,
): number {
  const origin = state.playerOrigins.get(playerId);
  if (!origin || origin.originTeamId !== teamId) {
    return baseAppeal;
  }

  const bond = state.prospectBonds.find((entry) => entry.prospectId === playerId);
  if (!bond) {
    return baseAppeal;
  }

  return clamp(baseAppeal + (getProspectLoyaltyModifier(bond) * 15), 0, 100);
}

export function getProspectBondView(
  state: Pick<ProspectFarmState, 'prospectBonds'>,
  playerId: string,
): ProspectBond | null {
  return state.prospectBonds.find((bond) => bond.prospectId === playerId) ?? null;
}

export function getActiveDevelopmentSetbackView(
  state: Pick<ProspectFarmState, 'minorLeagueState'>,
  playerId: string,
): DevelopmentSetback | null {
  return state.minorLeagueState.activeDevelopmentSetbacks.find((setback) => setback.playerId === playerId) ?? null;
}

export function getMinorLeagueProgressionView(
  state: Pick<ProspectFarmState, 'minorLeagueState'>,
  playerId: string,
): MinorLeagueSeasonLine[] {
  return getMinorLeagueProgression(
    new Map(state.minorLeagueState.minorLeagueStatHistory),
    playerId,
  );
}
