import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { NewsItem } from '@mbd/contracts';
import NewsItemCard from './NewsItemCard';

vi.mock('@mbd/sim-core', () => ({
  getTeamById: vi.fn((teamId: string) => {
    if (teamId === 'nym') return { abbreviation: 'NYT' };
    return null;
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const longBody = [
  'New York took two of three and pulled within a game of the top seed.',
  'The clubhouse believes the next two weeks could define the entire October path for this roster.',
  'The front office now has to decide whether to chase a bullpen deal before the next road trip.',
].join(' ');

const unreadItem: NewsItem = {
  id: 'news-new',
  headline: 'Playoff watch intensifies',
  body: longBody,
  priority: 3,
  category: 'playoff',
  tag: 'WATCH',
  timestamp: 'S3D45',
  relatedPlayerIds: ['player-ace'],
  relatedTeamIds: ['nym', 'unknown'],
  read: false,
};

describe('NewsItemCard', () => {
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

  it('renders an unread collapsed story with tags, teams, players, and excerpt', async () => {
    const onOpen = vi.fn();

    await act(async () => {
      root.render(
        <NewsItemCard
          expanded={false}
          item={unreadItem}
          marking={false}
          onOpen={onOpen}
        />,
      );
      await Promise.resolve();
    });

    const content = container.textContent ?? '';
    expect(container.querySelector('[data-news-id="news-new"]')).toBeTruthy();
    expect(content).toContain('Playoff watch intensifies');
    expect(content).toContain('Playoff');
    expect(content).toContain('Priority 3');
    expect(content).toContain('WATCH');
    expect(content).toContain('Unread');
    expect(content).toContain('Season 3 · Day 45');
    expect(content).toContain('NYT');
    expect(content).toContain('UNKNOWN');
    expect(content).toContain('player-ace');
    expect(content).toContain('could define the entire October path');
    expect(content).toContain('...');
    expect(content).not.toContain('bullpen deal');

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onOpen).toHaveBeenCalledWith(unreadItem);
  });

  it('renders full body and saving state for an expanded read story', async () => {
    await act(async () => {
      root.render(
        <NewsItemCard
          expanded
          item={{ ...unreadItem, read: true, tag: undefined }}
          marking
          onOpen={vi.fn()}
        />,
      );
      await Promise.resolve();
    });

    const content = container.textContent ?? '';
    expect(content).toContain(longBody);
    expect(content).toContain('Read');
    expect(content).toContain('Saving read state...');
    expect(content).not.toContain('WATCH');
  });

  it('renders the persisted contract-clock activation honestly', async () => {
    const item: NewsItem = {
      ...unreadItem,
      id: 'contract-clock-live-7',
      headline: 'Contract clock is now live',
      body: 'Contracts will now advance at each completed season and eligible expirations will enter free agency.',
      category: 'league_event',
      tag: 'ANALYSIS',
    };
    await act(async () => {
      root.render(<NewsItemCard expanded item={item} marking={false} onOpen={vi.fn()} />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Contract clock is now live');
    expect(container.textContent).toContain('eligible expirations will enter free agency');
    expect(container.textContent).toContain('League Event');
  });

  it('renders the persisted user-star expiry departure beat', async () => {
    const item: NewsItem = {
      ...unreadItem,
      id: 'contract-expiry-departure-7-player-star',
      headline: 'Bobby Expiring enters free agency',
      body: 'Bobby Expiring\'s contract expired and the club did not retain the player before free agency opened.',
      category: 'roster_move',
      tag: 'ANALYSIS',
    };
    await act(async () => {
      root.render(<NewsItemCard expanded item={item} marking={false} onOpen={vi.fn()} />);
      await Promise.resolve();
    });

    expect(container.querySelector('[data-news-id="contract-expiry-departure-7-player-star"]')).toBeTruthy();
    expect(container.textContent).toContain('Bobby Expiring enters free agency');
    expect(container.textContent).toContain('contract expired');
    expect(container.textContent).toContain('Roster Move');
  });
});
