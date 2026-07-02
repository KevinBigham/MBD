import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import CareerCrossroadsPanel from './CareerCrossroadsPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('CareerCrossroadsPanel', () => {
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

  it('renders the firing context, job openings, and delegates job applications', async () => {
    const onApplyForJob = vi.fn();

    await act(async () => {
      root.render(
        <CareerCrossroadsPanel
          applyingTeamId={null}
          jobs={[
            {
              teamId: 'oak',
              budget: 'Balanced budget',
              expectations: 'Rebuild patience',
              difficulty: 'Hard sell',
              attractiveness: 72,
            },
          ]}
          lastFiredReason="Ownership lost patience after a slow rebuild."
          onApplyForJob={onApplyForJob}
        />,
      );
    });

    expect(container.textContent).toContain('Career Crossroads');
    expect(container.textContent).toContain('Ownership made a change');
    expect(container.textContent).toContain('Ownership lost patience after a slow rebuild.');
    expect(container.textContent).toContain('Choose one opening to take over immediately.');
    expect(container.textContent).toContain('OAK');
    expect(container.textContent).toContain('Balanced budget');
    expect(container.textContent).toContain('Rebuild patience');
    expect(container.textContent).toContain('Hard sell');
    expect(container.textContent).toContain('72');

    const takeOverButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent?.includes('Take Over OAK')
    ));
    expect(takeOverButton).toBeDefined();

    await act(async () => {
      takeOverButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyForJob).toHaveBeenCalledWith('oak');
    expect(onApplyForJob).toHaveBeenCalledTimes(1);
  });

  it('uses fallback firing copy and locks all openings while an application is pending', async () => {
    await act(async () => {
      root.render(
        <CareerCrossroadsPanel
          applyingTeamId="kc"
          jobs={[
            {
              teamId: 'kc',
              budget: 'Lean budget',
              expectations: 'Win soon',
              difficulty: 'Pressure cooker',
              attractiveness: 61,
            },
            {
              teamId: 'pit',
              budget: 'Flexible budget',
              expectations: 'Build steadily',
              difficulty: 'Patience available',
              attractiveness: 84,
            },
          ]}
          lastFiredReason={null}
          onApplyForJob={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('Your last club moved on.');
    expect(container.textContent).toContain('Applying...');
    expect(container.textContent).toContain('Take Over PIT');

    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons).toHaveLength(2);
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });
});
