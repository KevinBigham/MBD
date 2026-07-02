import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DraftPageContent, { type DraftPageContentProps } from './DraftPageContent';
import type { DraftRoomView } from '@/workers/sim.worker.helpers';

vi.mock('./DraftAvailabilityPanel', () => ({
  DraftAvailabilityPanel: ({
    onStartDraft,
    status,
    variant,
  }: {
    onStartDraft: () => void;
    status: string;
    variant: string;
  }) => (
    <section data-testid="draft-availability-panel">
      <span>{variant}</span>
      <span>{status}</span>
      <button type="button" onClick={onStartDraft}>start draft</button>
    </section>
  ),
}));

vi.mock('./DraftBoard', () => ({
  DraftBoard: ({ visibleCount }: { visibleCount: number }) => (
    <section data-testid="draft-board">board {visibleCount}</section>
  ),
}));

vi.mock('./DraftCurrentPickPanel', () => ({
  DraftCurrentPickPanel: ({
    onDraft,
    onScout,
    onToggleBoard,
  }: {
    onDraft: () => void;
    onScout: () => void;
    onToggleBoard: () => void;
  }) => (
    <section data-testid="draft-current-pick-panel">
      <button type="button" onClick={onDraft}>make pick</button>
      <button type="button" onClick={onScout}>scout look</button>
      <button type="button" onClick={onToggleBoard}>toggle board</button>
    </section>
  ),
}));

vi.mock('./DraftPostDraftGradesPanel', () => ({
  DraftPostDraftGradesPanel: () => (
    <section data-testid="draft-post-draft-grades-panel">grades</section>
  ),
}));

vi.mock('./DraftProspectsPanel', () => ({
  DraftProspectsPanel: ({ onSelect }: { onSelect: (prospectId: string) => void }) => (
    <section data-testid="draft-prospects-panel">
      <button type="button" onClick={() => onSelect('prospect-1')}>select prospect</button>
    </section>
  ),
}));

vi.mock('./DraftRoomHeaderPanel', () => ({
  DraftRoomHeaderPanel: ({
    onWatchDraft,
    progressLabel,
    status,
  }: {
    onWatchDraft: () => void;
    progressLabel: string;
    status: string;
  }) => (
    <section data-testid="draft-room-header-panel">
      <span>{status}</span>
      <span>{progressLabel}</span>
      <button type="button" onClick={onWatchDraft}>watch draft</button>
    </section>
  ),
}));

vi.mock('./DraftSummaryPanel', () => ({
  DraftSummaryPanel: ({
    onBonusChange,
    onSign,
  }: {
    onBonusChange: (playerId: string, value: string) => void;
    onSign: (playerId: string) => void;
  }) => (
    <section data-testid="draft-summary-panel">
      <button type="button" onClick={() => onBonusChange('pick-1', '2.4')}>bonus</button>
      <button type="button" onClick={() => onSign('pick-1')}>sign pick</button>
    </section>
  ),
}));

vi.mock('./DraftTicker', () => ({
  DraftTicker: ({ progressLabel }: { progressLabel: string }) => (
    <section data-testid="draft-ticker">ticker {progressLabel}</section>
  ),
}));

