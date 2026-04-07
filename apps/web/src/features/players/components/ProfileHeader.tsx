import { estimateProjectedWarRange } from '@mbd/sim-core';
import { Badge, Card, CardContent, GradeBar, StatLine } from '@mbd/ui';
import { TeamLogo } from '@/shared/components/TeamLogo';
import {
  badgeVariantForStoryPhase,
  badgeVariantForTrajectory,
  displayBand,
  gradeColor,
  isPitcherProfile,
  labelize,
  type PlayerProfilePlayerView,
} from './playerProfileShared';

export default function ProfileHeader({
  player,
}: {
  player: PlayerProfilePlayerView;
}) {
  const isPitcher = isPitcherProfile(player);
  const projectedWar = estimateProjectedWarRange({
    overall: player.displayRating,
    floor: displayBand(player.floor),
    ceiling: displayBand(player.ceiling),
    isPitcher,
  });

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              <TeamLogo teamId={player.teamId} size="xs" />
              {player.teamId.toUpperCase()} · {player.rosterStatus}
            </div>
            <h1 className="mt-2 font-brand text-4xl tracking-wide text-dynasty-textBright">
              {player.firstName} {player.lastName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{player.position}</Badge>
              <Badge variant="info">Age {player.age}</Badge>
              <Badge variant={badgeVariantForTrajectory(player.developmentTrajectory)}>
                {labelize(player.developmentTrajectory)}
              </Badge>
              {player.activeStory ? (
                <Badge variant={badgeVariantForStoryPhase(player.activeStory.phase)}>
                  {labelize(player.activeStory.arcType)}
                </Badge>
              ) : null}
              {player.historical ? (
                <Badge variant="warning">Historical</Badge>
              ) : null}
            </div>
            {player.activeStory?.latestMilestone ? (
              <p className="mt-4 max-w-3xl rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-3 font-heading text-sm text-dynasty-text">
                {player.activeStory.latestMilestone}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-dynasty-border bg-dynasty-elevated px-6 py-5 text-right">
            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              Display Grade
            </div>
            <div className="mt-2 font-data text-5xl font-bold text-dynasty-textBright">
              {player.displayRating}
            </div>
            <div className={`mt-2 inline-flex rounded px-3 py-1 font-data text-xl font-bold ${gradeColor(player.letterGrade)}`}>
              {player.letterGrade}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <GradeBar label="Floor" grade={displayBand(player.floor)} />
            <GradeBar label="Current" grade={player.displayRating} />
            <GradeBar label="Ceiling" grade={displayBand(player.ceiling)} />
          </div>

          <div className="space-y-3 rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
            <StatLine
              stats={[
                { label: 'Floor', value: displayBand(player.floor) || '--' },
                { label: 'Current', value: player.displayRating },
                { label: 'Ceiling', value: displayBand(player.ceiling) || '--' },
              ]}
            />
            <StatLine
              stats={[
                { label: 'WAR Floor', value: projectedWar.floorWar?.toFixed(1) ?? '--' },
                { label: 'WAR Now', value: projectedWar.currentWar.toFixed(1) },
                { label: 'WAR Ceiling', value: projectedWar.ceilingWar?.toFixed(1) ?? '--' },
              ]}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
