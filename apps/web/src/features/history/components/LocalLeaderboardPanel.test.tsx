import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { LeaderboardEntry } from '@/shared/lib/saveSystem';
import LocalLeaderboardPanel from './LocalLeaderboardPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const entries: LeaderboardEntry[] = [
  {
    id: 'leader-1',
    slotNumber: 1,
    scenarioId: null,
    gmName: 'Kevin Bigham',
    teamId: 'nym',
    teamName: 'New York Tycoons',
    season: 8,
    score: 742,
    record: '104-58',
    championships: 3,
    summary: 'Three titles in eight seasons with a top-ranked farm.',
    updatedAt: '2026-06-11T00:00:00.000Z',
  },
  {
    id: 'leader-2',
    slotNumber: 2,
    scenarioId: 'expansion',
    gmName: 'Maya Chen',
    teamId: 'por',
    teamName: 'Portland Pines',
    season: 5,
    score: 518,
    record: '91-71',
    championships: 1,
    summary: 'Expansion club reached October in three straight years.',
    updatedAt: '2026-06-10T00:00:00.000Z',
  },
];

describe('LocalLeaderboardPanel', () => {
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

  it('renders ranked local save leaderboard entries', async () => {
    await act(async () => {
      root.render(<LocalLeaderboardPanel leaderboardEntries={entries} />);
    });

    expect(container.textContent).toContain('Local Leaderboard');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('#1 · Kevin Bigham');
    expect(container.textContent).toContain('New York Tycoons · Season 8 · 104-58');
    expect(container.textContent).toContain('742');
    expect(container.textContent).toContain('Three titles in eight seasons');
    expect(container.textContent).toContain('#2 · Maya Chen');
    expect(container.textContent).toContain('518');
  });

  it('renders an empty state before local saves populate the leaderboard', async () => {
    await act(async () => {
      root.render(<LocalLeaderboardPanel leaderboardEntries={[]} />);
    });

    expect(container.textContent).toContain('Local Leaderboard');
    expect(container.textContent).toContain('No leaderboard entries yet');
    expect(container.textContent).toContain('Save snapshots populate the cross-save leaderboard automatically.');
  });
});
