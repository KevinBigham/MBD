import type { TickerEntry } from '@mbd/contracts';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffectiveReducedMotion } from '@/shared/hooks/useEffectiveReducedMotion';
import { TickerBar } from './TickerBar';

vi.mock('@/shared/hooks/useEffectiveReducedMotion', () => ({
  useEffectiveReducedMotion: vi.fn(),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockedUseEffectiveReducedMotion = vi.mocked(useEffectiveReducedMotion);

const tickerEntries: TickerEntry[] = [
  {
    id: 'ticker-milestone-1',
    timestamp: 'S3D87',
    category: 'milestone',
    text: 'Victor Veteran records career hit #2000.',
    priority: 5,
    relatedTeamIds: ['nym'],
    relatedPlayerIds: ['player-1'],
    expiresDay: 90,
  },
  {
    id: 'ticker-trade-1',
    timestamp: 'S3D87',
    category: 'trade',
    text: 'Seattle Drizzle intensify talks for a late-inning arm.',
    priority: 4,
    relatedTeamIds: ['sea'],
    relatedPlayerIds: [],
    expiresDay: 90,
  },
];

describe('TickerBar', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onSelectEntry = vi.fn();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    onSelectEntry.mockReset();
    mockedUseEffectiveReducedMotion.mockReturnValue(false);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  async function renderTicker(entries = tickerEntries) {
    await act(async () => {
      root.render(<TickerBar entries={entries} onSelectEntry={onSelectEntry} />);
    });
  }

  function tickerRegion() {
    const region = container.querySelector('[aria-label="League news ticker"]');
    expect(region).toBeTruthy();
    return region as HTMLElement;
  }

  function tickerTrack() {
    const list = container.querySelector('[aria-label="League headlines"]');
    expect(list?.firstElementChild).toBeTruthy();
    return list?.firstElementChild as HTMLElement;
  }

  it('pauses the marquee on hover and focus, then resumes when interaction leaves', async () => {
    await renderTicker();

    const region = tickerRegion();
    const track = tickerTrack();
    expect(track.style.animation).toContain('mbd-ticker-scroll');
    expect(track.style.animationPlayState).toBe('running');

    await act(async () => {
      region.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    expect(track.style.animationPlayState).toBe('paused');

    await act(async () => {
      region.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    });
    expect(track.style.animationPlayState).toBe('running');

    const firstHeadline = container.querySelector('button');
    expect(firstHeadline).toBeTruthy();

    await act(async () => {
      firstHeadline?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });
    expect(track.style.animationPlayState).toBe('paused');

    await act(async () => {
      firstHeadline?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    expect(track.style.animationPlayState).toBe('running');
  });

  it('disables marquee animation when reduced motion is active', async () => {
    mockedUseEffectiveReducedMotion.mockReturnValue(true);

    await renderTicker();

    const track = tickerTrack();
    expect(track.style.animation).toBe('');
    expect(track.style.animationPlayState).toBe('');
    expect(container.querySelectorAll('button')).toHaveLength(tickerEntries.length);
  });
});
