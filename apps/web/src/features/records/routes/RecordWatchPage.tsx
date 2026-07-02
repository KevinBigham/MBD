import { useState } from 'react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { PageShell } from '@/shared/components/PageShell';
import {
  RecordWatchContentPanel,
  type RecordWatchViewMode,
} from '../components/RecordWatchContentPanel';
import { useRecordWatchRouteData } from '../hooks/useRecordWatchRouteData';

export default function RecordWatchPage() {
  const worker = useWorker();
  const { isInitialized, season, day, phase } = useGameStore();
  const [viewMode, setViewMode] = useState<RecordWatchViewMode>('watch');
  const { loading, recordBook, watchList } = useRecordWatchRouteData({
    day,
    getRecordBook: worker.getRecordBook,
    getRecordWatchList: worker.getRecordWatchList,
    isInitialized,
    phase,
    season,
    workerReady: worker.isReady,
  });

  return (
    <PageShell loading={loading}>
      <RecordWatchContentPanel
        recordBook={recordBook}
        season={season}
        viewMode={viewMode}
        watchList={watchList}
        onViewModeChange={setViewMode}
      />
    </PageShell>
  );
}
