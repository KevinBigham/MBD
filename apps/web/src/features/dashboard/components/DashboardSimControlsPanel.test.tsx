import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import DashboardSimControlsPanel from './DashboardSimControlsPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('DashboardSimControlsPanel', () => {
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

  it('renders sim action buttons, story count, challenge badge, and delegates clicks', async () => {
    const onSimDay = vi.fn();
    const onSimWeek = vi.fn();
    const onSimMonth = vi.fn();

    await act(async () => {
      root.render(
        <DashboardSimControlsPanel
          activeStorylineCount={4}
          challengeName="September Sprint"
          onSimDay={onSimDay}
          onSimMonth={onSimMonth}
          onSimWeek={onSimWeek}
          simAction={null}
        />,
      );
    });

    expect(container.textContent).toContain('Sim Day');
    expect(container.textContent).toContain('Sim Week');
    expect(container.textContent).toContain('Sim Month');
    expect(container.textContent).toContain('4 active story arcs');
    expect(container.textContent).toContain('September Sprint');

    const simWeekButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent?.includes('Sim Week')
    ));
    expect(simWeekButton).toBeDefined();

    await act(async () => {
      simWeekButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSimWeek).toHaveBeenCalledTimes(1);
    expect(onSimDay).not.toHaveBeenCalled();
    expect(onSimMonth).not.toHaveBeenCalled();
  });

  it('marks the active sim action busy and omits the challenge badge when there is no challenge', async () => {
    await act(async () => {
      root.render(
        <DashboardSimControlsPanel
          activeStorylineCount={0}
          challengeName={null}
          onSimDay={vi.fn()}
          onSimMonth={vi.fn()}
          onSimWeek={vi.fn()}
          simAction="month"
        />,
      );
    });

    expect(container.textContent).toContain('0 active story arcs');
    expect(container.textContent).toContain('Sim Month...');

    const buttons = Array.from(container.querySelectorAll('button'));
    const simDayButton = buttons.find((button) => button.textContent?.includes('Sim Day'));
    const simWeekButton = buttons.find((button) => button.textContent?.includes('Sim Week'));
    const simMonthButton = buttons.find((button) => button.textContent?.includes('Sim Month'));

    expect(simDayButton?.disabled).toBe(false);
    expect(simWeekButton?.disabled).toBe(false);
    expect(simMonthButton?.disabled).toBe(true);
    expect(container.textContent).not.toContain('September Sprint');
  });

  it('marks sim controls as mobile-critical and exposes keyboard shortcuts to assistive tech', async () => {
    await act(async () => {
      root.render(
        <DashboardSimControlsPanel
          activeStorylineCount={2}
          challengeName={null}
          onSimDay={vi.fn()}
          onSimMonth={vi.fn()}
          onSimWeek={vi.fn()}
          simAction={null}
        />,
      );
    });

    const simDayButton = container.querySelector('[data-mobile-critical-control="dashboard-sim-day"]');
    const simWeekButton = container.querySelector('[data-mobile-critical-control="dashboard-sim-week"]');
    const simMonthButton = container.querySelector('[data-mobile-critical-control="dashboard-sim-month"]');

    expect(simDayButton?.className).toContain('mobile-critical-control');
    expect(simWeekButton?.className).toContain('mobile-critical-control');
    expect(simMonthButton?.className).toContain('mobile-critical-control');
    expect(simDayButton?.getAttribute('aria-keyshortcuts')).toBe('Space');
    expect(simWeekButton?.getAttribute('aria-keyshortcuts')).toBe('Shift+Space');
    expect(simMonthButton?.getAttribute('aria-keyshortcuts')).toBe('Control+Space Meta+Space');
  });
});
