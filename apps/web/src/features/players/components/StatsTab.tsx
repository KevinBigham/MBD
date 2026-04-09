import { Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@mbd/ui';
import type { PlayerProfileView } from './playerProfileShared';
import {
  formatDecimal,
  formatInnings,
  isPitcherProfile,
} from './playerProfileShared';

const ProjectionsPanel = lazy(() => import('./ProjectionsPanel'));

function StatBlock({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="font-heading text-xs uppercase text-dynasty-muted">{label}</div>
      <div className={`mt-1 font-data text-2xl font-bold ${highlight ? 'text-accent-primary' : 'text-dynasty-text'}`}>
        {value}
      </div>
    </div>
  );
}

export default function StatsTab({
  view,
}: {
  view: PlayerProfileView;
}) {
  if (!view.player) {
    return null;
  }

  const { player, careerStats } = view;
  const isPitcher = isPitcherProfile(player);
  const advanced = player.advanced;

  return (
    <div className="space-y-6">
      {player.stats ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Season Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {isPitcher ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                <StatBlock label="ERA" value={player.stats.era} highlight />
                <StatBlock label="W-L" value={`${player.stats.wins}-${player.stats.losses}`} />
                <StatBlock label="K" value={String(player.stats.strikeouts)} />
                <StatBlock label="BB" value={String(player.stats.walks)} />
                <StatBlock label="H" value={String(player.stats.hitsAllowed)} />
                <StatBlock label="IP" value={formatInnings(player.stats.ip)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
                <StatBlock label="AVG" value={player.stats.avg} highlight />
                <StatBlock label="HR" value={String(player.stats.hr)} />
                <StatBlock label="RBI" value={String(player.stats.rbi)} />
                <StatBlock label="H" value={String(player.stats.hits)} />
                <StatBlock label="BB" value={String(player.stats.bb)} />
                <StatBlock label="K" value={String(player.stats.k)} />
                <StatBlock label="PA" value={String(player.stats.pa)} />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center font-heading text-sm text-dynasty-muted">
            No stats yet. Sim games to see this player&apos;s performance.
          </CardContent>
        </Card>
      )}

      {advanced ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Advanced Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {isPitcher ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <StatBlock label="WAR" value={formatDecimal(advanced.war, 1)} highlight />
                <StatBlock label="FIP" value={formatDecimal(advanced.fip, 2)} />
                <StatBlock label="xFIP" value={formatDecimal(advanced.xfip, 2)} />
                <StatBlock label="WHIP" value={formatDecimal(advanced.whip, 2)} />
                <StatBlock label="K/9" value={formatDecimal(advanced.kPer9, 1)} />
                <StatBlock label="K/BB" value={formatDecimal(advanced.kBb, 2)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <StatBlock label="WAR" value={formatDecimal(advanced.war, 1)} highlight />
                <StatBlock label="wOBA" value={formatDecimal(advanced.woba, 3)} />
                <StatBlock label="wRC+" value={formatDecimal(advanced.wrcPlus, 0)} />
                <StatBlock label="OPS+" value={formatDecimal(advanced.opsPlus, 0)} />
                <StatBlock label="ISO" value={formatDecimal(advanced.iso, 3)} />
                <StatBlock label="Peak" value={String(careerStats?.peakOverall ?? '--')} />
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {!player.historical && (
        <Suspense fallback={null}>
          <ProjectionsPanel playerId={player.id} />
        </Suspense>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-dynasty-text">Career Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {careerStats ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <StatBlock label="Seasons" value={String(careerStats.seasonsPlayed)} highlight />
                <StatBlock label="Peak OVR" value={String(careerStats.peakOverall)} />
                <StatBlock label="All-Star" value={String(careerStats.allStarSelections)} />
                <StatBlock label="Rings" value={String(careerStats.championshipRings)} />
                <StatBlock label="WAR" value={careerStats.war != null ? careerStats.war.toFixed(1) : '--'} />
                <StatBlock label="Games" value={careerStats.gamesPlayed != null ? String(careerStats.gamesPlayed) : '--'} />
              </div>

              {careerStats.batting ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <StatBlock label="Career H" value={String(careerStats.batting.hits)} />
                  <StatBlock label="Career HR" value={String(careerStats.batting.hr)} />
                  <StatBlock label="Career RBI" value={String(careerStats.batting.rbi)} />
                  <StatBlock label="Teams" value={String(careerStats.teamIds.length)} />
                </div>
              ) : null}

              {careerStats.pitching ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  <StatBlock label="Career W" value={String(careerStats.pitching.wins)} />
                  <StatBlock label="Career K" value={String(careerStats.pitching.strikeouts)} />
                  <StatBlock label="Career IP" value={careerStats.pitching.inningsPitched.toFixed(1)} />
                  <StatBlock
                    label="Career ERA"
                    value={careerStats.pitching.inningsPitched > 0
                      ? formatDecimal((careerStats.pitching.earnedRuns / careerStats.pitching.inningsPitched) * 9, 2)
                      : '--'}
                  />
                  <StatBlock label="Career SV" value={careerStats.saves != null ? String(careerStats.saves) : '--'} />
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 font-heading text-sm text-dynasty-muted">
              No career ledger has been recorded for this player yet.
            </div>
          )}

          <div className="rounded-lg border border-accent-info/30 bg-accent-info/10 px-4 py-3 font-heading text-sm text-accent-info">
            Split data is not tracked in v15.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
