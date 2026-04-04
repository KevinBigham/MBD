import { Mic2, RadioTower } from 'lucide-react';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import {
  buildPlayByPlayGroups,
  deriveLineScore,
  teamAbbreviation,
  formatInningsLabel,
  type GamePlayByPlayView,
} from './gameDayBroadcast';

interface PlayByPlayPanelProps {
  detail: GamePlayByPlayView | null;
  loading?: boolean;
}

export default function PlayByPlayPanel({
  detail,
  loading = false,
}: PlayByPlayPanelProps) {
  if (loading && detail == null) {
    return (
      <section className="rounded-xl border border-dynasty-border bg-dynasty-surface p-4">
        <div className="flex items-center gap-2">
          <Mic2 className="h-4 w-4 text-accent-info" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Broadcast Booth</h2>
        </div>
        <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading the latest call sheet...</div>
      </section>
    );
  }

  if (detail == null) {
    return (
      <section className="rounded-xl border border-dynasty-border bg-dynasty-surface p-4">
        <div className="flex items-center gap-2">
          <Mic2 className="h-4 w-4 text-accent-info" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Broadcast Booth</h2>
        </div>
        <EmptyStatePanel
          className="mt-4 border-dynasty-border/60 bg-dynasty-elevated"
          title="No game selected"
          description="Pick one of the recent recaps to load the booth feed, highlight reel, and inning-by-inning call."
        />
      </section>
    );
  }

  const linescore = deriveLineScore(detail.boxScore);
  const playGroups = buildPlayByPlayGroups(detail.plays);
  const inningHeaders = Array.from({ length: detail.boxScore.innings }, (_, index) => index + 1);

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-surface p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Mic2 className="h-4 w-4 text-accent-info" />
            <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Broadcast Booth</h2>
          </div>
          <div className="mt-2 font-heading text-lg text-dynasty-textBright">
            {teamAbbreviation(detail.boxScore.awayTeamId)} {detail.boxScore.awayScore} at {teamAbbreviation(detail.boxScore.homeTeamId)} {detail.boxScore.homeScore}
          </div>
          <div className="mt-2 font-heading text-sm text-dynasty-muted">{detail.recap}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-dynasty-border px-3 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
            {formatInningsLabel(detail.boxScore.innings)}
          </span>
          <span className="rounded-full border border-dynasty-border px-3 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
            {detail.highlights.length} highlights
          </span>
          <span className="rounded-full border border-dynasty-border px-3 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
            {detail.plays.length} calls
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dynasty-border/70 bg-dynasty-elevated p-4">
        <div className="flex items-center gap-2">
          <RadioTower className="h-4 w-4 text-accent-warning" />
          <h3 className="font-heading text-sm font-semibold text-dynasty-textBright">Highlight Reel</h3>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {detail.highlights.map((highlight, index) => (
            <div key={`${highlight.type}-${index}`} className="rounded-lg border border-dynasty-border bg-dynasty-surface p-3">
              <div className="font-data text-[10px] uppercase tracking-[0.16em] text-accent-warning">
                {highlight.type.replaceAll('_', ' ')}
              </div>
              <div className="mt-2 font-heading text-sm text-dynasty-text">{highlight.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dynasty-border/70 bg-dynasty-elevated p-4">
        <div className="font-heading text-sm font-semibold text-dynasty-textBright">Linescore</div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                <th className="pr-3 text-left">Team</th>
                {inningHeaders.map((inning) => (
                  <th key={inning} className="px-2 text-center">{inning}</th>
                ))}
                <th className="px-2 text-center">R</th>
                <th className="px-2 text-center">H</th>
              </tr>
            </thead>
            <tbody>
              {linescore.map((row) => (
                <tr key={row.teamId} className="rounded-lg bg-dynasty-surface font-heading text-sm text-dynasty-textBright">
                  <td className="rounded-l-lg px-3 py-2">{row.teamAbbreviation}</td>
                  {row.runsByInning.map((value, index) => (
                    <td key={`${row.teamId}-${index + 1}`} className="px-2 py-2 text-center text-dynasty-text">
                      {value}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center">{row.runs}</td>
                  <td className="rounded-r-lg px-2 py-2 text-center">{row.hits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {playGroups.map((group) => (
          <section key={group.key} className="rounded-xl border border-dynasty-border/70 bg-dynasty-elevated p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-heading text-sm font-semibold text-dynasty-textBright">{group.heading}</div>
              <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                {group.plays.length} call{group.plays.length === 1 ? '' : 's'}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {group.plays.map((play, index) => (
                <div key={`${group.key}-${index}`} className="rounded-lg border border-dynasty-border bg-dynasty-surface px-3 py-2">
                  <div className="flex items-start gap-3">
                    {play.isHighlight ? (
                      <span className="rounded-full border border-accent-warning/40 bg-accent-warning/10 px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.16em] text-accent-warning">
                        Highlight
                      </span>
                    ) : null}
                    <div className="font-heading text-sm text-dynasty-text">{play.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
