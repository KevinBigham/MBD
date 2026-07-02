import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { DraftBoardComparePanel } from './DraftBoardComparePanel';
import type { DraftRoomProspect } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function makeProspect(overrides: Partial<DraftRoomProspect> & Pick<DraftRoomProspect, 'id' | 'name' | 'scoutingGrade'>): DraftRoomProspect {
  return {
    id: overrides.id,
    playerId: overrides.playerId ?? overrides.id,
    name: overrides.name,
    firstName: overrides.firstName ?? overrides.name.split(' ')[0] ?? overrides.name,
    lastName: overrides.lastName ?? (overrides.name.split(' ').slice(1).join(' ') || overrides.name),
    position: overrides.position ?? 'SS',
    scoutingGrade: overrides.scoutingGrade,
    consensusGrade: overrides.consensusGrade ?? overrides.scoutingGrade,
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

describe('DraftBoardComparePanel', () => {
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

  it('compares the selected prospect against best-grade, safer-sign, and lower-risk alternatives', async () => {
    const selectedProspect = makeProspect({
      id: 'prospect-1',
      name: 'Eli Prospect',
      scoutingGrade: 61,
      position: 'SS',
      origin: 'HS',
      askBonus: 2.8,
    });
    const bestGrade = makeProspect({
      id: 'prospect-2',
      name: 'Maya College',
      scoutingGrade: 63,
      position: 'SP',
      decisionInputs: {
        ...selectedProspect.decisionInputs,
        signability: { label: 'Clean sign', value: 80, detail: 'Senior leverage is limited.' },
        risk: { label: 'Moderate risk', value: 44, detail: 'College profile lowers variance.' },
      },
    });
    const safestSign = makeProspect({
      id: 'prospect-3',
      name: 'Jon Safe',
      scoutingGrade: 55,
      position: '2B',
      askBonus: 1.1,
      decisionInputs: {
        ...selectedProspect.decisionInputs,
        signability: { label: 'Clean sign', value: 91, detail: 'Should close quickly.' },
        risk: { label: 'Low risk', value: 28, detail: 'High certainty suppresses variance.' },
      },
    });

    await act(async () => {
      root.render(
        <DraftBoardComparePanel
          selectedProspect={selectedProspect}
          prospects={[selectedProspect, bestGrade, safestSign]}
        />,
      );
    });

    expect(container.textContent).toContain('Board Compare');
    expect(container.textContent).toContain('Selected Read');
    expect(container.textContent).toContain('Best Grade');
    expect(container.textContent).toContain('Safer Sign');
    expect(container.textContent).toContain('Lower Risk');
    expect(container.textContent).toContain('Maya College');
    expect(container.textContent).toContain('+2 grade vs selected');
    expect(container.textContent).toContain('+49 signability vs selected');
    expect(container.textContent).toContain('-43 risk vs selected');
  });

  it('renders nothing when there is no selected comparison field', async () => {
    await act(async () => {
      root.render(<DraftBoardComparePanel selectedProspect={null} prospects={[]} />);
    });

    expect(container.textContent).toBe('');
  });
});
