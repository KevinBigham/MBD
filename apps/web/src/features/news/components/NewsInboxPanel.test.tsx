import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { NewsCategory, NewsItem } from '@mbd/contracts';
import { NewsInboxPanel } from './NewsInboxPanel';

vi.mock('@mbd/sim-core', () => ({
  getTeamById: vi.fn((teamId: string) => {
    if (teamId === 'nym') return { abbreviation: 'NYT' };
    return null;
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const playoffItem: NewsItem = {
  id: 'news-playoff',
  headline: 'Playoff watch intensifies',
  body: 'New York took two of three and pulled within a game of the top seed.',
  priority: 3,
  category: 'playoff',
  tag: 'WATCH',
  timestamp: 'S3D45',
  relatedPlayerIds: ['player-ace'],
  relatedTeamIds: ['nym'],
  read: false,
};

const tradeItem: NewsItem = {
  id: 'news-trade',
  headline: 'Deadline rumor heats up',
  body: 'The front office is weighing bullpen help before the market closes.',
  priority: 5,
  category: 'trade',
  tag: 'RUMOR',
  timestamp: 'S3D44',
  relatedPlayerIds: [],
  relatedTeamIds: ['bos'],
  read: true,
};

describe('NewsInboxPanel', () => {
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

  it('renders inbox totals, filters, stories, and open delegation', async () => {
    const onOpenItem = vi.fn();
    const onReadFilterChange = vi.fn();
    const onCategoryFilterChange = vi.fn();

    await act(async () => {
      root.render(
        <NewsInboxPanel
          categoryFilter="all"
          categoryOptions={['playoff', 'trade']}
          error={null}
          expandedIds={new Set(['news-trade'])}
          filteredItems={[playoffItem, tradeItem]}
          items={[playoffItem, tradeItem]}
          markingIds={new Set(['news-trade'])}
          onCategoryFilterChange={onCategoryFilterChange}
          onOpenItem={onOpenItem}
          onReadFilterChange={onReadFilterChange}
          onRetry={vi.fn()}
          readFilter="all"
          unreadCount={1}
        />,
      );
    });

    const content = container.textContent ?? '';
    expect(content).toContain('News Inbox');
    expect(content).toContain('2');
    expect(content).toContain('loaded stories');
    expect(content).toContain('1');
    expect(content).toContain('waiting for review');
    expect(content).toContain('represented in queue');
    expect(content).toContain('Playoff watch intensifies');
    expect(content).toContain('Deadline rumor heats up');
    expect(content).toContain('Saving read state...');

    const unreadButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent === 'Unread',
    ) as HTMLButtonElement;
    await act(async () => {
      unreadButton.click();
    });
    expect(onReadFilterChange).toHaveBeenCalledWith('unread');

    const categorySelect = container.querySelector('[aria-label="Category filter"]') as HTMLSelectElement;
    await act(async () => {
      categorySelect.value = 'trade';
      categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(onCategoryFilterChange).toHaveBeenCalledWith('trade');

    const storyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Playoff watch intensifies'),
    );
    await act(async () => {
      storyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onOpenItem).toHaveBeenCalledWith(playoffItem);
  });

  it('renders retry and empty states from route-owned state', async () => {
    const onRetry = vi.fn();

    await act(async () => {
      root.render(
        <NewsInboxPanel
          categoryFilter="all"
          categoryOptions={[]}
          error="News feed unavailable."
          expandedIds={new Set()}
          filteredItems={[]}
          items={[]}
          markingIds={new Set()}
          onCategoryFilterChange={vi.fn()}
          onOpenItem={vi.fn()}
          onReadFilterChange={vi.fn()}
          onRetry={onRetry}
          readFilter="all"
          unreadCount={0}
        />,
      );
    });

    expect(container.textContent).toContain('News feed unavailable.');
    const retryButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent === 'Retry',
    ) as HTMLButtonElement;
    await act(async () => {
      retryButton.click();
    });
    expect(onRetry).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.render(
        <NewsInboxPanel
          categoryFilter="trade"
          categoryOptions={['trade']}
          error={null}
          expandedIds={new Set()}
          filteredItems={[]}
          items={[tradeItem]}
          markingIds={new Set()}
          onCategoryFilterChange={vi.fn()}
          onOpenItem={vi.fn()}
          onReadFilterChange={vi.fn()}
          onRetry={vi.fn()}
          readFilter="unread"
          unreadCount={0}
        />,
      );
    });

    expect(container.textContent).toContain('No news matches those filters');
  });
});
