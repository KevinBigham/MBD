import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useSetupRouteData } from './useSetupRouteData';
import type { SetupPreview, SetupTeamOption } from '../components/SetupTeamPickerPanel';
import type { SaveTreeEntry } from '@/shared/lib/saveSystem';

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useSetupRouteData>[0];
type HookResult = ReturnType<typeof useSetupRouteData>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useSetupRouteData(options));
  return null;
}

const teamOptions = [
  { id: 'nym', label: 'New York Tycoons' },
  { id: 'bos', label: 'Boston Noreasters' },
  { id: 'kc', label: 'Kansas City BBQ Fountains' },
] as const satisfies readonly SetupTeamOption[];

const scenarioCatalog = [
  {
    id: 'win-now',
    name: 'Win Now',
    description: 'A short-window title chase.',
    difficulty: 'hard',
    maxSeasons: 3,
    requiresCareerMode: false,
    startingTeamId: 'bos',
  },
  {
    id: 'rebuild',
    name: 'Rebuild',
    description: 'A patient prospect-heavy climb.',
    difficulty: 'standard',
    maxSeasons: 5,
    requiresCareerMode: true,
    startingTeamId: 'kc',
  },
] as const;

function previewFor(teamId: string): SetupPreview {
  const label = teamOptions.find((team) => team.id === teamId)?.label ?? teamId;
  return {
    teamId,
    teamName: label,
    division: 'AL_EAST',
    archetype: teamId === 'bos' ? 'October Pressure' : 'Balanced Contender',
    franchiseHook: `${label} dossier`,
    whyNow: 'The front office needs a clean read before opening day.',
    marketSize: teamId === 'kc' ? 'small' : 'large',
    timeline: teamId === 'bos' ? 'Win now' : 'Balanced',
    payrollTier: teamId === 'kc' ? 'Lean' : 'Premier',
    farmSystemRating: teamId === 'kc' ? 'A-' : 'B',
    strengths: ['rotation depth'],
    weaknesses: ['bullpen volatility'],
    teamIdentityBlurb: `${label} identity`,
    projectedRecord: teamId === 'bos' ? '91-71' : '86-76',
    topPlayers: [
      { playerId: `${teamId}-star`, name: 'Anchor Star', position: 'CF', overall: 78 },
    ],
    divisionRivals: [
      { teamId: 'nym', teamName: 'New York Tycoons' },
    ],
  };
}

function saveTreeForSlots(slots: number[]): SaveTreeEntry[] {
  return slots.map((slot) => ({
    save: {
      id: `save-slot-${slot}`,
      slotNumber: slot,
      name: `Slot ${slot}`,
      season: 2,
      day: 42,
      phase: 'regular',
      schemaVersion: 34,
      hasSnapshot: false,
      snapshot: null,
      legacyState: null,
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T12:00:00.000Z',
      parentSaveId: null,
      isRootSave: true,
      branchMeta: null,
    },
    branches: [],
  }));
}

describe('useSetupRouteData', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      difficulty: 'standard',
      getScenarioCatalog: vi.fn().mockResolvedValue(scenarioCatalog),
      getSetupPreview: vi.fn().mockImplementation(async ({ userTeamId }: { userTeamId: string }) => previewFor(userTeamId)),
      isWorkerReady: true,
      listSaveTree: vi.fn().mockResolvedValue(saveTreeForSlots([1, 2])),
      seed: 42,
      teamId: 'nym',
      teamOptions,
      wizardMode: 'dynasty',
      wizardOpen: true,
      ...overrides,
    };
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

  it('loads save-tree data and dynasty previews for every selectable team', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.saveTree).toHaveLength(2);
      expect(latestResult?.selectedSlot).toBe(3);
      expect(latestResult?.scenarioCatalog).toEqual(scenarioCatalog);
      expect(latestResult?.selectedScenarioId).toBe('win-now');
      expect(Object.keys(latestResult?.previewMap ?? {}).sort()).toEqual(['bos', 'kc', 'nym']);
      expect(latestResult?.activePreview?.teamId).toBe('nym');
    });

    expect(options.listSaveTree).toHaveBeenCalledTimes(1);
    expect(options.getScenarioCatalog).toHaveBeenCalledTimes(1);
    expect(options.getSetupPreview).toHaveBeenCalledWith({
      seed: 42,
      userTeamId: 'nym',
      difficulty: 'standard',
    });
    expect(options.getSetupPreview).toHaveBeenCalledWith({
      seed: 42,
      userTeamId: 'bos',
      difficulty: 'standard',
    });
    expect(options.getSetupPreview).toHaveBeenCalledWith({
      seed: 42,
      userTeamId: 'kc',
      difficulty: 'standard',
    });
  });

  it('loads only the selected scenario starter preview in scenario mode', async () => {
    const options = baseOptions({ wizardMode: 'scenario' });
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.selectedScenarioId).toBe('win-now');
      expect(latestResult?.selectedScenario?.startingTeamId).toBe('bos');
      expect(latestResult?.activePreview?.teamId).toBe('bos');
      expect(Object.keys(latestResult?.previewMap ?? {})).toEqual(['bos']);
    });

    expect(options.getSetupPreview).toHaveBeenCalledTimes(1);
    expect(options.getSetupPreview).toHaveBeenCalledWith({
      seed: 42,
      userTeamId: 'bos',
      difficulty: 'standard',
    });
  });

  it('skips worker preview calls until the wizard and worker are ready', async () => {
    const options = baseOptions({ isWorkerReady: false, wizardOpen: false });
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.saveTree).toHaveLength(2);
      expect(latestResult?.selectedSlot).toBe(3);
    });

    expect(options.getScenarioCatalog).not.toHaveBeenCalled();
    expect(options.getSetupPreview).not.toHaveBeenCalled();
  });

  it('surfaces a status message when preview loading fails', async () => {
    const options = baseOptions({
      getSetupPreview: vi.fn().mockRejectedValue(new Error('preview failed')),
    });
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.status).toBe('Failed to build the dynasty previews.');
    });
  });
});
