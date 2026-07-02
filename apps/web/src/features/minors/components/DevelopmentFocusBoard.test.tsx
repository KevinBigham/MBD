import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import DevelopmentFocusBoard from './DevelopmentFocusBoard';
import type { ProspectPipelineView } from './PipelineView';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const focus: ProspectPipelineView['developmentFocus'] = {
  summary: '1 promotion window and 1 recalibration need attention.',
  priorities: [
    {
      playerId: 'prospect-ready',
      playerName: 'Marco Ascension',
      level: 'AAA',
      category: 'promotion_window',
      label: 'Promotion Window',
      action: 'Evaluate MLB fit during the next roster checkpoint.',
      reason: 'Ready-now AAA performance is forcing a big-league decision.',
      evidence: ['.322 AVG · 82 H · 14 HR · 48 RBI'],
    },
    {
      playerId: 'prospect-stall',
      playerName: 'Jules Caldera',
      level: 'AA',
      category: 'recalibrate_plan',
      label: 'Recalibrate Plan',
      action: 'Reset the current development plan before the next checkpoint.',
      reason: 'Below expectations trend with swing-decision risk.',
      evidence: [],
    },
  ],
};

describe('DevelopmentFocusBoard', () => {
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

  it('renders development priorities with labels, actions, reasons, evidence, and level copy', async () => {
    await act(async () => {
      root.render(<DevelopmentFocusBoard focus={focus} />);
      await Promise.resolve();
    });

    const content = container.textContent ?? '';
    expect(content).toContain('Development Focus');
    expect(content).toContain('1 promotion window and 1 recalibration need attention.');
    expect(content).toContain('2 priorities');
    expect(content).toContain('Marco Ascension');
    expect(content).toContain('AAA');
    expect(content).toContain('Promotion Window');
    expect(content).toContain('Evaluate MLB fit');
    expect(content).toContain('Ready-now AAA performance');
    expect(content).toContain('.322 AVG');
    expect(content).toContain('Jules Caldera');
    expect(content).toContain('AA');
    expect(content).toContain('Recalibrate Plan');
    expect(content).toContain('Reset the current development plan');
    expect(content).toContain('Below expectations trend');
  });

  it('delegates development-plan application from priority cards', async () => {
    const onApplyPlan = vi.fn();

    await act(async () => {
      root.render(
        <DevelopmentFocusBoard
          focus={focus}
          onApplyPlan={onApplyPlan}
          busyPlayerId="prospect-stall"
          actionMessage="Jules Caldera: refinement plan applied."
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Jules Caldera: refinement plan applied.');
    const buttons = [...container.querySelectorAll('button')];
    expect(buttons.filter((button) => button.textContent === 'Apply plan')).toHaveLength(2);
    expect(buttons[1]?.disabled).toBe(true);

    await act(async () => {
      buttons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyPlan).toHaveBeenCalledWith(focus.priorities[0]);
  });

  it('renders nothing without priorities', async () => {
    await act(async () => {
      root.render(<DevelopmentFocusBoard focus={{ summary: 'No focus needed.', priorities: [] }} />);
      await Promise.resolve();
    });

    expect(container.textContent).toBe('');
  });
});
