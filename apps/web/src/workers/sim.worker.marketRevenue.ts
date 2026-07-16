import type { BriefingItem, OwnerState } from '@mbd/contracts';
import {
  TEAMS,
  createOwnerState,
  deriveMarketRevenueStatement,
  determinePlayoffSeeds,
  getTeamBudget,
  type MarketRevenueStatement,
  type NewsItem,
  type PlayoffBracket,
  type PlayoffSeed,
  type PlayoffSeriesState,
  type StandingsTracker,
} from '@mbd/sim-core';

interface MarketRevenueState {
  season: number;
  day: number;
  userTeamId: string;
  seasonState: {
    standings: Pick<StandingsTracker, 'getFullStandings'>;
  };
  playoffBracket: PlayoffBracket | null;
  ownerState: Map<string, OwnerState>;
  storyFlags: Map<string, string[]>;
  news: NewsItem[];
  briefingQueue: BriefingItem[];
  seasonArchive: Array<{
    season: number;
    standings: Array<{ teamId: string; wins: number; losses: number }>;
    playoffSeries: Array<{
      winnerTeamId: string | null;
      loserTeamId: string | null;
    }>;
  }>;
}

interface MarketRevenueReconciliation {
  season: number;
  statements: MarketRevenueStatement[];
  ownerState: Map<string, OwnerState>;
  storyFlags: Map<string, string[]>;
  news: NewsItem[];
  briefingQueue: BriefingItem[];
}

function money(value: number): string {
  return `$${value.toFixed(2)}M`;
}

function percent(value: number): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}

export function marketRevenueReceiptId(season: number): string {
  return `market_revenue_budget_reconciled_s${season}`;
}

function validateRecordRows(
  standings: readonly { teamId: string; wins: number; losses: number }[],
  source: string,
): Map<string, { wins: number; losses: number }> {
  const knownTeamIds = new Set(TEAMS.map((team) => team.id));
  if (knownTeamIds.size !== 32) {
    throw new Error('Market revenue requires exactly 32 canonical teams.');
  }

  const records = new Map<string, { wins: number; losses: number }>();
  for (const entry of standings) {
    if (!knownTeamIds.has(entry.teamId)) {
      throw new Error(`Market revenue ${source} contains unknown team ${entry.teamId}.`);
    }
    if (records.has(entry.teamId)) {
      throw new Error(`Market revenue ${source} duplicates team ${entry.teamId}.`);
    }
    if (!Number.isInteger(entry.wins)
      || !Number.isInteger(entry.losses)
      || entry.wins < 0
      || entry.losses < 0
      || entry.wins + entry.losses !== 162) {
      throw new Error(`Market revenue requires a complete 162-game record for ${entry.teamId}.`);
    }
    records.set(entry.teamId, { wins: entry.wins, losses: entry.losses });
  }
  if (records.size !== knownTeamIds.size
    || TEAMS.some((team) => !records.has(team.id))) {
    throw new Error(`Market revenue ${source} does not cover all 32 canonical teams.`);
  }
  const totalWins = Array.from(records.values()).reduce((sum, record) => sum + record.wins, 0);
  const totalLosses = Array.from(records.values()).reduce((sum, record) => sum + record.losses, 0);
  if (totalWins !== totalLosses) {
    throw new Error('Market revenue standings do not conserve league wins and losses.');
  }
  return records;
}

function validateCompletedSeason(state: MarketRevenueState): Map<string, { wins: number; losses: number }> {
  return validateRecordRows(
    Object.values(state.seasonState.standings.getFullStandings()).flat(),
    'standings',
  );
}

function sameSeed(left: PlayoffSeed, right: PlayoffSeed): boolean {
  return left.teamId === right.teamId
    && left.seed === right.seed
    && left.wins === right.wins
    && left.losses === right.losses
    && left.league === right.league
    && left.divisionWinner === right.divisionWinner;
}

