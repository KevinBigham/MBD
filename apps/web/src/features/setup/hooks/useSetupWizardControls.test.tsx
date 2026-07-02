import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSetupWizardControls } from './useSetupWizardControls';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useSetupWizardControls>[0];
type HookResult = ReturnType<typeof useSetupWizardControls>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useSetupWizardControls(options));
  return null;
}

describe('useSetupWizardControls', () => {
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
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    dateNowSpy.mockRestore();
    vi.clearAllMocks();
  });

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      onResetPreviewMap: vi.fn(),
      onStatusChange: vi.fn(),
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

  it('initializes the wizard from the deterministic default name seed', async () => {
    await renderHook(baseOptions());

    expect(latestResult?.seed).toBe(42);
    expect(latestResult?.gmName).toBe('Alex Porter');
    expect(latestResult?.teamId).toBe('nym');
    expect(latestResult?.difficulty).toBe('standard');
    expect(latestResult?.playMode).toBe('standard');
    expect(latestResult?.dayOneExperience).toBe('full');
    expect(latestResult?.wizardMode).toBe('dynasty');
    expect(latestResult?.wizardOpen).toBe(false);
    expect(latestResult?.teamPickerFilters).toEqual({
      archetype: 'all',
      farm: 'all',
      market: 'all',
      payroll: 'all',
      timeline: 'all',
    });
  });

  it('resets defaults, filters, status, and preview cache when opening a new wizard', async () => {
    const options = baseOptions();
    await renderHook(options);

    act(() => {
      latestResult?.setPlayMode('career');
      latestResult?.setDayOneExperience('quick');
      latestResult?.setWizardMode('scenario');
      latestResult?.updateTeamPickerFilter('market', 'large');
      latestResult?.updateTeamPickerFilter('farm', 'elite');
    });
    dateNowSpy.mockReturnValue(99);

    act(() => {
      latestResult?.openWizard();
    });

    expect(latestResult?.seed).toBe(99);
    expect(latestResult?.gmName).toBe('Taylor Bennett');
    expect(latestResult?.playMode).toBe('standard');
    expect(latestResult?.dayOneExperience).toBe('full');
    expect(latestResult?.wizardMode).toBe('dynasty');
    expect(latestResult?.wizardOpen).toBe(true);
    expect(latestResult?.teamPickerFilters).toEqual({
      archetype: 'all',
      farm: 'all',
      market: 'all',
      payroll: 'all',
      timeline: 'all',
    });
    expect(options.onResetPreviewMap).toHaveBeenCalledTimes(1);
    expect(options.onStatusChange).toHaveBeenCalledWith('');
  });

  it('updates individual team picker filters and exposes direct wizard setters', async () => {
    await renderHook(baseOptions());

    act(() => {
      latestResult?.setTeamId('bos');
      latestResult?.setDifficulty('hard');
      latestResult?.setGmName('Pat Dynasty');
      latestResult?.updateTeamPickerFilter('timeline', 'win-now');
      latestResult?.updateTeamPickerFilter('payroll', 'lean');
      latestResult?.updateTeamPickerFilter('archetype', 'rebuild');
    });

    expect(latestResult?.teamId).toBe('bos');
    expect(latestResult?.difficulty).toBe('hard');
    expect(latestResult?.gmName).toBe('Pat Dynasty');
    expect(latestResult?.teamPickerFilters).toEqual({
      archetype: 'rebuild',
      farm: 'all',
      market: 'all',
      payroll: 'lean',
      timeline: 'win-now',
    });
  });
});
