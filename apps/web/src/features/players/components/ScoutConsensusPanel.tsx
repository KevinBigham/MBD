import { useEffect, useState } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@mbd/ui';
import { Eye } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

interface AttributeEstimate {
  attribute: string;
  pointEstimate: number;
  low: number;
  high: number;
  confidence: number;
}

interface ConsensusData {
  consensus: {
    playerId: string;
    consensusRating: number;
    confidenceInterval: { low: number; high: number };
    agreementLevel: 'unanimous' | 'majority' | 'split' | 'conflicted';
    outlierScoutIds: string[];
  };
  attributeEstimates: AttributeEstimate[];
  scoutCount: number;
  observations: Array<{
    scoutId: string;
    scoutName: string;
    observedRating: number;
    confidence: number;
  }>;
}

function agreementBadge(level: string) {
  switch (level) {
    case 'unanimous': return <Badge variant="success">Unanimous</Badge>;
    case 'majority': return <Badge variant="info">Majority</Badge>;
    case 'split': return <Badge variant="warning">Split</Badge>;
    case 'conflicted': return <Badge variant="danger">Conflicted</Badge>;
    default: return <Badge variant="outline">{level}</Badge>;
  }
}

function attrLabel(key: string): string {
  const labels: Record<string, string> = {
    contact: 'Contact', power: 'Power', eye: 'Eye', speed: 'Speed',
    defense: 'Defense', stuff: 'Stuff', control: 'Control',
    stamina: 'Stamina', velocity: 'Velocity', movement: 'Movement',
  };
  return labels[key] ?? key;
}

export default function ScoutConsensusPanel({ playerId }: { playerId: string }) {
  const worker = useWorker();
  const { isInitialized } = useGameStore();
  const [data, setData] = useState<ConsensusData | null>(null);

  useEffect(() => {
    if (!isInitialized || !worker.isReady || !playerId) return;
    void (async () => {
      const result = await worker.getScoutConsensus(playerId);
      setData(result as ConsensusData | null);
    })();
  }, [isInitialized, worker.isReady, playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return null;

  const { consensus, attributeEstimates, observations } = data;
  const intervalWidth = consensus.confidenceInterval.high - consensus.confidenceInterval.low;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-accent-info" />
            <CardTitle className="font-heading text-dynasty-text">Scout Consensus</CardTitle>
          </div>
          {agreementBadge(consensus.agreementLevel)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Consensus rating */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="font-data text-3xl font-bold text-dynasty-textBright">
              {consensus.consensusRating}
            </div>
            <div className="font-data text-xs text-dynasty-muted">consensus</div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between font-data text-xs text-dynasty-muted">
              <span>{consensus.confidenceInterval.low}</span>
              <span>range: {intervalWidth}</span>
              <span>{consensus.confidenceInterval.high}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-dynasty-border/50">
              <div
                className="h-full rounded-full bg-accent-info/60"
                style={{
                  marginLeft: `${Math.max(0, ((consensus.confidenceInterval.low - (consensus.consensusRating - 50)) / 100) * 100)}%`,
                  width: `${Math.min(100, (intervalWidth / 100) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Scout observations */}
        <div className="space-y-2">
          <div className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">
            Individual Reads ({data.scoutCount} scouts)
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {observations.map(obs => {
              const isOutlier = consensus.outlierScoutIds.includes(obs.scoutId);
              return (
                <div
                  key={obs.scoutId}
                  className={`rounded-lg border p-2 ${
                    isOutlier
                      ? 'border-accent-warning/30 bg-accent-warning/5'
                      : 'border-dynasty-border bg-dynasty-elevated'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-xs text-dynasty-muted">{obs.scoutName}</span>
                    <span className="font-data text-sm font-bold text-dynasty-text">{obs.observedRating}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-data text-[10px] text-dynasty-muted">conf {obs.confidence}%</span>
                    {isOutlier && <Badge variant="warning" className="text-[9px]">outlier</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attribute estimates */}
        <div className="space-y-2">
          <div className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">
            Attribute Estimates
          </div>
          {attributeEstimates.map(attr => (
            <div key={attr.attribute} className="space-y-1">
              <div className="flex items-center justify-between font-heading text-xs">
                <span className="text-dynasty-muted">{attrLabel(attr.attribute)}</span>
                <span className="text-dynasty-text">
                  {attr.pointEstimate}
                  <span className="ml-1 text-dynasty-muted">({attr.low}–{attr.high})</span>
                </span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-dynasty-border/50">
                {/* Range bar */}
                <div
                  className="absolute h-full rounded-full bg-accent-info/30"
                  style={{
                    left: `${Math.max(0, (attr.low / 550) * 100)}%`,
                    width: `${Math.min(100, ((attr.high - attr.low) / 550) * 100)}%`,
                  }}
                />
                {/* Point estimate marker */}
                <div
                  className="absolute h-full w-1 rounded-full bg-accent-info"
                  style={{ left: `${Math.max(0, (attr.pointEstimate / 550) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
