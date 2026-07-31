// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersistentTradeOffer, TradeAsset, TradeHistoryEntry } from '@mbd/contracts';
import { TEAMS, type GeneratedPlayer } from '@mbd/sim-core';

vi.mock('comlink', () => ({
  expose: () => {},
}));

vi.mock('../shared/lib/saveSystem.js', () => ({
  listBranches: vi.fn(),
  loadGameById: vi.fn(),
  saveGameById: vi.fn(),
}));

import { api } from './sim.worker';
import { requireState, setState, type FullGameState } from './sim.worker.helpers';
import {
  calculateStateTeamPayroll,
  calculateStateLeaguePayrolls,
  effectiveAcquiringSalary,
  validateTradeFinancialTerms,
} from './sim.worker.tradeFinance';

type PlayerAsset = Extract<TradeAsset, { type: 'player' }>;

function startRegularGame(seed = 17_101, userTeamId = 'nym'): FullGameState {
  api.newGame({
    seed,
    userTeamId,
    gmName: 'Trade Finance Audit',
    difficulty: 'standard',
    saveSlot: 1,
  });
  const state = requireState();
  state.phase = 'regular';
  state.day = 60;
  return state;
}

function controlledContractPlayer(
  state: FullGameState,
  teamId: string,
  excludedIds: readonly string[] = [],
): GeneratedPlayer {
  const player = state.players.find((candidate) => candidate.teamId === teamId
    && candidate.rosterStatus === 'MLB'
    && candidate.contract.years >= 2
    && candidate.contract.annualSalary > 0
    && !excludedIds.includes(candidate.id));
  if (!player) throw new Error(`Expected a contracted MLB player controlled by ${teamId}.`);
  return player;
}

function firstCpuTeam(state: FullGameState): string {
  const teamId = state.players.find((player) => player.teamId && player.teamId !== state.userTeamId)?.teamId;
  if (!teamId) throw new Error('Expected at least one CPU team.');
  return teamId;
}

function financialAsset(
  state: FullGameState,
  player: GeneratedPlayer,
  overrides: Partial<PlayerAsset> = {},
): PlayerAsset {
  const guaranteedYears = player.contract.years
    - (player.contract.playerOption || player.contract.teamOption ? 1 : 0);
  return {
    type: 'player',
    playerId: player.id,
    contractReference: {
      annualSalary: player.contract.annualSalary,
      contractEndSeasonExclusive: state.season + player.contract.years,
    },
    retainedSalary: {
      annualAmount: Math.round(player.contract.annualSalary * 25) / 100,
      startSeason: state.season,
      endSeasonExclusive: state.season + guaranteedYears,
    },
    ...overrides,
  };
}

function history(
  state: FullGameState,
  id: string,
  fromTeamId: string,
  toTeamId: string,
  asset: PlayerAsset,
): TradeHistoryEntry {
  return {
    id,
    fromTeamId,
    toTeamId,
    offeringAssets: [asset],
    requestingAssets: [],
    fairnessScore: 0,
    summary: id,
    timestamp: `S${state.season}D${state.day}`,
  };
}

function incomingOffer(
  state: FullGameState,
  id: string,
  fromTeamId: string,
  offeringAsset: PlayerAsset,
  requestedPlayer: GeneratedPlayer,
): PersistentTradeOffer {
  return {
    id,
    fromTeamId,
    toTeamId: state.userTeamId,
    offeringAssets: [offeringAsset],
    requestingAssets: [{ type: 'player', playerId: requestedPlayer.id }],
    fairnessScore: 0,
    message: 'Exact salary-support audit offer.',
    createdAt: `S${state.season}D${state.day}`,
  };
}

