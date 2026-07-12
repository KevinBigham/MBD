import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type {
  DraftActionResult,
  DraftRoomView,
} from '@/workers/sim.worker.helpers';

interface UseDraftActionHandlersOptions {
  autosaveActiveGame: (context: { season: number }) => Promise<unknown>;
  loadDraft: () => Promise<void>;
  makeDraftPick: (prospectId: string) => Promise<unknown>;
  scoutDraftPlayer: (prospectId: string) => Promise<unknown>;
  selectedProspect: DraftRoomView['availableProspects'][number] | null;
  season: number;
  setDraft: Dispatch<SetStateAction<DraftRoomView | null>>;
  setRevealedPickCount: Dispatch<SetStateAction<number>>;
  setWatchTargetCount: Dispatch<SetStateAction<number | null>>;
  signDraftPick: (playerId: string, offeredBonus: number) => Promise<unknown>;
  simulateRemainingDraft: () => Promise<unknown>;
  startDraft: () => Promise<unknown>;
  toggleDraftBigBoard: (prospectId: string) => Promise<unknown>;
}

interface UseDraftActionHandlersResult {
  bonusOffers: Record<string, string>;
  error: string | null;
  handleBonusOfferChange: (playerId: string, value: string) => void;
  handleMakePick: () => Promise<void>;
  handleScoutProspect: () => Promise<void>;
  handleSignDraftPick: (playerId: string) => Promise<void>;
  handleStartDraft: () => Promise<void>;
  handleToggleBigBoard: () => Promise<void>;
  handleWatchDraft: () => Promise<void>;
  loading: boolean;
  scouting: boolean;
  signingPlayerId: string | null;
}

function snapshotSaved(value: unknown): value is { saved: true } {
  return typeof value === 'object'
    && value !== null
    && 'saved' in value
    && (value as { saved?: unknown }).saved === true;
}