function validateCompletedPlayoffs(state: MarketRevenueState): Set<string> {
  const bracket = state.playoffBracket;
  const knownTeamIds = new Set(TEAMS.map((team) => team.id));
  if (!bracket?.champion || !bracket.runnerUp || bracket.currentRound !== 'WORLD_SERIES') {
    throw new Error('Market revenue requires one completed playoff bracket and champion.');
  }

  const expectedSeeds = determinePlayoffSeeds(state.seasonState.standings.getFullStandings());
  if (expectedSeeds.length !== 12 || bracket.seeds.length !== expectedSeeds.length) {
    throw new Error('Market revenue requires the exact 12-team completed playoff field.');
  }
  const expectedBySlot = new Map(
    expectedSeeds.map((seed) => [`${seed.league}-${seed.seed}`, seed]),
  );
  const expectedByTeam = new Map(expectedSeeds.map((seed) => [seed.teamId, seed]));
  const playoffTeamIds = new Set<string>();
  for (const seed of bracket.seeds) {
    if (!knownTeamIds.has(seed.teamId) || playoffTeamIds.has(seed.teamId)) {
      throw new Error('Market revenue playoff seeds are unknown or duplicated.');
    }
    const expected = expectedBySlot.get(`${seed.league}-${seed.seed}`);
    if (!expected || !sameSeed(seed, expected)) {
      throw new Error('Market revenue playoff seeds contradict the final standings.');
    }
    playoffTeamIds.add(seed.teamId);
  }
  if (!playoffTeamIds.has(bracket.champion)
    || !playoffTeamIds.has(bracket.runnerUp)) {
    throw new Error('Market revenue champion and runner-up must belong to the completed playoff field.');
  }

  const expectedRounds = [
    { round: 'WILD_CARD', count: 4, bestOf: 3 },
    { round: 'DIVISION_SERIES', count: 4, bestOf: 5 },
    { round: 'CHAMPIONSHIP_SERIES', count: 2, bestOf: 7 },
    { round: 'WORLD_SERIES', count: 1, bestOf: 7 },
  ] as const;
  if (bracket.completedRounds.length !== expectedRounds.length) {
    throw new Error('Market revenue requires every completed playoff round exactly once.');
  }

  const seriesById = new Map<string, PlayoffSeriesState>();
  for (const [index, expectedRound] of expectedRounds.entries()) {
    const completed = bracket.completedRounds[index];
    if (completed?.round !== expectedRound.round || completed.series.length !== expectedRound.count) {
      throw new Error(`Market revenue playoff ${expectedRound.round} topology is incomplete.`);
    }
    for (const series of completed.series) {
      const higher = expectedByTeam.get(series.higherSeed.teamId);
      const lower = expectedByTeam.get(series.lowerSeed.teamId);
      const winsNeeded = Math.ceil(series.bestOf / 2);
      const winnerWins = series.winnerId === series.higherSeed.teamId
        ? series.higherSeedWins
        : series.lowerSeedWins;
      const loserWins = series.loserId === series.higherSeed.teamId
        ? series.higherSeedWins
        : series.lowerSeedWins;
      if (seriesById.has(series.id)
        || series.round !== expectedRound.round
        || series.bestOf !== expectedRound.bestOf
        || series.status !== 'complete'
        || !series.winnerId
        || !series.loserId
        || series.winnerId === series.loserId
        || !higher
        || !lower
        || !sameSeed(series.higherSeed, higher)
        || !sameSeed(series.lowerSeed, lower)
        || ![series.higherSeed.teamId, series.lowerSeed.teamId].includes(series.winnerId)
        || ![series.higherSeed.teamId, series.lowerSeed.teamId].includes(series.loserId)
        || winnerWins !== winsNeeded
        || loserWins >= winsNeeded) {
        throw new Error(`Market revenue playoff ${expectedRound.round} contains an invalid completed series.`);
      }
      seriesById.set(series.id, series);
    }
  }

  function seedAt(league: 'AL' | 'NL', seed: number): PlayoffSeed {
    const resolved = expectedBySlot.get(`${league}-${seed}`);
    if (!resolved) throw new Error(`Market revenue playoff seed ${league}-${seed} disappeared.`);
    return resolved;
  }

  function requireSeries(
    id: string,
    league: 'AL' | 'NL' | 'MLB',
    higherTeamId: string,
    lowerTeamId: string,
  ): PlayoffSeriesState {
    const series = seriesById.get(id);
    if (!series
      || series.league !== league
      || series.higherSeed.teamId !== higherTeamId
      || series.lowerSeed.teamId !== lowerTeamId) {
      throw new Error(`Market revenue playoff series ${id} contradicts the canonical bracket path.`);
    }
    return series;
  }

  const leagueChampions: PlayoffSeed[] = [];
  for (const league of ['AL', 'NL'] as const) {
    const firstWildCard = requireSeries(
      `${league}-WC-1`,
      league,
      seedAt(league, 3).teamId,
      seedAt(league, 6).teamId,
    );
    const secondWildCard = requireSeries(
      `${league}-WC-2`,
      league,
      seedAt(league, 4).teamId,
      seedAt(league, 5).teamId,
    );
    const wildCardWinners = [firstWildCard, secondWildCard]
      .map((series) => expectedByTeam.get(series.winnerId!))
      .filter((seed): seed is PlayoffSeed => seed != null)
      .sort((left, right) => right.seed - left.seed);
    if (wildCardWinners.length !== 2) {
      throw new Error(`Market revenue ${league} Wild Card winners are incomplete.`);
    }
    const firstDivision = requireSeries(
      `${league}-DS-1`,
      league,
      seedAt(league, 1).teamId,
      wildCardWinners[0]!.teamId,
    );
    const secondDivision = requireSeries(
      `${league}-DS-2`,
      league,
      seedAt(league, 2).teamId,
      wildCardWinners[1]!.teamId,
    );
    const divisionWinners = [firstDivision, secondDivision]
      .map((series) => expectedByTeam.get(series.winnerId!))
      .filter((seed): seed is PlayoffSeed => seed != null)
      .sort((left, right) => left.seed - right.seed || left.teamId.localeCompare(right.teamId));
    if (divisionWinners.length !== 2) {
      throw new Error(`Market revenue ${league} Division Series winners are incomplete.`);
    }
    const championship = requireSeries(
      `${league}-CS-1`,
      league,
      divisionWinners[0]!.teamId,
      divisionWinners[1]!.teamId,
    );
    const champion = expectedByTeam.get(championship.winnerId!);
    if (!champion) throw new Error(`Market revenue ${league} champion is unknown.`);
    leagueChampions.push(champion);
  }

  const worldSeriesSeeds = leagueChampions.sort((left, right) => (
    right.wins - left.wins
    || left.losses - right.losses
    || left.seed - right.seed
    || left.teamId.localeCompare(right.teamId)
  ));
  const worldSeries = requireSeries(
    'WS-1',
    'MLB',
    worldSeriesSeeds[0]!.teamId,
    worldSeriesSeeds[1]!.teamId,
  );
  const currentWorldSeries = bracket.currentRoundSeries;
  if (currentWorldSeries.length !== 1
    || currentWorldSeries[0]?.id !== worldSeries.id
    || currentWorldSeries[0]?.status !== 'complete'
    || currentWorldSeries[0]?.winnerId !== worldSeries.winnerId
    || currentWorldSeries[0]?.loserId !== worldSeries.loserId
    || bracket.champion !== worldSeries.winnerId
    || bracket.runnerUp !== worldSeries.loserId) {
    throw new Error('Market revenue World Series completion contradicts the bracket champion.');
  }

  const completedSeries = Array.from(seriesById.values());
  const legacyResults = bracket.series.map((series) => (
    `${series.round}|${series.winnerId}|${series.loserId}|${series.winnerWins}|${series.loserWins}`
  )).sort();
  const canonicalResults = completedSeries.map((series) => {
    const winnerWins = series.winnerId === series.higherSeed.teamId
      ? series.higherSeedWins
      : series.lowerSeedWins;
    const loserWins = series.loserId === series.higherSeed.teamId
      ? series.higherSeedWins
      : series.lowerSeedWins;
    return `${series.round}|${series.winnerId}|${series.loserId}|${winnerWins}|${loserWins}`;
  }).sort();
  if (legacyResults.length !== 11
    || legacyResults.some((result, index) => result !== canonicalResults[index])) {
    throw new Error('Market revenue legacy playoff results contradict the completed bracket.');
  }
  return playoffTeamIds;
}

