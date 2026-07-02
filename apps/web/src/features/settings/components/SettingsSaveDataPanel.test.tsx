import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaveData } from '@/shared/lib/saveSystem';
import { SettingsSaveDataPanel } from './SettingsSaveDataPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const baseSave: SaveData = {
  id: 'save-slot-1',
  slotNumber: 1,
  name: 'Healthy Save',
  season: 4,
  day: 91,
  phase: 'regular',
  schemaVersion: 34,
  hasSnapshot: true,
  snapshot: null,
  legacyState: null,
  parentSaveId: null,
  isRootSave: true,
  branchMeta: null,
  createdAt: '2026-04-02T00:00:00.000Z',
  updatedAt: '2026-04-02T12:00:00.000Z',
};

const branchSave: SaveData = {
  ...baseSave,
  id: 'branch-1',
  slotNumber: null,
  name: 'Branch Save',
  parentSaveId: 'save-slot-1',
  isRootSave: false,
  branchMeta: {
    id: 'branch-1',
    saveId: 'branch-1',
    branchedAtSeason: 4,
    branchedAtDay: 91,
    description: 'Aggressive deadline push',
    createdAt: '2026-04-03T00:00:00.000Z',
  },
};

function defaultProps() {
  return {
    activeRootSaveId: 'save-slot-1',
    activeSaveId: 'save-slot-1',
    branchBusy: false,
    branchDescription: 'Sell the farm',
    branches: [branchSave],
    busySlot: null,
    installed: false,
    saveSlots: [1, 2],
    saves: [
      baseSave,
      {
        ...baseSave,
        id: 'save-slot-2',
        slotNumber: 2,
        name: 'Legacy Save',
        hasSnapshot: false,
      },
    ],
    whatIfBranchLimit: 3,
    workerReady: true,
    onBranchDescriptionChange: vi.fn(),
    onClearAllSaves: vi.fn(),
    onCreateBranch: vi.fn(),
    onDeleteBranch: vi.fn(),
    onDeleteSlot: vi.fn(),
    onExportCurrent: vi.fn(),
    onImportFile: vi.fn(),
    onInstallApp: vi.fn(),
    onLoadSlot: vi.fn(),
    onRefreshSaves: vi.fn(),
    onSaveSlot: vi.fn(),
  };
}

describe('SettingsSaveDataPanel', () => {
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

  it('renders branch management, save slots, and delegates save actions', async () => {
    const props = defaultProps();

    await act(async () => {
      root.render(<SettingsSaveDataPanel {...props} />);
    });

    expect(container.textContent).toContain('What-If Branching');
    expect(container.textContent).toContain('1/3 branches');
    expect(container.textContent).toContain('Aggressive deadline push');
    expect(container.textContent).toContain('Healthy Save');
    expect(container.textContent).toContain('Legacy metadata only. Resume unavailable until resaved as a snapshot.');

    const expectMobileCriticalControl = (controlId: string, expectedCount: number) => {
      const controls = Array.from(
        container.querySelectorAll(`[data-mobile-critical-control="${controlId}"]`),
      );

      expect(controls).toHaveLength(expectedCount);
      for (const control of controls) {
        expect(control.className).toContain('mobile-critical-control');
        expect(control.className).toContain('focus-ring');
      }
    };

    expectMobileCriticalControl('settings-save-refresh', 1);
    expectMobileCriticalControl('settings-save-export', 1);
    expectMobileCriticalControl('settings-save-import', 1);
    expectMobileCriticalControl('settings-save-clear', 1);
    expectMobileCriticalControl('settings-branch-description', 1);
    expectMobileCriticalControl('settings-branch-create', 1);
    expectMobileCriticalControl('settings-branch-delete', 1);
    expectMobileCriticalControl('settings-slot-save', 2);
    expectMobileCriticalControl('settings-slot-load', 2);
    expectMobileCriticalControl('settings-slot-delete', 2);

    const findButton = (label: string) => Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(label),
    );
    const findButtonByLabel = (label: string) =>
      container.querySelector(`button[aria-label="${label}"]`);

    await act(async () => {
      findButton('Refresh')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButton('Export Current Save')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButton('Clear All Saves')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButton('Install App')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButton('Create Branch')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButton('Delete Branch')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButtonByLabel('Save current dynasty to slot 1')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButtonByLabel('Load save slot 1')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButtonByLabel('Delete save slot 1')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onRefreshSaves).toHaveBeenCalledTimes(1);
    expect(props.onExportCurrent).toHaveBeenCalledTimes(1);
    expect(props.onClearAllSaves).toHaveBeenCalledTimes(1);
    expect(props.onInstallApp).toHaveBeenCalledTimes(1);
    expect(props.onCreateBranch).toHaveBeenCalledTimes(1);
    expect(props.onDeleteBranch).toHaveBeenCalledWith('branch-1');
    expect(props.onSaveSlot).toHaveBeenCalledWith(1);
    expect(props.onLoadSlot).toHaveBeenCalledWith(1);
    expect(props.onDeleteSlot).toHaveBeenCalledWith(1);
  });

  it('shows root-save guidance instead of branch controls when no root timeline is active', async () => {
    await act(async () => {
      root.render(
        <SettingsSaveDataPanel
          {...defaultProps()}
          activeRootSaveId={null}
          activeSaveId={null}
          branches={[]}
          branchDescription=""
        />,
      );
    });

    expect(container.textContent).toContain('Load a root dynasty save to create or manage what-if branches.');
    expect(container.textContent).not.toContain('Create Branch');
  });
});
