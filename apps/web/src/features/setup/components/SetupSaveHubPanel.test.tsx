import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaveData, SaveTreeEntry } from '@/shared/lib/saveSystem';
import SetupSaveHubPanel from './SetupSaveHubPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const rootSave = {
  id: 'save-slot-1',
  slotNumber: 1,
  name: 'Tycoons Year 4',
  season: 4,
  day: 88,
  phase: 'regular',
  schemaVersion: 34,
  hasSnapshot: true,
  snapshot: {
    schemaVersion: 34,
    season: 4,
    day: 88,
    phase: 'regular',
    userTeamId: 'nym',
    seasonState: {
      standings: [
        { teamId: 'nym', wins: 88, losses: 74 },
      ],
    },
    franchise: {
      teamName: 'New York Tycoons',
    },
    achievements: {
      unlocked: [
        { id: 'champion' },
        { id: 'rivalry' },
      ],
    },
  },
  legacyState: null,
  createdAt: '2026-04-02T00:00:00.000Z',
  updatedAt: '2026-04-02T12:00:00.000Z',
  parentSaveId: null,
  isRootSave: true,
  branchMeta: null,
} as unknown as SaveData;

const branchSave = {
  id: 'branch-1',
  slotNumber: null,
  name: 'Deadline branch',
  season: 4,
  day: 92,
  phase: 'regular',
  schemaVersion: 34,
  hasSnapshot: true,
  snapshot: {
    schemaVersion: 34,
    season: 4,
    day: 92,
    phase: 'regular',
  },
  legacyState: null,
  createdAt: '2026-04-02T12:00:00.000Z',
  updatedAt: '2026-04-02T12:30:00.000Z',
  parentSaveId: 'save-slot-1',
  isRootSave: false,
  branchMeta: {
    id: 'branch-1',
    saveId: 'branch-1',
    branchedAtSeason: 4,
    branchedAtDay: 62,
    description: 'Aggressive deadline push',
    createdAt: '2026-04-02T12:00:00.000Z',
  },
} as unknown as SaveData;

const saveTree = [
  {
    save: rootSave,
    branches: [branchSave],
  },
] as unknown as SaveTreeEntry[];

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(text),
  );
  expect(button, `Missing button containing "${text}"`).toBeTruthy();
  return button as HTMLButtonElement;
}

function expectMobileCriticalControls(container: HTMLElement, controlId: string, expectedCount: number): void {
  const controls = Array.from(container.querySelectorAll(`[data-mobile-critical-control="${controlId}"]`));

  expect(controls).toHaveLength(expectedCount);
  for (const control of controls) {
    expect(control.getAttribute('class')).toContain('mobile-critical-control');
    expect(control.getAttribute('class')).toContain('focus-ring');
  }
}

