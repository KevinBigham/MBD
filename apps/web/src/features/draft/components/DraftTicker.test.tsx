import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { DraftTicker } from './DraftTicker';
import type { DraftRoomPick } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function makePick(overrides: Partial<DraftRoomPick> & Pick<DraftRoomPick, 'pickNumber' | 'playerId' | 'playerName'>): DraftRoomPick {
  return {
    slotId: overrides.slotId ?? `standard:1:${overrides.pickNumber}:nym`,
    round: overrides.round ?? 1,
    pickNumber: overrides.pickNumber,
    teamId: overrides.teamId ?? 'nym',
    teamName: overrides.teamName ?? 'New York Tycoons',
    teamAbbreviation: overrides.teamAbbreviation ?? 'NYT',
    playerId: overrides.playerId,
    playerName: overrides.playerName,
    position: overrides.position ?? 'SS',
    scoutingGrade: overrides.scoutingGrade ?? 61,
    origin: overrides.origin ?? 'HS',
    slotKind: overrides.slotKind,
    compensation: overrides.compensation,
    tone: overrides.tone ?? 'user',
  };
}

describe('DraftTicker', () => {
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

  it('renders progress, pick count, selections, grades, and compensation context', async () => {
    await act(async () => {
      root.render(
        <DraftTicker
          picks={[
            makePick({
              pickNumber: 1,
              playerId: 'prospect-1',
              playerName: 'Eli Vega',
              position: 'SS',
              scoutingGrade: 61,
              origin: 'HS',
              tone: 'user',
            }),
            makePick({
              pickNumber: 2,
              playerId: 'prospect-2',
              playerName: 'Maya College',
              position: 'SP',
              scoutingGrade: 63,
              origin: 'College',
              tone: 'division_rival',
              compensation: {
                compensationForPlayerId: 'free-agent-1',
                compensationForPlayerName: 'Rafael Anchor',
                compensationFromTeamId: 'bos',
                compensationFromTeamName: 'Boston Noreasters',
              },
            }),
          ]}
          progressLabel="Round 1 of 20 - Pick 2 of 600"
        />,
      );
    });

    expect(container.textContent).toContain('Draft Ticker');
    expect(container.textContent).toContain('Round 1 of 20 - Pick 2 of 600');
    expect(container.textContent).toContain('2 picks shown');
    expect(container.textContent).toContain('Round 1 · Pick 1');
    expect(container.textContent).toContain('NYT selected Eli Vega');
    expect(container.textContent).toContain('SS · HS');
    expect(container.textContent).toContain('61');
    expect(container.textContent).toContain('Round 1 · Pick 2');
    expect(container.textContent).toContain('Maya College');
    expect(container.textContent).toContain('QO');
    expect(container.textContent).toContain('QO for Rafael Anchor from Boston Noreasters');
  });

  it('renders the empty ticker state', async () => {
    await act(async () => {
      root.render(<DraftTicker picks={[]} progressLabel="Draft Available" />);
    });

    expect(container.textContent).toContain('Draft Ticker');
    expect(container.textContent).toContain('Draft Available');
    expect(container.textContent).toContain('0 picks shown');
    expect(container.textContent).toContain('Start the draft to begin the ticker.');
  });
});
