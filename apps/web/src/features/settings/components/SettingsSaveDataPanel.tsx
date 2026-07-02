import { useRef } from 'react';
import { Download, Monitor, Save, Trash2, Upload } from 'lucide-react';
import { humanizeLabel } from '@/shared/lib/labels';
import type { SaveData } from '@/shared/lib/saveSystem';

export interface SettingsSaveDataPanelProps {
  activeRootSaveId: string | null;
  activeSaveId: string | null | undefined;
  branchBusy: boolean;
  branchDescription: string;
  branches: SaveData[];
  busySlot: number | null;
  installed: boolean;
  saveSlots: readonly number[];
  saves: SaveData[];
  whatIfBranchLimit: number;
  workerReady: boolean;
  onBranchDescriptionChange: (description: string) => void;
  onClearAllSaves: () => void | Promise<void>;
  onCreateBranch: () => void | Promise<void>;
  onDeleteBranch: (branchSaveId: string) => void | Promise<void>;
  onDeleteSlot: (slot: number) => void | Promise<void>;
  onExportCurrent: () => void | Promise<void>;
  onImportFile: (file: File | null) => void | Promise<void>;
  onInstallApp: () => void | Promise<void>;
  onLoadSlot: (slot: number) => void | Promise<boolean | void>;
  onRefreshSaves: () => void | Promise<void>;
  onSaveSlot: (slot: number) => void | Promise<void>;
}

