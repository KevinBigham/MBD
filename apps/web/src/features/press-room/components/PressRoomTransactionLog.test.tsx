import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { PressRoomEntry } from '@/shared/types/pressRoom';
import PressRoomTransactionLog from './PressRoomTransactionLog';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const transactionEntry: PressRoomEntry = {
  id: 'news-trade-1',
  source: 'league_wire',
  category: 'trade',
  tag: 'RUMOR',
  priority: 2,
  headline: 'Breaking trade headline',
  body: 'New York added a bullpen arm in a deadline swing.',
  timestamp: 'S3D43',
  relatedTeamIds: ['nym', 'bos'],
  relatedPlayerIds: [],
};

describe('PressRoomTransactionLog', () => {
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

  it('renders transaction entries with category and timestamp labels', async () => {
    await act(async () => {
      root.render(<PressRoomTransactionLog transactionFeed={[transactionEntry]} />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Transaction Log');
    expect(container.textContent).toContain('1 entries');
    expect(container.textContent).toContain('Breaking trade headline');
    expect(container.textContent).toContain('Trade');
    expect(container.textContent).toContain('Season 3 • Day 43');
  });

  it('renders the empty transaction state without route hooks', async () => {
    await act(async () => {
      root.render(<PressRoomTransactionLog transactionFeed={[]} />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('0 entries');
    expect(container.textContent).toContain('No league transactions match the current filters.');
  });
});
