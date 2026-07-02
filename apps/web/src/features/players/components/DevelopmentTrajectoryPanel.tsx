import { Suspense, lazy } from 'react';
import { estimateProjectedWarRange } from '@mbd/sim-core';
import { Badge, Card, CardContent, CardHeader, CardTitle, GradeBar, Skeleton, StatLine } from '@mbd/ui';
import type { DevelopmentReportsView, PlayerProfilePlayerView } from './playerProfileShared';
import {
  badgeVariantForTrajectory,
  displayBand,
  isPitcherProfile,
  labelize,
} from './playerProfileShared';

const DevCurveChart = lazy(() => import('@/shared/components/charts/DevCurveChart'));

interface DevelopmentTrajectoryPanelProps {
  player: PlayerProfilePlayerView;
  history: DevelopmentReportsView['history'];
}

export default function DevelopmentTrajectoryPanel({
  player,
  history,
}: DevelopmentTrajectoryPanelProps): JSX.Element {
  const projectedWar = estimateProjectedWarRange({
    overall: player.displayRating,
    floor: displayBand(player.floor),
    ceiling: displayBand(player.ceiling),
    isPitcher: isPitcherProfile(player),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-dynasty-text">Development Trajectory</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              Current Program
            </div>
            <div className="mt-1 font-heading text-sm text-dynasty-text">
              {player.developmentProgram ? labelize(player.developmentProgram) : 'No assignment'}
            </div>
          </div>
          <Badge variant={badgeVariantForTrajectory(player.developmentTrajectory)}>
            {labelize(player.developmentTrajectory)}
          </Badge>
        </div>
        <div className="space-y-3">
          <GradeBar label="Floor" grade={displayBand(player.floor)} />
          <GradeBar label="Current" grade={player.displayRating} />
          <GradeBar label="Ceiling" grade={displayBand(player.ceiling)} />
        </div>
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
        {history.length ? (
          <Suspense fallback={<Skeleton className="h-48 rounded-lg" />}>
            <div className="mt-2" data-testid="dev-curve-chart">
              <DevCurveChart
                history={history}
                floor={displayBand(player.floor)}
                ceiling={displayBand(player.ceiling)}
              />
            </div>
          </Suspense>
        ) : null}
      </CardContent>
    </Card>
  );
}
