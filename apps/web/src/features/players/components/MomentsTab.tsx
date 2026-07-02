import { Badge } from '@mbd/ui';
import { GameRNG, formatMomentDescription } from '@mbd/sim-core';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import type { PlayerProfileView } from './playerProfileShared';

function roundLabel(value: NonNullable<PlayerProfileView['moments'][number]['round']>): string {
  switch (value) {
    case 'WC':
      return 'Wild Card';
    case 'DS':
      return 'Division Series';
    case 'CS':
      return 'Championship Series';
    case 'WS':
      return 'World Series';
  }
}

export default function MomentsTab({
  view,
}: {
  view: PlayerProfileView;
}) {
  if (!view.player) {
    return null;
  }

  const playerName = `${view.player.firstName} ${view.player.lastName}`;

  return (
    <DensePanel title="Signature Moments" bodyClassName="space-y-3">
      {view.moments.length === 0 ? (
        <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 font-heading text-sm text-dynasty-muted">
          No signature moments have been recorded for this player yet.
        </div>
      ) : (
        view.moments.map((moment, index) => {
          const positive = moment.impact >= 0;
          const fallbackDescription = formatMomentDescription(
            moment,
            playerName,
            new GameRNG((moment.season * 1000) + (moment.day ?? index + 1)),
          );

          return (
            <div
              key={`${moment.type}-${moment.season}-${moment.day ?? index}-${moment.timestamp ?? index}`}
              className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-full p-2 ${positive ? 'bg-accent-success/10 text-accent-success' : 'bg-accent-danger/10 text-accent-danger'}`}>
                    {positive ? <Sparkles className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-heading text-sm text-dynasty-textBright">
                      {moment.description || fallbackDescription}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant={positive ? 'success' : 'warning'}>
                        Impact {moment.impact > 0 ? `+${moment.impact}` : moment.impact}
                      </Badge>
                      <Badge variant="outline">
                        Relevance {moment.relevance.toFixed(2)}
                      </Badge>
                      <Badge variant="outline">
                        Season {moment.season}
                      </Badge>
                      {moment.day != null ? (
                        <Badge variant="outline">Day {moment.day}</Badge>
                      ) : null}
                      {moment.round ? (
                        <Badge variant="info">{roundLabel(moment.round)}</Badge>
                      ) : null}
                      {moment.worldSeriesClincher ? (
                        <Badge variant="warning">World Series Clincher</Badge>
                      ) : null}
                      {moment.isEliminationGame ? (
                        <Badge variant="warning">Elimination Game</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </DensePanel>
  );
}
