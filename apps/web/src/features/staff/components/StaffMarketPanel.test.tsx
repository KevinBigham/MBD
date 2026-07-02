import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { StaffMarketPanel } from './StaffMarketPanel';
import type { CoachView } from './staffPresentation';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const staff: CoachView[] = [
  {
    id: 'coach-1',
    firstName: 'Ruben',
    lastName: 'Serrano',
    role: 'hitting_coach',
    specialty: 'contact',
    teachingAbility: 0.83,
    developmentBonus: 0.14,
    personalityFit: 0.75,
    annualSalary: 2.3,
  },
];

const market: CoachView[] = [
  {
    id: 'coach-2',
    firstName: 'Nate',
    lastName: 'Braddock',
    role: 'hitting_coach',
    specialty: 'power',
    teachingAbility: 0.79,
    developmentBonus: 0.18,
    personalityFit: 0.71,
    annualSalary: 2.6,
  },
  {
    id: 'coach-3',
    firstName: 'Maya',
    lastName: 'Voss',
    role: 'pitching_coach',
    specialty: 'command',
    teachingAbility: 0.88,
    developmentBonus: 0.2,
    personalityFit: 0.81,
    annualSalary: 3.1,
  },
];

describe('StaffMarketPanel', () => {
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
    vi.clearAllMocks();
  });

  function renderPanel(
    overrides: Partial<{
      busyCoachId: string | null;
      canManage: boolean;
      onFire: (coachId: string) => void;
      onHire: (coachId: string) => void;
      projectedVacancies: ReadonlySet<string>;
    }> = {},
  ) {
    const onFire = overrides.onFire ?? vi.fn();
    const onHire = overrides.onHire ?? vi.fn();

    act(() => {
      root.render(
        <StaffMarketPanel
          busyCoachId={overrides.busyCoachId ?? null}
          canManage={overrides.canManage ?? true}
          market={market}
          onFire={onFire}
          onHire={onHire}
          projectedVacancies={overrides.projectedVacancies ?? new Set(['hitting_coach'])}
          staff={staff}
        />,
      );
    });

    return { onFire, onHire };
  }

  it('renders current staff actions and coach market candidates', () => {
    renderPanel();

    expect(container.textContent).toContain('Current Staff Actions');
    expect(container.textContent).toContain('Coach Market');
    expect(container.textContent).toContain('Ruben Serrano');
    expect(container.textContent).toContain('Nate Braddock');
    expect(container.textContent).toContain('Maya Voss');
    expect(container.textContent).toContain('$2.30M');
    expect(container.textContent).toContain('$2.60M');
    expect(container.textContent).toContain('18%');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(2);
  });

  it('delegates fire and hire actions to route-owned handlers', () => {
    const { onFire, onHire } = renderPanel();
    const fireButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Fire'),
    );
    const hireButtons = Array.from(container.querySelectorAll('button')).filter((button) =>
      button.textContent?.includes('Hire'),
    );

    act(() => {
      fireButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      hireButtons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onFire).toHaveBeenCalledWith('coach-1');
    expect(onHire).toHaveBeenCalledWith('coach-2');
  });

  it('disables market actions outside the hiring window', () => {
    renderPanel({ canManage: false });

    for (const button of container.querySelectorAll('button')) {
      expect(button.disabled).toBe(true);
    }
  });

  it('marks fire and hire actions as route-critical mobile controls', () => {
    renderPanel();

    const fireButtons = Array.from(
      container.querySelectorAll('button[data-mobile-critical-control="staff-fire-coach"]'),
    );
    const hireButtons = Array.from(
      container.querySelectorAll('button[data-mobile-critical-control="staff-hire-coach"]'),
    );

    expect(fireButtons).toHaveLength(staff.length);
    expect(hireButtons).toHaveLength(market.length);
    for (const button of [...fireButtons, ...hireButtons]) {
      expect(button.className).toContain('mobile-critical-control');
      expect(button.className).toContain('focus-ring');
    }
  });
});
