import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@mbd/ui';
import { Rocket } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { minorLevelLabel } from '@/shared/lib/labels';

interface WatchEntry {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  level: string;
  probability: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'imminent';
  narrativeHook: string;
  trajectory: string;
  topFactor: string;
}

interface WatchData {
  watchList: WatchEntry[];
}

function riskColor(level: string): string {
  switch (level) {
    case 'imminent': return 'text-accent-success';
    case 'high': return 'text-accent-warning';
    case 'moderate': return 'text-accent-info';
    default: return 'text-dynasty-muted';
  }
}

function riskBadge(level: string) {
  switch (level) {
    case 'imminent': return <Badge variant="success">Imminent</Badge>;
    case 'high': return <Badge variant="warning">High</Badge>;
    case 'moderate': return <Badge variant="info">Moderate</Badge>;
    default: return <Badge variant="outline">Low</Badge>;
  }
}

function trajectoryTag(t: string): string {
  switch (t) {
    case 'rocket': return 'Rocket';
    case 'steady_climb': return 'Climbing';
    case 'plateau': return 'Plateau';
    case 'stalled': return 'Stalled';
    case 'declining': return 'Declining';
    case 'volatile': return 'Volatile';
    default: return t;
  }
}

export default function ProspectBreakoutTracker() {
  const worker = useWorker();
  const { isInitialized, day, season } = useGameStore();
  const [data, setData] = useState<WatchData | null>(null);

  useEffect(() => {
    if (!isInitialized || !worker.isReady) return;
    void (async () => {
      const result = await worker.getProspectBreakoutWatch();
      setData(result as WatchData | null);
    })();
  }, [isInitialized, worker.isReady, day, season]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || data.watchList.length === 0) return null;

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="flex items-center gap-2">
        <Rocket className="h-4 w-4 text-accent-warning" />
        <div className="font-heading text-sm font-semibold text-dynasty-text">Breakout Watch</div>
        <Badge variant="outline" className="font-data text-[10px]">
          {data.watchList.length} prospects
        </Badge>
      </div>

      <div className="mt-4 space-y-2">
        {data.watchList.map(entry => (
          <Link
            key={entry.playerId}
            to={`/players/${entry.playerId}?tab=development`}
            className="flex items-center gap-3 rounded-lg border border-dynasty-border bg-dynasty-elevated p-3 transition-colors hover:border-accent-primary/30"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm text-dynasty-text">{entry.playerName}</span>
                {riskBadge(entry.riskLevel)}
                <Badge variant="outline" className="font-data text-[10px]">
                  {trajectoryTag(entry.trajectory)}
                </Badge>
              </div>
              <div className="mt-1 font-data text-xs text-dynasty-muted">
                {entry.position} · Age {entry.age} · {minorLevelLabel(entry.level)}
              </div>
              <div className="mt-1 font-heading text-xs text-dynasty-muted">
                {entry.narrativeHook}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className={`font-data text-xl font-bold ${riskColor(entry.riskLevel)}`}>
                {entry.probability}%
              </div>
              <div className="font-data text-[10px] text-dynasty-muted">{entry.topFactor}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
