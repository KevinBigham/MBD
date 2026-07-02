import { Award } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';

export interface HallOfFameEntryView {
  playerId: string;
  playerName: string;
  position: string;
  seasonsPlayed: number;
  teamIds: string[];
  inductionSeason: number;
  score: number;
  inductionType: string;
  careerStats: {
    batting: { hits: number; hr: number; rbi: number } | null;
    pitching: { wins: number; strikeouts: number; inningsPitched: number; earnedRuns: number } | null;
  };
}

interface HallOfFamePanelProps {
  hallOfFame: HallOfFameEntryView[];
  teamName: (teamId: string | null) => string;
}

export default function HallOfFamePanel({ hallOfFame, teamName }: HallOfFamePanelProps) {
  return (
    <DensePanel
      title="Hall of Fame"
      icon={<Award className="h-4 w-4 text-accent-success" />}
      titleClassName="text-dynasty-textBright"
      bodyClassName="space-y-3"
    >
      {hallOfFame.length > 0 ? hallOfFame.map((entry) => (
        <div key={`${entry.playerId}-${entry.inductionSeason}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-heading text-sm text-dynasty-text">{entry.playerName}</div>
            <div className="font-data text-xs text-dynasty-muted">Season {entry.inductionSeason}</div>
          </div>
          <div className="mt-1 font-heading text-xs text-dynasty-muted">
            {entry.position} · {entry.seasonsPlayed} seasons · {entry.score} score
          </div>
          <div className="mt-2 font-heading text-xs text-dynasty-muted">
            {entry.teamIds.map((teamId) => teamName(teamId)).join(', ')}
          </div>
          <div className="mt-2 font-heading text-xs text-dynasty-muted">
            {entry.careerStats.batting
              ? `${entry.careerStats.batting.hits} hits · ${entry.careerStats.batting.hr} HR · ${entry.careerStats.batting.rbi} RBI`
              : `${entry.careerStats.pitching?.wins ?? 0} wins · ${entry.careerStats.pitching?.strikeouts ?? 0} strikeouts`}
          </div>
        </div>
      )) : (
        <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
          Retired legends will appear here once the Hall of Fame begins to fill.
        </div>
      )}
    </DensePanel>
  );
}
