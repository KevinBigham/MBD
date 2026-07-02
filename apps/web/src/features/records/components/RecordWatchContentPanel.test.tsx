import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import type { RecordBookEntry, RecordWatchEntry } from '@mbd/contracts';
import { RecordWatchContentPanel, type RecordWatchViewMode } from './RecordWatchContentPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const watchEntry: RecordWatchEntry = {
  id: 'watch-1',
  playerId: 'player-1',
  playerName: 'Milo Slugger',
  teamId: 'nym',
  recordId: 'hr-season',
  recordLabel: 'Single-season HR',
  currentValue: 55,
  holderValue: 61,
  projectedValue: 64.2,
  progressRatio: 0.91,
  summary: 'On pace to challenge the franchise mark.',
};

const franchiseRecord: RecordBookEntry = {
  id: 'record-1',
  label: 'Single-season HR',
  category: 'individual_single_season',
  scope: 'franchise',
  stat: 'hr',
  qualifier: null,
  teamId: 'nym',
  trackingFromSeason: 1,
  note: null,
  holders: [
    {
      value: 61,
      season: 6,
      teamId: 'nym',
      playerId: 'player-2',
      playerName: 'Arlo Hammer',
      displayValue: '61',
    },
  ],
};

function Harness({
  initialViewMode = 'watch',
  watchList = [watchEntry],
}: {
  initialViewMode?: RecordWatchViewMode;
  watchList?: RecordWatchEntry[];
}) {
  const [viewMode, setViewMode] = useState<RecordWatchViewMode>(initialViewMode);

  return (
    <MemoryRouter>
      <RecordWatchContentPanel
        recordBook={{ franchise: [franchiseRecord], league: [] }}
        season={7}
        viewMode={viewMode}
        watchList={watchList}
        onViewModeChange={setViewMode}
      />
    </MemoryRouter>
  );
}

describe('RecordWatchContentPanel', () => {
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

  it('renders active record-watch cards and stats reference link', async () => {
    await act(async () => {
      root.render(<Harness />);
    });

    expect(container.textContent).toContain('Record Watch');
    expect(container.textContent).toContain('Season 7');
    expect(container.textContent).toContain('tracking 1 active record chases');
    expect(container.textContent).toContain('Milo Slugger');
    expect(container.textContent).toContain('Single-season HR');
    expect(container.textContent).toContain('91%');
    expect(container.textContent).toContain('On pace to challenge the franchise mark.');
    expect(container.querySelector('a[href="/stats"]')).toBeTruthy();
    expect(container.querySelector('a[href="/players/player-1"]')).toBeTruthy();
  });

  it('switches to franchise records and renders record-book rows', async () => {
    await act(async () => {
      root.render(<Harness />);
    });

    const franchiseTab = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Franchise Records'),
    );

    await act(async () => {
      franchiseTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Arlo Hammer');
    expect(container.textContent).toContain('61');
    expect(container.textContent).toContain('Season');
    expect(container.querySelector('a[href="/players/player-2"]')).toBeTruthy();
  });

  it('renders the empty watch state when no players are chasing records', async () => {
    await act(async () => {
      root.render(<Harness watchList={[]} />);
    });

    expect(container.textContent).toContain('No active record chases');
    expect(container.textContent).toContain('players approaching records will appear here');
  });
});
