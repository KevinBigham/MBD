import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import DashboardIntelligenceGrid from './DashboardIntelligenceGrid';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const slotLabels = [
  'Standings',
  'Roster Health',
  'Trade Intel',
  'Farm Report',
  'Financials',
  'Press Digest',
  'Milestone Watch',
  'Chase Watch',
  'Pennant Race Heat',
  'Award Race',
  'Signature Moments',
  'This Week in History',
  'Player Arcs of the Season',
  'Franchise Legacy',
  'Career Retrospective',
];

function slot(label: string): JSX.Element {
  return <article data-slot={label}>{label}</article>;
}

function renderGrid(): JSX.Element {
  return (
    <DashboardIntelligenceGrid
      standingsSlot={slot('Standings')}
      rosterHealthSlot={slot('Roster Health')}
      tradeIntelSlot={slot('Trade Intel')}
      farmReportSlot={slot('Farm Report')}
      financialsSlot={slot('Financials')}
      pressDigestSlot={slot('Press Digest')}
      milestoneWatchSlot={slot('Milestone Watch')}
      chaseWatchSlot={slot('Chase Watch')}
      pennantRaceSlot={slot('Pennant Race Heat')}
      awardRaceSlot={slot('Award Race')}
      signatureMomentsSlot={slot('Signature Moments')}
      thisWeekInHistorySlot={slot('This Week in History')}
      playerArcsSlot={slot('Player Arcs of the Season')}
      franchiseLegacySlot={slot('Franchise Legacy')}
      careerRetrospectiveSlot={slot('Career Retrospective')}
    />
  );
}

describe('DashboardIntelligenceGrid', () => {
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

  it('renders intelligence slots in the dashboard card order', async () => {
    await act(async () => {
      root.render(renderGrid());
    });

    const grid = container.querySelector('section');
    expect(grid?.className).toContain('grid gap-4 lg:grid-cols-2');

    const renderedLabels = Array.from(grid?.children ?? []).map((child) => child.textContent);
    expect(renderedLabels).toEqual(slotLabels);
  });

  it('keeps route-provided slots as direct grid children without extra wrappers', async () => {
    await act(async () => {
      root.render(renderGrid());
    });

    const directChildren = Array.from(container.querySelector('section')?.children ?? []);

    expect(directChildren).toHaveLength(slotLabels.length);
    expect(directChildren.every((child) => child.tagName === 'ARTICLE')).toBe(true);
  });
});
