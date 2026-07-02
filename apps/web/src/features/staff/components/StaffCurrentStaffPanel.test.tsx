import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { StaffCurrentStaffPanel } from './StaffCurrentStaffPanel';
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

describe('StaffCurrentStaffPanel', () => {
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

  it('renders current staff ratings, compensation, and enabled management actions', async () => {
    const onFire = vi.fn();

    await act(async () => {
      root.render(
        <StaffCurrentStaffPanel
          busyCoachId={null}
          canManage={true}
          onFire={onFire}
          staff={staff}
        />,
      );
    });

    expect(container.textContent).toContain('Current Staff');
    expect(container.textContent).toContain('Ruben Serrano');
    expect(container.textContent).toContain('Hitting Coach');
    expect(container.textContent).toContain('contact');
    expect(container.textContent).toContain('$2.30M');
    expect(container.textContent).toContain('14%');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);

    const fireButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Fire'),
    );
    expect(fireButton).toBeTruthy();
    expect(fireButton?.disabled).toBe(false);

    await act(async () => {
      fireButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onFire).toHaveBeenCalledWith('coach-1');
  });

  it('disables fire actions outside the staff management window', async () => {
    const onFire = vi.fn();

    await act(async () => {
      root.render(
        <StaffCurrentStaffPanel
          busyCoachId={null}
          canManage={false}
          onFire={onFire}
          staff={staff}
        />,
      );
    });

    const fireButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Fire'),
    );

    expect(fireButton?.disabled).toBe(true);
  });

  it('marks fire actions as route-critical mobile controls', async () => {
    await act(async () => {
      root.render(
        <StaffCurrentStaffPanel
          busyCoachId={null}
          canManage={true}
          onFire={vi.fn()}
          staff={staff}
        />,
      );
    });

    const fireButtons = Array.from(
      container.querySelectorAll('button[data-mobile-critical-control="staff-fire-coach"]'),
    );

    expect(fireButtons).toHaveLength(staff.length);
    for (const button of fireButtons) {
      expect(button.className).toContain('mobile-critical-control');
      expect(button.className).toContain('focus-ring');
    }
  });
});
