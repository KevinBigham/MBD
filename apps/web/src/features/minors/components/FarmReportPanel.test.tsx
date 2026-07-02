import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import FarmReportPanel, { type FarmReportView } from './FarmReportPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const farmReport: FarmReportView = {
  bondedProspects: 4,
  activeSetbackCount: 1,
  breakoutCandidates: [
    {
      playerId: 'prospect-1',
      playerName: 'Marco Ascension',
      summary: 'Dark horse Marco Ascension could be next in line for a callup.',
    },
  ],
  topProspects: [
    {
      playerId: 'prospect-1',
      playerName: 'Marco Ascension',
      position: 'SS',
      level: 'AAA',
      levelLabel: 'AAA',
      overallRating: 61,
      ceiling: 74,
      bondStrength: 42,
      loyaltyModifier: 0.42,
      milestones: ['Drafted Round 1, 3', 'Promoted to AAA, 5'],
      latestLineSummary: '.322 AVG · 82 H · 14 HR · 48 RBI',
      activeSetback: {
        type: 'hot_streak',
        summary: 'Marco Ascension is tearing through upper-level pitching.',
        endMonth: 5,
        endSeason: 5,
      },
    },
  ],
};

describe('FarmReportPanel', () => {
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

  it('renders farm-report summary, breakout candidates, top prospects, setback copy, and milestones', async () => {
    await act(async () => {
      root.render(<FarmReportPanel farmReport={farmReport} />);
      await Promise.resolve();
    });

    const content = container.textContent ?? '';
    expect(content).toContain('Farm report');
    expect(content).toContain('4 bonded prospects');
    expect(content).toContain('1 breakout candidates');
    expect(content).toContain('1 active development signals');
    expect(content).toContain('Breakout candidates');
    expect(content).toContain('could be next in line for a callup');
    expect(content).toContain('Marco Ascension');
    expect(content).toContain('SS | AAA');
    expect(content).toContain('61');
    expect(content).toContain('Bond 42');
    expect(content).toContain('.322 AVG');
    expect(content).toContain('tearing through upper-level pitching');
    expect(content).toContain('Drafted Round 1, 3 | Promoted to AAA, 5');
  });

  it('renders an empty top-prospect state without report entries', async () => {
    await act(async () => {
      root.render(<FarmReportPanel farmReport={null} />);
      await Promise.resolve();
    });

    const content = container.textContent ?? '';
    expect(content).toContain('0 bonded prospects');
    expect(content).toContain('No farm report entries available yet.');
    expect(content).not.toContain('Breakout candidates');
  });
});
