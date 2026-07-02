import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Flame, Maximize2 } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import PennantRaceCardBody, {
  type DivisionRace,
  type WildcardRace,
} from './PennantRaceCardBody';

const PennantRaceModal = lazy(() => import('./PennantRaceModal'));

interface PennantRaceView {
  season: number;
  day: number;
  gamesRemaining: number;
  divisionRaces: DivisionRace[];
  wildcardRaces: WildcardRace[];
}

export default function PennantRaceCard() {
  const { getPennantRaces, isReady } = useWorker();
  const [view, setView] = useState<PennantRaceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchView = useCallback(async () => {
    try {
      const data = (await getPennantRaces()) as PennantRaceView;
      setView(data);
    } catch {
      // Silently handle — card is non-critical intel
    } finally {
      setLoading(false);
    }
  }, [getPennantRaces]);

  useEffect(() => {
    if (isReady) {
      fetchView();
    }
  }, [isReady, fetchView]);

  const divisionRaces = view?.divisionRaces ?? [];
  const wildcardRaces = view?.wildcardRaces ?? [];
  const totalRaces = divisionRaces.length + wildcardRaces.length;

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-accent-danger" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
          Pennant Race Heat
        </h2>
        {totalRaces > 0 && (
          <span className="rounded-full bg-accent-danger/20 px-2 py-0.5 font-data text-[11px] font-medium text-accent-danger">
            {totalRaces}
          </span>
        )}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-dynasty-border/70 bg-dynasty-surface/70 px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.14em] text-dynasty-muted transition hover:bg-dynasty-surface hover:text-dynasty-textBright"
          aria-label="Open pennant race board"
        >
          <Maximize2 className="h-3 w-3" />
          Board
        </button>
      </div>

      <PennantRaceCardBody
        loading={loading}
        divisionRaces={divisionRaces}
        wildcardRaces={wildcardRaces}
      />

      {modalOpen ? (
        <Suspense fallback={null}>
          <PennantRaceModal onDismiss={() => setModalOpen(false)} />
        </Suspense>
      ) : null}
    </section>
  );
}
