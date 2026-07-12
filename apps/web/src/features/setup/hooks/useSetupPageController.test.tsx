import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SetupPreview, SetupTeamOption } from '../components/SetupTeamPickerPanel';
import { useSetupPageController } from './useSetupPageController';

const simAdvanceRuntime = vi.hoisted(() => ({
  status: { kind: 'idle' } as { kind: string },
}));

vi.mock('@/shared/hooks/useSimAdvanceExecutor', () => ({
  useSimAdvanceCoordinatorStatus: () => simAdvanceRuntime.status,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useSetupPageController>[0];
type HookResult = ReturnType<typeof useSetupPageController>;

const teamOptions = [
  { id: 'nym', label: 'New York Tycoons' },
  { id: 'bos', label: 'Boston Noreasters' },
] as const satisfies readonly SetupTeamOption[];

function previewFor(teamId: string): SetupPreview {
  return {
    teamId,
    teamName: teamOptions.find((team) => team.id === teamId)?.label ?? teamId,
    division: 'AL_EAST',
    archetype: 'Balanced Contender',
    franchiseHook: `${teamId} hook`,
    whyNow: 'The room needs a clean read before Opening Day.',
    marketSize: 'large',
    timeline: 'Balanced',
    payrollTier: 'Premier',
    farmSystemRating: 'B',
    strengths: ['rotation depth'],
    weaknesses: ['bullpen volatility'],
    teamIdentityBlurb: `${teamId} identity`,
    projectedRecord: '86-76',
    topPlayers: [
      { playerId: `${teamId}-star`, name: 'Anchor Star', position: 'CF', overall: 78 },
    ],
    divisionRivals: [
      { teamId: 'bos', teamName: 'Boston Noreasters' },
    ],
  };
}

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useSetupPageController(options));
  return null;
}

describe('useSetupPageController', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;
  let dateNowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
    dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(42);
    simAdvanceRuntime.status = { kind: 'idle' };
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      activeSaveId: null,
      activeSaveSlot: null,
      initializeGame: vi.fn(),
      setInitialized: vi.fn(),
      isInitialized: false,
      listSaveTree: vi.fn().mockResolvedValue([]),
      navigate: vi.fn(),
      persistActiveSave: vi.fn().mockResolvedValue({ saved: true, saveName: 'Outgoing Save' }),
      recovery: { showFailure: vi.fn() },
      teamOptions,
      worker: {
        exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34 }),
        getScenarioCatalog: vi.fn().mockResolvedValue([]),
        getSetupPreview: vi.fn().mockImplementation(async ({ userTeamId }: { userTeamId: string }) => previewFor(userTeamId)),
        importSnapshot: vi.fn().mockResolvedValue({
          success: true,
          season: 4,
          day: 88,
          phase: 'regular',
          playerCount: 780,
          userTeamId: 'nym',
          teamName: 'New York Tycoons',
          gmName: 'General Manager',
          difficulty: 'standard',
        }),
        isReady: true,
        newGame: vi.fn().mockResolvedValue({
          season: 1,
          day: 1,
          phase: 'preseason',
          playerCount: 780,
          userTeamId: 'nym',
          teamName: 'New York Tycoons',
          gmName: 'Alex Rivera',
          difficulty: 'standard',
        }),
        restartWorker: vi.fn().mockResolvedValue(undefined),
        workerStatus: 'ready',
      },
      ...overrides,
    } as HookOptions;
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    expect(latestResult).toBeTruthy();
    return latestResult as HookResult;
  }

  async function waitForAssertion(assertion: () => void) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        assertion();
        return;
      } catch (error) {
        lastError = error;
      }
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      });
    }
    throw lastError;
  }

  it('builds setup content props and opens the selected slot through existing setup hooks', async () => {
    const options = baseOptions();
    await renderHook(options);

    expect(latestResult?.contentProps.wizardOpen).toBe(false);
    expect(latestResult?.contentProps.saveHubPanelProps.selectedSlot).toBe(1);

    await act(async () => {
      latestResult?.contentProps.saveHubPanelProps.onUseSlot(4);
    });

    await waitForAssertion(() => {
      expect(latestResult?.contentProps.wizardOpen).toBe(true);
      expect(latestResult?.contentProps.wizardPanelProps.selectedSlot).toBe(4);
      expect(latestResult?.contentProps.wizardPanelProps.gmName).toBe('Alex Porter');
      expect(latestResult?.contentProps.wizardPanelProps.previewMap.nym?.teamName).toBe('New York Tycoons');
      expect(latestResult?.contentProps.wizardPanelProps.previewMap.bos?.teamName).toBe('Boston Noreasters');
    });

    expect(options.worker.getSetupPreview).toHaveBeenCalledWith({
      seed: 42,
      userTeamId: 'nym',
      difficulty: 'standard',
    });
    expect(options.worker.getSetupPreview).toHaveBeenCalledWith({
      seed: 42,
      userTeamId: 'bos',
      difficulty: 'standard',
    });

    await act(async () => {
      latestResult?.contentProps.wizardPanelProps.onBack();
    });

    expect(latestResult?.contentProps.wizardOpen).toBe(false);
  });

  it('keeps read-only refresh available while visibly blocking save-tree changes during coordinator work', async () => {
    const listSaveTree = vi.fn().mockResolvedValue([]);
    const options = baseOptions({ listSaveTree });
    simAdvanceRuntime.status = { kind: 'persisting' };
    await renderHook(options);
    await waitForAssertion(() => expect(listSaveTree).toHaveBeenCalled());

    expect(latestResult?.contentProps.saveHubPanelProps.mutationBlocked).toBe(true);
    expect(latestResult?.contentProps.wizardPanelProps.mutationBlocked).toBe(true);
    expect(latestResult?.contentProps.status).toContain('Save-tree changes are paused');
    await act(async () => {
      latestResult?.contentProps.onOpenWizard();
      latestResult?.contentProps.saveHubPanelProps.onUseSlot(4);
      latestResult?.contentProps.saveHubPanelProps.onDeleteSlot(1);
      latestResult?.contentProps.wizardPanelProps.onBeginDynasty();
      latestResult?.contentProps.saveHubPanelProps.onRefresh();
    });

    expect(latestResult?.contentProps.wizardOpen).toBe(false);
    expect(options.worker.newGame).not.toHaveBeenCalled();
    expect(listSaveTree.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('gives live coordinator-busy truth precedence over an older setup status', async () => {
    const options = baseOptions({ listSaveTree: vi.fn().mockRejectedValue(new Error('old refresh failure')) });
    await renderHook(options);
    await waitForAssertion(() => expect(latestResult?.contentProps.status).not.toBe(''));

    simAdvanceRuntime.status = { kind: 'running' };
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => { latestResult = result; }} />);
    });
    expect(latestResult?.contentProps.status).toBe(
      'Simulation save activity is still settling. Save-tree changes are paused; read-only refresh remains available.',
    );
  });
});
