import { Link } from 'react-router-dom';
import { DensePanel } from '@/shared/components/DensePanel';
import { ResponsiveTable, type ColumnDef } from '@/shared/components/ResponsiveTable';
import { gradeBadgeColor } from '@/shared/lib/grade';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

export interface RosterMinorLevelTableProps {
  levelKey: string;
  levelLabel: string;
  players: PlayerDTO[];
  busyAction: string | null;
  onPromotePlayer: (player: PlayerDTO, levelLabel: string) => void;
}

function renderPlayerName(player: PlayerDTO) {
  return (
    <Link
      to={`/players/${player.id}`}
      className="font-heading font-medium text-dynasty-text hover:text-accent-primary"
    >
      {player.firstName} {player.lastName}
    </Link>
  );
}

function renderGrade(player: PlayerDTO) {
  return (
    <span className={`inline-block w-6 rounded text-center font-data text-xs font-bold ${gradeBadgeColor(player.letterGrade)}`}>
      {player.letterGrade}
    </span>
  );
}

function buildMinorColumns(
  levelKey: string,
  levelLabel: string,
  busyAction: string | null,
  onPromotePlayer: (player: PlayerDTO, levelLabel: string) => void,
): ColumnDef<PlayerDTO>[] {
  return [
    {
      key: 'player',
      label: 'Player',
      primary: true,
      render: renderPlayerName,
    },
    {
      key: 'position',
      label: 'POS',
      render: (player) => player.position,
    },
    {
      key: 'overall',
      label: 'OVR',
      className: 'text-right',
      highlight: true,
      render: (player) => player.displayRating,
    },
    {
      key: 'grade',
      label: 'GRD',
      className: 'text-center',
      render: renderGrade,
    },
    {
      key: 'age',
      label: 'AGE',
      className: 'text-right',
      render: (player) => player.age,
    },
    {
      key: 'options',
      label: 'OPT',
      className: 'text-right',
      render: (player) => `${player.optionYearsUsed}${player.isOutOfOptions ? ' / OOO' : ''}`,
    },
    {
      key: 'action',
      label: 'Action',
      className: 'text-right',
      mobileClassName: 'col-span-3',
      render: (player) => levelKey !== 'INTERNATIONAL'
        ? (
          <button
            type="button"
            data-mobile-critical-control="roster-promote"
            onClick={() => onPromotePlayer(player, levelLabel)}
            disabled={busyAction === `promote-${player.id}`}
            className="mobile-critical-control w-full rounded border border-accent-success/50 px-3 py-2 font-heading text-xs text-accent-success transition-colors hover:bg-accent-success/10 disabled:opacity-50 md:w-auto md:px-2 md:py-1"
          >
            Promote
          </button>
        )
        : <span className="font-heading text-xs text-dynasty-muted">Intake only</span>,
    },
  ];
}

export function RosterMinorLevelTable({
  levelKey,
  levelLabel,
  players,
  busyAction,
  onPromotePlayer,
}: RosterMinorLevelTableProps) {
  return (
    <DensePanel
      title={`${levelLabel} (${players.length})`}
      bodyClassName="p-3 md:p-0"
    >
      <ResponsiveTable
        data={players.slice(0, 12)}
        columns={buildMinorColumns(levelKey, levelLabel, busyAction, onPromotePlayer)}
        keyExtractor={(player) => player.id}
        emptyMessage={`No players listed at ${levelLabel}.`}
      />
    </DensePanel>
  );
}
