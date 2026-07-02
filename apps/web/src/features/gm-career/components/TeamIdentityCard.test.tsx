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

  async function renderCard(moments: SignatureMoment[]) {
    await act(async () => {
      root.render(
        <TeamIdentityCard
          teamId="nym"
          moments={moments}
        />,
      );
      await Promise.resolve();
    });
  }

  async function clickButton(label: string) {
    const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes(label),
    );

    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
  }

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
    await renderCard([]);

    expect(container.textContent).toContain('New York Tycoons');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
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

    await renderCard(moments);

    const text = container.textContent ?? '';
    expect(text).toContain('New York Tycoons');
    expect(text).toContain('The room doubled down on contention.');
    expect(text).toContain('The front office pivoted toward future value.');
    expect(text.indexOf('The room doubled down on contention.')).toBeLessThan(
      text.indexOf('The front office pivoted toward future value.'),
    );
  });

  it('renders all moments when both filters are set to all', async () => {
    const moments: SignatureMoment[] = [
      {
        season: 7,
        day: 120,
        timestamp: 'S7D120',
        type: 'deadline_buyer',
        description: 'Season seven buyer push.',
        impact: 21,
        relevance: 0.91,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
      {
        season: 6,
        day: 111,
        timestamp: 'S6D111',
        type: 'deadline_seller',
        description: 'Season six seller reset.',
        impact: -9,
        relevance: 0.74,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
      {
        season: 6,
        day: 98,
        timestamp: 'S6D098',
        type: 'deadline_buyer',
        description: 'Season six buyer swing.',
        impact: 12,
        relevance: 0.69,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
    ];

    await renderCard(moments);

    const text = container.textContent ?? '';
    expect(text).toContain('Season');
    expect(text).toContain('Type');
    expect(text).toContain('Season seven buyer push.');
    expect(text).toContain('Season six seller reset.');
    expect(text).toContain('Season six buyer swing.');
  });

  it('filters moments by season', async () => {
    const moments: SignatureMoment[] = [
      {
        season: 7,
        day: 120,
        timestamp: 'S7D120',
        type: 'deadline_buyer',
        description: 'Season seven buyer push.',
        impact: 21,
        relevance: 0.91,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
      {
        season: 6,
        day: 111,
        timestamp: 'S6D111',
        type: 'deadline_seller',
        description: 'Season six seller reset.',
        impact: -9,
        relevance: 0.74,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
      {
        season: 5,
        day: 88,
        timestamp: 'S5D088',
        type: 'deadline_buyer',
        description: 'Season five buyer spark.',
        impact: 8,
        relevance: 0.61,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
    ];

    await renderCard(moments);
    await clickButton('Season 6');

    const text = container.textContent ?? '';
    expect(text).toContain('Season six seller reset.');
    expect(text).not.toContain('Season seven buyer push.');
    expect(text).not.toContain('Season five buyer spark.');
  });

  it('filters moments by type', async () => {
    const moments: SignatureMoment[] = [
      {
        season: 7,
        day: 120,
        timestamp: 'S7D120',
        type: 'deadline_buyer',
        description: 'Buyer surge moment.',
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
        description: 'Seller reset moment.',
        impact: -16,
        relevance: 0.89,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
      {
        season: 6,
        day: 95,
        timestamp: 'S6D095',
        type: 'deadline_seller',
        description: 'Seller consolidation moment.',
        impact: -7,
        relevance: 0.64,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
    ];

    await renderCard(moments);
    await clickButton('Deadline Seller');

    const text = container.textContent ?? '';
    expect(text).toContain('Seller reset moment.');
    expect(text).toContain('Seller consolidation moment.');
    expect(text).not.toContain('Buyer surge moment.');
  });

  it('composes season and type filters and shows an empty filtered state when needed', async () => {
    const moments: SignatureMoment[] = [
      {
        season: 7,
        day: 120,
        timestamp: 'S7D120',
        type: 'deadline_buyer',
        description: 'Season seven buyer push.',
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
        description: 'Season seven seller reset.',
        impact: -16,
        relevance: 0.89,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
      {
        season: 6,
        day: 111,
        timestamp: 'S6D111',
        type: 'deadline_buyer',
        description: 'Season six buyer swing.',
        impact: 10,
        relevance: 0.7,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
    ];

    await renderCard(moments);
    await clickButton('Season 7');
    await clickButton('Deadline Buyer');

    let text = container.textContent ?? '';
    expect(text).toContain('Season seven buyer push.');
    expect(text).not.toContain('Season seven seller reset.');
    expect(text).not.toContain('Season six buyer swing.');

    await clickButton('Deadline Seller');

    text = container.textContent ?? '';
    expect(text).toContain('Season seven seller reset.');
    expect(text).not.toContain('Season seven buyer push.');

    await clickButton('Season 6');

    text = container.textContent ?? '';
    expect(text).toContain('No moments match the current filters.');
    expect(text).not.toContain('Season seven seller reset.');
    expect(text).not.toContain('Season six buyer swing.');
  });

  it('hides both chip rows when there is only one distinct season and one distinct type', async () => {
    const moments: SignatureMoment[] = [
      {
        season: 7,
        day: 120,
        timestamp: 'S7D120',
        type: 'deadline_buyer',
        description: 'Single season buyer beat one.',
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
        type: 'deadline_buyer',
        description: 'Single season buyer beat two.',
        impact: 9,
        relevance: 0.65,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
    ];

    await renderCard(moments);

    const buttons = Array.from(container.querySelectorAll('button')).map((button) => button.textContent ?? '');
    expect(buttons.some((text) => text.includes('Season 7'))).toBe(false);
    expect(buttons.some((text) => text.includes('Deadline Buyer'))).toBe(false);
    expect(container.textContent).not.toContain('Type');
  });
});
