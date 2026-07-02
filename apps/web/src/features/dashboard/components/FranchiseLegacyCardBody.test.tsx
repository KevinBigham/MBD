import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { SignatureMoment } from '@mbd/contracts';
import FranchiseLegacyCardBody from './FranchiseLegacyCardBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('FranchiseLegacyCardBody', () => {
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

  async function renderBody({
    loading = false,
    moments = [],
  }: {
    loading?: boolean;
    moments?: SignatureMoment[];
  }) {
    await act(async () => {
      root.render(<FranchiseLegacyCardBody loading={loading} moments={moments} />);
    });
  }

  it('renders loading and empty states without worker data', async () => {
    await renderBody({ loading: true });
    expect(container.textContent ?? '').toContain('Loading...');

    await renderBody({});
    expect(container.textContent ?? '').toContain('Team identity beats will appear here after your first trade deadline.');
  });

  it('summarizes franchise moments and highlights the latest positive moment', async () => {
    await renderBody({
      moments: [
        {
          season: 7,
          day: 120,
          timestamp: 'S7D120',
          type: 'deadline_buyer',
          description: 'The front office doubled down on contention.',
          impact: 18,
          relevance: 0.9,
          isPlayoff: false,
          round: null,
          worldSeriesClincher: false,
          isEliminationGame: false,
        },
        {
          season: 6,
          day: 118,
          timestamp: 'S6D118',
          type: 'deadline_seller',
          description: 'Sold off veterans at the deadline.',
          impact: -14,
          relevance: 0.75,
          isPlayoff: false,
          round: null,
          worldSeriesClincher: false,
          isEliminationGame: false,
        },
        {
          season: 5,
          day: 118,
          timestamp: 'S5D118',
          type: 'deadline_buyer',
          description: 'Acquired a frontline starter.',
          impact: 16,
          relevance: 0.7,
          isPlayoff: false,
          round: null,
          worldSeriesClincher: false,
          isEliminationGame: false,
        },
      ],
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Moments');
    expect(text).toContain('Positive');
    expect(text).toContain('Setbacks');
    expect(text).toContain('3');
    expect(text).toContain('2');
    expect(text).toContain('1');
    expect(text).toContain('Latest');
    expect(text).toContain('Deadline Buyer');
    expect(text).toContain('The front office doubled down on contention.');
    expect(text).toContain('Season 7 · Day 120');
  });

  it('renders negative latest moments with the danger tone', async () => {
    await renderBody({
      moments: [
        {
          season: 8,
          day: 182,
          timestamp: 'S8D182',
          type: 'deadline_seller',
          description: 'Rebuild begun at the deadline.',
          impact: -20,
          relevance: 0.8,
          isPlayoff: false,
          round: null,
          worldSeriesClincher: false,
          isEliminationGame: false,
        },
      ],
    });

    expect(container.innerHTML).toContain('text-accent-danger');
    expect(container.textContent ?? '').toContain('Deadline Seller');
    expect(container.textContent ?? '').toContain('Rebuild begun at the deadline.');
  });
});