function normalizeOwner(
  state: MarketRevenueState,
  teamId: string,
): OwnerState {
  const fallback = createOwnerState(teamId, getTeamBudget(teamId));
  const persisted = state.ownerState.get(teamId);
  return {
    ...fallback,
    ...persisted,
    teamId,
    expectations: {
      ...fallback.expectations,
      ...persisted?.expectations,
    },
  };
}

function deriveStatements(
  state: MarketRevenueState,
  records: ReadonlyMap<string, { wins: number; losses: number }>,
  playoffTeamIds: ReadonlySet<string>,
): MarketRevenueStatement[] {
  return TEAMS.map((team) => {
    const record = records.get(team.id);
    if (!record) {
      throw new Error(`Market revenue record disappeared for ${team.id}.`);
    }
    const owner = normalizeOwner(state, team.id);
    return deriveMarketRevenueStatement({
      teamId: team.id,
      wins: record.wins,
      losses: record.losses,
      madePlayoffs: playoffTeamIds.has(team.id),
      ownerArchetype: owner.archetype,
    });
  });
}

function archivedStatementFacts(
  state: MarketRevenueState,
  season: number,
): { records: Map<string, { wins: number; losses: number }>; playoffTeamIds: Set<string> } | null {
  const archive = state.seasonArchive.find((entry) => entry.season === season);
  if (!archive || archive.playoffSeries.length === 0) return null;

  const records = validateRecordRows(archive.standings, `Season ${season} archive standings`);
  const knownTeamIds = new Set(TEAMS.map((team) => team.id));
  const playoffTeamIds = new Set<string>();
  for (const series of archive.playoffSeries) {
    for (const teamId of [series.winnerTeamId, series.loserTeamId]) {
      if (!teamId) continue;
      if (!knownTeamIds.has(teamId)) {
        throw new Error(`Market revenue Season ${season} archive contains unknown playoff team ${teamId}.`);
      }
      playoffTeamIds.add(teamId);
    }
  }
  if (playoffTeamIds.size === 0) return null;
  return { records, playoffTeamIds };
}

