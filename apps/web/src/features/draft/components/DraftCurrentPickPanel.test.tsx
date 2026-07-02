import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { DraftCurrentPickPanel } from './DraftCurrentPickPanel';
import type { DraftRoomProspect, DraftRoomView } from '@/workers/sim.worker.helpers';

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
    background: overrides.background ?? 'HS',
    bigBoardRank: overrides.bigBoardRank ?? null,
    age: overrides.age ?? 18,
    origin: overrides.origin ?? 'HS',
    scoutConflict: overrides.scoutConflict ?? null,
    decisionInputs: overrides.decisionInputs ?? {
      scoutAccuracy: { label: 'Draft focus 74%', value: 74, detail: '2 looks with the draft staff confidence model.' },
      disagreement: { label: 'Small gap', value: 3, detail: 'Your room is 3 points above the consensus board.' },
      makeup: { label: 'Strong makeup', value: 82, detail: 'Work ethic supports a longer development runway.' },
      signability: { label: 'Difficult sign', value: 42, detail: 'Commitment leverage is live.' },
      risk: { label: 'High risk', value: 71, detail: 'Prep profile and limited certainty raise the variance.' },
      whyThisPick: 'Middle-of-diamond upside with a strong internal grade edge.',
    },
  };
}

function makeDraft(prospects: DraftRoomProspect[]): DraftRoomView {
  return {
    status: 'in_progress',
    availableProspects: prospects,
    udfaProspects: [],
    completedPicks: [],
    currentPick: {
      slotId: 'standard:1:8:nym',
      round: 1,
      pickNumber: 8,
      pickInRound: 8,
      totalPicks: 600,
      teamId: 'nym',
      teamName: 'New York Tycoons',
      teamAbbreviation: 'NYT',
      userOnClock: true,
    },
    board: { teams: [], rounds: [] },
    counts: { totalRounds: 20, totalPicks: 600, picksMade: 7, picksRemaining: 593 },
    userDraftClass: {
      picks: [
        {
          playerId: 'pick-1',
          playerName: 'Prior Pick',
          position: 'SP',
          scoutingGrade: 58,
          origin: 'College',
          slotValue: 2.1,
          askBonus: 2,
          signed: null,
          agreedBonus: null,
          assessment: 'Solid value.',
        },
      ],
      overallGrade: 'B',
      averageScoutingGrade: 58,
    },
    userBigBoard: ['prospect-1'],
  };
}

describe('DraftCurrentPickPanel', () => {
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

  it('renders the on-clock selected prospect decision card and forwards actions', async () => {
    const onDraft = vi.fn();
    const onScout = vi.fn();
    const onToggleBoard = vi.fn();
    const selectedProspect = makeProspect({
      id: 'prospect-1',
      name: 'Eli Vega',
      scoutingGrade: 61,
      bigBoardRank: 1,
      scoutConflict: {
        prospectId: 'prospect-1',
        teamId: 'nym',
        prospectType: 'draft',
        createdSeason: 4,
        resolutionSeason: 7,
        resolved: false,
        headline: 'Scouts split on Eli Vega.',
        divergence: 17,
        debateGenerated: false,
        resolution: null,
        winningSource: null,
        outcomeSummary: 'The room wants one more look before locking the card.',
        opinions: [
          {
            source: 'scout_director',
            overallGrade: 61,
            ceiling: 68,
            floor: 46,
            confidence: 13,
            summary: 'Believes the glove gives him a major-league floor.',
          },
          {
            source: 'analytics_head',
            overallGrade: 52,
            ceiling: 62,
            floor: 42,
            confidence: 15,
            summary: 'Model flags swing decisions as the separator.',
          },
          {
            source: 'manager',
            overallGrade: 58,
            ceiling: 64,
            floor: 47,
            confidence: 11,
            summary: 'Trusts the makeup but wants patience.',
          },
        ],
      },
    });
    const bestGrade = makeProspect({ id: 'prospect-2', name: 'Maya College', scoutingGrade: 63 });
    const saferSign = makeProspect({
      id: 'prospect-3',
      name: 'Jon Safe',
      scoutingGrade: 55,
      decisionInputs: {
        ...selectedProspect.decisionInputs,
        signability: { label: 'Clean sign', value: 91, detail: 'Should close quickly.' },
        risk: { label: 'Low risk', value: 28, detail: 'High certainty suppresses variance.' },
      },
    });

    await act(async () => {
      root.render(
        <DraftCurrentPickPanel
          draft={makeDraft([selectedProspect, bestGrade, saferSign])}
          selectedProspect={selectedProspect}
          prospects={[selectedProspect, bestGrade, saferSign]}
          onDraft={onDraft}
          onScout={onScout}
          onToggleBoard={onToggleBoard}
          drafting={false}
          scouting={false}
        />,
      );
    });

    expect(container.textContent).toContain('On The Clock');
    expect(container.textContent).toContain('New York Tycoons');
    expect(container.textContent).toContain('Round 1, Pick 8');
    expect(container.textContent).toContain('User Pick');
    expect(container.textContent).toContain('Eli Vega');
    expect(container.textContent).toContain('SS');
    expect(container.textContent).toContain('Age 18');
    expect(container.textContent).toContain('Decision Inputs');
    expect(container.textContent).toContain('High risk');
    expect(container.textContent).toContain('Middle-of-diamond upside');
    expect(container.textContent).toContain('Board Compare');
    expect(container.textContent).toContain('+2 grade vs selected');
    expect(container.textContent).toContain('Scout Debate');
    expect(container.textContent).toContain('Divergence 17');
    expect(container.textContent).toContain('Scout Director');
    expect(container.textContent).toContain('The room wants one more look');
    expect(container.textContent).toContain('593');
    expect(container.textContent).toContain('Available');
    expect(container.textContent).toContain('Your Picks');

    const buttons = Array.from(container.querySelectorAll('button'));
    const scoutButton = buttons.find((button) => button.textContent?.includes('Scout Look'));
    const boardButton = buttons.find((button) => button.textContent?.includes('Big Board #1'));
    const draftButton = buttons.find((button) => button.textContent?.includes('Draft Vega'));

    expect(scoutButton).toBeTruthy();
    expect(boardButton).toBeTruthy();
    expect(draftButton).toBeTruthy();

    await act(async () => {
      scoutButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      boardButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      draftButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onScout).toHaveBeenCalledTimes(1);
    expect(onToggleBoard).toHaveBeenCalledTimes(1);
    expect(onDraft).toHaveBeenCalledTimes(1);
  });

  it('renders the empty selected-prospect state without action controls', async () => {
    const prospects = [makeProspect({ id: 'prospect-1', name: 'Eli Vega', scoutingGrade: 61 })];

    await act(async () => {
      root.render(
        <DraftCurrentPickPanel
          draft={makeDraft(prospects)}
          selectedProspect={null}
          prospects={prospects}
          onDraft={vi.fn()}
          onScout={vi.fn()}
          onToggleBoard={vi.fn()}
          drafting={false}
          scouting={false}
        />,
      );
    });

    expect(container.textContent).toContain('Select a prospect to set your draft board.');
    expect(container.textContent).not.toContain('Scout Look');
    expect(container.textContent).not.toContain('Draft Vega');
  });
});
