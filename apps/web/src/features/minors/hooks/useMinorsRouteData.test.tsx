import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { AffiliateBoxScoreView, AffiliateResultView } from '../components/AffiliateResultsPanel';
import type { AffiliateStandingView } from '../components/AffiliateStandingsPanel';
import type { FarmReportView } from '../components/FarmReportPanel';
import type { WaiverClaimView } from '../components/WaiverTrafficPanel';
import { useMinorsRouteData } from './useMinorsRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useMinorsRouteData>[0];
type HookResult = ReturnType<typeof useMinorsRouteData>;

const affiliates: AffiliateStandingView[] = [
  {
    teamId: 'nym',
    level: 'AAA',
    label: 'AAA',
    wins: 48,
    losses: 32,
    gamesPlayed: 80,
    runDifferential: 37,
    topPerformer: {
      playerId: 'prospect-1',
      playerName: 'Marco Ascension',
      statLine: '.322 AVG | 14 HR',
    },
  },
];

const recentBoxScores: AffiliateResultView[] = [
  {
    id: 'box-1',
    teamId: 'nym',
    day: 92,
    level: 'AAA',
    label: 'AAA',
    result: 'W',
    scoreline: '6-3 vs BOS',
    summary: 'The lineup controlled the zone all night.',
  },
  {
    id: 'box-2',
    teamId: 'nym',
    day: 93,
    level: 'AA',
    label: 'AA',
    result: 'L',
    scoreline: '4-2 vs BAL',
    summary: 'The late rally stalled.',
  },
];

const overview = {
  affiliates,
  recentBoxScores,
  waiverClaims: [] as WaiverClaimView[],
  farmReport: {
    bondedProspects: 4,
    activeSetbackCount: 1,
    breakoutCandidates: [],
    topProspects: [],
  } satisfies FarmReportView,
};

const pipeline = {
  health: {
    score: 78,
    label: 'surging',
    readyNow: 1,
    nextWave: 1,
    longTerm: 1,
    organizationalDepth: 1,
  },
  developmentFocus: {
    summary: 'Development priorities are separated.',
    priorities: [],
  },
  prospects: [
    {
      playerId: 'prospect-1',
      playerName: 'Marco Ascension',
      position: 'SS',
      level: 'AAA',
      age: 22,
      overallRating: 61,
      ceiling: 74,
      prospectTier: 'ready_depth' as const,
      bondStrength: 42,
      eta: 'Ready now',
      trend: 'surging' as const,
      latestLineSummary: '.322 AVG | 82 H | 14 HR | 48 RBI',
      activeSetback: null,
      milestones: ['Drafted Round 1, 3'],
    },
    {
      playerId: 'prospect-2',
      playerName: 'Jules Caldera',
      position: 'CF',
      level: 'AA',
      age: 21,
      overallRating: 55,
      ceiling: 70,
      prospectTier: 'future' as const,
      bondStrength: 24,
      eta: 'Next season',
      trend: 'setback' as const,
      latestLineSummary: '.241 AVG | 7 HR',
      activeSetback: {
        type: 'discipline',
        summary: 'Swing decisions have slipped.',
      },
      milestones: [],
    },
    {
      playerId: 'prospect-3',
      playerName: 'Theo Longview',
      position: 'RHP',
      level: 'A',
      age: 19,
      overallRating: 47,
      ceiling: 76,
      prospectTier: 'impact' as const,
      bondStrength: 12,
      eta: '3 seasons',
      trend: 'steady' as const,
      latestLineSummary: '38.0 IP | 3.10 ERA | 44 K',
      activeSetback: null,
      milestones: [],
    },
    {
      playerId: 'prospect-4',
      playerName: 'Depth Arm',
      position: 'RHP',
      level: 'AAA',
      age: 29,
      overallRating: 52,
      ceiling: 57,
      prospectTier: 'organizational_depth' as const,
      bondStrength: 4,
      eta: 'Depth option',
      trend: 'steady' as const,
      latestLineSummary: null,
      activeSetback: null,
      milestones: [],
    },
  ],
};

