import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { DraftWarRoomPanel } from './DraftWarRoomPanel';
import type { WorkerApi } from '@/workers/sim.worker';
import type { DraftRoomProspect } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type DraftCommentaryView = Awaited<ReturnType<WorkerApi['getDraftCommentary']>>;
type DraftProspectReactionView = Awaited<ReturnType<WorkerApi['getDraftProspectReaction']>>;

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
    background: overrides.background ?? 'HS',
    bigBoardRank: overrides.bigBoardRank ?? null,
    age: overrides.age ?? 18,
    origin: overrides.origin ?? 'HS',
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

describe('DraftWarRoomPanel', () => {
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

  it('renders commentary buzz, selected-prospect preview, and feed labels', async () => {
    const commentary: NonNullable<DraftCommentaryView> = {
      heartbeat: 'NYT are live at pick 8 with 24 prospects still on the board.',
      buzz: [
        {
          id: 'slide-prospect-1',
          label: 'Value Slide',
          summary: 'Eli Vega is still live with a 61 grade.',
          trend: 'up',
          urgency: 'target',
          playerId: 'prospect-1',
          teamId: null,
        },
        {
          id: 'prep-risk',
          label: 'Prep Risk',
          summary: 'Prep bats are moving slower than expected.',
          trend: 'down',
          urgency: 'heat',
          playerId: null,
          teamId: null,
        },
      ],
      entries: [
        {
          id: 'clock-1',
          pickNumber: 8,
          tag: 'commissioner',
          headline: 'New York Tycoons are on the clock',
          detail: 'The commissioner has opened the pick window.',
          tone: 'neutral',
          playerId: null,
        },
        {
          id: 'room-1',
          pickNumber: null,
          tag: 'scouting-director',
          headline: 'The room likes Eli Vega',
          detail: 'Scouting sees a middle-of-diamond player with upside.',
          tone: 'user',
          playerId: 'prospect-1',
        },
        {
          id: 'analyst-1',
          pickNumber: null,
          tag: 'analyst',
          headline: 'Division rival may pivot',
          detail: 'A rival club is tied to college pitching.',
          tone: 'division_rival',
          playerId: null,
        },
      ],
    };
    const reaction: NonNullable<DraftProspectReactionView> = {
      playerId: 'prospect-1',
      headline: 'Eli Vega looks like a board win if the card is ready',
      summary: 'Eli Vega fits the zone where talent and cost can balance out.',
      fit: 'New York Tycoons would be targeting an infielder who can stay in the middle.',
      risk: 'The risk lives in the high school development runway.',
      signability: 'The signability should play cleanly at this slot.',
      recommendation: 'hover',
    };

    await act(async () => {
      root.render(
        <DraftWarRoomPanel
          commentary={commentary}
          reaction={reaction}
          selectedProspect={makeProspect({ id: 'prospect-1', name: 'Eli Vega', scoutingGrade: 61 })}
        />,
      );
    });

    expect(container.textContent).toContain('War Room');
    expect(container.textContent).toContain('NYT are live at pick 8');
    expect(container.textContent).toContain('Buzz Tracker');
    expect(container.textContent).toContain('2 signals');
    expect(container.textContent).toContain('Value Slide');
    expect(container.textContent).toContain('Prep Risk');
    expect(container.textContent).toContain('hover');
    expect(container.textContent).toContain('Eli Vega looks like a board win');
    expect(container.textContent).toContain('Commissioner');
    expect(container.textContent).toContain('Scouting Director');
    expect(container.textContent).toContain('Analyst Desk');
    expect(container.textContent).toContain('Pick 8');
    expect(container.textContent).toContain('3 notes');
  });

  it('renders gathering and selection empty states', async () => {
    await act(async () => {
      root.render(
        <DraftWarRoomPanel
          commentary={null}
          reaction={null}
          selectedProspect={null}
        />,
      );
    });

    expect(container.textContent).toContain('0 signals');
    expect(container.textContent).toContain('The room is still gathering signals.');
    expect(container.textContent).toContain('Select a prospect to see the war-room read.');
    expect(container.textContent).toContain('0 notes');
    expect(container.textContent).toContain('Start the draft to bring the war-room feed online.');
  });
});
