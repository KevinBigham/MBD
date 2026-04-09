import { useEffect, useState } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@mbd/ui';
import { TrendingUp } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

interface HitterProjectedStatLine {
  pa: number;
  hits: number;
  hr: number;
  rbi: number;
  bb: number;
  k: number;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
}

interface PitcherProjectedStatLine {
  ip: number;
  wins: number;
  saves: number;
  strikeouts: number;
  era: string;
  whip: string;
}

type ProjectedStatLine = HitterProjectedStatLine | PitcherProjectedStatLine;

interface SeasonProjection {
  playerId: string;
  gamesPlayed: number;
  gamesRemaining: number;
  projectedStats: ProjectedStatLine;
  paceLabel: string;
  confidenceLevel: 'high' | 'medium' | 'low';
}

interface NotableProjection {
  playerId: string;
  category: string;
  projectedValue: string;
  benchmark: string;
  paceDescription: string;
}

interface ProjectionData {
  projection: SeasonProjection;
  notableProjections: NotableProjection[];
  teamNotableCount: number;
}

function isPitcherProjection(line: ProjectedStatLine): line is PitcherProjectedStatLine {
  return 'ip' in line;
}

function confidenceBadge(level: string) {
  switch (level) {
    case 'high': return <Badge variant="success">High Confidence</Badge>;
    case 'medium': return <Badge variant="warning">Medium Confidence</Badge>;
    default: return <Badge variant="outline">Low Confidence</Badge>;
  }
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-heading text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">{label}</div>
      <div className="mt-1 font-data text-lg font-bold text-dynasty-text">{value}</div>
    </div>
  );
}

export default function ProjectionsPanel({ playerId }: { playerId: string }) {
  const worker = useWorker();
  const { isInitialized, day } = useGameStore();
  const [data, setData] = useState<ProjectionData | null>(null);

  useEffect(() => {
    if (!isInitialized || !worker.isReady || !playerId) return;
    void (async () => {
      const result = await worker.getSeasonProjections(playerId);
      setData(result as ProjectionData | null);
    })();
  }, [isInitialized, worker.isReady, playerId, day]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return null;

  const { projection, notableProjections } = data;
  const stats = projection.projectedStats;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent-info" />
            <CardTitle className="font-heading text-dynasty-text">Season Projections</CardTitle>
          </div>
          {confidenceBadge(projection.confidenceLevel)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-accent-info/20 bg-accent-info/5 px-4 py-3">
          <p className="font-heading text-sm text-accent-info">{projection.paceLabel}</p>
          <div className="mt-1 font-data text-xs text-dynasty-muted">
            {projection.gamesPlayed} GP · {projection.gamesRemaining} remaining
          </div>
        </div>

        {isPitcherProjection(stats) ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <StatBlock label="IP" value={String(stats.ip)} />
            <StatBlock label="W" value={String(stats.wins)} />
            <StatBlock label="SV" value={String(stats.saves)} />
            <StatBlock label="K" value={String(stats.strikeouts)} />
            <StatBlock label="ERA" value={stats.era} />
            <StatBlock label="WHIP" value={stats.whip} />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            <StatBlock label="AVG" value={stats.avg} />
            <StatBlock label="HR" value={String(stats.hr)} />
            <StatBlock label="RBI" value={String(stats.rbi)} />
            <StatBlock label="OPS" value={stats.ops} />
            <StatBlock label="H" value={String(stats.hits)} />
          </div>
        )}

        {notableProjections.length > 0 && (
          <div className="space-y-2">
            <div className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">
              Notable Pace
            </div>
            {notableProjections.map((np) => (
              <div
                key={np.category}
                className="flex items-center justify-between rounded-lg border border-accent-warning/20 bg-accent-warning/5 px-3 py-2"
              >
                <div>
                  <span className="font-heading text-sm text-accent-warning">{np.category}</span>
                  <span className="ml-2 font-data text-xs text-dynasty-muted">
                    {np.projectedValue} (benchmark: {np.benchmark})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
