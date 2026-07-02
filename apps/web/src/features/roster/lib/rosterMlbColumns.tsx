import { Link } from 'react-router-dom';
import type { ColumnDef } from '@/shared/components/ResponsiveTable';
import { gradeBadgeColor } from '@/shared/lib/grade';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

interface RosterMlbColumnsOptions {
  busyAction: string | null;
  onDemotePlayer: (player: PlayerDTO) => void;
}

function formatServiceTime(serviceTimeDays: number): string {
  const years = Math.floor(serviceTimeDays / 172);
  const days = serviceTimeDays % 172;
  return `${years}y ${days}d`;
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

function renderDemoteButton(
  player: PlayerDTO,
  busyAction: string | null,
  onDemotePlayer: (player: PlayerDTO) => void,
) {
  return (
    <button
      type="button"
      data-mobile-critical-control="roster-demote"
      onClick={() => onDemotePlayer(player)}
      disabled={busyAction === `demote-${player.id}`}
      className="mobile-critical-control w-full rounded border border-dynasty-border px-3 py-2 font-heading text-xs text-dynasty-muted transition-colors hover:border-accent-primary hover:text-accent-primary disabled:opacity-50 md:w-auto md:px-2 md:py-1"
    >
      Demote
    </button>
  );
}

function sharedRosterColumns({
  busyAction,
  onDemotePlayer,
}: RosterMlbColumnsOptions): ColumnDef<PlayerDTO>[] {
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
      key: 'service',
      label: 'SVC',
      className: 'text-right',
      render: (player) => formatServiceTime(player.serviceTimeDays),
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
      render: (player) => renderDemoteButton(player, busyAction, onDemotePlayer),
    },
  ];
}

export function buildHitterColumns(options: RosterMlbColumnsOptions): ColumnDef<PlayerDTO>[] {
  const columns = sharedRosterColumns(options);
  const actionColumn = columns.pop()!;

  return [
    ...columns,
    {
      key: 'plate-appearances',
      label: 'PA',
      className: 'text-right',
      hideOnMobile: true,
      render: (player) => player.stats?.pa ?? '-',
    },
    {
      key: 'average',
      label: 'AVG',
      className: 'text-right',
      render: (player) => player.stats?.avg ?? '-',
    },
    {
      key: 'home-runs',
      label: 'HR',
      className: 'text-right',
      render: (player) => player.stats?.hr ?? '-',
    },
    {
      key: 'rbi',
      label: 'RBI',
      className: 'text-right',
      render: (player) => player.stats?.rbi ?? '-',
    },
    {
      key: 'war',
      label: 'WAR',
      className: 'text-right',
      highlight: true,
      render: (player) => player.advanced?.war?.toFixed(1) ?? '-',
    },
    actionColumn,
  ];
}

export function buildPitcherColumns(options: RosterMlbColumnsOptions): ColumnDef<PlayerDTO>[] {
  const columns = sharedRosterColumns(options);
  const actionColumn = columns.pop()!;

  return [
    ...columns,
    {
      key: 'era',
      label: 'ERA',
      className: 'text-right',
      render: (player) => player.stats?.era ?? '-',
    },
    {
      key: 'strikeouts',
      label: 'K',
      className: 'text-right',
      render: (player) => player.stats?.strikeouts ?? '-',
    },
    {
      key: 'walks',
      label: 'BB',
      className: 'text-right',
      render: (player) => player.stats?.walks ?? '-',
    },
    {
      key: 'war',
      label: 'WAR',
      className: 'text-right',
      highlight: true,
      render: (player) => player.advanced?.war?.toFixed(1) ?? '-',
    },
    actionColumn,
  ];
}
