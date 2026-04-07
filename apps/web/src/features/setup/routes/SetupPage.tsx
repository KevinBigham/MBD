import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, PlusCircle, Shield, Trash2, Trophy } from 'lucide-react';
import { PageShell } from '@/shared/components/PageShell';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { logger } from '@/shared/lib/logger';
import { SaveRecoveryDialog } from '@/shared/components/SaveRecoveryDialog';
import {
  SAVE_SLOTS,
  deleteSave,
  inspectSaveById,
  listSaveTree,
  loadGameSafe,
  repairSave,
  saveGame,
  type SaveData,
  type SaveInspectionResult,
  type SaveTreeEntry,
} from '@/shared/lib/saveSystem';

type SetupDifficulty = 'easy' | 'standard' | 'hard';
type SetupPlayMode = 'standard' | 'career';
type SetupWizardMode = 'dynasty' | 'scenario';

interface SetupPreview {
  teamId: string;
  teamName: string;
  division: string;
  payrollTier: string;
  farmSystemRating: string;
  teamIdentityBlurb: string;
  projectedRecord: string;
  topPlayers: Array<{
    playerId: string;
    name: string;
    position: string;
    overall: number;
  }>;
  divisionRivals: Array<{
    teamId: string;
    teamName: string;
  }>;
}

interface ScenarioCatalogEntry {
  id: string;
  name: string;
  description: string;
  difficulty: 'rookie' | 'standard' | 'hard' | 'legendary';
  maxSeasons: number;
  requiresCareerMode: boolean;
  startingTeamId?: string;
}

const TEAM_OPTIONS = [
  { id: 'phx', label: 'Phoenix Dust Devils' },
  { id: 'atl', label: 'Atlanta Peach Kings' },
  { id: 'bal', label: 'Baltimore Crab Cakes' },
  { id: 'bos', label: 'Boston Noreasters' },
  { id: 'chi', label: 'Chicago Deep Dish' },
  { id: 'col', label: 'Columbus Buckeyes' },
  { id: 'nas', label: 'Nashville Honky Tonks' },
  { id: 'cle', label: 'Cleveland Forge' },
  { id: 'col', label: 'Denver Altitude' },
  { id: 'det', label: 'Detroit Motor Kings' },
  { id: 'hou', label: 'Houston Space Cowboys' },
  { id: 'kc', label: 'Kansas City BBQ Fountains' },
  { id: 'dal', label: 'Dallas Lone Stars' },
  { id: 'lax', label: 'Los Angeles Sunset Strip' },
  { id: 'mia', label: 'Miami Hurricanes' },
  { id: 'mil', label: 'Milwaukee Suds' },
  { id: 'min', label: 'Minneapolis Frost Giants' },
  { id: 'ral', label: 'Raleigh Pines' },
  { id: 'nym', label: 'New York Tycoons' },
  { id: 'nym', label: 'New York Tycoons' },
  { id: 'por', label: 'Portland Sasquatch' },
  { id: 'phi', label: 'Philadelphia Liberty Bells' },
  { id: 'pit', label: 'Pittsburgh Smokestack' },
  { id: 'por', label: 'Portland Sasquatch' },
  { id: 'sdg', label: 'San Diego Surf Hounds' },
  { id: 'sea', label: 'Seattle Drizzle' },
  { id: 'sfb', label: 'San Francisco Fog Horns' },
  { id: 'stl', label: 'St. Louis Archers' },
  { id: 'orl', label: 'Orlando Thunder' },
  { id: 'sat', label: 'San Antonio Riverwalk' },
  { id: 'cha', label: 'Charlotte Hornets' },
  { id: 'wsh', label: 'Washington Monuments' },
] as const;

const GM_FIRST_NAMES = ['Alex', 'Jordan', 'Jamie', 'Taylor', 'Morgan', 'Casey'] as const;
const GM_LAST_NAMES = ['Rivera', 'Porter', 'Sullivan', 'Hughes', 'Bennett', 'Foster'] as const;
const WHAT_IF_BRANCH_LIMIT = 3;

