import type { SeasonStatLeader, SeasonStatLeaders } from '@mbd/contracts';

interface SeasonLeadersPanelProps {
  statLeaders: SeasonStatLeaders;
  playerName: (playerId: string) => string;
  teamName: (teamId: string | null) => string;
}

function LeaderList({
  title,
  leaders,
  playerName,
  teamName,
}: {
  title: string;
  leaders: SeasonStatLeader[];
  playerName: (playerId: string) => string;
  teamName: (teamId: string | null) => string;
}): JSX.Element | null {
  if (leaders.length === 0) return null;

  return (
    <div className="rounded border border-dynasty-border/70 p-3">
      <div className="font-heading text-xs uppercase text-dynasty-muted">{title}</div>
      <div className="mt-2 space-y-2">
        {leaders.map((leader) => (
          <div key={`${title}-${leader.playerId}`} className="flex items-start justify-between gap-3">
            <div>
              <div className="font-heading text-sm text-dynasty-text">{playerName(leader.playerId)}</div>
              <div className="font-heading text-[11px] text-dynasty-muted">{teamName(leader.teamId)}</div>
            </div>
            <div className="font-data text-sm text-dynasty-textBright">{leader.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SeasonLeadersPanel({
  statLeaders,
  playerName,
  teamName,
}: SeasonLeadersPanelProps): JSX.Element {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <LeaderList title="HR Leaders" leaders={statLeaders.hr} playerName={playerName} teamName={teamName} />
      <LeaderList title="RBI Leaders" leaders={statLeaders.rbi} playerName={playerName} teamName={teamName} />
      <LeaderList title="AVG Leaders" leaders={statLeaders.avg} playerName={playerName} teamName={teamName} />
      <LeaderList title="ERA Leaders" leaders={statLeaders.era} playerName={playerName} teamName={teamName} />
      <LeaderList title="Strikeout Leaders" leaders={statLeaders.k} playerName={playerName} teamName={teamName} />
      <LeaderList title="Win Leaders" leaders={statLeaders.w} playerName={playerName} teamName={teamName} />
    </div>
  );
}
