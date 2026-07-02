import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { StaffImpactPanel } from './StaffImpactPanel';
import type { CoachingImpactView } from '../hooks/useStaffRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const impact: CoachingImpactView[] = [
  {
    id: 'impact-1',
    role: 'hitting_coach',
    name: 'Ruben Serrano',
    specialty: 'contact',
    teachingAbility: 0.83,
    developmentBonus: 0.14,
    personalityFit: 0.75,
  },
  {
    id: 'impact-2',
    role: 'pitching_coach',
    name: 'Maya Voss',
    specialty: 'command',
    teachingAbility: 0.88,
    developmentBonus: 0.2,
    personalityFit: 0.81,
  },
];

describe('StaffImpactPanel', () => {
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

  it('renders staff impact cards with role labels and rounded ratings', async () => {
    await act(async () => {
      root.render(<StaffImpactPanel impact={impact} />);
    });

    expect(container.textContent).toContain('Staff Impact');
    expect(container.textContent).toContain('Ruben Serrano');
    expect(container.textContent).toContain('Hitting Coach');
    expect(container.textContent).toContain('contact');
    expect(container.textContent).toContain('Teach');
    expect(container.textContent).toContain('83%');
    expect(container.textContent).toContain('Dev');
    expect(container.textContent).toContain('14%');
    expect(container.textContent).toContain('Fit');
    expect(container.textContent).toContain('75%');
    expect(container.textContent).toContain('Maya Voss');
    expect(container.textContent).toContain('Pitching Coach');
    expect(container.textContent).toContain('20%');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });
});
