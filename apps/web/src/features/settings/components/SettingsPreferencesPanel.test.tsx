import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPreferencesPanel } from './SettingsPreferencesPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function defaultProps() {
  return {
    ambientVolumePercent: 18,
    autoAdvance: false,
    defaultStatView: 'sabermetric' as const,
    effectVolumePercent: 55,
    highContrast: false,
    muted: true,
    openSections: {
      accessibility: true,
      audio: true,
      display: true,
      simulation: true,
    },
    reducedMotion: false,
    simSpeed: 'normal' as const,
    tableDensity: 'standard' as const,
    volumePercent: 72,
    onAmbientVolumeChange: vi.fn(),
    onAutoAdvanceToggle: vi.fn(),
    onDefaultStatViewChange: vi.fn(),
    onEffectVolumeChange: vi.fn(),
    onHighContrastToggle: vi.fn(),
    onMuteToggle: vi.fn(),
    onReducedMotionToggle: vi.fn(),
    onSimSpeedChange: vi.fn(),
    onTableDensityChange: vi.fn(),
    onToggleSection: vi.fn(),
    onVolumeChange: vi.fn(),
  };
}

describe('SettingsPreferencesPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders preference controls and delegates changes', async () => {
    const props = defaultProps();

    await act(async () => {
      root.render(<SettingsPreferencesPanel {...props} />);
    });

    expect(container.textContent).toContain('Muted');
    expect(container.textContent).toContain('72%');
    expect(container.textContent).toContain('55%');
    expect(container.textContent).toContain('18%');
    expect(container.textContent).toContain('Auto Advance Off');
    expect(container.textContent).toContain('Reduced Motion Off');
    expect(container.textContent).toContain('High Contrast Off');

    const setInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    const setSelectValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    const masterVolume = container.querySelector('#audio-volume') as HTMLInputElement;
    const effectVolume = container.querySelector('#audio-effect-volume') as HTMLInputElement;
    const ambientVolume = container.querySelector('#audio-ambient-volume') as HTMLInputElement;
    const simSpeed = container.querySelector('select[aria-label="Sim Speed"]') as HTMLSelectElement;
    const statView = container.querySelector('select[aria-label="Default Stat View"]') as HTMLSelectElement;
    const tableDensity = container.querySelector('select[aria-label="Table Density"]') as HTMLSelectElement;
    const findButton = (label: string) => Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(label),
    );

    await act(async () => {
      findButton('Muted')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButton('Auto Advance')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButton('Reduced Motion')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButton('High Contrast')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      setInputValue?.call(masterVolume, '41');
      masterVolume.dispatchEvent(new Event('change', { bubbles: true }));
      setInputValue?.call(effectVolume, '63');
      effectVolume.dispatchEvent(new Event('change', { bubbles: true }));
      setInputValue?.call(ambientVolume, '27');
      ambientVolume.dispatchEvent(new Event('change', { bubbles: true }));
      setSelectValue?.call(simSpeed, 'detailed');
      simSpeed.dispatchEvent(new Event('change', { bubbles: true }));
      setSelectValue?.call(statView, 'traditional');
      statView.dispatchEvent(new Event('change', { bubbles: true }));
      setSelectValue?.call(tableDensity, 'compact');
      tableDensity.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(props.onMuteToggle).toHaveBeenCalledTimes(1);
    expect(props.onAutoAdvanceToggle).toHaveBeenCalledTimes(1);
    expect(props.onReducedMotionToggle).toHaveBeenCalledTimes(1);
    expect(props.onHighContrastToggle).toHaveBeenCalledTimes(1);
    expect(props.onVolumeChange).toHaveBeenCalledWith(0.41);
    expect(props.onEffectVolumeChange).toHaveBeenCalledWith(0.63);
    expect(props.onAmbientVolumeChange).toHaveBeenCalledWith(0.27);
    expect(props.onSimSpeedChange).toHaveBeenCalledWith('detailed');
    expect(props.onDefaultStatViewChange).toHaveBeenCalledWith('traditional');
    expect(props.onTableDensityChange).toHaveBeenCalledWith('compact');
  });

  it('delegates section toggles and hides closed section content', async () => {
    const props = defaultProps();

    await act(async () => {
      root.render(
        <SettingsPreferencesPanel
          {...props}
          openSections={{ ...props.openSections, display: false }}
        />,
      );
    });

    expect(container.textContent).toContain('Display');
    expect(container.textContent).not.toContain('Default Stat View');

    const displayToggle = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Display'),
    );

    await act(async () => {
      displayToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onToggleSection).toHaveBeenCalledWith('display');
  });
});
