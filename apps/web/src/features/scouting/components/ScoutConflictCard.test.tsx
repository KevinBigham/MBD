import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import ScoutConflictCard from './ScoutConflictCard';
import type { ScoutConflict } from '../hooks/useScoutConflictsData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function makeConflict(overrides: Partial<ScoutConflict> = {}): ScoutConflict {
  return {
    prospectId: 'p1',
    headline: 'Is Rodriguez the real deal?',
    opinions: [
      {
        source: 'scout_director',
        overallGrade: 65,
        ceiling: 75,
        floor: 55,
        confidence: 80,
        summary: 'Plus bat speed and power projection.',
      },
      {
        source: 'analytics_head',
        overallGrade: 52,
        ceiling: 60,
        floor: 45,
        confidence: 90,
        summary: 'Swing metrics below elite threshold.',
      },
      {
        source: 'manager',
        overallGrade: 58,
        ceiling: 68,
        floor: 48,
        confidence: 60,
        summary: 'Looks the part but needs polish.',
      },
    ],
    divergence: 13,
    resolved: false,
    resolution: null,
    winningSource: null,
    outcomeSummary: null,
    ...overrides,
  };
}

describe('ScoutConflictCard', () => {
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

  it('renders active conflicts with source labels, grades, confidence, and divided status', async () => {
    await act(async () => {
      root.render(<ScoutConflictCard conflict={makeConflict()} />);
    });

    expect(container.textContent).toContain('Is Rodriguez the real deal?');
    expect(container.textContent).toContain('Scout Director');
    expect(container.textContent).toContain('Analytics');
    expect(container.textContent).toContain('Manager');
    expect(container.textContent).toContain('65');
    expect(container.textContent).toContain('Floor 55');
    expect(container.textContent).toContain('Ceil 75');
    expect(container.textContent).toContain('Confidence');
    expect(container.textContent).toContain('DIVIDED');
    expect(container.textContent).toContain('Gap: 13');
    expect(container.textContent).toContain('Plus bat speed and power projection.');
  });

  it('renders resolved conflicts with the winning opinion and outcome summary', async () => {
    await act(async () => {
      root.render(
        <ScoutConflictCard
          conflict={makeConflict({
            headline: 'Smith pitching debate settled',
            divergence: 15,
            resolved: true,
            resolution: { season: 4, actualGrade: 62, closestSource: 'analytics_head' },
            winningSource: 'analytics_head',
            outcomeSummary: 'Analytics nailed it. Smith became a solid #3 starter.',
          })}
        />,
      );
    });

    expect(container.textContent).toContain('Smith pitching debate settled');
    expect(container.textContent).toContain('VINDICATED');
    expect(container.textContent).toContain('Resolved - Season 4');
    expect(container.textContent).toContain('Actual Grade: 62');
    expect(container.textContent).toContain('Analytics nailed it');
    expect(container.textContent).not.toContain('DIVIDED');
  });
});
