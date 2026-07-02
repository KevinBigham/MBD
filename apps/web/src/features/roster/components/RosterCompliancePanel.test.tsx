import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { RosterCompliancePanel, type RosterComplianceView } from './RosterCompliancePanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('RosterCompliancePanel', () => {
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

  it('summarizes compliance pressure and sends DFA recommendation requests to the route', async () => {
    const onRequestDfa = vi.fn();
    const compliance: RosterComplianceView = {
      activeRosterCount: 28,
      activeRosterLimit: 26,
      fortyManCount: 42,
      issues: [{
        code: 'forty_man_over_limit',
        severity: 'error',
        message: '40-man roster has 42 players (limit 40).',
      }],
      dfaRecommendations: [{
        playerId: 'dfa-1',
        playerName: 'Logan Depth',
        position: '1B',
        age: 29,
        salary: 2.2,
        score: 83,
        reason: 'Low-value 40-man bat relative to age and salary.',
      }],
    };

    await act(async () => {
      root.render(
        <RosterCompliancePanel
          compliance={compliance}
          busyAction={null}
          onRequestDfa={onRequestDfa}
        />,
      );
    });

    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('Roster Compliance War Room');
    expect(container.textContent).toContain('28/26');
    expect(container.textContent).toContain('2 over');
    expect(container.textContent).toContain('42/40');
    expect(container.textContent).toContain('40-man roster has 42 players');
    expect(container.textContent).toContain('Moderate roster risk');
    expect(container.textContent).toContain('DFA is the cleanest compliance move');

    const dfaButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('DFA Logan Depth'),
    );

    await act(async () => {
      dfaButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onRequestDfa).toHaveBeenCalledWith(compliance.dfaRecommendations[0]);
  });

  it('renders a compliant empty state and disables only the busy DFA action', async () => {
    const compliance: RosterComplianceView = {
      activeRosterCount: 26,
      activeRosterLimit: 26,
      fortyManCount: 39,
      issues: [],
      dfaRecommendations: [{
        playerId: 'dfa-2',
        playerName: 'Sam Salary',
        position: 'DH',
        age: 34,
        salary: 9.5,
        score: 96,
        reason: 'Expensive bench bat behind better options.',
      }],
    };

    await act(async () => {
      root.render(
        <RosterCompliancePanel
          compliance={compliance}
          busyAction="dfa-dfa-2"
          onRequestDfa={vi.fn()}
        />,
      );
    });

    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('Active roster and 40-man roster are compliant today.');
    expect(container.textContent).toContain('Low roster risk');
    expect(container.textContent).toContain('Shop salary first');

    const dfaButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('DFA Sam Salary'),
    ) as HTMLButtonElement | undefined;

    expect(dfaButton?.disabled).toBe(true);
  });
});
