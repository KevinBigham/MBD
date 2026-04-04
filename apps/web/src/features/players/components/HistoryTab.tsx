import { Badge, Card, CardContent, CardHeader, CardTitle, StatLine } from '@mbd/ui';
import type { PlayerProfileView } from './playerProfileShared';
import {
  badgeVariantForStoryPhase,
  labelize,
  moneyLabel,
} from './playerProfileShared';

export default function HistoryTab({
  view,
}: {
  view: PlayerProfileView;
}) {
  if (!view.player) {
    return null;
  }

  const { player, careerStats } = view;

  return (
    <div className="space-y-6">
      {player.historical && player.historicalSummary ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Historical Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="font-heading text-sm text-dynasty-text">
                {player.historicalSummary.fullName} is preserved as a retired franchise figure.
              </div>
              <div className="mt-2 font-heading text-xs text-dynasty-muted">
                {player.historicalSummary.retiredSeason != null
                  ? `Retired after Season ${player.historicalSummary.retiredSeason}`
                  : 'Retirement season unavailable'}
                {' · '}
                {player.historicalSummary.seasonsPlayed} seasons
              </div>
              <div className="mt-2 font-heading text-xs text-dynasty-muted">
                Last club: {player.historicalSummary.lastKnownTeamId.toUpperCase()}
              </div>
            </div>
            {player.historicalSummary.personalityTraits.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {player.historicalSummary.personalityTraits.map((trait) => (
                  <Badge key={trait} variant="outline">{trait}</Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {(player.activeStory || (player.storyHistory?.length ?? 0) > 0) ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Story Arc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {player.activeStory ? (
              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={badgeVariantForStoryPhase(player.activeStory.phase)}>
                    {player.activeStory.phase}
                  </Badge>
                  <span className="font-heading text-sm text-dynasty-text">
                    {labelize(player.activeStory.arcType)}
                  </span>
                </div>
                <div className="mt-3 font-heading text-sm text-dynasty-muted">
                  {player.activeStory.latestMilestone ?? `${player.firstName} ${player.lastName} is building momentum.`}
                </div>
                <div className="mt-2 font-data text-xs text-dynasty-muted">
                  Began S{player.activeStory.startSeason} · Day {player.activeStory.startDay}
                </div>
              </div>
            ) : null}

            {(player.storyHistory?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {(player.storyHistory ?? []).map((arc) => (
                  <div key={`${arc.arcType}-${arc.startSeason}-${arc.startDay}`} className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-heading text-sm text-dynasty-text">{labelize(arc.arcType)}</div>
                      <Badge variant={badgeVariantForStoryPhase(arc.phase)}>{arc.phase}</Badge>
                    </div>
                    <div className="mt-2 font-data text-xs text-dynasty-muted">
                      Started S{arc.startSeason} · Day {arc.startDay}
                      {arc.resolvedSeason != null ? ` · Resolved S${arc.resolvedSeason}` : ''}
                    </div>
                    {arc.milestones.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {arc.milestones.slice(-2).map((milestone) => (
                          <div key={milestone} className="font-heading text-sm text-dynasty-muted">
                            {milestone}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Extension History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {player.extensionHistory.length ? player.extensionHistory.map((entry) => (
              <div key={`${entry.season}-${entry.teamId}-${entry.years}`} className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-heading text-sm text-dynasty-text">Season {entry.season}</div>
                  <Badge variant={entry.outcome === 'accepted' ? 'success' : entry.outcome === 'rejected' ? 'warning' : 'outline'}>
                    {entry.outcome}
                  </Badge>
                </div>
                <StatLine
                  className="mt-2"
                  stats={[
                    { label: 'Team', value: entry.teamId.toUpperCase() },
                    { label: 'Years', value: entry.years },
                    { label: 'AAV', value: moneyLabel(entry.annualSalary) },
                    { label: 'Total', value: moneyLabel(entry.totalValue) },
                  ]}
                />
              </div>
            )) : (
              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 font-heading text-sm text-dynasty-muted">
                No extension negotiations recorded.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Legacy Ledger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {careerStats ? (
              <>
                <StatLine
                  stats={[
                    { label: 'Seasons', value: careerStats.seasonsPlayed },
                    { label: 'Peak OVR', value: careerStats.peakOverall },
                    { label: 'WAR', value: careerStats.war != null ? careerStats.war.toFixed(1) : '--' },
                  ]}
                />
                <StatLine
                  stats={[
                    { label: 'Rings', value: careerStats.championshipRings },
                    { label: 'All-Star', value: careerStats.allStarSelections },
                    { label: 'Teams', value: careerStats.teamIds.length },
                  ]}
                />
                <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-3 font-heading text-sm text-dynasty-text">
                  {careerStats.teamIds.length > 0
                    ? `Career clubs: ${careerStats.teamIds.map((teamId) => teamId.toUpperCase()).join(', ')}`
                    : 'Career club history is still empty.'}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 font-heading text-sm text-dynasty-muted">
                No legacy ledger is available for this player yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
