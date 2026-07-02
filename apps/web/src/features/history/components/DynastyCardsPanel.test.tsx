import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { DynastyCard } from '@mbd/contracts';
import DynastyCardsPanel from './DynastyCardsPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const cards: DynastyCard[] = [
  {
    id: 'card-1',
    type: 'championship_run',
    title: 'Season 8 Champions',
    subtitle: 'A 104-win club finished the job.',
    stats: [
      { label: 'Record', value: '104-58' },
      { label: 'Titles', value: '3' },
    ],
    highlights: ['Won 11 straight in September', 'Closed the World Series in six'],
    generatedAt: 'S8D190',
    teamId: 'nym',
    season: 8,
    textSummary: 'Season 8 Champions: 104 wins and a third title.',
  },
  {
    id: 'card-2',
    type: 'farm_pipeline',
    title: 'Farm Pipeline',
    subtitle: 'Three top prospects reached Triple-A.',
    stats: [{ label: 'Top 100 prospects', value: '5' }],
    highlights: [],
    generatedAt: 'S7D120',
    teamId: 'nym',
    season: 7,
    textSummary: 'Farm Pipeline: five Top 100 prospects.',
  },
];

describe('DynastyCardsPanel', () => {
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

  it('renders dynasty cards and delegates latest-summary copy', async () => {
    const onCopyLatestSummary = vi.fn();

    await act(async () => {
      root.render(
        <DynastyCardsPanel
          dynastyCards={cards}
          onCopyLatestSummary={onCopyLatestSummary}
        />,
      );
    });

    expect(container.textContent).toContain('Dynasty Cards');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('Season 8 Champions');
    expect(container.textContent).toContain('A 104-win club finished the job.');
    expect(container.textContent).toContain('Record: 104-58');
    expect(container.textContent).toContain('Won 11 straight in September | Closed the World Series in six');
    expect(container.textContent).toContain('Farm Pipeline');

    const copyButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Copy Latest Summary'));
    expect(copyButton).toBeTruthy();

    await act(async () => {
      copyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onCopyLatestSummary).toHaveBeenCalledWith('Season 8 Champions: 104 wins and a third title.');
  });

  it('renders an empty state when no dynasty cards exist', async () => {
    await act(async () => {
      root.render(
        <DynastyCardsPanel
          dynastyCards={[]}
          onCopyLatestSummary={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('Dynasty Cards');
    expect(container.textContent).toContain('No legacy cards yet');
    expect(container.textContent).toContain('Season recaps, championships, and career-overview cards appear here once those moments are recorded.');
    expect(container.textContent).not.toContain('Copy Latest Summary');
  });
});
