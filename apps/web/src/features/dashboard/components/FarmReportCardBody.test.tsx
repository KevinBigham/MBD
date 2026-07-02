import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import FarmReportCardBody from './FarmReportCardBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('FarmReportCardBody', () => {
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
    prospects = [],
    recentMoves = [],
  }: Partial<Parameters<typeof FarmReportCardBody>[0]> = {}) {
    await act(async () => {
      root.render(
        <FarmReportCardBody
          prospects={prospects}
          recentMoves={recentMoves}
        />,
      );
    });
  }

  it('renders prospect pulse rows and recent farm moves', async () => {
    await renderBody({
      prospects: [
        {
          playerId: 'p-top',
          name: 'Top Prospect',
          position: 'SS',
          level: 'AAA',
          readiness: 410,
          trend: 'up',
          latestLineSummary: '12-game on-base streak',
        },
        {
          playerId: 'p-steady',
          name: 'Steady Arm',
          position: 'SP',
          level: 'AA',
          readiness: 72,
          trend: 'steady',
          latestLineSummary: null,
        },
      ],
      recentMoves: [
        {
          id: 'move-1',
          timestamp: 'Day 42',
          headline: 'Top Prospect promoted to AAA',
        },
      ],
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Top Prospect');
    expect(text).toContain('AAA · SS · 65 OVR');
    expect(text).toContain('12-game on-base streak');
    expect(text).toContain('Steady Arm');
    expect(text).toContain('AA · SP · 72 OVR');
    expect(text).toContain('No recent line summary available.');
    expect(text).toContain('Recent farm moves');
    expect(text).toContain('Day 42 · Top Prospect promoted to AAA');
  });

  it('renders empty prospect and move fallbacks', async () => {
    await renderBody();

    const text = container.textContent ?? '';
    expect(text).toContain('No prospect pulse is available yet.');
    expect(text).toContain('Recent farm moves');
    expect(text).toContain('No farm moves have hit the narrative feed recently.');
  });
});
