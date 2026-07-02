import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Crown,
} from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import CareerRetrospectiveCardBody, {
  type CareerRetrospectiveView,
} from './CareerRetrospectiveCardBody';

const SeasonStoryReelModal = lazy(() => import('./SeasonStoryReelModal'));

export default function CareerRetrospectiveCard() {
  const { getCareerRetrospective, isReady } = useWorker();
  const [view, setView] = useState<CareerRetrospectiveView | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  const fetchRetrospective = useCallback(async () => {
    if (!isReady || typeof getCareerRetrospective !== 'function') {
      setView(null);
      setLoading(false);
      return;
    }

    try {
      const data = await getCareerRetrospective();
      setView(data as CareerRetrospectiveView);
    } catch {
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [getCareerRetrospective, isReady]);

  useEffect(() => {
    void fetchRetrospective();
  }, [fetchRetrospective]);

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-accent-warning" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Career Retrospective</h2>
        </div>
        <Link
          to="/career"
          className="flex items-center gap-1 font-heading text-xs text-accent-info hover:text-accent-primary"
        >
          GM dossier <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <CareerRetrospectiveCardBody
        loading={loading}
        view={view}
        onSelectSeason={setSelectedSeason}
      />

      {selectedSeason != null ? (
        <Suspense fallback={null}>
          <SeasonStoryReelModal
            seasonYear={selectedSeason}
            onDismiss={() => setSelectedSeason(null)}
          />
        </Suspense>
      ) : null}
    </section>
  );
}
