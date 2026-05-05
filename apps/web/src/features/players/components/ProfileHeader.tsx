import { useEffect, useRef } from 'react';
import { estimateProjectedWarRange, type MilestoneAlert } from '@mbd/sim-core';
import { Badge, Card, CardContent, GradeBar, StatLine } from '@mbd/ui';
import { Award, Quote } from 'lucide-react';
import { RatingBadge } from '@/shared/components/RatingBadge';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { getAudioEngine } from '@/shared/lib/audio';
import {
  badgeVariantForStoryPhase,
  badgeVariantForTrajectory,
  displayBand,
  isPitcherProfile,
  labelize,
  type PlayerProfileView,
  type PlayerProfilePlayerView,
} from './playerProfileShared';

export default function ProfileHeader({
  player,
  nicknames,
  milestoneAlerts,
}: {
  player: PlayerProfilePlayerView;
  nicknames: PlayerProfileView['nicknames'];
  milestoneAlerts: MilestoneAlert[];
}) {
  const isPitcher = isPitcherProfile(player);
  const primaryNickname = nicknames?.primaryNickname?.displayText ?? null;
  const previousNicknameRef = useRef<string | null>(null);
  const hasMountedRef = useRef(false);
  const projectedWar = estimateProjectedWarRange({
    overall: player.displayRating,
    floor: displayBand(player.floor),
    ceiling: displayBand(player.ceiling),
    isPitcher,
  });

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      previousNicknameRef.current = primaryNickname;
      return;
    }

    if (primaryNickname && previousNicknameRef.current !== primaryNickname) {
      getAudioEngine().playEffect('achievement_unlock');
    }
    previousNicknameRef.current = primaryNickname;
  }, [primaryNickname]);

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              <TeamLogo teamId={player.teamId} size="xs" />
              {player.teamId.toUpperCase()} · {player.rosterStatus}
            </div>
            {primaryNickname ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent-warning/30 bg-accent-warning/10 px-3 py-1 font-data text-[11px] uppercase tracking-[0.18em] text-accent-warning">
                <Quote className="h-3.5 w-3.5" />
                {primaryNickname}
              </div>
            ) : null}
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
            {milestoneAlerts.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {milestoneAlerts.slice(0, 3).map((alert) => (
                  <Badge
                    key={`${alert.playerId}-${alert.milestoneLabel}-${alert.threshold}`}
                    variant={alert.urgency === 'imminent' ? 'warning' : alert.urgency === 'close' ? 'info' : 'outline'}
                    className="gap-1.5 font-data text-[11px] uppercase tracking-[0.14em]"
                  >
                    <Award className="h-3.5 w-3.5" />
                    {alert.remaining} {alert.milestoneLabel} to {alert.threshold}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-5 py-4 text-right">
            <RatingBadge value={player.displayRating} grade={player.letterGrade} size="lg" />
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
