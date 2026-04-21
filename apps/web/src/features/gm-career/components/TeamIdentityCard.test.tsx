import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { SignatureMoment } from '@mbd/contracts';
import TeamIdentityCard from './TeamIdentityCard';

vi.mock('@mbd/sim-core', () => ({
  GameRNG: class GameRNG {
    constructor(_seed: number) {}
  },
  formatMomentDescription: vi.fn((moment: SignatureMoment, teamName: string) => `${teamName} ${moment.type}`),
  getTeamById: vi.fn((teamId: string) => {
    if (teamId === 'nym') {
      return { city: 'New York', name: 'Tycoons', abbreviation: 'NYT' };
    }

    return null;
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('TeamIdentityCard', () => {
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

  it('renders the empty team identity state', async () => {
    await act(async () => {
      root.render(
        <TeamIdentityCard
          teamId="nym"
          moments={[]}
        />,
      );
    });

    expect(container.textContent).toContain('New York Tycoons');
    expect(container.textContent).toContain('No team identity moments yet. Deadline seller/buyer beats will appear here after your first trade deadline.');
  });

  it('renders persisted team identity moments in recency order', async () => {
    const moments: SignatureMoment[] = [
      {
        season: 7,
        day: 120,
        timestamp: 'S7D120',
        type: 'deadline_buyer',
        description: 'The room doubled down on contention.',
        impact: 21,
        relevance: 0.91,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
      {
        season: 7,
        day: 118,
        timestamp: 'S7D118',
        type: 'deadline_seller',
        description: 'The front office pivoted toward future value.',
        impact: -16,
        relevance: 0.91,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
    ];

    await act(async () => {
      root.render(
        <TeamIdentityCard
          teamId="nym"
          moments={moments}
        />,
      );
    });

    const text = container.textContent ?? '';
    expect(text).toContain('New York Tycoons');
    expect(text).toContain('The room doubled down on contention.');
    expect(text).toContain('The front office pivoted toward future value.');
    expect(text.indexOf('The room doubled down on contention.')).toBeLessThan(
      text.indexOf('The front office pivoted toward future value.'),
    );
  });
});
