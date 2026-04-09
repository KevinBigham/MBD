import { useEffect, useState } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@mbd/ui';
import { Rocket, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

interface BreakoutFactor {
  name: string;
  weight: number;
  contribution: number;
  description: string;
}

interface BreakoutData {
  assessment: {
    playerId: string;
    probability: number;
    factors: BreakoutFactor[];
    riskLevel: 'low' | 'moderate' | 'high' | 'imminent';
    narrativeHook: string;
  };
  ceiling: {
    projectedPeak: number;
    confidenceLevel: 'low' | 'medium' | 'high';
    comparisonArchetype: string;
    timelineSeasons: number;
  };
  regression: {
    riskLevel: 'stable' | 'concerning' | 'declining';
    declineRate: number;
    projectedFloor: number;
    warningSignals: string[];
  };
  trajectory: string;
  scoutReport: string;
  playerName: string;
  position: string;
  age: number;
  developmentPhase: string;
}

function riskLevelBadge(level: string) {
  switch (level) {
    case 'imminent': return <Badge variant="success">Imminent</Badge>;
    case 'high': return <Badge variant="warning">High</Badge>;
    case 'moderate': return <Badge variant="info">Moderate</Badge>;
    default: return <Badge variant="outline">Low</Badge>;
  }
}

function regressionBadge(level: string) {
  switch (level) {
    case 'declining': return <Badge variant="danger">Declining</Badge>;
    case 'concerning': return <Badge variant="warning">Concerning</Badge>;
    default: return <Badge variant="success">Stable</Badge>;
  }
}

function trajectoryLabel(t: string): string {
  switch (t) {
    case 'rocket': return 'Rocket';
    case 'steady_climb': return 'Steady Climb';
    case 'plateau': return 'Plateau';
    case 'stalled': return 'Stalled';
    case 'declining': return 'Declining';
    case 'volatile': return 'Volatile';
    default: return t;
  }
}

function ProbabilityGauge({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-accent-success' : value >= 60 ? 'bg-accent-warning' : value >= 35 ? 'bg-accent-info' : 'bg-dynasty-muted';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="h-3 overflow-hidden rounded-full bg-dynasty-border/50">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
        </div>
      </div>
      <div className="font-data text-2xl font-bold text-dynasty-textBright">{value}%</div>
    </div>
  );
}

export default function BreakoutIntelligencePanel({ playerId }: { playerId: string }) {
  const worker = useWorker();
  const { isInitialized } = useGameStore();
  const [data, setData] = useState<BreakoutData | null>(null);

  useEffect(() => {
    if (!isInitialized || !worker.isReady || !playerId) return;
    void (async () => {
      const result = await worker.getBreakoutIntelligence(playerId);
      setData(result as BreakoutData | null);
    })();
  }, [isInitialized, worker.isReady, playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return null;

  const { assessment, ceiling, regression, trajectory, scoutReport } = data;

  // Don't render for decline/retirement phase
  if (data.developmentPhase === 'Decline' || data.developmentPhase === 'Retirement') return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-accent-warning" />
            <CardTitle className="font-heading text-dynasty-text">Breakout Intelligence</CardTitle>
          </div>
          {riskLevelBadge(assessment.riskLevel)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Probability gauge */}
        <ProbabilityGauge value={assessment.probability} />

        {/* Narrative hook */}
        <div className="rounded-lg border border-accent-warning/20 bg-accent-warning/5 px-4 py-3">
          <p className="font-heading text-sm text-dynasty-text">{assessment.narrativeHook}</p>
        </div>

        {/* Contributing factors */}
        <div className="space-y-2">
          <div className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">Contributing Factors</div>
          {assessment.factors.map(f => (
            <div key={f.name} className="space-y-1">
              <div className="flex items-center justify-between font-heading text-xs">
                <span className="text-dynasty-muted">{f.name}</span>
                <span className="text-dynasty-text">{f.contribution.toFixed(1)}/{f.weight}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-dynasty-border/50">
                <div
                  className="h-full rounded-full bg-accent-info transition-all"
                  style={{ width: `${(f.contribution / f.weight) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Ceiling projection + trajectory */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-accent-info" />
              <div className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">Ceiling</div>
            </div>
            <div className="mt-2 font-data text-xl font-bold text-dynasty-text">{ceiling.projectedPeak}</div>
            <div className="mt-1 font-data text-xs text-dynasty-muted">
              {ceiling.comparisonArchetype} profile · ~{ceiling.timelineSeasons} season{ceiling.timelineSeasons !== 1 ? 's' : ''} to peak
            </div>
            <Badge variant="outline" className="mt-2 font-data text-[10px]">
              {ceiling.confidenceLevel} confidence
            </Badge>
          </div>

          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="flex items-center gap-2">
              {regression.riskLevel === 'stable'
                ? <TrendingDown className="h-3.5 w-3.5 text-accent-success" />
                : <AlertTriangle className="h-3.5 w-3.5 text-accent-warning" />}
              <div className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">Regression Risk</div>
            </div>
            <div className="mt-2">{regressionBadge(regression.riskLevel)}</div>
            <div className="mt-2 font-data text-xs text-dynasty-muted">
              Floor: {regression.projectedFloor} · Trajectory: {trajectoryLabel(trajectory)}
            </div>
            {regression.warningSignals.length > 0 && (
              <div className="mt-2 space-y-1">
                {regression.warningSignals.map((s, i) => (
                  <div key={i} className="font-heading text-xs text-accent-warning">{s}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scout report */}
        <div className="rounded-lg border border-accent-info/20 bg-accent-info/5 px-4 py-3">
          <div className="font-heading text-xs uppercase tracking-[0.18em] text-accent-info">Scout Assessment</div>
          <p className="mt-2 font-heading text-sm leading-relaxed text-dynasty-muted">{scoutReport}</p>
        </div>
      </CardContent>
    </Card>
  );
}
