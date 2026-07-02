import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import CareerRetrospectiveTenureTitles from './CareerRetrospectiveTenureTitles';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('CareerRetrospectiveTenureTitles', () => {
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

  async function renderTenureTitles() {
    await act(async () => {
      root.render(
        <CareerRetrospectiveTenureTitles
          view={{
            franchise: {
              gmName: 'Sam Riley',
              teamId: 'nym',
              teamName: 'New York Mets',
              abbreviation: 'NYM',
              hiredSeason: 2024,
              currentSeason: 2030,
            },
            tenure: {
              yearsServed: 7,
              overallRecord: { wins: 623, losses: 509 },
              winPct: 0.55,
              reputation: 78.4,
            },
            titles: {
              worldSeries: 2,
              pennants: 3,
              divisionTitles: 5,
              playoffAppearances: 6,
            },
          }}
        />,
      );
    });
  }

  it('renders tenure identity, formatted record, reputation, and title totals', async () => {
    await renderTenureTitles();

    const text = container.textContent ?? '';
    expect(text).toContain('Tenure');
    expect(text).toContain('Sam Riley');
    expect(text).toContain('NYM');
    expect(text).toContain('S2024-S2030');
    expect(text).toContain('Years 7');
    expect(text).toContain('Record 623-509');
    expect(text).toContain('Win% .550');
    expect(text).toContain('Rep 78');
    expect(text).toContain('World Series');
    expect(text).toContain('Pennants');
    expect(text).toContain('Division Titles');
    expect(text).toContain('Playoff Appearances:');
    expect(text).toContain('6');
  });
});