describe('trade financial aggregate validator', () => {
  beforeEach(() => {
    setState(null);
  });

  afterEach(() => {
    setState(null);
    vi.restoreAllMocks();
  });

  it('accepts one bounded player-linked term independent of which club is user-controlled', () => {
    const state = startRegularGame();
    const cpuTeamId = firstCpuTeam(state);
    const player = controlledContractPlayer(state, cpuTeamId);
    const asset = financialAsset(state, player, {
      cashConsideration: { amount: 0.01, season: state.season },
    });

    const first = validateTradeFinancialTerms(state, cpuTeamId, state.userTeamId, [asset], []);
    const originalUserTeamId = state.userTeamId;
    state.userTeamId = cpuTeamId;
    const swapped = validateTradeFinancialTerms(state, cpuTeamId, originalUserTeamId, [asset], []);
    state.userTeamId = originalUserTeamId;

    expect(first).toBeNull();
    expect(swapped).toBe(first);
    expect(effectiveAcquiringSalary(state, asset, state.userTeamId)).toBe(
      Math.round((player.contract.annualSalary
        - asset.retainedSalary!.annualAmount
        - asset.cashConsideration!.amount) * 100) / 100,
    );
  });

  it('builds an exact ordered same-day league projection without changing the single-team oracle', () => {
    const state = startRegularGame();
    const teamIds = TEAMS.map((team) => team.id);
    const projection = calculateStateLeaguePayrolls(state, teamIds);
    expect(Array.from(projection.keys())).toEqual(teamIds);
    for (const teamId of teamIds) {
      expect(projection.get(teamId)).toEqual(calculateStateTeamPayroll(state, teamId));
    }
  });

  it.each([
    ['wrong-side ownership', (state: FullGameState, cpuTeamId: string, player: GeneratedPlayer, asset: PlayerAsset) => ({
      fromTeamId: state.userTeamId,
      toTeamId: cpuTeamId,
      offering: [asset],
      requesting: [],
      message: 'Financial support can only be attached by the team controlling that player.',
    })],
    ['stale contract reference', (state: FullGameState, cpuTeamId: string, _player: GeneratedPlayer, asset: PlayerAsset) => ({
      fromTeamId: cpuTeamId,
      toTeamId: state.userTeamId,
      offering: [{ ...asset, contractReference: { ...asset.contractReference!, annualSalary: asset.contractReference!.annualSalary + 1 } }],
      requesting: [],
      message: 'The player contract changed after these financial terms were prepared.',
    })],
    ['duplicate player', (state: FullGameState, cpuTeamId: string, _player: GeneratedPlayer, asset: PlayerAsset) => ({
      fromTeamId: cpuTeamId,
      toTeamId: state.userTeamId,
      offering: [asset],
      requesting: [{ type: 'player' as const, playerId: asset.playerId }],
      message: 'A player may appear only once in a trade package.',
    })],
    ['offsetting cash', (state: FullGameState, cpuTeamId: string, _player: GeneratedPlayer, asset: PlayerAsset) => {
      const userPlayer = controlledContractPlayer(state, state.userTeamId);
      return {
        fromTeamId: cpuTeamId,
        toTeamId: state.userTeamId,
        offering: [{ ...asset, cashConsideration: { amount: 0.01, season: state.season } }],
        requesting: [financialAsset(state, userPlayer, {
          retainedSalary: undefined,
          cashConsideration: { amount: 0.01, season: state.season },
        })],
        message: 'Both teams cannot send offsetting cash considerations.',
      };
    }],
    ['option-year overreach', (state: FullGameState, cpuTeamId: string, player: GeneratedPlayer, asset: PlayerAsset) => {
      player.contract = { ...player.contract, playerOption: true };
      return {
        fromTeamId: cpuTeamId,
        toTeamId: state.userTeamId,
        offering: [{
          ...asset,
          contractReference: {
            annualSalary: player.contract.annualSalary,
            contractEndSeasonExclusive: state.season + player.contract.years,
          },
          retainedSalary: {
            ...asset.retainedSalary!,
            endSeasonExclusive: state.season + player.contract.years,
          },
        }],
        requesting: [],
        message: 'Retained salary must match the player’s remaining guaranteed contract seasons.',
      };
    }],
  ] as const)('rejects %s before trade mutation', (_label, buildCase) => {
    const state = startRegularGame();
    const cpuTeamId = firstCpuTeam(state);
    const player = controlledContractPlayer(state, cpuTeamId);
    const testCase = buildCase(state, cpuTeamId, player, financialAsset(state, player));

    expect(validateTradeFinancialTerms(
      state,
      testCase.fromTeamId,
      testCase.toTeamId,
      testCase.offering,
      testCase.requesting,
    )).toBe(testCase.message);
  });

  it('rejects a third retaining team, a duplicate retainer, and a fourth active retained contract', () => {
    const state = startRegularGame();
    const cpuTeamId = firstCpuTeam(state);
    const player = controlledContractPlayer(state, cpuTeamId);
    const asset = financialAsset(state, player);
    state.tradeState.tradeHistory = [
      history(state, 'prior-1', 'bos', cpuTeamId, asset),
      history(state, 'prior-2', 'lad', cpuTeamId, asset),
    ];

    expect(validateTradeFinancialTerms(state, cpuTeamId, state.userTeamId, [asset], []))
      .toBe('This contract already has the maximum number of retaining teams.');

    state.tradeState.tradeHistory = [history(state, 'same-payer', cpuTeamId, state.userTeamId, asset)];
    expect(validateTradeFinancialTerms(state, cpuTeamId, state.userTeamId, [asset], []))
      .toBe('A team cannot retain the same player contract twice.');

    const teammates = state.players.filter((candidate) => candidate.teamId === cpuTeamId
      && candidate.rosterStatus === 'MLB'
      && candidate.contract.years >= 2
      && candidate.contract.annualSalary > 0
      && candidate.id !== player.id).slice(0, 3);
    expect(teammates).toHaveLength(3);
    state.tradeState.tradeHistory = teammates.map((teammate, index) => history(
      state,
      `active-${index}`,
      cpuTeamId,
      state.userTeamId,
      financialAsset(state, teammate),
    ));
    expect(validateTradeFinancialTerms(state, cpuTeamId, state.userTeamId, [asset], []))
      .toBe('This team would exceed the maximum number of retained contracts.');
  });

  it('rejects two proposed retained contracts that jointly exceed the team limit', () => {
    const state = startRegularGame();
    const cpuTeamId = firstCpuTeam(state);
    const players = state.players.filter((candidate) => candidate.teamId === cpuTeamId
      && candidate.rosterStatus === 'MLB'
      && candidate.contract.years >= 2
      && candidate.contract.annualSalary > 0).slice(0, 4);
    expect(players).toHaveLength(4);
    state.tradeState.tradeHistory = players.slice(0, 2).map((player, index) => history(
      state,
      `existing-${index}`,
      cpuTeamId,
      state.userTeamId,
      financialAsset(state, player),
    ));

    expect(validateTradeFinancialTerms(
      state,
      cpuTeamId,
      state.userTeamId,
      players.slice(2).map((player) => financialAsset(state, player)),
      [],
    )).toBe('This team would exceed the maximum number of retained contracts.');
  });

  it('values a return to the payer at gross responsibility and subtracts only external support', () => {
    const state = startRegularGame();
    const cpuTeamId = firstCpuTeam(state);
    const player = controlledContractPlayer(state, cpuTeamId);
    player.contract = {
      ...player.contract,
      years: 3,
      annualSalary: 20,
      totalValue: 60,
      playerOption: false,
      teamOption: false,
    };
    const ownSupport = financialAsset(state, player, {
      retainedSalary: { annualAmount: 5, startSeason: state.season, endSeasonExclusive: state.season + 3 },
      cashConsideration: undefined,
    });
    state.tradeState.tradeHistory = [history(
      state,
      'user-retained',
      state.userTeamId,
      cpuTeamId,
      ownSupport,
    )];
    const returningAsset: PlayerAsset = {
      type: 'player',
      playerId: player.id,
      contractReference: ownSupport.contractReference,
    };
    expect(effectiveAcquiringSalary(state, returningAsset, state.userTeamId)).toBe(20);

    state.tradeState.tradeHistory.unshift(history(
      state,
      'external-retained',
      'lad',
      cpuTeamId,
      {
        ...ownSupport,
        retainedSalary: { annualAmount: 3, startSeason: state.season, endSeasonExclusive: state.season + 3 },
      },
    ));
    expect(effectiveAcquiringSalary(state, returningAsset, state.userTeamId)).toBe(17);
  });

  it('exposes prior support, remaining headroom, buyer responsibility, and the uncovered option year', () => {
    const state = startRegularGame();
    const cpuTeamId = firstCpuTeam(state);
    const player = controlledContractPlayer(state, cpuTeamId);
    player.contract = {
      ...player.contract,
      years: 3,
      annualSalary: 24,
      totalValue: 72,
      playerOption: true,
      teamOption: false,
    };
    const priorAsset = financialAsset(state, player, {
      retainedSalary: {
        annualAmount: 4,
        startSeason: state.season,
        endSeasonExclusive: state.season + 2,
      },
      cashConsideration: { amount: 1, season: state.season },
    });
    state.tradeState.tradeHistory = [history(state, 'prior-support', 'lad', cpuTeamId, priorAsset)];

    const inventory = api.getTradeAssetInventory(cpuTeamId);
    expect(inventory.playerFinancials?.[player.id]).toMatchObject({
      grossAnnualSalary: 24,
      guaranteedEndSeasonExclusive: state.season + 2,
      contractEndSeasonExclusive: state.season + 3,
      optionSeason: state.season + 2,
      existingRetainedSalary: 4,
      existingCashConsideration: 1,
      remainingRetentionHeadroom: 8,
      remainingCurrentSupportHeadroom: 7,
      guaranteedFutureSeason: state.season + 1,
    });

    const outgoing = controlledContractPlayer(state, state.userTeamId);
    state.tradeState.pendingOffers = [incomingOffer(
      state,
      'supported-option-offer',
      cpuTeamId,
      { type: 'player', playerId: player.id, contractReference: priorAsset.contractReference },
      outgoing,
    )];
    const detail = api.getTradeOffers()[0]?.offeringAssets[0]?.detail ?? '';
    expect(detail).toContain('$5.00M prior support');
    expect(detail).toContain('$19.00M buyer now');
    expect(detail).toContain(`$20.00M buyer S${state.season + 1}`);
    expect(detail).toContain(`$24.00M option S${state.season + 2} uncovered`);
  });

  it('counts prior current-season cash when validating support on a retrade', () => {
    const state = startRegularGame();
    const cpuTeamId = firstCpuTeam(state);
    const player = controlledContractPlayer(state, cpuTeamId);
    player.contract = {
      ...player.contract,
      annualSalary: 20,
      totalValue: 60,
      years: 3,
      playerOption: false,
      teamOption: false,
    };
    const priorCashAsset = financialAsset(state, player, {
      retainedSalary: undefined,
      cashConsideration: { amount: 4, season: state.season },
    });
    state.tradeState.tradeHistory = [history(
      state,
      'prior-cash',
      'bos',
      cpuTeamId,
      priorCashAsset,
    )];
    const retradeAsset = financialAsset(state, player, {
      retainedSalary: {
        annualAmount: 7,
        startSeason: state.season,
        endSeasonExclusive: state.season + 3,
      },
    });

    expect(validateTradeFinancialTerms(
      state,
      cpuTeamId,
      state.userTeamId,
      [retradeAsset],
      [],
    )).toBe('Retained salary plus cash consideration cannot exceed 50% of gross salary.');
  });
});

