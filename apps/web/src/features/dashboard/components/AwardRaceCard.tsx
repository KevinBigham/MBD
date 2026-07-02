import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Maximize2, Trophy } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import AwardRaceCardBody, { type AwardBoard } from './AwardRaceCardBody';

const AwardRaceModal = lazy(() => import('./AwardRaceModal'));

interface AwardRaceBoardsView {
  season: number;
  day: number;
  gamesRemaining: number;
  al: AwardBoard;
  nl: AwardBoard;
}

const EMPTY_AWARD_BOARD: AwardBoard = { mvp: [], cyYoung: [], roy: [] };

export default function AwardRaceCard() {
  const { getAwardRaceBoards, isReady } = useWorker();
  const [view, setView] = useState<AwardRaceBoardsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchBoards = useCallback(async () => {
    if (!isReady || typeof getAwardRaceBoards !== 'function') {
      setView(null);
      setLoading(false);
      return;
    }

    try {
      const data = await getAwardRaceBoards();
      setView(data as AwardRaceBoardsView);
    } catch {
      // Non-critical intel — fall through to empty state.
    } finally {
      setLoading(false);
    }
  }, [getAwardRaceBoards, isReady]);

  useEffect(() => {
    void fetchBoards();
  }, [fetchBoards]);

  const alBoard = view?.al ?? EMPTY_AWARD_BOARD;
  const nlBoard = view?.nl ?? EMPTY_AWARD_BOARD;

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-accent-warning" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Award Race</h2>
        <span className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
          League-wide
        </span>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="ml-auto flex items-center gap-1 rounded border border-dynasty-border/70 bg-dynasty-surface/70 px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted transition hover:bg-dynasty-surface hover:text-dynasty-textBright"
          aria-label="Open award race board"
        >
          <Maximize2 className="h-3 w-3" />
          Board
        </button>
      </div>

      <AwardRaceCardBody loading={loading} al={alBoard} nl={nlBoard} />
      {modalOpen ? (
        <Suspense fallback={null}>
          <AwardRaceModal onDismiss={() => setModalOpen(false)} />
        </Suspense>
      ) : null}
    </section>
  );
}
