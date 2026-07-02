import { useCallback, useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import MilestoneTrackerCardBody, { type MilestoneAlert } from './MilestoneTrackerCardBody';

const URGENCY_ORDER: Record<MilestoneAlert['urgency'], number> = {
  imminent: 0,
  close: 1,
  approaching: 2,
};

export default function MilestoneTrackerCard() {
  const { getMilestoneTrackerAlerts, isReady } = useWorker();
  const [alerts, setAlerts] = useState<MilestoneAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await getMilestoneTrackerAlerts();
      const sorted = [...(data as MilestoneAlert[])].sort(
        (a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency],
      );
      setAlerts(sorted);
    } catch {
      // Silently handle — card is non-critical intel
    } finally {
      setLoading(false);
    }
  }, [getMilestoneTrackerAlerts]);

  useEffect(() => {
    if (isReady) {
      fetchAlerts();
    }
  }, [isReady, fetchAlerts]);

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-accent-warning" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
          Milestone Watch
        </h2>
        {alerts.length > 0 && (
          <span className="ml-auto rounded-full bg-accent-warning/20 px-2 py-0.5 font-data text-[11px] font-medium text-accent-warning">
            {alerts.length}
          </span>
        )}
      </div>

      <MilestoneTrackerCardBody loading={loading} alerts={alerts} />
    </section>
  );
}
