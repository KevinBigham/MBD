import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { StaffChemistryPanel } from './StaffChemistryPanel';
import type { ChemistryView } from '../hooks/useStaffRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const chemistry: ChemistryView = {
  harmony: {
    overallScore: 74,
    synergies: [],
    strongestBond: {
      coachAId: 'coach-1',
      coachBId: 'coach-2',
      synergyScore: 87,
      factors: ['Shared philosophy', 'Development overlap'],
    },
    weakestLink: {
      coachAId: 'coach-3',
      coachBId: 'coach-4',
      synergyScore: 42,
      factors: ['Conflicting approach'],
    },
  },
  issues: [
    {
      severity: 'medium',
      description: 'Pitching staff and development staff are sending mixed signals.',
      involvedIds: ['coach-3', 'coach-4'],
    },
  ],
  playerAffinities: [],
  coaches: [
    {
      id: 'coach-1',
      name: 'Ruben Serrano',
      role: 'hitting_coach',
      specialty: 'contact',
      teaching: 0.83,
      impact: 0.14,
      fit: 0.75,
      salary: 2.3,
    },
    {
      id: 'coach-2',
      name: 'Maya Voss',
      role: 'bench_coach',
      specialty: 'culture',
      teaching: 0.79,
      impact: 0.18,
      fit: 0.82,
      salary: 2.1,
    },
  ],
};

describe('StaffChemistryPanel', () => {
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

  it('renders harmony score, staff issues, radar data, and bond summaries', async () => {
    await act(async () => {
      root.render(<StaffChemistryPanel chemistry={chemistry} />);
    });

    expect(container.textContent).toContain('Staff Chemistry');
    expect(container.textContent).toContain('74');
    expect(container.textContent).toContain('Harmony Score');
    expect(container.textContent).toContain('Issues');
    expect(container.textContent).toContain('Pitching staff and development staff are sending mixed signals.');
    expect(container.textContent).toContain('medium');
    expect(container.textContent).toContain('Strongest Bond');
    expect(container.textContent).toContain('87');
    expect(container.textContent).toContain('Shared philosophy');
    expect(container.textContent).toContain('Weakest Link');
    expect(container.textContent).toContain('42');
    expect(container.textContent).toContain('Conflicting approach');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });

  it('renders nothing when chemistry data has not loaded', async () => {
    await act(async () => {
      root.render(<StaffChemistryPanel chemistry={null} />);
    });

    expect(container.textContent).toBe('');
  });
});
