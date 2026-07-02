import type { PlayoffSeriesState } from '@mbd/sim-core';
import type { SeasonFlowPreviewSeries } from '@/app/layout/seasonFlow';
import { TeamLogo } from '@/shared/components/TeamLogo';

interface PlayoffPreviewGridProps {
  liveSeries: ReadonlyMap<string, PlayoffSeriesState>;
  playoffPreview: SeasonFlowPreviewSeries[];
}

const ROUND_LABELS: Array<{ key: string; label: string }> = [
  { key: 'Wild Card', label: 'Wild Card' },
  { key: 'Division Series', label: 'Division Series' },
  { key: 'Championship Series', label: 'Championship Series' },
  { key: 'World Series', label: 'World Series' },
];

function teamName(teamId: string | null, fallback: string): string {
  return teamId ? teamId.toUpperCase() : fallback;
}

export default function PlayoffPreviewGrid({
  liveSeries,
  playoffPreview,
}: PlayoffPreviewGridProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-4">
      {ROUND_LABELS.map((round) => {
        const cards = playoffPreview.filter((entry) => entry.round === round.key);
        return (
          <div key={round.key} className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-info">{round.label}</div>
            <div className="mt-3 space-y-3">
              {cards.length > 0 ? cards.map((card) => {
                const live = liveSeries.get(card.id);
                return (
                  <div key={card.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                    <div className="flex items-center justify-between font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                      <span>{card.id}</span>
                      <span>Best of {card.bestOf}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 font-heading text-sm text-dynasty-text">
                        {live?.higherSeed.teamId && <TeamLogo teamId={live.higherSeed.teamId} size="xs" />}
                        {live ? `${live.higherSeed.seed} ${teamName(live.higherSeed.teamId, card.home.teamName)}` : `${card.home.seed ?? ''} ${card.home.teamName}`.trim()}
                      </div>
                      <div className="flex items-center gap-2 font-heading text-sm text-dynasty-text">
                        {live?.lowerSeed.teamId && <TeamLogo teamId={live.lowerSeed.teamId} size="xs" />}
                        {live ? `${live.lowerSeed.seed} ${teamName(live.lowerSeed.teamId, card.away.teamName)}` : `${card.away.seed ?? ''} ${card.away.teamName}`.trim()}
                      </div>
                    </div>
                    <div className="mt-3 font-data text-xs text-dynasty-muted">
                      {live ? live.leaderSummary : 'Awaiting matchup'}
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
                  Round will populate once the bracket is set.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
