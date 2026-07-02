import { Trophy } from 'lucide-react';
import { AnimatedNumber } from '@/shared/components/AnimatedNumber';
import { DensePanel } from '@/shared/components/DensePanel';

export interface DynastyScoreSummary {
  score: number;
  grade: string;
  breakdown: {
    championships: number;
    worldSeriesAppearances: number;
    playoffAppearances: number;
    ninetyWinSeasons: number;
    divisionTitles: number;
    losingSeasons: number;
    awardWinners: number;
  };
}

interface DynastyScorePanelProps {
  dynastyScore: DynastyScoreSummary | null;
}

export default function DynastyScorePanel({ dynastyScore }: DynastyScorePanelProps) {
  return (
    <DensePanel
      title="Dynasty Score"
      icon={<Trophy className="h-4 w-4 text-accent-primary" />}
      titleClassName="text-dynasty-textBright"
      bodyClassName="grid gap-4 md:grid-cols-[0.45fr_0.55fr]"
    >
      <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
        <div className="font-brand text-5xl text-accent-primary">{dynastyScore?.grade ?? 'F'}</div>
        <div className="mt-2 font-data text-sm text-dynasty-muted">
          <AnimatedNumber value={dynastyScore?.score ?? 0} formatter={(value) => `${Math.round(value)} total points`} />
        </div>
      </div>
      <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="font-heading text-xs text-dynasty-muted">Titles: {dynastyScore?.breakdown.championships ?? 0}</div>
          <div className="font-heading text-xs text-dynasty-muted">Pennants: {dynastyScore?.breakdown.worldSeriesAppearances ?? 0}</div>
          <div className="font-heading text-xs text-dynasty-muted">Playoff trips: {dynastyScore?.breakdown.playoffAppearances ?? 0}</div>
          <div className="font-heading text-xs text-dynasty-muted">Division crowns: {dynastyScore?.breakdown.divisionTitles ?? 0}</div>
          <div className="font-heading text-xs text-dynasty-muted">90-win years: {dynastyScore?.breakdown.ninetyWinSeasons ?? 0}</div>
          <div className="font-heading text-xs text-dynasty-muted">Award winners: {dynastyScore?.breakdown.awardWinners ?? 0}</div>
        </div>
      </div>
    </DensePanel>
  );
}
