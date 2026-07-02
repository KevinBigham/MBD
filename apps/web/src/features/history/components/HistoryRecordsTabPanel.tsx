import type { AwardRaces } from '@mbd/sim-core';
import type { RecordWatchEntry, Rivalry } from '@mbd/contracts';
import AwardRaceWatchPanel from './AwardRaceWatchPanel';
import RecordsPanel, { type RecordBookView } from './RecordsPanel';
import RivalryWatchPanel from './RivalryWatchPanel';

interface HistoryRecordsTabPanelProps {
  awardRaces: AwardRaces | null;
  playerName: (playerId: string) => string;
  recordBook: RecordBookView;
  recordWatch: RecordWatchEntry[];
  rivalries: Rivalry[];
  teamAbbreviation: (teamId: string) => string;
  teamName: (teamId: string | null) => string;
}

export default function HistoryRecordsTabPanel({
  awardRaces,
  playerName,
  recordBook,
  recordWatch,
  rivalries,
  teamAbbreviation,
  teamName,
}: HistoryRecordsTabPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <AwardRaceWatchPanel awardRaces={awardRaces} playerName={playerName} teamName={teamName} />

        <RivalryWatchPanel rivalries={rivalries} teamAbbreviation={teamAbbreviation} teamName={teamName} />
      </div>

      <RecordsPanel
        playerName={playerName}
        recordBook={recordBook}
        recordWatch={recordWatch}
        teamName={teamName}
      />
    </div>
  );
}
