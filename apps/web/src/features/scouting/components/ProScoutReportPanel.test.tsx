import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import ProScoutReportPanel, { type ScoutReportView } from './ProScoutReportPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function makeReport(overrides: Partial<ScoutReportView> = {}): ScoutReportView {
  return {
    playerId: 'player-1',
    playerName: 'Julio Vega',
    position: 'CF',
    age: 26,
    teamName: 'Kansas City Fountains',
    isPitcher: false,
    grades: {
      contact: 64,
      power: 58,
      eye: 54,
      speed: 62,
      defense: 60,
      durability: 55,
    },
    confidence: 4,
    overall: 62,
    ceiling: 74,
    floor: 48,
    notes: 'Plus runner with enough center-field instincts to start now.',
    scoutName: 'Marta Vega',
    date: 'Season 2 Day 14',
    reliability: 4,
    ...overrides,
  };
}

describe('ProScoutReportPanel', () => {
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

  it('renders hitter report grades, WAR projection context, and notes', async () => {
    await act(async () => {
      root.render(<ProScoutReportPanel report={makeReport()} />);
    });

    expect(container.textContent).toContain('Julio Vega');
    expect(container.textContent).toContain('CF | Age 26 | Kansas City Fountains');
    expect(container.textContent).toContain('Overall Grade');
    expect(container.textContent).toContain('Contact');
    expect(container.textContent).toContain('64');
    expect(container.textContent).toContain('Ceiling');
    expect(container.textContent).toContain('Floor');
    expect(container.textContent).toContain('Reliability');
    expect(container.textContent).toContain('WAR Floor');
    expect(container.textContent).toContain('WAR Now');
    expect(container.textContent).toContain('WAR Ceiling');
    expect(container.textContent).toContain('Scout Notes (Marta Vega)');
    expect(container.textContent).toContain('Plus runner with enough center-field instincts');
  });

  it('renders pitcher-specific grades and skips the notes block when no notes exist', async () => {
    await act(async () => {
      root.render(
        <ProScoutReportPanel
          report={makeReport({
            playerName: 'Avery Stone',
            position: 'SP',
            isPitcher: true,
            grades: {
              stuff: 67,
              control: 61,
              stamina: 58,
              velocity: 64,
              movement: 62,
            },
            notes: '',
          })}
        />,
      );
    });

    expect(container.textContent).toContain('Avery Stone');
    expect(container.textContent).toContain('Stuff');
    expect(container.textContent).toContain('Control');
    expect(container.textContent).toContain('Movement');
    expect(container.textContent).not.toContain('Scout Notes');
  });
});