function hasCompleteReceiptSet(state: MarketRevenueState, season: number): boolean {
  const receipt = marketRevenueReceiptId(season);
  return TEAMS.every((team) => (
    (state.storyFlags.get(team.id) ?? []).filter((flag) => flag === receipt).length === 1
  ));
}

function ownerAllocationsMatchStatements(
  state: MarketRevenueState,
  statements: readonly MarketRevenueStatement[],
): boolean {
  return statements.length === TEAMS.length && statements.every((statement) => {
    const owner = state.ownerState.get(statement.teamId);
    return owner != null
      && owner.annualBudget === statement.annualBudget
      && owner.payrollCap === statement.payrollCap
      && owner.draftBonusPool === statement.draftBonusPool
      && owner.ifaBonusPool === statement.ifaBonusPool
      && owner.staffBudget === statement.staffBudget
      && owner.expectations.payrollTarget === statement.expectationsPayrollTarget;
  });
}

function buildUserNews(
  state: MarketRevenueState,
  statement: MarketRevenueStatement,
): NewsItem {
  const direction = statement.attendanceRevenue > 0
    ? 'added'
    : statement.attendanceRevenue < 0
      ? 'reduced'
      : 'left unchanged';
  const playoff = statement.madePlayoffs
    ? ` A playoff berth added ${money(statement.playoffRevenue)} (${percent(statement.playoffRate)}).`
    : ' No playoff bump was earned.';
  return {
    id: `market-revenue-${state.season}-${state.userTeamId}`,
    headline: 'Market revenue sets the next-season budget',
    body: `${statement.marketSize[0]?.toUpperCase()}${statement.marketSize.slice(1)} market baseline ${money(statement.marketBaseline)}. The ${statement.wins}-${statement.losses} record ${direction} ${money(Math.abs(statement.attendanceRevenue))} through the record-driven modeled attendance effect (${percent(statement.attendanceRate)}).${playoff} Modeled gross revenue finished at ${money(statement.grossRevenue)}; the owner's ${statement.allocationFactor.toFixed(2)}x allocation sets a raw next-season budget of ${money(statement.annualBudget)} and payroll plan of ${money(statement.payrollCap)}. Projected tax remains separate and is not deducted here.`,
    priority: statement.madePlayoffs || statement.wins >= 90 ? 2 : 3,
    category: 'performance',
    tag: 'ANALYSIS',
    timestamp: `S${state.season}D${state.day}`,
    relatedPlayerIds: [],
    relatedTeamIds: [state.userTeamId],
    read: false,
  };
}

function buildUserBriefing(news: NewsItem): BriefingItem {
  return {
    id: `brief-${news.id}`,
    priority: news.priority,
    category: 'owner',
    tag: news.tag,
    headline: news.headline,
    body: news.body,
    relatedTeamIds: [...news.relatedTeamIds],
    relatedPlayerIds: [],
    timestamp: news.timestamp,
    acknowledged: false,
  };
}

