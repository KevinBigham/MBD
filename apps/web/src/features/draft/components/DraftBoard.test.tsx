import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { DraftBoard } from './DraftBoard';
import type { DraftRoomPick, DraftRoomView } from '@/workers/sim.worker.helpers';

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

function makeDraftView(): DraftRoomView {
  const compensation = {
    compensationForPlayerId: 'free-agent-1',
    compensationForPlayerName: 'Rafael Anchor',
    compensationFromTeamId: 'bos',
    compensationFromTeamName: 'Boston Noreasters',
  };
  const visiblePick = makePick({
    slotId: 'comp-4-nym-free-agent-1-1',
    pickNumber: 31,
    playerId: 'prospect-31',
    playerName: 'Miles Compensation',
    position: 'CF',
    scoutingGrade: 57,
    origin: 'College',
    slotKind: 'compensatory',
    compensation,
  });
  const hiddenPick = makePick({
    slotId: 'standard:1:32:bos',
    pickNumber: 32,
    teamId: 'bos',
    teamName: 'Boston Noreasters',
    teamAbbreviation: 'BOS',
    playerId: 'prospect-32',
    playerName: 'Future Ace',
    position: 'SP',
    scoutingGrade: 63,
    origin: 'College',
    tone: 'division_rival',
  });

  return {
    status: 'in_progress',
    availableProspects: [],
    udfaProspects: [],
    completedPicks: [visiblePick, hiddenPick],
    currentPick: null,
    board: {
      teams: [
        { teamId: 'nym', teamName: 'New York Tycoons', abbreviation: 'NYT', tone: 'user' },
        { teamId: 'bos', teamName: 'Boston Noreasters', abbreviation: 'BOS', tone: 'division_rival' },
      ],
      rounds: [
        {
          round: 1,
          cells: [
            {
              slotId: 'comp-4-nym-free-agent-1-1',
              round: 1,
              pickInRound: 31,
              teamId: 'nym',
              teamAbbreviation: 'NYT',
              tone: 'user',
              compensation,
              pick: visiblePick,
            },
            {
              slotId: 'standard:1:32:bos',
              round: 1,
              pickInRound: 32,
              teamId: 'bos',
              teamAbbreviation: 'BOS',
              tone: 'division_rival',
              compensation,
              pick: hiddenPick,
            },
          ],
        },
      ],
    },
    counts: { totalRounds: 20, totalPicks: 600, picksMade: 32, picksRemaining: 568 },
    userDraftClass: null,
    userBigBoard: [],
  };
}

describe('DraftBoard', () => {
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

  it('renders team columns, visible completed picks, and hidden future slots with QO context', async () => {
    await act(async () => {
      root.render(<DraftBoard draft={makeDraftView()} visibleCount={1} />);
    });

    expect(container.textContent).toContain('Draft Board');
    expect(container.textContent).toContain('User picks in green, division rivals in amber');
    const body = container.querySelector('[data-testid="dense-panel-body"]');
    expect(body).not.toBeNull();
    expect(body?.className).toContain('overflow-x-auto');
    expect(container.textContent).toContain('NYT');
    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('Miles Compensation');
    expect(container.textContent).toContain('CF · 57');
    expect(container.textContent).toContain('QO for Rafael Anchor from Boston Noreasters');
    expect(container.textContent).not.toContain('Future Ace');
  });

  it('reveals later picks when visible count advances', async () => {
    await act(async () => {
      root.render(<DraftBoard draft={makeDraftView()} visibleCount={2} />);
    });

    expect(container.textContent).toContain('Future Ace');
    expect(container.textContent).toContain('SP · 63');
  });
});