vi.mock('./DraftWarRoomPanel', () => ({
  DraftWarRoomPanel: () => (
    <section data-testid="draft-war-room-panel">war room</section>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const draftView: DraftRoomView = {
  availableProspects: [],
  board: { rounds: [], teams: [] },
  completedPicks: [],
  counts: { picksMade: 1, picksRemaining: 599, totalPicks: 600, totalRounds: 20 },
  currentPick: null,
  status: 'in_progress',
  udfaProspects: [],
  userBigBoard: [],
  userDraftClass: null,
};

function buildProps(overrides: Partial<DraftPageContentProps> = {}): DraftPageContentProps {
  return {
    availabilityPanelProps: null,
    nudgeCard: <div data-testid="draft-nudge">nudge</div>,
    roomContentProps: {
      boardProps: {
        draft: draftView,
        visibleCount: 0,
      },
      currentPickPanelProps: {
        draft: draftView,
        drafting: false,
        onDraft: vi.fn(),
        onScout: vi.fn(),
        onToggleBoard: vi.fn(),
        prospects: [],
        scouting: false,
        selectedProspect: null,
      },
      error: 'Draft system unavailable.',
      postDraftGradesPanelProps: {
        gradesView: null,
      },
      prospectsPanelProps: {
        onSelect: vi.fn(),
        prospects: [],
        selectedProspectId: null,
      },
      roomHeaderPanelProps: {
        draftStatus: 'in_progress',
        loading: false,
        onWatchDraft: vi.fn(),
        progressLabel: 'Round 1 of 20 - Pick 1 of 600',
        status: 'Draft In Progress',
        userOnClock: false,
        watching: false,
      },
      summaryPanelProps: {
        bonusOffers: {},
        draft: draftView,
        onBonusChange: vi.fn(),
        onSign: vi.fn(),
        signingPlayerId: null,
      },
      tickerProps: {
        picks: [],
        progressLabel: 'Round 1 of 20 - Pick 1 of 600',
      },
      warRoomPanelProps: {
        commentary: null,
        reaction: null,
        selectedProspect: null,
      },
    },
    ...overrides,
  };
}

describe('DraftPageContent', () => {
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

  it('renders the availability state and keeps start-draft delegation route-owned', async () => {
    const onStartDraft = vi.fn();

    await act(async () => {
      root.render(
        <DraftPageContent
          {...buildProps({
            availabilityPanelProps: {
              error: null,
              loading: false,
              onStartDraft,
              season: 5,
              status: 'Draft Available',
              variant: 'available',
            },
            roomContentProps: null,
          })}
        />,
      );
    });

    expect(container.textContent).toContain('available');
    expect(container.textContent).toContain('Draft Available');
    expect(container.textContent).toContain('nudge');
    expect(container.querySelector('[data-testid="draft-room-header-panel"]')).toBeNull();

    const startButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('start draft'),
    );

    await act(async () => {
      startButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onStartDraft).toHaveBeenCalledTimes(1);
  });

  it('composes the draft-room panels and delegates route-owned actions', async () => {
    const onDraft = vi.fn();
    const onScout = vi.fn();
    const onSelect = vi.fn();
    const onToggleBoard = vi.fn();
    const onWatchDraft = vi.fn();
    const onBonusChange = vi.fn();
    const onSign = vi.fn();

    await act(async () => {
      root.render(
        <DraftPageContent
          {...buildProps({
            roomContentProps: {
              ...buildProps().roomContentProps!,
              currentPickPanelProps: {
                ...buildProps().roomContentProps!.currentPickPanelProps,
                onDraft,
                onScout,
                onToggleBoard,
              },
              prospectsPanelProps: {
                ...buildProps().roomContentProps!.prospectsPanelProps,
                onSelect,
              },
              roomHeaderPanelProps: {
                ...buildProps().roomContentProps!.roomHeaderPanelProps,
                onWatchDraft,
              },
              summaryPanelProps: {
                ...buildProps().roomContentProps!.summaryPanelProps,
                onBonusChange,
                onSign,
              },
            },
          })}
        />,
      );
    });

    expect(container.textContent).toContain('Draft In Progress');
    expect(container.textContent).toContain('Round 1 of 20 - Pick 1 of 600');
    expect(container.textContent).toContain('Draft system unavailable.');
    expect(container.querySelector('[data-testid="draft-prospects-panel"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="draft-current-pick-panel"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="draft-war-room-panel"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="draft-ticker"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="draft-board"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="draft-post-draft-grades-panel"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="draft-summary-panel"]')).toBeTruthy();
    expect(container.textContent).toContain('nudge');

    for (const label of ['watch draft', 'select prospect', 'make pick', 'scout look', 'toggle board', 'bonus', 'sign pick']) {
      const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
        candidate.textContent?.includes(label),
      );
      await act(async () => {
        button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }

    expect(onWatchDraft).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('prospect-1');
    expect(onDraft).toHaveBeenCalledTimes(1);
    expect(onScout).toHaveBeenCalledTimes(1);
    expect(onToggleBoard).toHaveBeenCalledTimes(1);
    expect(onBonusChange).toHaveBeenCalledWith('pick-1', '2.4');
    expect(onSign).toHaveBeenCalledWith('pick-1');
  });
});
