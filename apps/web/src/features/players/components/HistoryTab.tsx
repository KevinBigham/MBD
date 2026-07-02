import { Badge, Card, CardContent, CardHeader, CardTitle, StatLine } from '@mbd/ui';
import type { PlayerProfileView } from './playerProfileShared';
import { moneyLabel } from './playerProfileShared';

export default function HistoryTab({
  view,
}: {
  view: PlayerProfileView;
}) {
  if (!view.player) {
    return null;
  }

  const { player, careerStats, developmentReports } = view;
  const draftOutcome = developmentReports?.draftOutcome ?? null;

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

      {draftOutcome ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="font-heading text-dynasty-text">Draft Outcome</CardTitle>
              <Badge variant={draftOutcome.signed === true ? 'success' : draftOutcome.signed === false ? 'warning' : 'outline'}>
                {draftOutcome.signed === true
                  ? 'Signed'
                  : draftOutcome.signed === false
                    ? 'Unsigned'
                    : 'Decision Unknown'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="font-heading text-sm text-dynasty-text">{draftOutcome.summary}</div>
              <div className="mt-2 font-heading text-xs text-dynasty-muted">
                Drafted by {draftOutcome.teamName}
              </div>
            </div>
            <StatLine
              stats={[
                { label: 'Season', value: `S${draftOutcome.season}` },
                { label: 'Round', value: draftOutcome.round ?? '--' },
                { label: 'Pick', value: draftOutcome.pickNumber ?? '--' },
                { label: 'Current', value: draftOutcome.currentLevel ?? draftOutcome.currentStatus },
              ]}
            />
            <StatLine
              stats={[
                { label: 'Original Grade', value: draftOutcome.originalGrade ?? '--' },
                { label: 'Bonus', value: draftOutcome.bonusAmount != null ? moneyLabel(draftOutcome.bonusAmount) : '--' },
                { label: 'Bond', value: draftOutcome.bondStrength ?? '--' },
                {
                  label: 'Loyalty',
                  value: draftOutcome.loyaltyModifier != null
                    ? `${Math.round(draftOutcome.loyaltyModifier * 100)}%`
                    : '--',
                },
              ]}
            />
            {draftOutcome.milestones.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {draftOutcome.milestones.map((milestone) => (
                  <div
                    key={milestone}
                    className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-xs text-dynasty-muted"
                  >
                    {milestone}
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