export function useDraftActionHandlers({
  autosaveActiveGame,
  loadDraft,
  makeDraftPick,
  scoutDraftPlayer,
  selectedProspect,
  season,
  setDraft,
  setRevealedPickCount,
  setWatchTargetCount,
  signDraftPick,
  simulateRemainingDraft,
  startDraft,
  toggleDraftBigBoard,
}: UseDraftActionHandlersOptions): UseDraftActionHandlersResult {
  const [loading, setLoading] = useState(false);
  const [scouting, setScouting] = useState(false);
  const [signingPlayerId, setSigningPlayerId] = useState<string | null>(null);
  const [bonusOffers, setBonusOffers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const applyDraftResult = useCallback((result: DraftActionResult | null, options?: { watch?: boolean }) => {
    if (!result?.success || !result.draft) {
      if (result?.error) {
        setError(result.error);
      }
      return false;
    }

    setDraft(result.draft);
    setError(null);

    if (options?.watch) {
      const finalCount = result.draft.completedPicks.length;
      const startCount = Math.max(0, finalCount - result.newPicks.length);
      setRevealedPickCount(startCount);
      setWatchTargetCount(finalCount);
    } else {
      setWatchTargetCount(null);
      setRevealedPickCount(result.draft.completedPicks.length);
    }

    return true;
  }, [setDraft, setRevealedPickCount, setWatchTargetCount]);

  const autosaveDraftMutation = useCallback(async () => {
    return snapshotSaved(await autosaveActiveGame({ season }));
  }, [autosaveActiveGame, season]);

  const handleStartDraft = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await startDraft();
      if (!isSuccessfulDraftMutation(result) || !await autosaveDraftMutation()) return;
      applyDraftResult(result as DraftActionResult);
    } catch {
      setError('Draft system unavailable.');
    } finally {
      setLoading(false);
    }
  }, [applyDraftResult, autosaveDraftMutation, startDraft]);

  const handleMakePick = useCallback(async () => {
    if (!selectedProspect) return;
    setLoading(true);
    setError(null);
    try {
      const result = await makeDraftPick(selectedProspect.id);
      if (!isSuccessfulDraftMutation(result) || !await autosaveDraftMutation()) return;
      applyDraftResult(result as DraftActionResult);
    } catch {
      setError('Failed to submit draft pick.');
    } finally {
      setLoading(false);
    }
  }, [applyDraftResult, autosaveDraftMutation, makeDraftPick, selectedProspect]);

  const handleScoutProspect = useCallback(async () => {
    if (!selectedProspect) return;
    setScouting(true);
    setError(null);
    try {
      const result = await scoutDraftPlayer(selectedProspect.id);
      if (isFailedDraftMutation(result)) {
        setError(result.error ?? 'Failed to update scouting report.');
        return;
      }
      // Persist the accepted mutation before refreshing the room so a refresh
      // failure cannot drop the durable post-mutation snapshot. The refresh is
      // display-only, so its failure must not surface as a mutation error.
      if (!await autosaveDraftMutation()) return;
      await loadDraft().catch(() => undefined);
    } catch {
      setError('Failed to update scouting report.');
    } finally {
      setScouting(false);
    }
  }, [autosaveDraftMutation, loadDraft, scoutDraftPlayer, selectedProspect]);

  const handleToggleBigBoard = useCallback(async () => {
    if (!selectedProspect) return;
    setError(null);
    try {
      const result = await toggleDraftBigBoard(selectedProspect.id);
      if (isFailedDraftMutation(result)) {
        setError(result.error ?? 'Failed to update big board.');
        return;
      }
      // Persist before refreshing so a refresh failure cannot drop the write.
      // The refresh is display-only and must not surface as a mutation error.
      if (!await autosaveDraftMutation()) return;
      await loadDraft().catch(() => undefined);
    } catch {
      setError('Failed to update big board.');
    }
  }, [autosaveDraftMutation, loadDraft, selectedProspect, toggleDraftBigBoard]);

  const handleSignDraftPick = useCallback(async (playerId: string) => {
    const offeredBonus = Number.parseFloat(bonusOffers[playerId] ?? '0');
    if (!Number.isFinite(offeredBonus) || offeredBonus <= 0) {
      setError('Enter a valid bonus offer.');
      return;
    }

    setSigningPlayerId(playerId);
    setError(null);
    try {
      const result = await signDraftPick(playerId, offeredBonus);
      if (isFailedDraftMutation(result)) {
        setError(result.error ?? 'Failed to complete draft signing.');
        return;
      }
      // Persist the accepted signing before refreshing the room so a refresh
      // failure cannot drop the durable post-signing snapshot. The refresh is
      // display-only, so its failure must not surface as a signing error.
      if (!await autosaveDraftMutation()) return;
      await loadDraft().catch(() => undefined);
    } catch {
      setError('Failed to complete draft signing.');
    } finally {
      setSigningPlayerId(null);
    }
  }, [autosaveDraftMutation, bonusOffers, loadDraft, signDraftPick]);

  const handleWatchDraft = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await simulateRemainingDraft();
      if (!isSuccessfulDraftMutation(result) || !await autosaveDraftMutation()) return;
      applyDraftResult(result as DraftActionResult, { watch: true });
    } catch {
      setError('Failed to simulate the remaining draft.');
    } finally {
      setLoading(false);
    }
  }, [applyDraftResult, autosaveDraftMutation, simulateRemainingDraft]);

  const handleBonusOfferChange = useCallback((playerId: string, value: string) => {
    setBonusOffers((current) => ({ ...current, [playerId]: value }));
  }, []);

  return {
    bonusOffers,
    error,
    handleBonusOfferChange,
    handleMakePick,
    handleScoutProspect,
    handleSignDraftPick,
    handleStartDraft,
    handleToggleBigBoard,
    handleWatchDraft,
    loading,
    scouting,
    signingPlayerId,
  };
}

function isFailedDraftMutation(result: unknown): result is { success: false; error?: string } {
  return typeof result === 'object'
    && result !== null
    && 'success' in result
    && (result as { success?: unknown }).success === false;
}

function isSuccessfulDraftMutation(result: unknown): result is DraftActionResult {
  return typeof result === 'object'
    && result !== null
    && 'success' in result
    && (result as { success?: unknown }).success === true
    && 'draft' in result
    && Boolean((result as { draft?: unknown }).draft);
}
