import { useEffect, useState } from 'react';
import { Badge } from '@mbd/ui';
import { Flame, Home, Clock, TrendingUp, Gauge } from 'lucide-react';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

interface GameModifiers {
  homeOffenseModifier: number;
  awayOffenseModifier: number;
  homePitchingModifier: number;
  awayPitchingModifier: number;
  varianceMultiplier: number;
  momentumNarrative: string;
}

interface MomentumData {
  homeTeamId: string;
  awayTeamId: string;
  seriesHomeWins: number;
  seriesAwayWins: number;
  round: string;
  isElimination: boolean;
  modifiers: GameModifiers;
  narrative: string;
}

function modifierDisplay(value: number): { label: string; tone: string } {
  if (value > 0.01) return { label: `+${(value * 100).toFixed(1)}%`, tone: 'text-accent-success' };
  if (value < -0.01) return { label: `${(value * 100).toFixed(1)}%`, tone: 'text-accent-danger' };
  return { label: 'Neutral', tone: 'text-dynasty-muted' };
}

function roundLabel(round: string): string {
  switch (round) {
    case 'WC': return 'Wild Card';
    case 'DS': return 'Division Series';
    case 'CS': return 'Championship Series';
    case 'WS': return 'World Series';
    default: return round;
  }
}

export default function MomentumPanel() {
  const worker = useWorker();
  const { isInitialized, day, phase } = useGameStore();
  const [data, setData] = useState<MomentumData | null>(null);

  useEffect(() => {
    if (!isInitialized || !worker.isReady || phase !== 'playoffs') return;
    void (async () => {
      const result = await worker.getPlayoffMomentum();
      setData(result as MomentumData | null);
    })();
  }, [isInitialized, worker.isReady, day, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return null;

  const { modifiers } = data;
  const homeOff = modifierDisplay(modifiers.homeOffenseModifier);
  const awayOff = modifierDisplay(modifiers.awayOffenseModifier);
  const homePitch = modifierDisplay(modifiers.homePitchingModifier);
  const awayPitch = modifierDisplay(modifiers.awayPitchingModifier);

  return (
    <div className="rounded-lg border border-accent-primary/30 bg-dynasty-surface p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-accent-primary" />
          <div className="font-heading text-sm font-semibold text-dynasty-text">Series Momentum</div>
          <Badge variant="info">{roundLabel(data.round)}</Badge>
          {data.isElimination && <Badge variant="danger">Elimination</Badge>}
        </div>
        <div className="flex items-center gap-2 font-data text-sm">
          <TeamLogo teamId={data.homeTeamId} size="xs" />
          <span className="text-dynasty-text">{data.seriesHomeWins}</span>
          <span className="text-dynasty-muted">-</span>
          <span className="text-dynasty-text">{data.seriesAwayWins}</span>
          <TeamLogo teamId={data.awayTeamId} size="xs" />
        </div>
      </div>

      {/* Narrative */}
      <div className="mt-3 rounded-lg border border-accent-info/20 bg-accent-info/5 px-4 py-3">
        <p className="font-heading text-sm leading-relaxed text-dynasty-muted">{data.narrative}</p>
      </div>

      {/* Modifier grid */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
          <div className="flex items-center gap-1.5">
            <Home className="h-3.5 w-3.5 text-accent-info" />
            <span className="font-heading text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Home Offense</span>
          </div>
          <div className={`mt-1 font-data text-lg font-bold ${homeOff.tone}`}>{homeOff.label}</div>
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-accent-warning" />
            <span className="font-heading text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Pitching</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className={`font-data text-sm ${homePitch.tone}`}>H: {homePitch.label}</span>
            <span className={`font-data text-sm ${awayPitch.tone}`}>A: {awayPitch.label}</span>
          </div>
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
          <div className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-accent-danger" />
            <span className="font-heading text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Pressure</span>
          </div>
          <div className={`mt-1 font-data text-lg font-bold ${awayOff.tone}`}>{awayOff.label}</div>
          <div className="font-data text-[10px] text-dynasty-muted">away offense</div>
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-accent-success" />
            <span className="font-heading text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Variance</span>
          </div>
          <div className="mt-1 font-data text-lg font-bold text-dynasty-text">
            {modifiers.varianceMultiplier.toFixed(2)}x
          </div>
          <div className="font-data text-[10px] text-dynasty-muted">outcome swing</div>
        </div>
      </div>
    </div>
  );
}
