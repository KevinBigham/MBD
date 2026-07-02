import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import CareerRetrospectiveStoryStack from './CareerRetrospectiveStoryStack';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('CareerRetrospectiveStoryStack', () => {
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

  async function renderStack(onSelectSeason: (season: number) => void) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <CareerRetrospectiveStoryStack
            moments={[
              {
                type: 'dynasty_marker',
                description: 'The front office turned a 92-win core into a parade.',
                season: 2026,
                day: 12,
                impact: 8,
                relevance: 92,
              },
              {
                type: 'collapse_watch',
                description: 'A September skid forced a painful reset.',
                season: 2027,
                day: null,
                impact: -6,
                relevance: 83,
              },
            ]}
            legendArcs={[
              {
                playerId: 'legend-1',
                playerName: 'Avery Stone',
                arcType: 'career_shutouts',
                resolvedSeason: 2028,
                milestoneHeadline: 'Three October shutouts made him a franchise legend.',
              },
            ]}
            signatureArcs={[
              {
                playerId: 'arc-1',
                playerName: 'Milo Grant',
                arcType: 'late_career_peak',
                season: 2029,
                description: 'A veteran found one last MVP-caliber summer.',
                relevance: 89,
              },
            ]}
            onSelectSeason={onSelectSeason}
          />
        </MemoryRouter>,
      );
    });
  }

  it('renders story sections with player links and delegates season story-reel selection', async () => {
    const selectedSeasons: number[] = [];

    await renderStack((season) => {
      selectedSeasons.push(season);
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Signature Beats');
    expect(text).toContain('The front office turned a 92-win core into a parade.');
    expect(text).toContain('Season 2026 · Day 12');
    expect(text).toContain('A September skid forced a painful reset.');
    expect(text).toContain('Season 2027');
    expect(text).toContain('Legend Arcs');
    expect(text).toContain('Avery Stone');
    expect(text).toContain('Career Shutouts');
    expect(text).toContain('Three October shutouts made him a franchise legend.');
    expect(text).toContain('Notable Player Arcs');
    expect(text).toContain('Milo Grant');
    expect(text).toContain('Late-Career Peak');
    expect(text).toContain('A veteran found one last MVP-caliber summer.');

    expect(container.querySelector('a[href="/players/legend-1"]')).not.toBeNull();
    expect(container.querySelector('a[href="/players/arc-1?tab=moments"]')).not.toBeNull();

    await act(async () => {
      container
        .querySelector('button[aria-label="Open season 2026 story reel"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      container
        .querySelector('button[aria-label="Open season 2028 story reel"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      container
        .querySelector('button[aria-label="Open season 2029 story reel"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(selectedSeasons).toEqual([2026, 2028, 2029]);
  });
});
