// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  StandingsTracker,
  TEAMS,
  createOffseasonState,
  deriveMarketRevenueStatement,
  determinePlayoffSeeds,
  simulatePlayoffs,
  type PlayoffBracket,
  type TeamRecord,
} from '@mbd/sim-core';
import { buildNewGameState } from './sim.worker.setup.js';
import {
  advanceOffseasonOnce,
  buildOffseasonStateView,
  setState,
  skipOffseasonPhaseWithAI,
} from './sim.worker.helpers.js';
import {
  applyPreparedMarketRevenue,
  marketRevenueReceiptId,
  prepareCompletedSeasonMarketRevenue,
  reconcileCompletedSeasonMarketRevenue,
} from './sim.worker.marketRevenue.js';
import { recordSeasonArchive } from './sim.worker.narrative.js';
import { exportGameSnapshot, importGameSnapshot } from './snapshot.js';
import { queryApi } from './sim.worker.queries.js';

function makeState(seed = 15_001) {
  return buildNewGameState({
    seed,
    userTeamId: 'nym',
    gmName: 'Revenue Audit',
    difficulty: 'standard',
    saveSlot: 15,
    dayOneExperience: 'quick',
  });
}

function teamRecords(overrides: Record<string, { wins: number; losses: number }> = {}): TeamRecord[] {
  return TEAMS.map((team) => {
    const record = overrides[team.id] ?? { wins: 81, losses: 81 };
    return {
      teamId: team.id,
      wins: record.wins,
      losses: record.losses,
      runsScored: record.wins * 5,
      runsAllowed: record.losses * 5,
      streak: 0,
      last10: [5, 5],
      divisionWins: 20,
      divisionLosses: 20,
    };
  });
}

function completedBracket(standings: StandingsTracker): PlayoffBracket {
  return simulatePlayoffs(
    new GameRNG(15_000),
    determinePlayoffSeeds(standings.getFullStandings()),
    [],
  );
}

function setCompletedSeason(state: ReturnType<typeof makeState>) {
  const standings = StandingsTracker.deserialize(teamRecords({
    nym: { wins: 100, losses: 62 },
    phi: { wins: 62, losses: 100 },
  }));
  state.seasonState = {
    ...state.seasonState,
    currentDay: 162,
    completed: true,
    standings,
  };
  state.playoffBracket = completedBracket(standings);
  state.phase = 'offseason';
  state.offseasonState = createOffseasonState(state.season);
}

function nonfinancialOwner(owner: ReturnType<typeof makeState>['ownerState'] extends Map<string, infer T> ? T : never) {
  const copy = structuredClone(owner) as Record<string, unknown>;
  delete copy.annualBudget;
  delete copy.payrollCap;
  delete copy.draftBonusPool;
  delete copy.ifaBonusPool;
  delete copy.staffBudget;
  if (copy.expectations && typeof copy.expectations === 'object') {
    delete (copy.expectations as Record<string, unknown>).payrollTarget;
  }
  return copy;
}