/**
 * Validate and precompute every canonical result before any worker state is
 * changed. Receipt presence never bypasses statement or owner validation.
 */
export function prepareCompletedSeasonMarketRevenue(
  state: MarketRevenueState,
): MarketRevenueReconciliation {
  const records = validateCompletedSeason(state);
  const playoffTeamIds = validateCompletedPlayoffs(state);
  const receiptId = marketRevenueReceiptId(state.season);
  const ownerState = new Map(state.ownerState);
  const storyFlags = new Map(
    Array.from(state.storyFlags.entries(), ([teamId, flags]) => [teamId, [...flags]]),
  );
  const statements = deriveStatements(state, records, playoffTeamIds);

  for (const statement of statements) {
    const teamId = statement.teamId;
    const owner = normalizeOwner(state, teamId);
    ownerState.set(teamId, {
      ...owner,
      annualBudget: statement.annualBudget,
      payrollCap: statement.payrollCap,
      draftBonusPool: statement.draftBonusPool,
      ifaBonusPool: statement.ifaBonusPool,
      staffBudget: statement.staffBudget,
      expectations: {
        ...owner.expectations,
        payrollTarget: statement.expectationsPayrollTarget,
      },
    });
    storyFlags.set(teamId, Array.from(new Set([
      ...(storyFlags.get(teamId) ?? []),
      receiptId,
    ])).sort((left, right) => left.localeCompare(right)));
  }

  const userStatement = statements.find((statement) => statement.teamId === state.userTeamId);
  if (!userStatement) {
    throw new Error('Market revenue could not resolve the user organization.');
  }
  const canonicalNews = buildUserNews(state, userStatement);
  const matchingNews = state.news.filter((item) => item.id === canonicalNews.id);
  canonicalNews.read = matchingNews.some((item) => item.read);
  const news = [canonicalNews, ...state.news.filter((item) => item.id !== canonicalNews.id)];

  const canonicalBriefing = buildUserBriefing(canonicalNews);
  const matchingBriefings = state.briefingQueue.filter((item) => item.id === canonicalBriefing.id);
  canonicalBriefing.acknowledged = matchingBriefings.some((item) => item.acknowledged);
  const briefingQueue = [
    canonicalBriefing,
    ...state.briefingQueue.filter((item) => item.id !== canonicalBriefing.id),
  ];

  return {
    season: state.season,
    statements,
    ownerState,
    storyFlags,
    news,
    briefingQueue,
  };
}

export function applyPreparedMarketRevenue(
  state: MarketRevenueState,
  prepared: MarketRevenueReconciliation,
): MarketRevenueStatement[] {
  if (prepared.season !== state.season) {
    throw new Error('A stale market revenue reconciliation cannot be applied to another season.');
  }
  state.ownerState = prepared.ownerState;
  state.storyFlags = prepared.storyFlags;
  state.news = prepared.news;
  state.briefingQueue = prepared.briefingQueue;
  return prepared.statements;
}

export function reconcileCompletedSeasonMarketRevenue(
  state: MarketRevenueState,
): MarketRevenueStatement[] {
  return applyPreparedMarketRevenue(state, prepareCompletedSeasonMarketRevenue(state));
}

export function getSettledMarketRevenueStatement(
  state: MarketRevenueState,
  teamId: string,
): MarketRevenueStatement | null {
  if (hasCompleteReceiptSet(state, state.season) && state.playoffBracket) {
    const statements = deriveStatements(
      state,
      validateCompletedSeason(state),
      validateCompletedPlayoffs(state),
    );
    if (!ownerAllocationsMatchStatements(state, statements)) return null;
    return statements.find((statement) => statement.teamId === teamId) ?? null;
  }

  // Once the next season starts, the active budget still belongs to the most
  // recently settled completed season. Reconstruct its explanation from the
  // factual archive and all-team receipt set; do not persist a parallel
  // revenue ledger or fabricate a statement when archive facts are absent.
  const priorSeason = state.season - 1;
  if (priorSeason < 1 || !hasCompleteReceiptSet(state, priorSeason)) return null;
  const archived = archivedStatementFacts(state, priorSeason);
  if (!archived) return null;
  const statements = deriveStatements(state, archived.records, archived.playoffTeamIds);
  if (!ownerAllocationsMatchStatements(state, statements)) return null;
  return statements.find((statement) => statement.teamId === teamId) ?? null;
}
