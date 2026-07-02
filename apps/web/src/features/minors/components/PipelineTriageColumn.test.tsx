import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import PipelineTriageColumn from './PipelineTriageColumn';
import type { ProspectPipelineView } from './PipelineView';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const prospects: ProspectPipelineView['prospects'] = [
  {
    playerId: 'prospect-1',
    playerName: 'Marco Ascension',
    position: 'SS',
    level: 'AAA',
    age: 22,
    overallRating: 61,
    ceiling: 74,
    prospectTier: 'ready_depth',
    bondStrength: 42,
    eta: 'Ready now',
    trend: 'surging',
    latestLineSummary: null,
    activeSetback: null,
    milestones: [],
  },
  {
    playerId: 'prospect-2',
    playerName: 'Jules Caldera',
    position: 'CF',
    level: 'AA',
    age: 20,
    overallRating: 55,
    ceiling: 70,
    prospectTier: 'future',
    bondStrength: 36,
    eta: 'Next season',
    trend: 'steady',
    latestLineSummary: null,
    activeSetback: null,
    milestones: [],
  },
  {
    playerId: 'prospect-3',
    playerName: 'Rafi Calder',
    position: 'SP',
    level: 'A',
    age: 19,
    overallRating: 50,
    ceiling: 72,
    prospectTier: 'future',
    bondStrength: 29,
    eta: 'Long view',
    trend: 'steady',
    latestLineSummary: null,
    activeSetback: null,
    milestones: [],
  },
  {
    playerId: 'prospect-4',
    playerName: 'Eli Ventana',
    position: '3B',
    level: 'ROOKIE',
    age: 18,
    overallRating: 48,
    ceiling: 71,
    prospectTier: 'impact',
    bondStrength: 22,
    eta: 'Long view',
    trend: 'setback',
    latestLineSummary: null,
    activeSetback: null,
    milestones: [],
  },
  {
    playerId: 'prospect-5',
    playerName: 'Noel Hidden',
    position: 'RP',
    level: 'AAA',
    age: 24,
    overallRating: 49,
    ceiling: 55,
    prospectTier: 'organizational_depth',
    bondStrength: 10,
    eta: 'Depth',
    trend: 'steady',
    latestLineSummary: null,
    activeSetback: null,
    milestones: [],
  },
];

describe('PipelineTriageColumn', () => {
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

  it('renders the first four prospects with position, level, age, and tier labels', async () => {
    await act(async () => {
      root.render(
        <PipelineTriageColumn
          empty="No clear risers this cycle."
          prospects={prospects}
          title="Risers"
        />,
      );
      await Promise.resolve();
    });

    const content = container.textContent ?? '';
    expect(content).toContain('Risers');
    expect(content).toContain('Marco Ascension');
    expect(content).toContain('SS · AAA · Age 22 · Ready Depth');
    expect(content).toContain('Jules Caldera');
    expect(content).toContain('CF · AA · Age 20 · Future');
    expect(content).toContain('Rafi Calder');
    expect(content).toContain('SP · A · Age 19 · Future');
    expect(content).toContain('Eli Ventana');
    expect(content).toContain('3B · Rookie · Age 18 · Impact');
    expect(content).not.toContain('Noel Hidden');
  });

  it('renders the provided empty state when no prospects match', async () => {
    await act(async () => {
      root.render(
        <PipelineTriageColumn
          empty="No active setback flags."
          prospects={[]}
          title="Fallers"
        />,
      );
      await Promise.resolve();
    });

    const content = container.textContent ?? '';
    expect(content).toContain('Fallers');
    expect(content).toContain('No active setback flags.');
  });
});