describe('SetupSaveHubPanel', () => {
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

  it('renders occupied, empty, and branch save states without route state', async () => {
    await act(async () => {
      root.render(
        <SetupSaveHubPanel
          saveTree={saveTree}
          selectedSlot={2}
          busySlot={null}
          branchLimit={3}
          onRefresh={vi.fn()}
          onUseSlot={vi.fn()}
          onContinueSave={vi.fn()}
          onDeleteSlot={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('Save Slots');
    expect(container.textContent).toContain('New York Tycoons');
    expect(container.textContent).toContain('Season 4 · 88-74');
    expect(container.textContent).toContain('Regular · Updated');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('1/3 branches');
    expect(container.textContent).toContain('Aggressive deadline push');
    expect(container.textContent).toContain('Empty Slot');
    expect(container.textContent).toContain('Reserved for a fresh dynasty build.');

    expectMobileCriticalControls(container, 'setup-save-refresh', 1);
    expectMobileCriticalControls(container, 'setup-save-continue', 1);
    expectMobileCriticalControls(container, 'setup-save-delete', 1);
    expectMobileCriticalControls(container, 'setup-save-use-slot', 5);
    expectMobileCriticalControls(container, 'setup-save-open-branch', 1);
  });

  it('delegates refresh, continue, delete, branch open, and slot selection actions', async () => {
    const onRefresh = vi.fn();
    const onUseSlot = vi.fn();
    const onContinueSave = vi.fn();
    const onDeleteSlot = vi.fn();

    await act(async () => {
      root.render(
        <SetupSaveHubPanel
          saveTree={saveTree}
          selectedSlot={2}
          busySlot={null}
          branchLimit={3}
          onRefresh={onRefresh}
          onUseSlot={onUseSlot}
          onContinueSave={onContinueSave}
          onDeleteSlot={onDeleteSlot}
        />,
      );
    });

    await act(async () => {
      buttonByText(container, 'Refresh').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      buttonByText(container, 'Continue').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      buttonByText(container, 'Delete').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      buttonByText(container, 'Open Branch').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      buttonByText(container, 'Use This Slot').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onContinueSave).toHaveBeenNthCalledWith(1, rootSave);
    expect(onDeleteSlot).toHaveBeenCalledWith(1);
    expect(onContinueSave).toHaveBeenNthCalledWith(2, branchSave);
    expect(onUseSlot).toHaveBeenCalledWith(2);
  });

  it('disables every tree-changing control while a save operation is busy', async () => {
    await act(async () => {
      root.render(
        <SetupSaveHubPanel
          saveTree={saveTree}
          selectedSlot={1}
          busySlot={1}
          branchLimit={3}
          onRefresh={vi.fn()}
          onUseSlot={vi.fn()}
          onContinueSave={vi.fn()}
          onDeleteSlot={vi.fn()}
        />,
      );
    });

    expect(buttonByText(container, 'Continue').disabled).toBe(true);
    expect(buttonByText(container, 'Delete').disabled).toBe(true);
    expect(buttonByText(container, 'Refresh').disabled).toBe(true);
    expect(buttonByText(container, 'Open Branch').disabled).toBe(true);
    expect(buttonByText(container, 'Use This Slot').disabled).toBe(true);
  });

  it('labels complete, partial, and unavailable local evidence separately from exact origin thresholds', async () => {
    const renderWithEvidence = async (storageEstimate: NonNullable<ComponentProps<typeof SetupSaveHubPanel>['storageEstimate']>, percentage: number) => {
      await act(async () => {
        root.render(
          <SetupSaveHubPanel
            saveTree={saveTree}
            selectedSlot={1}
            busySlot={null}
            branchLimit={3}
            storageEstimate={storageEstimate}
            originEstimate={{ status: 'available', usage: percentage, quota: 100, percentage, pressure: percentage >= 90 ? 'critical' : percentage >= 80 ? 'warning' : 'normal' }}
            onRefresh={vi.fn()}
            onUseSlot={vi.fn()}
            onContinueSave={vi.fn()}
            onDeleteSlot={vi.fn()}
          />,
        );
      });
    };
    const complete = {
      status: 'available' as const, allMbdBytes: 9000, allMbdBytesKnown: true, unattributedBytes: 0, message: null,
      trees: [{ rootSaveId: 'save-slot-1', slotNumber: 1, saveIds: ['save-slot-1', 'branch-1'], primaryBytes: 2000, shadowBytes: 3000, leaderboardBytes: 4000, totalBytes: 9000, attribution: 'complete' as const }],
    };
    await renderWithEvidence(complete, 80);
    expect(container.textContent).toContain('All-MBD raw records: 9.0 KB.');
    expect(container.textContent).toContain('2.0 KB primary + 3.0 KB shadow + 4.0 KB leaderboard');
    expect(container.textContent).toContain('80.00% (80% to under 90% warning)');

    await renderWithEvidence({ ...complete, status: 'partial', allMbdBytes: 5000, allMbdBytesKnown: false, trees: [] }, 90);
    expect(container.textContent).toContain('5.0 KB known lower bound');
    expect(container.textContent).toContain('Protected-tree estimate is partial or unattributable');
    expect(container.textContent).toContain('90.00% (90% or more critical)');

    await renderWithEvidence({ ...complete, status: 'unavailable', allMbdBytes: null, allMbdBytesKnown: false, trees: [] }, 79.99);
    expect(container.textContent).toContain('All-MBD raw-record estimate is unavailable.');
    expect(container.textContent).toContain('Protected-tree estimate unavailable.');
    expect(container.textContent).toContain('79.99% (below 80% normal)');
  });

  it.each([
    [79.99, 'normal', '79.99% (below 80% normal)'],
    [80, 'warning', '80.00% (80% to under 90% warning)'],
    [89.99, 'warning', '89.99% (80% to under 90% warning)'],
    [90, 'critical', '90.00% (90% or more critical)'],
  ] as const)('renders the %s origin boundary without contradictory rounding', async (percentage, pressure, copy) => {
    await act(async () => {
      root.render(
        <SetupSaveHubPanel
          saveTree={saveTree}
          selectedSlot={1}
          busySlot={null}
          branchLimit={3}
          originEstimate={{ status: 'available', usage: percentage, quota: 100, percentage, pressure }}
          onRefresh={vi.fn()}
          onUseSlot={vi.fn()}
          onContinueSave={vi.fn()}
          onDeleteSlot={vi.fn()}
        />,
      );
    });
    expect(container.textContent).toContain(copy);
  });
});
