import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { AudioEffectName } from '@/shared/lib/audio';
import type { WorkerApi } from '@/workers/sim.worker';
import type {
  DraftRoomPick,
  DraftRoomView,
} from '@/workers/sim.worker.helpers';

type DraftCommentaryView = Awaited<ReturnType<WorkerApi['getDraftCommentary']>>;
type DraftProspectReactionView = Awaited<ReturnType<WorkerApi['getDraftProspectReaction']>>;
type DraftPostDraftGradesView = Awaited<ReturnType<WorkerApi['getDraftPostDraftGrades']>>;

interface UseDraftRouteDataOptions {
  getDraftClass: () => Promise<unknown>;
  getDraftCommentary: (visiblePickCount?: number) => Promise<unknown>;
  getOffseasonState?: () => Promise<unknown>;
  getDraftPostDraftGrades: () => Promise<unknown>;
  getDraftProspectReaction: (prospectId: string) => Promise<unknown>;
  isInitialized: boolean;
  phase: string;
  playEffect: (name: AudioEffectName) => void;
  season: number;
  workerReady: boolean;
}

interface UseDraftRouteDataResult {
  commentary: DraftCommentaryView | null;
  draft: DraftRoomView | null;
  gradesView: DraftPostDraftGradesView | null;
  loadDraft: () => Promise<void>;
  offseasonPhase: string | null;
  reaction: DraftProspectReactionView | null;
  revealedPickCount: number;
  selectedProspect: DraftRoomView['availableProspects'][number] | null;
  selectedProspectId: string | null;
  setDraft: Dispatch<SetStateAction<DraftRoomView | null>>;
  setRevealedPickCount: Dispatch<SetStateAction<number>>;
  setSelectedProspectId: Dispatch<SetStateAction<string | null>>;
  setWatchTargetCount: Dispatch<SetStateAction<number | null>>;
  visiblePicks: DraftRoomPick[];
  watching: boolean;
  watchTargetCount: number | null;
}

export function useDraftRouteData({
  getDraftClass,
  getDraftCommentary,
  getOffseasonState,
  getDraftPostDraftGrades,
  getDraftProspectReaction,
  isInitialized,
  phase,
  playEffect,
  season,
  workerReady,
}: UseDraftRouteDataOptions): UseDraftRouteDataResult {
  const [draft, setDraft] = useState<DraftRoomView | null>(null);
  const [offseasonPhase, setOffseasonPhase] = useState<string | null>(null);
  const [commentary, setCommentary] = useState<DraftCommentaryView | null>(null);
  const [reaction, setReaction] = useState<DraftProspectReactionView | null>(null);
  const [gradesView, setGradesView] = useState<DraftPostDraftGradesView | null>(null);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [watchTargetCount, setWatchTargetCount] = useState<number | null>(null);
  const [revealedPickCount, setRevealedPickCount] = useState(0);
  const hydratedTickerRef = useRef(false);
  const visiblePickCountRef = useRef(0);

  const loadDraft = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    try {
      const [data, offseasonData] = await Promise.all([
        getDraftClass(),
        getOffseasonState ? getOffseasonState() : Promise.resolve(null),
      ]);
      setDraft(data as DraftRoomView | null);
      if (getOffseasonState) {
        setOffseasonPhase(
          typeof offseasonData === 'object'
            && offseasonData !== null
            && 'currentPhase' in offseasonData
            && typeof (offseasonData as { currentPhase?: unknown }).currentPhase === 'string'
            ? (offseasonData as { currentPhase: string }).currentPhase
            : null,
        );
      } else {
        setOffseasonPhase(phase === 'offseason' ? 'draft' : null);
      }
    } catch {
      setDraft(null);
      setOffseasonPhase(null);
    }
  }, [getDraftClass, getOffseasonState, isInitialized, phase, workerReady]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft, phase, season]);

  useEffect(() => {
    if (!draft) {
      setRevealedPickCount(0);
      setSelectedProspectId(null);
      return;
    }

    if (watchTargetCount == null) {
      setRevealedPickCount(draft.completedPicks.length);
    }

    if (!selectedProspectId || !draft.availableProspects.some((prospect) => prospect.id === selectedProspectId)) {
      setSelectedProspectId(draft.availableProspects[0]?.id ?? null);
    }
  }, [draft, selectedProspectId, watchTargetCount]);

  useEffect(() => {
    if (watchTargetCount == null) return;
    if (revealedPickCount >= watchTargetCount) {
      setWatchTargetCount(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setRevealedPickCount((current) => Math.min(current + 1, watchTargetCount));
    }, 120);

    return () => window.clearTimeout(timer);
  }, [revealedPickCount, watchTargetCount]);

  const selectedProspect = draft?.availableProspects.find((prospect) => prospect.id === selectedProspectId) ?? null;
  const visiblePicks = draft?.completedPicks.slice(0, watchTargetCount == null ? draft.completedPicks.length : revealedPickCount) ?? [];
  const watching = watchTargetCount != null;

  useEffect(() => {
    let cancelled = false;

    if (!draft || !workerReady) {
      setCommentary(null);
      setReaction(null);
      setGradesView(null);
      return () => {
        cancelled = true;
      };
    }

    const loadWarRoom = async () => {
      try {
        const [nextCommentary, nextReaction, nextGrades] = await Promise.all([
          getDraftCommentary(visiblePicks.length),
          selectedProspectId ? getDraftProspectReaction(selectedProspectId) : Promise.resolve(null),
          getDraftPostDraftGrades(),
        ]);

        if (cancelled) {
          return;
        }

        setCommentary((nextCommentary ?? null) as DraftCommentaryView | null);
        setReaction((nextReaction ?? null) as DraftProspectReactionView | null);
        setGradesView((nextGrades ?? null) as DraftPostDraftGradesView | null);
      } catch {
        if (!cancelled) {
          setCommentary(null);
          setReaction(null);
          setGradesView(null);
        }
      }
    };

    void loadWarRoom();

    return () => {
      cancelled = true;
    };
  }, [
    draft,
    getDraftCommentary,
    getDraftPostDraftGrades,
    getDraftProspectReaction,
    selectedProspectId,
    visiblePicks.length,
    workerReady,
  ]);

  useEffect(() => {
    if (!draft) {
      hydratedTickerRef.current = false;
      visiblePickCountRef.current = 0;
      return;
    }

    if (!hydratedTickerRef.current) {
      hydratedTickerRef.current = true;
      visiblePickCountRef.current = visiblePicks.length;
      return;
    }

    if (visiblePicks.length > visiblePickCountRef.current) {
      playEffect('draft_pick_announced');
    }

    visiblePickCountRef.current = visiblePicks.length;
  }, [draft, playEffect, visiblePicks.length]);

  return {
    commentary,
    draft,
    gradesView,
    loadDraft,
    offseasonPhase,
    reaction,
    revealedPickCount,
    selectedProspect,
    selectedProspectId,
    setDraft,
    setRevealedPickCount,
    setSelectedProspectId,
    setWatchTargetCount,
    visiblePicks,
    watching,
    watchTargetCount,
  };
}
