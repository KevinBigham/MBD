import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { CeremonyMoment } from '@mbd/contracts';
import { MomentCardOverlay } from './MomentCardOverlay';
import { getAudioEngine } from '@/shared/lib/audio';

vi.mock('@/shared/lib/audio', () => ({
  getAudioEngine: vi.fn(),
}));

const mockedGetAudioEngine = vi.mocked(getAudioEngine);
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('MomentCardOverlay', () => {
  let container: HTMLDivElement;
  let root: Root;
  const playEffect = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockedGetAudioEngine.mockReturnValue({
      playEffect,
    } as unknown as ReturnType<typeof getAudioEngine>);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    vi.useRealTimers();
    playEffect.mockReset();
    container.remove();
    vi.clearAllMocks();
  });

  const moment: CeremonyMoment = {
    id: 'moment-world-series',
    type: 'world_series_win',
    title: 'WORLD CHAMPIONS',
    subtitle: 'New York Yankees',
    detailLines: ['Defeated Los Angeles Dodgers 4-2', 'MVP: Aaron Judge'],
    soundEffect: 'world_series_win',
    autoDismissMs: 5000,
    createdAt: 'S1D180',
    theme: 'celebration',
    relatedTeamIds: ['nyy', 'lad'],
    relatedPlayerIds: ['nyy-1'],
  };

  it('renders the active celebration card content', async () => {
    await act(async () => {
      root.render(
        <MomentCardOverlay
          moment={moment}
          busy={false}
          onDismiss={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('WORLD CHAMPIONS');
    expect(container.textContent).toContain('New York Yankees');
    expect(container.textContent).toContain('Aaron Judge');
  });

  it('plays the configured audio effect when the moment appears', async () => {
    await act(async () => {
      root.render(
        <MomentCardOverlay
          moment={moment}
          busy={false}
          onDismiss={vi.fn()}
        />,
      );
    });

    expect(playEffect).toHaveBeenCalledWith('world_series_win');
  });

  it('auto-dismisses after the configured timeout', async () => {
    const onDismiss = vi.fn();
    await act(async () => {
      root.render(
        <MomentCardOverlay
          moment={moment}
          busy={false}
          onDismiss={onDismiss}
        />,
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(onDismiss).toHaveBeenCalledWith('moment-world-series');
  });

  it('renders award ceremony card with trophy icon and award title', async () => {
    const awardMoment: CeremonyMoment = {
      id: 'award-moment-1-AL-MVP-player1',
      type: 'award',
      title: 'MOST VALUABLE PLAYER',
      subtitle: 'AL · Season 1',
      detailLines: ['Aaron Judge · New York Yankees', '.312 AVG · 42 HR · 121 RBI', '178 H · 98 R · 72 BB'],
      soundEffect: 'achievement_unlock',
      autoDismissMs: 5000,
      createdAt: 'S1D162',
      theme: 'historic',
      relatedTeamIds: ['nyy'],
      relatedPlayerIds: ['player1'],
    };

    await act(async () => {
      root.render(
        <MomentCardOverlay
          moment={awardMoment}
          busy={false}
          onDismiss={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('MOST VALUABLE PLAYER');
    expect(container.textContent).toContain('AL · Season 1');
    expect(container.textContent).toContain('Aaron Judge · New York Yankees');
    expect(container.textContent).toContain('.312 AVG · 42 HR · 121 RBI');
    expect(container.textContent).toContain('Award Ceremony');
  });

  it('pauses the auto-dismiss timer while the document is hidden', async () => {
    const onDismiss = vi.fn();
    await act(async () => {
      root.render(
        <MomentCardOverlay
          moment={moment}
          busy={false}
          onDismiss={onDismiss}
        />,
      );
    });

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(5000);
    });

    expect(onDismiss).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(5000);
    });

    expect(onDismiss).toHaveBeenCalledWith('moment-world-series');
  });
});
