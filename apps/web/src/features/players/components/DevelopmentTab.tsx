import { Suspense, lazy } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton, StatLine } from '@mbd/ui';
import DevelopmentDecisionPanel from './DevelopmentDecisionPanel';
import DevelopmentTrajectoryPanel from './DevelopmentTrajectoryPanel';
import type { PlayerProfileView } from './playerProfileShared';
import {
  badgeVariantForSetback,
  badgeVariantForTrajectory,
  displayBand,
  formatMonth,
  formatMinorLevel,
  isPitcherProfile,
  labelize,
} from './playerProfileShared';

const CareerArcChart = lazy(() => import('@/shared/components/charts/CareerArcChart'));
const BreakoutIntelligencePanel = lazy(() => import('./BreakoutIntelligencePanel'));

export default function DevelopmentTab({
  view,
}: {
  view: PlayerProfileView;
}) {
  if (!view.player) {
    return null;
  }

  const { player, developmentReports } = view;
  const isPitcher = isPitcherProfile(player);

  return (
    <div className="space-y-6">
      {developmentReports?.developmentDecision ? (
        <DevelopmentDecisionPanel decision={developmentReports.developmentDecision} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <DevelopmentTrajectoryPanel player={player} history={developmentReports?.history ?? []} />

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Checkpoint History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {developmentReports?.history.length ? developmentReports.history.map((entry) => (
              <div key={`${entry.season}-${entry.month}`} className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-heading text-sm text-dynasty-text">
                    {formatMonth(entry.month)} S{entry.season}
                  </div>
                  <Badge variant={badgeVariantForTrajectory(entry.trajectory)}>
                    {entry.trajectory}
                  </Badge>
                </div>
                <div className="mt-2 font-heading text-sm text-dynasty-muted">{entry.summary}</div>
                <div className="mt-2 font-data text-xs text-dynasty-muted">
                  Overall {displayBand(entry.overallRating)}
                </div>
              </div>
            )) : (
              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 font-heading text-sm text-dynasty-muted">
                No monthly checkpoints recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!player.historical && (
        <Suspense fallback={null}>
          <BreakoutIntelligencePanel playerId={player.id} />
        </Suspense>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Conversion Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {developmentReports?.recommendations.length ? developmentReports.recommendations.map((entry) => (
              <div key={`${entry.playerId}-${entry.fromPosition}-${entry.toPosition}`} className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-heading text-sm text-dynasty-text">
                    {entry.fromPosition} to {entry.toPosition}
                  </div>
                  <Badge variant={entry.confidence >= 0.65 ? 'success' : 'info'}>
                    {Math.round(entry.confidence * 100)}%
                  </Badge>
                </div>
                <div className="mt-2 font-heading text-sm text-dynasty-muted">{entry.reason}</div>
              </div>
            )) : (
              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 font-heading text-sm text-dynasty-muted">
                No position-change recommendations on file.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Development Path</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {developmentReports?.minorLeagueProgression.length ? developmentReports.minorLeagueProgression.map((line) => (
              <div key={`${line.season}-${line.level}`} className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-heading text-sm text-dynasty-text">
                    S{line.season} · {formatMinorLevel(line.level)}
                  </div>
                  <div className="font-data text-xs text-dynasty-muted">
                    {line.gamesPlayed} G
                  </div>
                </div>
                <div className="mt-2 font-heading text-sm text-dynasty-muted">
                  {isPitcher
                    ? `${line.ip.toFixed(1)} IP · ${line.era.toFixed(2)} ERA · ${line.k} K · ${line.bb} BB`
                    : `${line.avg.toFixed(3).replace(/^0/, '')} AVG · ${line.hits} H · ${line.hr} HR · ${line.rbi} RBI · ${line.pa} PA`}
                </div>
              </div>
            )) : (
              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 font-heading text-sm text-dynasty-muted">
                No minor league progression recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-dynasty-text">Prospect Bond</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {developmentReports?.prospectBond ? (
            <>
              <StatLine
                stats={[
                  { label: 'Drafted', value: `S${developmentReports.prospectBond.draftedSeason}` },
                  { label: 'Bond', value: developmentReports.prospectBond.bondStrength },
                  { label: 'Loyalty', value: `${Math.round(developmentReports.prospectBond.loyaltyModifier * 100)}%` },
                ]}
              />
              <StatLine
                stats={[
                  { label: 'Level', value: formatMinorLevel(developmentReports.prospectBond.currentLevel) },
                  { label: 'Debut', value: developmentReports.prospectBond.debutSeason != null ? `S${developmentReports.prospectBond.debutSeason}` : '--' },
                  { label: 'Milestones', value: developmentReports.prospectBond.milestones.length },
                ]}
              />
            </>
          ) : null}

          {developmentReports?.activeSetback ? (
            <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-heading text-sm text-dynasty-text">Current Development Signal</div>
                <Badge variant={badgeVariantForSetback(developmentReports.activeSetback.type)}>
                  {labelize(developmentReports.activeSetback.type)}
                </Badge>
              </div>
              <div className="mt-2 font-heading text-sm text-dynasty-muted">{developmentReports.activeSetback.summary}</div>
              <div className="mt-2 font-data text-xs text-dynasty-muted">
                Modifier {developmentReports.activeSetback.overallModifier > 0 ? '+' : ''}
                {developmentReports.activeSetback.overallModifier}
                {' · '}
                Through {formatMonth(developmentReports.activeSetback.endMonth)} S{developmentReports.activeSetback.endSeason}
              </div>
            </div>
          ) : null}

          {developmentReports?.prospectBond?.milestones.length ? (
            <div className="space-y-2">
              {developmentReports.prospectBond.milestones.map((milestone) => (
                <div key={milestone} className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-3 py-3 font-heading text-sm text-dynasty-muted">
                  {milestone}
                </div>
              ))}
            </div>
          ) : null}

          {!developmentReports?.prospectBond && !developmentReports?.activeSetback ? (
            <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 font-heading text-sm text-dynasty-muted">
              No homegrown bond data recorded for this player.
            </div>
          ) : null}
        </CardContent>
      </Card>

      {developmentReports?.history.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Career Rating Arc</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-44 rounded-lg" />}>
              <div data-testid="career-arc-chart">
                <CareerArcChart history={developmentReports.history} />
              </div>
            </Suspense>
          </CardContent>
        </Card>
      ) : null}

      {developmentReports?.debutFlashback ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Debut Flashback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="font-heading text-sm text-dynasty-text">
                Season {developmentReports.debutFlashback.draftSeason} · Round {developmentReports.debutFlashback.draftRound}
              </div>
              <div className="mt-2 font-heading text-sm text-dynasty-muted">
                Original grade {developmentReports.debutFlashback.originalGrade} to debut overall {developmentReports.debutFlashback.debutOverall}.
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {developmentReports.debutFlashback.journeyHighlights.map((highlight) => (
                <div key={highlight} className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-3 py-3 font-heading text-sm text-dynasty-muted">
                  {highlight}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
