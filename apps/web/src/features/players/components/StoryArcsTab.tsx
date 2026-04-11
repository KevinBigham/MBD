import { Badge, Card, CardContent, CardHeader, CardTitle } from '@mbd/ui';
import { ProgressFill } from '@/shared/components/ProgressFill';
import type { PlayerProfileView } from './playerProfileShared';
import {
  badgeVariantForStoryPhase,
  labelize,
  storyPhaseProgress,
} from './playerProfileShared';

export default function StoryArcsTab({
  view,
}: {
  view: PlayerProfileView;
}) {
  if (!view.player) {
    return null;
  }
  const player = view.player;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-dynasty-text">Story Arcs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {view.storyArcs.length === 0 ? (
          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 font-heading text-sm text-dynasty-muted">
            No active or archived story arcs are attached to this player yet.
          </div>
        ) : (
          view.storyArcs.map((arc) => (
            <div
              key={`${arc.playerId}-${arc.arcType}-${arc.startSeason}-${arc.startDay}`}
              className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-heading text-sm text-dynasty-textBright">
                    {labelize(arc.arcType)}
                  </div>
                  <div className="mt-1 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                    Started S{arc.startSeason} · Day {arc.startDay}
                    {arc.resolvedSeason != null ? ` · Resolved S${arc.resolvedSeason}` : ''}
                  </div>
                </div>
                <Badge variant={badgeVariantForStoryPhase(arc.phase)}>
                  {arc.phase}
                </Badge>
              </div>

              <div className="mt-3">
                <ProgressFill toneClassName="bg-accent-primary" value={storyPhaseProgress(arc.phase)} />
              </div>
              <div className="mt-2 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                Progress {storyPhaseProgress(arc.phase)}%
              </div>
              <div className="mt-3 font-heading text-sm text-dynasty-text">
                {arc.milestones.at(-1) ?? `${player.firstName} ${player.lastName} is building a new narrative thread.`}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
