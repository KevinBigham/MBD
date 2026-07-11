import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { DraftProspectsPanel } from './DraftProspectsPanel';
import type { DraftRoomProspect } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function makeProspect(overrides: Partial<DraftRoomProspect> & Pick<DraftRoomProspect, 'id' | 'name' | 'position' | 'scoutingGrade'>): DraftRoomProspect {
  return {
    id: overrides.id,
    playerId: overrides.playerId ?? overrides.id,
    name: overrides.name,
    firstName: overrides.firstName ?? overrides.name.split(' ')[0] ?? overrides.name,
    lastName: overrides.lastName ?? (overrides.name.split(' ').slice(1).join(' ') || overrides.name),
    position: overrides.position,
    scoutingGrade: overrides.scoutingGrade,
    consensusGrade: overrides.consensusGrade ?? overrides.scoutingGrade - 2,
    looks: overrides.looks ?? 2,
    slotValue: overrides.slotValue ?? 2,
    askBonus: overrides.askBonus ?? 2.4,
    background: overrides.background ?? 'college',
    bigBoardRank: overrides.bigBoardRank ?? null,
    age: overrides.age ?? 20,
    origin: overrides.origin ?? 'College',
    scoutConflict: overrides.scoutConflict ?? null,
    decisionInputs: overrides.decisionInputs ?? {
      scoutAccuracy: { label: 'Draft focus 74%', value: 74, detail: '2 looks.' },
      disagreement: { label: 'Small gap', value: 3, detail: 'Small board gap.' },
      makeup: { label: 'Strong makeup', value: 82, detail: 'Strong makeup.' },
      signability: { label: 'Difficult sign', value: 42, detail: 'Leverage is live.' },
      risk: { label: 'High risk', value: 71, detail: 'Variance is elevated.' },
      whyThisPick: 'Middle-of-diamond upside.',
    },
  };
}

function prospectRows(container: HTMLElement): HTMLTableRowElement[] {
  return Array.from(container.querySelectorAll('tbody tr'));
}

describe('DraftProspectsPanel', () => {
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

  it('sorts prospects by grade by default and forwards row selection', async () => {
    const onSelect = vi.fn();
    const prospects = [
      makeProspect({ id: 'prospect-1', name: 'Eli Shortstop', position: 'SS', scoutingGrade: 61, bigBoardRank: 4, age: 18, origin: 'HS', askBonus: 2.8 }),
      makeProspect({ id: 'prospect-2', name: 'Maya College', position: 'SP', scoutingGrade: 63, age: 21, origin: 'College', askBonus: 2 }),
      makeProspect({ id: 'prospect-3', name: 'Jon Safe', position: '2B', scoutingGrade: 55, age: 22, origin: 'College', askBonus: 1.1 }),
    ];

    await act(async () => {
      root.render(
        <DraftProspectsPanel
          prospects={prospects}
          selectedProspectId="prospect-1"
          onSelect={onSelect}
        />,
      );
    });

    expect(container.textContent).toContain('Available Prospects');
    expect(container.textContent).toContain('Board Sorted By Grade');
    const body = container.querySelector('[data-testid="dense-panel-body"]');
    expect(body).not.toBeNull();
    expect(body?.className).toContain('max-h-[32rem]');
    const rows = prospectRows(container);
    expect(rows[0]?.textContent).toContain('Maya College');
    expect(rows[0]?.dataset.testid).toBe('draft-prospect-row');
    expect(rows[0]?.dataset.prospectId).toBe('prospect-2');
    expect(rows[1]?.textContent).toContain('Eli Shortstop');
    expect(rows[1]?.textContent).toContain('4');
    expect(rows[1]?.textContent).toContain('SS');
    expect(rows[1]?.textContent).toContain('18');
    expect(rows[1]?.textContent).toContain('2');
    expect(rows[1]?.textContent).toContain('HS');
    expect(rows[1]?.textContent).toContain('61');
    expect(rows[1]?.textContent).toContain('59');
    expect(rows[1]?.textContent).toContain('$2.80M');

    await act(async () => {
      rows[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledWith('prospect-2');
  });

  it('toggles to position sorting and renders the empty board state', async () => {
    const prospects = [
      makeProspect({ id: 'prospect-1', name: 'Eli Shortstop', position: 'SS', scoutingGrade: 61 }),
      makeProspect({ id: 'prospect-2', name: 'Maya College', position: 'SP', scoutingGrade: 63 }),
      makeProspect({ id: 'prospect-3', name: 'Jon Safe', position: '2B', scoutingGrade: 55 }),
    ];

    await act(async () => {
      root.render(
        <DraftProspectsPanel
          prospects={prospects}
          selectedProspectId={null}
          onSelect={vi.fn()}
        />,
      );
    });

    const sortButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Sort POS'),
    );
    expect(sortButton).toBeTruthy();

    await act(async () => {
      sortButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Board Sorted By Position');
    const rows = prospectRows(container);
    expect(rows[0]?.textContent).toContain('Jon Safe');
    expect(rows[1]?.textContent).toContain('Maya College');
    expect(rows[2]?.textContent).toContain('Eli Shortstop');

    await act(async () => {
      root.render(
        <DraftProspectsPanel
          prospects={[]}
          selectedProspectId={null}
          onSelect={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('No prospects remain on the board.');
  });
});
