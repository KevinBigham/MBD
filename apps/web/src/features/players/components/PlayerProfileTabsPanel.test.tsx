import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import PlayerProfileTabsPanel from './PlayerProfileTabsPanel';
import type { PlayerProfileView } from './playerProfileShared';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./StatsTab', () => ({
  default: ({ view }: { view: PlayerProfileView }) => (
    <div data-testid="stats-tab">Stats panel for {view.player?.id ?? 'missing-player'}</div>
  ),
}));

vi.mock('./DevelopmentTab', () => ({
  default: () => <div data-testid="development-tab">Development panel</div>,
}));

vi.mock('./ScoutingTab', () => ({
  default: () => <div data-testid="scouting-tab">Scouting panel</div>,
}));

vi.mock('./MomentsTab', () => ({
  default: () => <div data-testid="moments-tab">Moments panel</div>,
}));

vi.mock('./StoryArcsTab', () => ({
  default: () => <div data-testid="story-arcs-tab">Story arcs panel</div>,
}));

vi.mock('./HistoryTab', () => ({
  default: () => <div data-testid="history-tab">History panel</div>,
}));

vi.mock('./PersonalityTab', () => ({
  default: () => <div data-testid="personality-tab">Personality panel</div>,
}));

const view = {
  player: {
    id: 'player-1',
  },
} as PlayerProfileView;

describe('PlayerProfileTabsPanel', () => {
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
  });

  async function renderPanel(activeTab: Parameters<typeof PlayerProfileTabsPanel>[0]['activeTab'] = 'stats') {
    const onTabChange = vi.fn();
    await act(async () => {
      root.render(
        <PlayerProfileTabsPanel
          activeTab={activeTab}
          view={view}
          onTabChange={onTabChange}
        />,
      );
      await vi.dynamicImportSettled();
      await Promise.resolve();
    });
    return onTabChange;
  }

  function getButton(label: string): HTMLButtonElement {
    const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes(label));
    expect(button).toBeTruthy();
    return button as HTMLButtonElement;
  }

  it('renders the tab rail and active stats panel with the supplied profile view', async () => {
    await renderPanel();

    expect(container.textContent).toContain('Stats');
    expect(container.textContent).toContain('Development');
    expect(container.textContent).toContain('Scouting');
    expect(container.textContent).toContain('Signature Moments');
    expect(container.textContent).toContain('Story Arcs');
    expect(container.textContent).toContain('History');
    expect(container.textContent).toContain('Personality');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.querySelector('[data-testid="stats-tab"]')?.textContent).toContain('player-1');
  });

  it('delegates tab changes to the route owner', async () => {
    const onTabChange = await renderPanel();

    await act(async () => {
      getButton('Development').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    });

    expect(onTabChange).toHaveBeenCalledWith('development');
  });

  it('mounts the selected lazy tab body', async () => {
    await renderPanel('history');

    expect(container.querySelector('[data-testid="history-tab"]')).toBeTruthy();
  });
});