const boxScores: Record<string, AffiliateBoxScoreView> = {
  'box-1': {
    id: 'box-1',
    season: 5,
    day: 92,
    level: 'AAA',
    label: 'AAA',
    homeTeamId: 'nym',
    awayTeamId: 'bos',
    homeTeamName: 'Tycoons',
    awayTeamName: 'Noreasters',
    homeScore: 6,
    awayScore: 3,
    summary: 'The lineup controlled the zone all night.',
    notablePlayers: [],
  },
  'box-2': {
    id: 'box-2',
    season: 5,
    day: 93,
    level: 'AA',
    label: 'AA',
    homeTeamId: 'nym',
    awayTeamId: 'bal',
    homeTeamName: 'Tycoons',
    awayTeamName: 'Blue Crabs',
    homeScore: 2,
    awayScore: 4,
    summary: 'The late rally stalled.',
    notablePlayers: [],
  },
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useMinorsRouteData(options));
  return null;
}

describe('useMinorsRouteData', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latest = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function makeOptions(overrides: Partial<HookOptions> = {}) {
    const getAffiliateOverview = vi.fn().mockResolvedValue(overview);
    const getAffiliateBoxScore = vi.fn().mockImplementation((boxScoreId: string) => Promise.resolve(boxScores[boxScoreId] ?? null));
    const getProspectPipeline = vi.fn().mockResolvedValue(pipeline);

    return {
      getAffiliateBoxScore,
      getAffiliateOverview,
      getProspectPipeline,
      options: {
        day: 92,
        getAffiliateBoxScore,
        getAffiliateOverview,
        getProspectPipeline,
        isInitialized: true,
        phase: 'regular',
        season: 5,
        userTeamId: 'nym',
        workerReady: true,
        ...overrides,
      } satisfies HookOptions,
    };
  }

  async function flushAsyncWork() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latest = result;
      }} />);
      await flushAsyncWork();
    });
    expect(latest).toBeTruthy();
    return latest as HookResult;
  }

  it('waits without querying until game state and worker are ready', async () => {
    const { getAffiliateBoxScore, getAffiliateOverview, getProspectPipeline, options } = makeOptions({
      workerReady: false,
    });

    const result = await renderHook(options);

    expect(getAffiliateOverview).not.toHaveBeenCalled();
    expect(getProspectPipeline).not.toHaveBeenCalled();
    expect(getAffiliateBoxScore).not.toHaveBeenCalled();
    expect(result.overview).toBeNull();
    expect(result.pipeline).toBeNull();
    expect(result.selectedBoxScore).toBeNull();
    expect(result.selectedBoxScoreId).toBeNull();
  });

  it('loads affiliate overview, prospect pipeline, default box score, and triage groups', async () => {
    const { getAffiliateBoxScore, getAffiliateOverview, getProspectPipeline, options } = makeOptions();

    const result = await renderHook(options);

    expect(getAffiliateOverview).toHaveBeenCalledWith('nym');
    expect(getProspectPipeline).toHaveBeenCalledWith('nym');
    expect(getAffiliateBoxScore).toHaveBeenCalledWith('box-1');
    expect(result.overview).toBe(overview);
    expect(result.pipeline).toBe(pipeline);
    expect(result.selectedBoxScoreId).toBe('box-1');
    expect(result.selectedBoxScore).toBe(boxScores['box-1']);
    expect(result.pipelineTriage.risers.map((prospect) => prospect.playerId)).toEqual(['prospect-1']);
    expect(result.pipelineTriage.fallers.map((prospect) => prospect.playerId)).toEqual(['prospect-2']);
    expect(result.pipelineTriage.readyNow.map((prospect) => prospect.playerId)).toEqual(['prospect-1']);
    expect(result.pipelineTriage.nextWave.map((prospect) => prospect.playerId)).toEqual(['prospect-2']);
    expect(result.pipelineTriage.longView.map((prospect) => prospect.playerId)).toEqual(['prospect-3']);
  });

  it('fetches a new selected affiliate box score when selection changes', async () => {
    const { getAffiliateBoxScore, options } = makeOptions();
    const result = await renderHook(options);

    await act(async () => {
      result.setSelectedBoxScoreId('box-2');
      await flushAsyncWork();
    });

    expect(getAffiliateBoxScore).toHaveBeenLastCalledWith('box-2');
    expect((latest as HookResult).selectedBoxScoreId).toBe('box-2');
    expect((latest as HookResult).selectedBoxScore).toBe(boxScores['box-2']);
  });

  it('refetches overview and pipeline when the game calendar changes', async () => {
    const { getAffiliateOverview, getProspectPipeline, options } = makeOptions();
    await renderHook(options);

    await renderHook({
      ...options,
      day: 93,
    });
    await renderHook({
      ...options,
      day: 1,
      phase: 'offseason',
      season: 6,
    });

    expect(getAffiliateOverview).toHaveBeenCalledTimes(3);
    expect(getProspectPipeline).toHaveBeenCalledTimes(3);
  });
});