function generateDefaultGMName(seed: number): string {
  const first = GM_FIRST_NAMES[Math.abs(seed) % GM_FIRST_NAMES.length] ?? 'Alex';
  const last = GM_LAST_NAMES[Math.abs(Math.floor(seed / GM_FIRST_NAMES.length)) % GM_LAST_NAMES.length] ?? 'Rivera';
  return `${first} ${last}`;
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

export default function SetupPage() {
  const navigate = useNavigate();
  const worker = useWorker();
  const { isInitialized, initializeGame } = useGameStore();
  const [saveTree, setSaveTree] = useState<SaveTreeEntry[]>([]);
  const [status, setStatus] = useState('');
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number>(2);
  const [seed, setSeed] = useState<number>(() => Date.now());
  const [teamId, setTeamId] = useState<string>('nym');
  const [difficulty, setDifficulty] = useState<SetupDifficulty>('standard');
  const [playMode, setPlayMode] = useState<SetupPlayMode>('standard');
  const [wizardMode, setWizardMode] = useState<SetupWizardMode>('dynasty');
  const [gmName, setGmName] = useState<string>(() => generateDefaultGMName(Date.now()));
  const [preview, setPreview] = useState<SetupPreview | null>(null);
  const [scenarioCatalog, setScenarioCatalog] = useState<ScenarioCatalogEntry[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [recoveryState, setRecoveryState] = useState<{
    slot: number;
    message: string;
  } | null>(null);
  const selectedScenario = scenarioCatalog.find((entry) => entry.id === selectedScenarioId) ?? null;

  const refreshSaves = useCallback(async () => {
    const nextSaveTree = await listSaveTree();
    setSaveTree(nextSaveTree);
    const taken = new Set(nextSaveTree.map((entry) => entry.save.slotNumber));
    const firstEmpty = SAVE_SLOTS.find((slot) => !taken.has(slot)) ?? SAVE_SLOTS[0];
    setSelectedSlot(firstEmpty);
  }, []);

  useEffect(() => {
    void refreshSaves();
  }, [refreshSaves]);

  useEffect(() => {
    if (!wizardOpen || !worker.isReady || typeof worker.getScenarioCatalog !== 'function') {
      return;
    }

    const previewTeamId = wizardMode === 'scenario'
      ? (selectedScenario?.startingTeamId ?? teamId)
      : teamId;

    void worker.getSetupPreview({
      seed,
      userTeamId: previewTeamId,
      difficulty,
    }).then((nextPreview) => {
      setPreview((nextPreview ?? null) as SetupPreview | null);
    }).catch((error) => {
      logger.error('Failed to build dynasty preview:', error);
      setStatus('Failed to build the dynasty preview.');
    });
  }, [difficulty, seed, selectedScenario?.startingTeamId, teamId, worker, wizardMode, wizardOpen]);

  useEffect(() => {
    if (!wizardOpen || !worker.isReady) {
      return;
    }

    void worker.getScenarioCatalog().then((catalog) => {
      const nextCatalog = (catalog ?? []) as ScenarioCatalogEntry[];
      setScenarioCatalog(nextCatalog);
      if (!selectedScenarioId && nextCatalog.length > 0) {
        setSelectedScenarioId(nextCatalog[0]!.id);
      }
    }).catch((error) => {
      logger.error('Failed to load scenario catalog:', error);
    });
  }, [selectedScenarioId, worker, wizardOpen]);

  const saveMap = useMemo(
    () => new Map(saveTree.map((entry) => [entry.save.slotNumber, entry])),
    [saveTree],
  );

  async function handleContinueSave(save: SaveData) {
    if (!worker.isReady) {
      return;
    }
    setBusySlot(save.slotNumber);
    setStatus('');
    try {
      const result = save.isRootSave && save.slotNumber != null
        ? await loadGameSafe(save.slotNumber)
        : await inspectSaveById(save.id);
      if (result.status !== 'ok') {
        if (save.slotNumber != null) {
          setRecoveryState({
            slot: save.slotNumber,
            message: result.status === 'empty'
              ? `Slot ${save.slotNumber} is empty.`
              : result.message,
          });
        } else {
          setStatus(`Unable to load branch "${save.name}".`);
        }
        return;
      }

      await continueFromInspection(result);
    } catch (error) {
      logger.error('Failed to continue save:', error);
      setStatus(save.slotNumber != null ? `Failed to load slot ${save.slotNumber}.` : `Failed to load branch "${save.name}".`);
    } finally {
      setBusySlot(null);
    }
  }

  async function handleDelete(slot: number) {
    setBusySlot(slot);
    setStatus('');
    try {
      await deleteSave(slot);
      setRecoveryState((current) => (current?.slot === slot ? null : current));
      await refreshSaves();
    } catch (error) {
      logger.error('Failed to delete save:', error);
      setStatus(`Failed to delete slot ${slot}.`);
    } finally {
      setBusySlot(null);
    }
  }

  async function continueFromInspection(result: Extract<SaveInspectionResult, { status: 'ok' }>) {
    const imported = await worker.importSnapshot(result.save.snapshot);
    initializeGame({
      season: imported.season,
      day: imported.day,
      phase: imported.phase,
      playerCount: imported.playerCount,
      userTeamId: imported.userTeamId,
      teamName: imported.teamName,
      gmName: imported.gmName,
      difficulty: imported.difficulty,
      activeSaveId: result.save.id,
      activeSaveSlot: result.save.slotNumber,
    });
    navigate('/dashboard');
  }

  async function handleRepair(slot: number) {
    setBusySlot(slot);
    setStatus('');
    try {
      const repaired = await repairSave(slot);
      if (repaired.status !== 'ok') {
        setStatus(`Unable to repair slot ${slot}.`);
        return;
      }

      setRecoveryState(null);
      await refreshSaves();
      await continueFromInspection(repaired);
    } catch (error) {
      logger.error('Failed to repair save:', error);
      setStatus(`Failed to repair slot ${slot}.`);
    } finally {
      setBusySlot(null);
    }
  }

  async function handleStartFresh(slot: number) {
    await handleDelete(slot);
    setRecoveryState(null);
    setSelectedSlot(slot);
    openWizard();
  }

  function openWizard() {
    const nextSeed = Date.now();
    setSeed(nextSeed);
    setGmName(generateDefaultGMName(nextSeed));
    setPlayMode('standard');
    setWizardMode('dynasty');
    setWizardOpen(true);
    setStatus('');
  }

  async function handleBeginDynasty() {
    if (!worker.isReady) {
      return;
    }

    const finalGmName = gmName.trim() || generateDefaultGMName(seed);
    setBusySlot(selectedSlot);
    setStatus('');
    try {
      const result = await worker.newGame({
        seed,
        userTeamId: wizardMode === 'scenario'
          ? (selectedScenario?.startingTeamId ?? teamId)
          : teamId,
        gmName: finalGmName,
        difficulty,
        saveSlot: selectedSlot,
        playMode: wizardMode === 'scenario'
          ? (selectedScenario?.requiresCareerMode ? 'career' : 'standard')
          : playMode,
        scenarioId: wizardMode === 'scenario' ? (selectedScenarioId ?? undefined) : undefined,
      });
      const snapshot = await worker.exportSnapshot();
      await saveGame(selectedSlot, `${finalGmName} • ${result.teamName}`, snapshot);
      initializeGame({
        season: result.season,
        day: result.day,
        phase: result.phase,
        playerCount: result.playerCount,
        userTeamId: result.userTeamId,
        teamName: result.teamName,
        gmName: result.gmName,
        difficulty: result.difficulty,
        activeSaveId: `save-slot-${selectedSlot}`,
        activeSaveSlot: selectedSlot,
      });
      navigate('/dashboard');
    } catch (error) {
      logger.error('Failed to create dynasty:', error);
      setStatus('Failed to create the new dynasty.');
    } finally {
      setBusySlot(null);
    }
  }

  return (
    <PageShell>
      <div className="min-h-screen bg-dynasty-base px-6 py-8 text-dynasty-text">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-2xl border border-dynasty-border bg-dynasty-surface p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent-info">Front Door</div>
              <h1 className="mt-3 font-brand text-5xl text-dynasty-textBright">Welcome to Mr. Baseball Dynasty</h1>
              <p className="mt-4 max-w-3xl font-heading text-sm leading-6 text-dynasty-muted">
                Build a franchise across decades. Draft, trade, develop, spend, and leave a legacy that survives every save slot.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {isInitialized ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-md border border-dynasty-border px-4 py-2 font-heading text-sm text-dynasty-text hover:bg-dynasty-elevated"
                >
                  <Play className="h-4 w-4" />
                  Return to Dashboard
                </Link>
              ) : null}
              <button
                type="button"
                onClick={openWizard}
                className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover"
              >
                <PlusCircle className="h-4 w-4" />
                New Dynasty
              </button>
            </div>
          </div>
      {status ? (
        <div className="mt-4 rounded-lg border border-accent-warning/40 bg-accent-warning/10 px-4 py-3 font-heading text-sm text-accent-warning">
          {status}
        </div>
      ) : null}
        </section>

        {recoveryState ? (
          <SaveRecoveryDialog
            slot={recoveryState.slot}
            message={recoveryState.message}
            busy={busySlot === recoveryState.slot}
            onRepair={() => void handleRepair(recoveryState.slot)}
            onStartFresh={() => void handleStartFresh(recoveryState.slot)}
            onDelete={() => void handleDelete(recoveryState.slot)}
            onClose={() => setRecoveryState(null)}
          />
        ) : null}

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
              onClick={() => void refreshSaves()}
              className="rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated"
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
                        <div>{save.phase.toUpperCase()} · Updated {new Date(save.updatedAt).toLocaleString()}</div>
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
                          disabled={busySlot === slot}
                          onClick={() => void handleContinueSave(save)}
                          className="inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:opacity-50"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Continue
                        </button>
                        <button
                          type="button"
                          disabled={busySlot === slot}
                          onClick={() => void handleDelete(slot)}
                          className="inline-flex items-center gap-2 rounded border border-accent-danger/40 px-3 py-2 font-heading text-xs uppercase tracking-wide text-accent-danger hover:bg-accent-danger/10 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSlot(slot);
                        openWizard();
                      }}
                      className="inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated"
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
                          {entry.branches.length}/{WHAT_IF_BRANCH_LIMIT} branches
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
                                    Season {branch.season} · {branch.phase.toUpperCase()} · Updated {new Date(branch.updatedAt).toLocaleString()}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void handleContinueSave(branch)}
                                  className="inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-[11px] uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated"
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

        {wizardOpen ? (
          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-2xl border border-dynasty-border bg-dynasty-surface p-6">
              <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent-success">New Dynasty</div>
              <h2 className="mt-3 font-brand text-3xl text-dynasty-textBright">Start in Slot {selectedSlot}</h2>
              <p className="mt-2 font-heading text-sm text-dynasty-muted">
                Pick a club, choose whether this save ends on firing or continues as a career, and enter the league with a GM identity that follows your legacy.
              </p>

              <div className="mt-6 space-y-5">
                <div>
                  <span className="font-heading text-sm text-dynasty-textBright">Start Type</span>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setWizardMode('dynasty')}
                      className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                        wizardMode === 'dynasty'
                          ? 'border-accent-primary bg-accent-primary/10'
                          : 'border-dynasty-border bg-dynasty-base hover:bg-dynasty-elevated'
                      }`}
                    >
                      <div className="font-heading text-sm text-dynasty-textBright">Open Dynasty</div>
                      <div className="mt-1 font-heading text-xs text-dynasty-muted">
                        Standard team selection with standard or career play modes.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizardMode('scenario')}
                      className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                        wizardMode === 'scenario'
                          ? 'border-accent-primary bg-accent-primary/10'
                          : 'border-dynasty-border bg-dynasty-base hover:bg-dynasty-elevated'
                      }`}
                    >
                      <div className="font-heading text-sm text-dynasty-textBright">Challenge Scenario</div>
                      <div className="mt-1 font-heading text-xs text-dynasty-muted">
                        Fixed-club starts with explicit win conditions and local leaderboard tracking.
                      </div>
                    </button>
                  </div>
                </div>

                {wizardMode === 'scenario' ? (
                  <div>
                    <span className="font-heading text-sm text-dynasty-textBright">Scenario</span>
                    <div className="mt-2 space-y-2">
                      {scenarioCatalog.map((scenario) => (
                        <button
                          key={scenario.id}
                          type="button"
                          onClick={() => setSelectedScenarioId(scenario.id)}
                          className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                            selectedScenarioId === scenario.id
                              ? 'border-accent-warning bg-accent-warning/10'
                              : 'border-dynasty-border bg-dynasty-base hover:bg-dynasty-elevated'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-heading text-sm text-dynasty-textBright">{scenario.name}</div>
                            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                              {scenario.difficulty} · {scenario.maxSeasons} seasons
                            </div>
                          </div>
                          <div className="mt-1 font-heading text-xs text-dynasty-muted">
                            {scenario.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                <label className="block">
                  <span className="font-heading text-sm text-dynasty-textBright">Team</span>
                  <select
                    id="setup-team"
                    value={teamId}
                    onChange={(event) => setTeamId(event.target.value)}
                    className="mt-2 w-full rounded-md border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
                  >
                    {TEAM_OPTIONS.map((team) => (
                      <option key={team.id} value={team.id}>{team.label}</option>
                    ))}
                  </select>
                </label>
                )}

                <label className="block">
                  <span className="font-heading text-sm text-dynasty-textBright">Difficulty</span>
                  <select
                    id="setup-difficulty"
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value as SetupDifficulty)}
                    className="mt-2 w-full rounded-md border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
                  >
                    <option value="easy">Easy</option>
                    <option value="standard">Standard</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>

                {wizardMode === 'dynasty' ? (
                <div>
                  <span className="font-heading text-sm text-dynasty-textBright">Mode</span>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPlayMode('standard')}
                      className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                        playMode === 'standard'
                          ? 'border-accent-primary bg-accent-primary/10'
                          : 'border-dynasty-border bg-dynasty-base hover:bg-dynasty-elevated'
                      }`}
                    >
                      <div className="font-heading text-sm text-dynasty-textBright">Standard Dynasty</div>
                      <div className="mt-1 font-heading text-xs text-dynasty-muted">
                        Traditional save. If ownership fires you, the dynasty becomes read-only.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayMode('career')}
                      className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                        playMode === 'career'
                          ? 'border-accent-primary bg-accent-primary/10'
                          : 'border-dynasty-border bg-dynasty-base hover:bg-dynasty-elevated'
                      }`}
                    >
                      <div className="font-heading text-sm text-dynasty-textBright">GM Career</div>
                      <div className="mt-1 font-heading text-xs text-dynasty-muted">
                        Firing opens the job market so the save continues with a new club.
                      </div>
                    </button>
                  </div>
                </div>
                ) : (
                  <div className="rounded-lg border border-dynasty-border bg-dynasty-base p-4 font-heading text-xs text-dynasty-muted">
                    {selectedScenario?.requiresCareerMode
                      ? 'This scenario uses career-mode rules. Firing keeps the save alive through the job market.'
                      : 'Scenario saves still follow standard firing rules unless the challenge explicitly says otherwise.'}
                  </div>
                )}

                <label className="block">
                  <span className="font-heading text-sm text-dynasty-textBright">GM Name</span>
                  <input
                    id="setup-gm-name"
                    value={gmName}
                    onInput={(event) => setGmName((event.target as HTMLInputElement).value)}
                    className="mt-2 w-full rounded-md border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setWizardOpen(false)}
                    className="rounded border border-dynasty-border px-4 py-2 font-heading text-sm text-dynasty-text hover:bg-dynasty-elevated"
                  >
                    Back to Save Hub
                  </button>
                  <button
                    type="button"
                    disabled={busySlot != null || !worker.isReady}
                    onClick={() => void handleBeginDynasty()}
                    className="rounded bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover disabled:cursor-not-allowed disabled:bg-dynasty-muted disabled:text-dynasty-border"
                  >
                    {busySlot != null
                      ? 'Creating...'
                      : !worker.isReady
                        ? 'Loading Engine...'
                        : wizardMode === 'scenario' ? 'Launch Scenario' : 'Begin Season 1'}
                  </button>
                </div>
                {worker.workerStatus === 'error' && (
                  <p className="mt-2 text-right font-data text-xs text-accent-danger">
                    Sim engine failed to load. Try refreshing the page.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-dynasty-border bg-dynasty-surface p-6">
              <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent-warning">Season Preview</div>
              <h2 className="mt-3 font-brand text-3xl text-dynasty-textBright">
                {wizardMode === 'scenario'
                  ? (selectedScenario?.name ?? 'Preparing Scenario')
                  : (preview?.teamName ?? 'Preparing Preview')}
              </h2>
              <p className="mt-3 font-heading text-sm leading-6 text-dynasty-muted">
                {wizardMode === 'scenario'
                  ? (selectedScenario?.description ?? 'Loading the scenario framing and opening roster context.')
                  : (preview?.teamIdentityBlurb ?? 'Running the numbers on your opening roster and division outlook.')}
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <PreviewStat label="Projected Record" value={preview?.projectedRecord ?? '--'} />
                <PreviewStat label="Payroll Tier" value={preview?.payrollTier ?? '--'} />
                <PreviewStat label="Farm System" value={preview?.farmSystemRating ?? '--'} />
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-dynasty-border bg-dynasty-base/40 p-4">
                  <div className="font-heading text-sm font-semibold text-dynasty-textBright">Key Players</div>
                  <div className="mt-3 space-y-2">
                    {(preview?.topPlayers ?? []).map((player) => (
                      <div key={player.playerId} className="rounded border border-dynasty-border/60 px-3 py-2">
                        <div className="font-heading text-sm text-dynasty-text">{player.name}</div>
                        <div className="font-data text-xs text-dynasty-muted">{player.position} · {player.overall} OVR</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-dynasty-border bg-dynasty-base/40 p-4">
                  <div className="font-heading text-sm font-semibold text-dynasty-textBright">Division Rivals</div>
                  <div className="mt-3 space-y-2">
                    {(preview?.divisionRivals ?? []).map((rival) => (
                      <div key={rival.teamId} className="rounded border border-dynasty-border/60 px-3 py-2 font-heading text-sm text-dynasty-text">
                        {rival.teamName}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
      </div>
    </PageShell>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-base/40 p-4">
      <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">{label}</div>
      <div className="mt-2 font-brand text-3xl text-dynasty-textBright">{value}</div>
    </div>
  );
}
