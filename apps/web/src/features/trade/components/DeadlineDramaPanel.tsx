import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import DeadlineDramaPanelBody, {
  type TradeDeadlineDrama,
} from './DeadlineDramaPanelBody';

export default function DeadlineDramaPanel() {
  const { getTradeDeadlineDrama, isReady } = useWorker();
  const { phase } = useGameStore();
  const [drama, setDrama] = useState<TradeDeadlineDrama | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(false);

  const fetchDrama = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getTradeDeadlineDrama();
      setDrama(result as TradeDeadlineDrama | null);
    } catch {
      setDrama(null);
    } finally {
      setLoading(false);
    }
  }, [getTradeDeadlineDrama]);

  useEffect(() => {
    if (isReady) {
      void fetchDrama();
    }
  }, [isReady, fetchDrama]);

  const toggleTimeline = useCallback(() => {
    setTimelineExpanded((prev) => !prev);
  }, []);

  return (
    <DeadlineDramaPanelBody
      drama={drama}
      loading={loading}
      onToggleTimeline={toggleTimeline}
      phase={phase}
      timelineExpanded={timelineExpanded}
    />
  );
}