export function SettingsSaveDataPanel({
  activeRootSaveId,
  activeSaveId,
  branchBusy,
  branchDescription,
  branches,
  busySlot,
  installed,
  saveSlots,
  saves,
  whatIfBranchLimit,
  workerReady,
  onBranchDescriptionChange,
  onClearAllSaves,
  onCreateBranch,
  onDeleteBranch,
  onDeleteSlot,
  onExportCurrent,
  onImportFile,
  onInstallApp,
  onLoadSlot,
  onRefreshSaves,
  onSaveSlot,
}: SettingsSaveDataPanelProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const saveMap = new Map(saves.map((save) => [save.slotNumber, save]));
  const branchLimitReached = branches.length >= whatIfBranchLimit;
  const rootSaveActive = Boolean(activeRootSaveId && activeSaveId === activeRootSaveId);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-label="Refresh save slot list"
          data-mobile-critical-control="settings-save-refresh"
          onClick={() => void onRefreshSaves()}
          className="mobile-critical-control focus-ring rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated"
        >
          Refresh
        </button>
        <button
          type="button"
          aria-label="Export the current dynasty as a JSON save file"
          data-mobile-critical-control="settings-save-export"
          onClick={() => void onExportCurrent()}
          className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated"
        >
          <Download className="h-3.5 w-3.5" />
          Export Current Save
        </button>
        <button
          type="button"
          aria-label="Import a dynasty save file"
          data-mobile-critical-control="settings-save-import"
          onClick={() => importInputRef.current?.click()}
          className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated"
        >
          <Upload className="h-3.5 w-3.5" />
          Import Save
        </button>
        <button
          type="button"
          aria-label="Clear all local save slots"
          data-mobile-critical-control="settings-save-clear"
          onClick={() => void onClearAllSaves()}
          className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded border border-accent-danger/40 px-3 py-2 font-heading text-xs uppercase tracking-wide text-accent-danger hover:bg-accent-danger/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear All Saves
        </button>
        <button
          type="button"
          aria-label={installed ? 'App already installed' : 'Install the Mr. Baseball Dynasty app'}
          onClick={() => void onInstallApp()}
          className="inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated"
        >
          <Monitor className="h-3.5 w-3.5" />
          {installed ? 'Installed' : 'Install App'}
        </button>
      </div>
      <input
        ref={importInputRef}
        className="sr-only"
        onChange={(event) => {
          const input = event.currentTarget;
          void Promise.resolve(onImportFile(input.files?.[0] ?? null)).finally(() => {
            input.value = '';
          });
        }}
        type="file"
        accept="application/json"
      />

      <div className="mt-6 rounded-lg border border-dynasty-border/70 bg-dynasty-base/30 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="font-heading text-sm font-semibold text-dynasty-textBright">
              What-If Branching
            </h3>
            <p className="mt-1 font-heading text-xs text-dynasty-muted">
              Branch the active root save before aggressive deadline moves or long sim experiments.
            </p>
          </div>
          <div className="font-data text-xs uppercase tracking-[0.18em] text-dynasty-muted">
            {branches.length}/{whatIfBranchLimit} branches
          </div>
        </div>

        {rootSaveActive ? (
          <>
            <div className="mt-4 flex flex-col gap-3 lg:flex-row">
              <input
                value={branchDescription}
                data-mobile-critical-control="settings-branch-description"
                onChange={(event) => onBranchDescriptionChange(event.target.value)}
                placeholder="Aggressive deadline push"
                className="mobile-critical-control focus-ring w-full rounded border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
              />
              <button
                type="button"
                disabled={branchBusy || branchLimitReached || branchDescription.trim().length === 0}
                data-mobile-critical-control="settings-branch-create"
                onClick={() => void onCreateBranch()}
                className="mobile-critical-control focus-ring rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create Branch
              </button>
            </div>
            {branchLimitReached ? (
              <div className="mt-3 font-heading text-xs text-accent-warning">
                This root save is already at the {whatIfBranchLimit}-branch limit.
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {branches.length > 0 ? branches.map((branch) => (
                <div
                  key={branch.id}
                  className="flex flex-col gap-3 rounded border border-dynasty-border/70 bg-dynasty-surface/70 p-3 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <div className="font-heading text-sm text-dynasty-textBright">
                      {branch.branchMeta?.description ?? branch.name}
                    </div>
                    <div className="mt-1 font-data text-xs text-dynasty-muted">
                      S{branch.season} D{branch.day} | {humanizeLabel(branch.phase)} | Updated {new Date(branch.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={branchBusy}
                    data-mobile-critical-control="settings-branch-delete"
                    onClick={() => void onDeleteBranch(branch.id)}
                    className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded border border-accent-danger/40 px-3 py-2 font-heading text-xs uppercase tracking-wide text-accent-danger hover:bg-accent-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Branch
                  </button>
                </div>
              )) : (
                <div className="font-heading text-xs text-dynasty-muted">
                  No what-if branches exist for the active root save.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-4 font-heading text-xs text-dynasty-muted">
            Load a root dynasty save to create or manage what-if branches. Branch saves can be reviewed in History, but new branches only fork from the root timeline.
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {saveSlots.map((slot) => {
          const save = saveMap.get(slot);
          const disabled = busySlot === slot;
          return (
            <div
              key={slot}
              className="flex flex-col gap-3 rounded-lg border border-dynasty-border/70 bg-dynasty-base/30 p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <div className="font-heading text-sm font-semibold text-dynasty-textBright">
                  Slot {slot}
                </div>
                {save ? (
                  <div className="mt-1 space-y-1">
                    <div className="font-heading text-sm text-dynasty-text">
                      {save.name}
                    </div>
                    <div className="font-data text-xs text-dynasty-muted">
                      S{save.season} D{save.day} | {humanizeLabel(save.phase)} | Updated {new Date(save.updatedAt).toLocaleString()}
                    </div>
                    {!save.hasSnapshot && (
                      <div className="font-heading text-xs text-accent-warning">
                        Legacy metadata only. Resume unavailable until resaved as a snapshot.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 font-heading text-sm text-dynasty-muted">
                    Empty slot
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={disabled || !workerReady}
                  aria-label={`Save current dynasty to slot ${slot}`}
                  data-mobile-critical-control="settings-slot-save"
                  onClick={() => void onSaveSlot(slot)}
                  className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save
                </button>
                <button
                  type="button"
                  disabled={disabled || !save || !workerReady}
                  aria-label={`Load save slot ${slot}`}
                  data-mobile-critical-control="settings-slot-load"
                  onClick={() => void onLoadSlot(slot)}
                  className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Load
                </button>
                <button
                  type="button"
                  disabled={disabled || !save}
                  aria-label={`Delete save slot ${slot}`}
                  data-mobile-critical-control="settings-slot-delete"
                  onClick={() => void onDeleteSlot(slot)}
                  className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded border border-accent-danger/40 px-3 py-2 font-heading text-xs uppercase tracking-wide text-accent-danger hover:bg-accent-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
