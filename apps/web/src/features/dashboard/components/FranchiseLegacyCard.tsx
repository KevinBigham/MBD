import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Flag } from 'lucide-react';
import type { SignatureMoment } from '@mbd/contracts';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import FranchiseLegacyCardBody from './FranchiseLegacyCardBody';

export default function FranchiseLegacyCard() {
  const worker = useWorker();
  const { season, userTeamId } = useGameStore();
  const [moments, setMoments] = useState<SignatureMoment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMoments = useCallback(async () => {
    if (!worker.isReady || typeof worker.getTeamMoments !== 'function' || !userTeamId) {
      setMoments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await worker.getTeamMoments(userTeamId);
      setMoments(data as SignatureMoment[]);
    } finally {
      setLoading(false);
    }
  }, [userTeamId, worker]);

  useEffect(() => {
    void fetchMoments();
  }, [fetchMoments, season]);

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-accent-info" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Franchise Legacy</h2>
        </div>
        <Link
          to="/career"
          className="flex items-center gap-1 font-heading text-xs text-accent-info hover:text-accent-primary"
        >
          Full timeline <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <FranchiseLegacyCardBody loading={loading} moments={moments} />
    </section>
  );
}
