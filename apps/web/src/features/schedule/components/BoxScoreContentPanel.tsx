import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TeamLogo } from '@/shared/components/TeamLogo';

export interface PlayEntry {
  inning: number;
  halfInning: 'top' | 'bottom';
  text: string;
  isHighlight: boolean;
}

export interface BoxScoreData {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  innings: number;
  homeHits: number;
  awayHits: number;
}

export interface LineScoreEntry {
  inning: number;
  awayRuns: number;
  homeRuns: number;
}

export interface GamePlayByPlayView {
  gameIndex?: number;
  archivedGameId?: string;
  recap: string;
  highlights: { inning: number; halfInning: string; text: string }[];
  plays: PlayEntry[];
  lineScore?: LineScoreEntry[];
  boxScore: BoxScoreData;
}

interface BoxScoreContentPanelProps {
  data: GamePlayByPlayView;
  enhancedPlayByPlaySlot: ReactNode;
}

export default function BoxScoreContentPanel({ data, enhancedPlayByPlaySlot }: BoxScoreContentPanelProps) {
  const { boxScore, recap, plays } = data;

  const playsByInning = new Map<string, PlayEntry[]>();
  for (const play of plays) {
    const key = `${play.inning}-${play.halfInning}`;
    const group = playsByInning.get(key);
    if (group) {
      group.push(play);
    } else {
      playsByInning.set(key, [play]);
    }
  }

  const inningColumns = Array.from({ length: boxScore.innings }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <Link
        to="/schedule"
        className="focus-ring inline-flex items-center gap-1 rounded text-sm text-dynasty-muted transition-colors hover:text-dynasty-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Schedule
      </Link>

      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-2">
            <TeamLogo teamId={boxScore.awayTeamId} size="lg" />
            <div className="font-heading text-lg font-bold text-dynasty-text">
              {boxScore.awayTeamId.toUpperCase()}
            </div>
            <div className="font-data text-3xl font-bold text-dynasty-text">
              {boxScore.awayScore}
            </div>
          </div>
          <div className="font-heading text-sm text-dynasty-muted">FINAL</div>
          <div className="flex flex-col items-center gap-2">
            <TeamLogo teamId={boxScore.homeTeamId} size="lg" />
            <div className="font-heading text-lg font-bold text-dynasty-text">
              {boxScore.homeTeamId.toUpperCase()}
            </div>
            <div className="font-data text-3xl font-bold text-dynasty-text">
              {boxScore.homeScore}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-dynasty-border bg-dynasty-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dynasty-border text-xs text-dynasty-muted">
              <th className="px-4 py-2 text-left font-heading">Team</th>
              {inningColumns.map((inn) => (
                <th key={inn} className="px-2 py-2 text-center font-data">{inn}</th>
              ))}
              <th className="border-l border-dynasty-border px-3 py-2 text-center font-data font-bold">R</th>
              <th className="px-3 py-2 text-center font-data font-bold">H</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-dynasty-border/50 text-sm">
              <td className="px-4 py-2 font-heading font-medium text-dynasty-text">
                {boxScore.awayTeamId.toUpperCase()}
              </td>
              {inningColumns.map((inn) => (
                <td key={inn} className="px-2 py-2 text-center font-data text-dynasty-muted">
                  {getInningRuns(data.lineScore, plays, inn, 'top')}
                </td>
              ))}
              <td className="border-l border-dynasty-border px-3 py-2 text-center font-data font-bold text-dynasty-text">
                {boxScore.awayScore}
              </td>
              <td className="px-3 py-2 text-center font-data text-dynasty-text">
                {boxScore.awayHits}
              </td>
            </tr>
            <tr className="text-sm">
              <td className="px-4 py-2 font-heading font-medium text-dynasty-text">
                {boxScore.homeTeamId.toUpperCase()}
              </td>
              {inningColumns.map((inn) => (
                <td key={inn} className="px-2 py-2 text-center font-data text-dynasty-muted">
                  {getInningRuns(data.lineScore, plays, inn, 'bottom')}
                </td>
              ))}
              <td className="border-l border-dynasty-border px-3 py-2 text-center font-data font-bold text-dynasty-text">
                {boxScore.homeScore}
              </td>
              <td className="px-3 py-2 text-center font-data text-dynasty-text">
                {boxScore.homeHits}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {recap && (
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <h2 className="mb-2 font-heading text-sm font-semibold text-dynasty-text">Game Recap</h2>
          <p className="font-heading text-sm leading-relaxed text-dynasty-muted">{recap}</p>
        </div>
      )}

      {enhancedPlayByPlaySlot}

      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
        <div className="border-b border-dynasty-border px-4 py-3">
          <h2 className="font-heading text-sm font-semibold text-dynasty-text">Play-by-Play</h2>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {Array.from(playsByInning.entries()).map(([key, inningPlays]) => {
            const [inning, half] = key.split('-');
            const halfLabel = half === 'top' ? 'Top' : 'Bottom';
            return (
              <div key={key}>
                <div className="sticky top-0 border-b border-dynasty-border bg-dynasty-elevated px-4 py-2">
                  <span className="font-heading text-xs font-semibold uppercase tracking-wider text-dynasty-muted">
                    {halfLabel} of the {ordinal(Number(inning))}
                  </span>
                </div>
                {inningPlays.map((play, idx) => (
                  <div
                    key={idx}
                    className={[
                      'border-b border-dynasty-border/30 px-4 py-2 font-heading text-sm',
                      play.isHighlight
                        ? 'border-l-2 border-l-accent-primary bg-accent-primary/5 text-accent-primary'
                        : 'text-dynasty-muted',
                    ].join(' ')}
                  >
                    {play.text}
                  </div>
                ))}
              </div>
            );
          })}
          {plays.length === 0 && (
            <div className="px-4 py-8 text-center font-heading text-sm text-dynasty-muted">
              No play-by-play available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getInningRuns(
  lineScore: LineScoreEntry[] | undefined,
  plays: PlayEntry[],
  inning: number,
  halfInning: 'top' | 'bottom',
): string {
  const scoreEntry = lineScore?.find((entry) => entry.inning === inning);
  if (scoreEntry) {
    return String(halfInning === 'top' ? scoreEntry.awayRuns : scoreEntry.homeRuns);
  }

  const inningPlays = plays.filter((p) => p.inning === inning && p.halfInning === halfInning);
  if (inningPlays.length === 0) return '-';

  let runs = 0;
  for (const play of inningPlays) {
    const text = play.text.toLowerCase();
    const scoreMatches = text.match(/\bscores?\b/g);
    if (scoreMatches) runs += scoreMatches.length;
    if (/\bhome\s*run\b|\bhomers?\b/i.test(text) && !scoreMatches) runs += 1;
  }
  return String(runs);
}

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const value = n % 100;
  return `${n}${suffixes[(value - 20) % 10] ?? suffixes[value] ?? suffixes[0]}`;
}