describe('worker market revenue reconciliation', () => {
  it('precomputes and commits all 32 statements without RNG or unrelated mutation', () => {
    const state = makeState();
    setCompletedSeason(state);
    const rngBefore = state.rng.getState();
    const playersBefore = structuredClone(state.players);
    const franchiseBefore = structuredClone(state.franchise);
    const ownerFactsBefore = new Map(Array.from(state.ownerState, ([teamId, owner]) => [
      teamId,
      nonfinancialOwner(owner),
    ]));
    const ownersBeforePrepare = structuredClone(Array.from(state.ownerState.entries()));
    const flagsBeforePrepare = structuredClone(Array.from(state.storyFlags.entries()));

    const prepared = prepareCompletedSeasonMarketRevenue(state);
    expect(Array.from(state.ownerState.entries())).toEqual(ownersBeforePrepare);
    expect(Array.from(state.storyFlags.entries())).toEqual(flagsBeforePrepare);

    const statements = applyPreparedMarketRevenue(state, prepared);
    const receipt = marketRevenueReceiptId(state.season);
    expect(statements).toHaveLength(32);
    expect(new Set(statements.map((statement) => statement.teamId)).size).toBe(32);
    for (const team of TEAMS) {
      const statement = statements.find((candidate) => candidate.teamId === team.id)!;
      const owner = state.ownerState.get(team.id)!;
      expect(owner).toMatchObject({
        annualBudget: statement.annualBudget,
        payrollCap: statement.payrollCap,
        draftBonusPool: statement.draftBonusPool,
        ifaBonusPool: statement.ifaBonusPool,
        staffBudget: statement.staffBudget,
        expectations: { payrollTarget: statement.payrollCap },
      });
      expect(nonfinancialOwner(owner)).toEqual(ownerFactsBefore.get(team.id));
      expect(state.storyFlags.get(team.id)?.filter((flag) => flag === receipt)).toHaveLength(1);
    }
    expect(state.news.filter((item) => item.id === `market-revenue-${state.season}-nym`)).toHaveLength(1);
    expect(state.briefingQueue.filter((item) => item.id === `brief-market-revenue-${state.season}-nym`)).toHaveLength(1);
    expect(state.news.find((item) => item.id === `market-revenue-${state.season}-nym`)?.body)
      .toMatch(/record-driven modeled attendance effect/i);
    expect(state.news.find((item) => item.id === `market-revenue-${state.season}-nym`)?.body)
      .not.toMatch(/fans attended|ticket revenue|paid tax/i);
    expect(state.rng.getState()).toEqual(rngBefore);
    expect(state.players).toEqual(playersBefore);
    expect(state.franchise).toEqual(franchiseBefore);
  });

  it('repairs stale owner fields, duplicate receipts, and either missing story half idempotently', () => {
    const state = makeState(15_002);
    setCompletedSeason(state);
    const first = reconcileCompletedSeasonMarketRevenue(state);
    const expectedUser = first.find((statement) => statement.teamId === state.userTeamId)!;
    const receipt = marketRevenueReceiptId(state.season);
    const owner = state.ownerState.get(state.userTeamId)!;
    state.ownerState.set(state.userTeamId, {
      ...owner,
      annualBudget: 1,
      payrollCap: 2,
      ifaBonusPool: undefined,
      expectations: { ...owner.expectations, payrollTarget: 3 },
    });
    state.storyFlags.set(state.userTeamId, [receipt, receipt, 'keep-me']);
    const newsId = `market-revenue-${state.season}-${state.userTeamId}`;
    state.news = state.news.filter((item) => item.id !== newsId);
    state.briefingQueue.push({
      ...state.briefingQueue.find((item) => item.id === `brief-${newsId}`)!,
      acknowledged: true,
    });

    reconcileCompletedSeasonMarketRevenue(state);
    const repaired = state.ownerState.get(state.userTeamId)!;
    expect(repaired).toMatchObject({
      annualBudget: expectedUser.annualBudget,
      payrollCap: expectedUser.payrollCap,
      ifaBonusPool: expectedUser.ifaBonusPool,
      expectations: { payrollTarget: expectedUser.payrollCap },
    });
    expect(state.storyFlags.get(state.userTeamId)).toEqual(['keep-me', receipt]);
    expect(state.news.filter((item) => item.id === newsId)).toHaveLength(1);
    expect(state.briefingQueue.filter((item) => item.id === `brief-${newsId}`)).toHaveLength(1);
    expect(state.briefingQueue.find((item) => item.id === `brief-${newsId}`)?.acknowledged).toBe(true);

    const fixedPoint = {
      owners: structuredClone(Array.from(state.ownerState.entries())),
      flags: structuredClone(Array.from(state.storyFlags.entries())),
      news: structuredClone(state.news),
      briefing: structuredClone(state.briefingQueue),
      rng: state.rng.getState(),
    };
    reconcileCompletedSeasonMarketRevenue(state);
    expect({
      owners: Array.from(state.ownerState.entries()),
      flags: Array.from(state.storyFlags.entries()),
      news: state.news,
      briefing: state.briefingQueue,
      rng: state.rng.getState(),
    }).toEqual(fixedPoint);
  });

  it('keeps canonical statements independent of user-only and recursive inputs', () => {
    const baseline = makeState(15_003);
    const hostile = makeState(15_003);
    setCompletedSeason(baseline);
    setCompletedSeason(hostile);
    hostile.userTeamId = 'bos';
    hostile.franchise.difficulty = 'hard';
    const nymOwner = hostile.ownerState.get('nym')!;
    hostile.ownerState.set('nym', {
      ...nymOwner,
      satisfaction: 0,
      spendingWillingness: 'cheap',
      annualBudget: 999,
      payrollCap: 999,
    });
    const nymPlayer = hostile.players.find((player) => player.teamId === 'nym')!;
    nymPlayer.contract = { ...nymPlayer.contract, annualSalary: nymPlayer.contract.annualSalary + 50 };

    const baselineStatements = prepareCompletedSeasonMarketRevenue(baseline).statements;
    const hostileStatements = prepareCompletedSeasonMarketRevenue(hostile).statements;
    expect(hostileStatements).toEqual(baselineStatements);
  });

  it('fails before mutation on incomplete standings, bracket topology, or stale prepared work', () => {
    for (const corrupt of [
      'standings',
      'undersized-field',
      'incomplete-world-series',
      'contradictory-champion',
    ] as const) {
      const state = makeState(15_004);
      setCompletedSeason(state);
      if (corrupt === 'standings') {
        state.seasonState = {
          ...state.seasonState,
          standings: StandingsTracker.deserialize(teamRecords().slice(1)),
        };
      } else if (corrupt === 'undersized-field') {
        state.playoffBracket = {
          ...state.playoffBracket!,
          seeds: state.playoffBracket!.seeds.slice(1),
        };
      } else if (corrupt === 'incomplete-world-series') {
        state.playoffBracket = {
          ...state.playoffBracket!,
          currentRoundSeries: [],
          completedRounds: state.playoffBracket!.completedRounds.slice(0, -1),
          series: state.playoffBracket!.series.filter((series) => series.round !== 'WORLD_SERIES'),
        };
      } else {
        const otherTeam = state.playoffBracket!.seeds.find(
          (seed) => seed.teamId !== state.playoffBracket!.champion
            && seed.teamId !== state.playoffBracket!.runnerUp,
        )!;
        state.playoffBracket = { ...state.playoffBracket!, champion: otherTeam.teamId };
      }
      const before = {
        owners: structuredClone(Array.from(state.ownerState.entries())),
        flags: structuredClone(Array.from(state.storyFlags.entries())),
        news: structuredClone(state.news),
        briefing: structuredClone(state.briefingQueue),
        rng: state.rng.getState(),
      };
      expect(() => prepareCompletedSeasonMarketRevenue(state)).toThrow(/market revenue/i);
      expect({
        owners: Array.from(state.ownerState.entries()),
        flags: Array.from(state.storyFlags.entries()),
        news: state.news,
        briefing: state.briefingQueue,
        rng: state.rng.getState(),
      }).toEqual(before);
    }

    const state = makeState(15_005);
    setCompletedSeason(state);
    const prepared = prepareCompletedSeasonMarketRevenue(state);
    state.season += 1;
    const before = structuredClone(Array.from(state.ownerState.entries()));
    expect(() => applyPreparedMarketRevenue(state, prepared)).toThrow(/stale/i);
    expect(Array.from(state.ownerState.entries())).toEqual(before);
  });

  it('settles on the first season-review Advance/Skip and defers saves already past it', () => {
    for (const operation of ['advance', 'skip'] as const) {
      const state = makeState(operation === 'advance' ? 15_006 : 15_007);
      setCompletedSeason(state);
      const receipt = marketRevenueReceiptId(state.season);
      expect(TEAMS.some((team) => state.storyFlags.get(team.id)?.includes(receipt))).toBe(false);

      const result = operation === 'advance'
        ? advanceOffseasonOnce(state)
        : skipOffseasonPhaseWithAI(state);
      expect(result.error).toBeUndefined();
      expect(TEAMS.every((team) => state.storyFlags.get(team.id)?.includes(receipt))).toBe(true);
    }

    const midOffseason = makeState(15_008);
    setCompletedSeason(midOffseason);
    midOffseason.offseasonState = {
      ...createOffseasonState(midOffseason.season),
      currentPhase: 'arbitration',
      phaseDay: 1,
      totalDay: 4,
    };
    advanceOffseasonOnce(midOffseason);
    expect(TEAMS.some((team) => midOffseason.storyFlags.get(team.id)?.includes(
      marketRevenueReceiptId(midOffseason.season),
    ))).toBe(false);

    const compactWithoutLeagueArtifact = makeState(15_011);
    setCompletedSeason(compactWithoutLeagueArtifact);
    compactWithoutLeagueArtifact.playoffBracket = null;
    const compactProgress = advanceOffseasonOnce(compactWithoutLeagueArtifact);
    expect(compactProgress.error).toBeUndefined();
    expect(compactWithoutLeagueArtifact.offseasonState?.phaseDay).toBe(2);
    expect(TEAMS.some((team) => compactWithoutLeagueArtifact.storyFlags.get(team.id)?.includes(
      marketRevenueReceiptId(compactWithoutLeagueArtifact.season),
    ))).toBe(false);
  });

  it('binds the worker result to the same pure controlled statement', () => {
    const state = makeState(15_009);
    setCompletedSeason(state);
    const user = prepareCompletedSeasonMarketRevenue(state).statements
      .find((statement) => statement.teamId === 'nym');
    expect(user).toEqual(deriveMarketRevenueStatement({
      teamId: 'nym',
      wins: 100,
      losses: 62,
      madePlayoffs: true,
      ownerArchetype: state.ownerState.get('nym')!.archetype,
    }));
  });

  it('archives the raw season budget rather than the user-only difficulty overlay or revenue', () => {
    const state = buildNewGameState({
      seed: 15_010,
      userTeamId: 'nym',
      gmName: 'Revenue Archive Audit',
      difficulty: 'hard',
      saveSlot: 15,
      dayOneExperience: 'quick',
    });
    setCompletedSeason(state);
    const owner = state.ownerState.get('nym')!;
    state.ownerState.set('nym', {
      ...owner,
      annualBudget: 321.09,
      payrollCap: 295.4,
    });

    setState(state);
    recordSeasonArchive(state);
    reconcileCompletedSeasonMarketRevenue(state);
    recordSeasonArchive(state, { includeOffseasonData: true });
    const archive = state.seasonArchive.find((entry) => entry.season === state.season)!;
    expect(archive.financials.find((entry) => entry.teamId === 'nym')?.budget).toBe(321.09);
    expect(archive.financials.find((entry) => entry.teamId === 'nym')).not.toHaveProperty('revenue');
  });

  it('round-trips one settled current snapshot without a fabricated revenue ledger', () => {
    const state = makeState(15_012);
    setCompletedSeason(state);
    const beforeRng = state.rng.getState();
    reconcileCompletedSeasonMarketRevenue(state);

    const snapshot = exportGameSnapshot(state);
    const restored = importGameSnapshot(snapshot);
    const roundTrip = exportGameSnapshot(restored);
    const receipt = marketRevenueReceiptId(state.season);

    expect(roundTrip).toEqual(snapshot);
    expect(roundTrip.schemaVersion).toBe(35);
    expect(restored.rng.getState()).toEqual(beforeRng);
    expect(TEAMS.every((team) => restored.storyFlags.get(team.id)?.includes(receipt))).toBe(true);
    expect(snapshot).not.toHaveProperty('marketRevenue');
    expect(snapshot.narrative).not.toHaveProperty('marketRevenue');
  });

  it('feeds Finance, team finance, Owner Intel, and Offseason from one settled statement', () => {
    const state = makeState(15_013);
    setCompletedSeason(state);
    const statement = reconcileCompletedSeasonMarketRevenue(state)
      .find((entry) => entry.teamId === state.userTeamId)!;
    setState(state);

    expect(queryApi.getFinanceOverview().marketRevenueStatement).toEqual(statement);
    expect(queryApi.getTeamFinances(state.userTeamId).marketRevenueStatement).toEqual(statement);
    expect(queryApi.getOwnerPayrollPresentation().marketRevenueStatement).toEqual(statement);
    expect(buildOffseasonStateView(state)?.commandCenter.projectedOpeningDay.marketRevenueStatement)
      .toEqual(statement);
    expect(queryApi.getOwnerPayrollPolicy().softCeiling).toBe(statement.payrollCap);
  });

  it('withholds stale or missing persisted allocations until the exact transition repairs them', () => {
    for (const corruption of ['stale', 'missing'] as const) {
      const state = makeState(corruption === 'stale' ? 15_015 : 15_016);
      setCompletedSeason(state);
      const statement = reconcileCompletedSeasonMarketRevenue(state)
        .find((entry) => entry.teamId === state.userTeamId)!;
      const imported = importGameSnapshot(exportGameSnapshot(state));
      if (corruption === 'missing') {
        imported.ownerState.delete(imported.userTeamId);
      } else {
        const owner = imported.ownerState.get(imported.userTeamId)!;
        imported.ownerState.set(imported.userTeamId, {
          ...owner,
          annualBudget: 1,
          payrollCap: 2,
          draftBonusPool: 3,
          ifaBonusPool: 4,
          staffBudget: 5,
          expectations: { ...owner.expectations, payrollTarget: 6 },
        });
      }

      const reloaded = importGameSnapshot(exportGameSnapshot(imported));
      setState(reloaded);
      expect(queryApi.getFinanceOverview().marketRevenueStatement).toBeNull();
      expect(queryApi.getTeamFinances(reloaded.userTeamId).marketRevenueStatement).toBeNull();
      expect(queryApi.getOwnerPayrollPresentation().marketRevenueStatement).toBeNull();
      expect(buildOffseasonStateView(reloaded)?.commandCenter.projectedOpeningDay.marketRevenueStatement)
        .toBeNull();

      const repair = advanceOffseasonOnce(reloaded);
      expect(repair.error).toBeUndefined();
      setState(reloaded);
      expect(queryApi.getFinanceOverview().marketRevenueStatement).toEqual(statement);
      expect(queryApi.getTeamFinances(reloaded.userTeamId).marketRevenueStatement).toEqual(statement);
      expect(queryApi.getOwnerPayrollPresentation().marketRevenueStatement).toEqual(statement);
      expect(buildOffseasonStateView(reloaded)?.commandCenter.projectedOpeningDay.marketRevenueStatement)
        .toEqual(statement);
      expect(queryApi.getOwnerPayrollPolicy().softCeiling).toBe(statement.payrollCap);
    }
  });

  it('keeps the settled explanation visible from factual archives after the next season starts', () => {
    const state = makeState(15_014);
    setCompletedSeason(state);
    const statement = reconcileCompletedSeasonMarketRevenue(state)
      .find((entry) => entry.teamId === state.userTeamId)!;
    recordSeasonArchive(state);
    const archive = state.seasonArchive.find((entry) => entry.season === state.season)!;
    const playoffTeams = state.playoffBracket!.seeds;
    archive.playoffSeries = playoffTeams.reduce<typeof archive.playoffSeries>(
      (series, team, index) => {
        if (index % 2 !== 0) return series;
        series.push({
          round: 'Wild Card',
          winnerTeamId: team.teamId,
          loserTeamId: playoffTeams[index + 1]?.teamId ?? null,
          result: '2-0',
        });
        return series;
      },
      [],
    );
    state.season += 1;
    state.playoffBracket = null;
    setState(state);

    expect(queryApi.getFinanceOverview().marketRevenueStatement).toEqual(statement);
    expect(queryApi.getOwnerPayrollPresentation().marketRevenueStatement).toEqual(statement);
    expect(queryApi.getTeamFinances(state.userTeamId).marketRevenueStatement).toEqual(statement);
  });
});
