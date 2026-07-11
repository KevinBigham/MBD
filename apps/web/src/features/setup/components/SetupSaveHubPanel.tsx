import { Play, Shield, Trash2, Trophy } from 'lucide-react';
import { humanizeLabel } from '@/shared/lib/labels';
import { SAVE_SLOTS, type SaveData, type SaveTreeEntry } from '@/shared/lib/saveSystem';

export interface SetupSaveHubPanelProps {
  saveTree: SaveTreeEntry[];
  selectedSlot: number;
  busySlot: number | null;
  branchLimit: number;
  onRefresh: () => void;
  onUseSlot: (slot: number) => void;
  onContinueSave: (save: SaveData) => void;
  onDeleteSlot: (slot: number) => void;
}

function snapshotRecord(save: SaveData): string | null {
  const standings = (save.snapshot as { seasonState?: { standings?: Array<{ teamId?: string; wins?: number; losses?: number }> } } | null)?.seasonState?.standings ?? [];
  const teamId = (save.snapshot as { userTeamId?: string } | null)?.userTeamId;
  const record = standings.find((entry) => entry.teamId === teamId);
  return record ? `${record.wins ?? 0}-${record.losses ?? 0}` : null;
}

function saveTeamName(save: SaveData): string {
  return (save.snapshot as { franchise?: { teamName?: string } } | null)?.franchise?.teamName ?? save.name;
}

function saveAchievementCount(save: SaveData): number {
  return (save.snapshot as { achievements?: { unlocked?: unknown[] } } | null)?.achievements?.unlocked?.length ?? 0;
}

export default function SetupSaveHubPanel({
  saveTree,
  selectedSlot,
  busySlot,
  branchLimit,
  onRefresh,
  onUseSlot,
  onContinueSave,
  onDeleteSlot,
}: SetupSaveHubPanelProps) {
  const saveMap = new Map(saveTree.map((entry) => [entry.save.slotNumber, entry]));
  const operationBusy = busySlot != null;

  return (
    <section className="rounded-2xl border border-dynasty-border bg-dynasty-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dynasty-textBright">Save Slots</h2>
          <p className="mt-1 font-heading text-sm text-dynasty-muted">
            Five dynasty slots. Continue, replace, or clear them from one hub.
          </p>
        </div>
        <button
          type="button"
          disabled={operationBusy}
          data-mobile-critical-control="setup-save-refresh"
          onClick={onRefresh}
          className="mobile-critical-control focus-ring rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {SAVE_SLOTS.map((slot) => {
          const entry = saveMap.get(slot) ?? null;
          const save = entry?.save ?? null;
          const selected = slot === selectedSlot;
          return (
            <div
              key={slot}
              className={`rounded-xl border p-4 transition-colors ${
                selected ? 'border-accent-primary bg-accent-primary/5' : 'border-dynasty-border bg-dynasty-base/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Slot {slot}</div>
                  <div className="mt-2 font-heading text-base text-dynasty-textBright">
                    {save ? saveTeamName(save) : 'Empty Slot'}
                  </div>
                </div>
                {save ? (
                  <div className="inline-flex items-center gap-2 rounded border border-accent-warning/30 bg-accent-warning/10 px-2 py-1 font-data text-[11px] text-accent-warning">
                    <Trophy className="h-3.5 w-3.5" />
                    {saveAchievementCount(save)}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 space-y-1 font-heading text-sm text-dynasty-muted">
                {save ? (
                  <>
                    <div>Season {save.season} · {snapshotRecord(save) ?? `${save.day} days logged`}</div>
                    <div>{humanizeLabel(save.phase)} · Updated {new Date(save.updatedAt).toLocaleString()}</div>
                  </>
                ) : (
                  <div>Reserved for a fresh dynasty build.</div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {save ? (
                  <>
                    <button
                      type="button"
                      disabled={operationBusy}
                      data-mobile-critical-control="setup-save-continue"
                      onClick={() => onContinueSave(save)}
                      className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:opacity-50"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Continue
                    </button>
                    <button
                      type="button"
                      disabled={operationBusy}
                      data-mobile-critical-control="setup-save-delete"
                      onClick={() => onDeleteSlot(slot)}
                      className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded border border-accent-danger/40 px-3 py-2 font-heading text-xs uppercase tracking-wide text-accent-danger hover:bg-accent-danger/10 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  disabled={operationBusy}
                  data-mobile-critical-control="setup-save-use-slot"
                  onClick={() => onUseSlot(slot)}
                  className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Shield className="h-3.5 w-3.5" />
                  {save ? 'Replace' : 'Use This Slot'}
                </button>
              </div>

              {entry ? (
                <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">What-If Branches</div>
                    <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
                      {entry.branches.length}/{branchLimit} branches
                    </div>
                  </div>

                  {entry.branches.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {entry.branches.map((branch) => (
                        <div
                          key={branch.id}
                          className="rounded border border-dynasty-border/70 bg-dynasty-base/40 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-heading text-sm text-dynasty-textBright">
                                {branch.branchMeta?.description ?? branch.name}
                              </div>
                              <div className="mt-1 font-heading text-[11px] text-dynasty-muted">
                                Season {branch.season} · {humanizeLabel(branch.phase)} · Updated {new Date(branch.updatedAt).toLocaleString()}
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={operationBusy}
                              data-mobile-critical-control="setup-save-open-branch"
                              onClick={() => onContinueSave(branch)}
                              className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-[11px] uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Play className="h-3 w-3" />
                              Open Branch
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 font-heading text-xs text-dynasty-muted">
                      No active what-if branches for this dynasty slot.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
