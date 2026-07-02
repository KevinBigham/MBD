import { useCallback, useEffect, useState } from 'react';
import { Telescope } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import ChaseWatchCardBody, {
  type CareerChase,
  type PaceChase,
} from './ChaseWatchCardBody';

interface ChaseWatchView {
  season: number;
  day: number;
  careerChases: CareerChase[];
  paceChases: PaceChase[];
}

const URGENCY_ORDER: Record<CareerChase['urgency'], number> = {
  imminent: 0,
  close: 1,
  approaching: 2,
};

export default function ChaseWatchCard() {
  const { getChaseWatch, isReady } = useWorker();
  const [view, setView] = useState<ChaseWatchView | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChases = useCallback(async () => {
    if (!isReady || typeof getChaseWatch !== 'function') {
      setView(null);
      setLoading(false);
      return;
    }

    try {
      const data = await getChaseWatch();
      const payload = data as ChaseWatchView;
      const careerChases = [...payload.careerChases].sort(
        (a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency],
      );
      setView({ ...payload, careerChases });
    } catch {
      // Non-critical intel — swallow and show empty state.
    } finally {
      setLoading(false);
    }
  }, [getChaseWatch, isReady]);

  useEffect(() => {
    void fetchChases();
  }, [fetchChases]);

  const careerChases = view?.careerChases ?? [];
  const paceChases = view?.paceChases ?? [];

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <Telescope className="h-4 w-4 text-accent-primary" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Chase Watch</h2>
        <span className="ml-auto font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
          League-wide
        </span>
      </div>

      <ChaseWatchCardBody
        loading={loading}
        careerChases={careerChases}
        paceChases={paceChases}
      />
    </section>
  );
}
