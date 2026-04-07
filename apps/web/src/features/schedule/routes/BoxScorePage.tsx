import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { TeamLogo } from '@/shared/components/TeamLogo';

interface PlayEntry {
  inning: number;
  halfInning: 'top' | 'bottom';
  text: string;
  isHighlight: boolean;
}

interface BoxScoreData {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  innings: number;
  homeHits: number;
  awayHits: number;
}

interface GamePlayByPlayView {
  gameIndex: number;
  recap: string;
  highlights: { inning: number; halfInning: string; text: string }[];
  plays: PlayEntry[];
  boxScore: BoxScoreData;
}

export default function BoxScorePage() {
  const { gameIndex: gameIndexParam } = useParams<{ gameIndex: string }>();
  const gameIndex = Number(gameIndexParam);
  const worker = useWorker();
  const { isInitialized } = useGameStore();
  const [data, setData] = useState<GamePlayByPlayView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isInitialized || !worker.isReady || Number.isNaN(gameIndex)) return;
    setLoading(true);
    void (async () => {
      const result = await worker.getGamePlayByPlay(gameIndex);
      setData(result as GamePlayByPlayView | null);
      setLoading(false);
    })();
  }, [isInitialized, worker.isReady, gameIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="font-data text-sm text-dynasty-muted">Loading box score...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link
          to="/schedule"
          className="focus-ring inline-flex items-center gap-1 rounded text-sm text-dynasty-muted transition-colors hover:text-dynasty-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Schedule
        </Link>
        <div className="py-12 text-center font-heading text-sm text-dynasty-muted">
          Game not found.
        </div>
      </div>
    );
  }

  const { boxScore, recap, plays } = data;

  // Group plays by inning
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

  // Build linescore columns
  const inningColumns = Array.from({ length: boxScore.innings }, (_, i) => i + 1);

  // Compute per-inning run totals from plays
  const awayRunsByInning = new Map<number, number>();
  const homeRunsByInning = new Map<number, number>();
  for (const play of plays) {
    // Each play text may describe runs scored; for a simple linescore we count
    // plays per half-inning. We'll derive from boxScore paResults if available,
    // but since we only have text, use a simple display approach.
    // Actually, we don't have run data per play text. Show dashes for individual innings
    // and just show R/H totals.
  }

  return (
    <div className="space-y-6">
      <Link
        to="/schedule"
        className="focus-ring inline-flex items-center gap-1 rounded text-sm text-dynasty-muted transition-colors hover:text-dynasty-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Schedule
      </Link>

      {/* Score header */}
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

      {/* Linescore */}
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
                  {getInningRuns(plays, inn, 'top')}
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
                  {getInningRuns(plays, inn, 'bottom')}
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

      {/* Recap */}
      {recap && (
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <h2 className="mb-2 font-heading text-sm font-semibold text-dynasty-text">Game Recap</h2>
          <p className="font-heading text-sm leading-relaxed text-dynasty-muted">{recap}</p>
        </div>
      )}

      {/* Play-by-play */}
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

/** Count scoring plays in a half-inning from play text heuristics. */
function getInningRuns(plays: PlayEntry[], inning: number, halfInning: 'top' | 'bottom'): string {
  const inningPlays = plays.filter((p) => p.inning === inning && p.halfInning === halfInning);
  if (inningPlays.length === 0) return '-';

  // Count mentions of "scores", "home run", "homers" in play text as approximate run indicators
  let runs = 0;
  for (const play of inningPlays) {
    const text = play.text.toLowerCase();
    // Count "scores" occurrences
    const scoreMatches = text.match(/\bscores?\b/g);
    if (scoreMatches) runs += scoreMatches.length;
    // Solo home runs mention the batter homering (1 run)
    if (/\bhome\s*run\b|\bhomers?\b/i.test(text) && !scoreMatches) runs += 1;
  }
  return String(runs);
}

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const value = n % 100;
  return `${n}${suffixes[(value - 20) % 10] ?? suffixes[value] ?? suffixes[0]}`;
}
