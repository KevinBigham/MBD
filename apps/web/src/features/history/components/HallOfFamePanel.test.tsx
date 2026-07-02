import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import HallOfFamePanel, { type HallOfFameEntryView } from './HallOfFamePanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const hallOfFame: HallOfFameEntryView[] = [
  {
    playerId: 'hof-bat-1',
    playerName: 'Maya Torres',
    position: 'CF',
    seasonsPlayed: 18,
    teamIds: ['nym', 'lad'],
    inductionSeason: 12,
    score: 98,
    inductionType: 'first_ballot',
    careerStats: {
      batting: { hits: 3012, hr: 412, rbi: 1530 },
      pitching: null,
    },
  },
  {
    playerId: 'hof-pitch-1',
    playerName: 'Nolan Cruz',
    position: 'SP',
    seasonsPlayed: 16,
    teamIds: ['bos'],
    inductionSeason: 13,
    score: 91,
    inductionType: 'veterans_committee',
    careerStats: {
      batting: null,
      pitching: { wins: 244, strikeouts: 3188, inningsPitched: 3280, earnedRuns: 1104 },
    },
  },
];

function teamName(teamId: string | null): string {
  if (teamId === 'nym') return 'New York Tycoons';
  if (teamId === 'lad') return 'Los Angeles Stars';
  if (teamId === 'bos') return 'Boston Pilgrims';
  return 'Unknown Club';
}

describe('HallOfFamePanel', () => {
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

  it('renders Hall of Fame batting and pitching inductees', async () => {
    await act(async () => {
      root.render(<HallOfFamePanel hallOfFame={hallOfFame} teamName={teamName} />);
    });

    expect(container.textContent).toContain('Hall of Fame');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('Maya Torres');
    expect(container.textContent).toContain('Season 12');
    expect(container.textContent).toContain('CF · 18 seasons · 98 score');
    expect(container.textContent).toContain('New York Tycoons, Los Angeles Stars');
    expect(container.textContent).toContain('3012 hits · 412 HR · 1530 RBI');
    expect(container.textContent).toContain('Nolan Cruz');
    expect(container.textContent).toContain('Boston Pilgrims');
    expect(container.textContent).toContain('244 wins · 3188 strikeouts');
  });

  it('renders an empty state before Hall of Fame inductees exist', async () => {
    await act(async () => {
      root.render(<HallOfFamePanel hallOfFame={[]} teamName={teamName} />);
    });

    expect(container.textContent).toContain('Hall of Fame');
    expect(container.textContent).toContain('Retired legends will appear here once the Hall of Fame begins to fill.');
  });
});