describe('bounded deterministic trade-retention study', () => {
  afterEach(() => {
    setState(null);
    vi.restoreAllMocks();
  });

  function run(seed: number) {
    const state = startRegularGame(seed);
    const cpuTeamId = firstCpuTeam(state);
    const incoming = controlledContractPlayer(state, cpuTeamId);
    const outgoing = controlledContractPlayer(state, state.userTeamId);
    incoming.contract = {
      ...incoming.contract,
      annualSalary: 20,
      totalValue: 60,
      years: 3,
      playerOption: false,
      teamOption: false,
    };
    const asset = financialAsset(state, incoming, {
      retainedSalary: {
        annualAmount: 5,
        startSeason: state.season,
        endSeasonExclusive: state.season + 3,
      },
      cashConsideration: { amount: 2, season: state.season },
    });
    const offer = incomingOffer(state, `study-${seed}`, cpuTeamId, asset, outgoing);
    state.tradeState.pendingOffers = [offer];
    expect(validateTradeFinancialTerms(
      state,
      offer.fromTeamId,
      offer.toTeamId,
      offer.offeringAssets,
      offer.requestingAssets,
    )).toBeNull();

    expect(api.respondToTradeOffer(offer.id, 'accept')).toMatchObject({
      success: true,
      decision: 'accepted',
      flowStateChanged: true,
    });
    const controller = api.getFinanceOverview();
    const contract = controller.contracts.find((entry) => entry.playerId === incoming.id);
    const payer = calculateStateTeamPayroll(requireState(), cpuTeamId);
    const digest = {
      seed,
      historyCount: requireState().tradeState.tradeHistory.filter((entry) => entry.id === offer.id).length,
      pendingCount: requireState().tradeState.pendingOffers.filter((entry) => entry.id === offer.id).length,
      controllerTeamId: requireState().players.find((entry) => entry.id === incoming.id)?.teamId,
      controllerGross: contract?.annualSalary,
      controllerCredit: contract?.salaryCredit,
      controllerNet: contract?.effectiveAnnualSalary,
      payerRetained: payer.retainedSalaryCharges,
      payerCash: payer.cashConsiderationCharges,
      payerDeadMoney: payer.deadMoney,
      conserved: Math.round(((contract?.effectiveAnnualSalary ?? 0) + payer.deadMoney) * 100) / 100,
      rng: requireState().rng.getState(),
    };
    setState(null);
    return digest;
  }

  it('is same-seed exact and conserves payer/controller responsibility across four leagues', () => {
    for (const seed of [17_101, 17_102, 17_103, 17_104]) {
      const first = run(seed);
      const second = run(seed);
      expect(second).toEqual(first);
      expect(first).toMatchObject({
        historyCount: 1,
        pendingCount: 0,
        controllerTeamId: 'nym',
        controllerGross: 20,
        controllerCredit: 7,
        controllerNet: 13,
        payerRetained: 5,
        payerCash: 2,
        payerDeadMoney: 7,
        conserved: 20,
      });
    }
  });
});
