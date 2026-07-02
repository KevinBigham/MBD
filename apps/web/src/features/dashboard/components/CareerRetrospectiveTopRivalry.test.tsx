import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import CareerRetrospectiveTopRivalry from './CareerRetrospectiveTopRivalry';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('CareerRetrospectiveTopRivalry', () => {
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

  async function renderRivalry() {
    await act(async () => {
      root.render(
        <CareerRetrospectiveTopRivalry
          rivalry={{
            opponentTeamId: 'atl',
            opponentTeamName: 'Atlanta Firebirds',
            opponentAbbreviation: 'ATL',
            intensity: 87.6,
            summary: 'Four straight October meetings turned every summer series into a referendum.',
            currentSeasonRecord: '7-6',
            historicalRecord: '42-39',
          }}
        />,
      );
    });
  }

  it('renders the top rivalry summary, rounded intensity, and record context', async () => {
    await renderRivalry();

    const text = container.textContent ?? '';
    expect(text).toContain('Top Rivalry');
    expect(text).toContain('Intensity 88');
    expect(text).toContain('vs Atlanta Firebirds');
    expect(text).toContain('Four straight October meetings turned every summer series into a referendum.');
    expect(text).toContain('Season 7-6');
    expect(text).toContain('Lifetime 42-39');
  });
});
