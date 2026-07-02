import { useState } from 'react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { PageShell } from '@/shared/components/PageShell';
import type { CategoryFilter } from '../components/StatsDefinitionLibraryPanel';
import StatsEncyclopediaContent from '../components/StatsEncyclopediaContent';
import { STAT_DEFINITIONS } from '../data/statDefinitions';
import {
  useStatsEncyclopediaRouteData,
} from '../hooks/useStatsEncyclopediaRouteData';

export default function StatsEncyclopediaPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, season, day, phase } = useGameStore();
  const { leagueContext } = useStatsEncyclopediaRouteData({
    day,
    getPerformanceDiagnostics: worker.getPerformanceDiagnostics,
    isInitialized,
    phase,
    season,
    workerReady,
  });
  const [filter, setFilter] = useState<CategoryFilter>('all');

  return (
    <PageShell>
      <StatsEncyclopediaContent
        definitions={STAT_DEFINITIONS}
        filter={filter}
        leagueContext={leagueContext}
        onFilterChange={setFilter}
      />
    </PageShell>
  );
}
