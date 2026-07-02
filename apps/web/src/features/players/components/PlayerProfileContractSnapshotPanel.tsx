import { Badge, StatLine } from '@mbd/ui';
import { DensePanel } from '@/shared/components/DensePanel';
import { formatMinorLevel, moneyLabel, type PlayerProfilePlayerView } from './playerProfileShared';

export interface PlayerProfileContractSnapshotPanelProps {
  player: Pick<
    PlayerProfilePlayerView,
    'contract' | 'rosterStatus' | 'minorLeagueLevel' | 'isOutOfOptions' | 'optionYearsUsed' | 'serviceTimeDays'
  >;
}

export default function PlayerProfileContractSnapshotPanel({
  player,
}: PlayerProfileContractSnapshotPanelProps) {
  return (
    <DensePanel title="Contract Snapshot" bodyClassName="space-y-4">
      <StatLine
        stats={[
          { label: 'Years', value: player.contract.years },
          { label: 'AAV', value: moneyLabel(player.contract.annualSalary) },
          { label: 'Total', value: moneyLabel(player.contract.totalValue) },
        ]}
      />
      <StatLine
        stats={[
          { label: 'Bonus', value: moneyLabel(player.contract.signingBonus) },
          { label: 'Opt-Outs', value: player.contract.optOutYears.length || '--' },
          { label: 'NTC', value: player.contract.noTradeClause ? player.contract.noTradeClauseType : 'none' },
        ]}
      />
      <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-3">
        <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
          Roster Context
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="outline">{formatMinorLevel(player.rosterStatus)}</Badge>
          {player.minorLeagueLevel ? (
            <Badge variant="outline">{formatMinorLevel(player.minorLeagueLevel)}</Badge>
          ) : null}
          {player.isOutOfOptions ? (
            <Badge variant="warning">Out of Options</Badge>
          ) : (
            <Badge variant="info">Options Used {player.optionYearsUsed}</Badge>
          )}
        </div>
        <div className="mt-3 font-heading text-sm text-dynasty-muted">
          Service time: {Math.floor(player.serviceTimeDays / 172)} years · {player.serviceTimeDays % 172} days
        </div>
      </div>
    </DensePanel>
  );
}
