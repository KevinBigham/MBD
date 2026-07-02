import { AffiliateIdentityMark } from '@/shared/components/AffiliateIdentityMark';

export interface AffiliateResultView {
  id: string;
  teamId: string;
  day: number;
  level: string;
  label: string;
  shortName?: string;
  result: string;
  scoreline: string;
  summary: string;
}

export interface AffiliateBoxScoreView {
  id: string;
  season: number;
  day: number;
  level: string;
  label: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeShortName?: string;
  awayShortName?: string;
  homeScore: number;
  awayScore: number;
  summary: string;
  notablePlayers: Array<{
    playerId: string;
    playerName: string;
    position: string;
  }>;
}

interface AffiliateResultsPanelProps {
  recentBoxScores: AffiliateResultView[];
  selectedBoxScore: AffiliateBoxScoreView | null;
  selectedBoxScoreId: string | null;
  onSelectBoxScore: (boxScoreId: string) => void;
}

export default function AffiliateResultsPanel({
  recentBoxScores,
  selectedBoxScore,
  selectedBoxScoreId,
  onSelectBoxScore,
}: AffiliateResultsPanelProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[22rem,minmax(0,1fr)]">
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="font-heading text-xs uppercase text-dynasty-muted">Recent affiliate results</div>
        <div className="mt-3 space-y-3">
          {recentBoxScores.length > 0 ? recentBoxScores.map((boxScore) => (
            <button
              key={boxScore.id}
              type="button"
              aria-pressed={selectedBoxScoreId === boxScore.id}
              onClick={() => onSelectBoxScore(boxScore.id)}
              className={`w-full rounded border p-3 text-left transition-colors ${
                selectedBoxScoreId === boxScore.id
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-dynasty-border bg-dynasty-elevated hover:border-dynasty-muted'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <AffiliateIdentityMark
                    teamId={boxScore.teamId}
                    level={boxScore.level}
                    label={boxScore.label}
                    shortName={boxScore.shortName}
                    className="shrink-0"
                    testId={`affiliate-result-mark-${boxScore.teamId}-${boxScore.id}`}
                  />
                  <div className="min-w-0">
                    <div className="font-heading text-sm text-dynasty-text">{boxScore.label}</div>
                    <div className="font-data text-xs text-dynasty-muted">Day {boxScore.day}</div>
                  </div>
                </div>
                <div className={`font-data text-sm ${boxScore.result === 'W' ? 'text-accent-success' : 'text-accent-danger'}`}>
                  {boxScore.result}
                </div>
              </div>
              <div className="mt-2 font-data text-sm text-dynasty-text">{boxScore.scoreline}</div>
              <div className="mt-1 text-sm text-dynasty-muted">{boxScore.summary}</div>
            </button>
          )) : (
            <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-4 text-sm text-dynasty-muted">
              No affiliate box scores yet.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="font-heading text-xs uppercase text-dynasty-muted">Selected box score</div>
        {selectedBoxScore ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-heading text-lg text-dynasty-text">
                  {selectedBoxScore.awayTeamName} at {selectedBoxScore.homeTeamName}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <AffiliateIdentityMark
                      teamId={selectedBoxScore.awayTeamId}
                      level={selectedBoxScore.level}
                      label={selectedBoxScore.awayTeamName}
                      shortName={selectedBoxScore.awayShortName}
                      size="xs"
                      className="shrink-0"
                      testId={`boxscore-team-mark-${selectedBoxScore.awayTeamId}`}
                    />
                    <span className="font-heading text-xs text-dynasty-muted">{selectedBoxScore.awayShortName ?? selectedBoxScore.awayTeamName}</span>
                  </div>
                  <span className="font-data text-xs text-dynasty-muted">at</span>
                  <div className="flex min-w-0 items-center gap-2">
                    <AffiliateIdentityMark
                      teamId={selectedBoxScore.homeTeamId}
                      level={selectedBoxScore.level}
                      label={selectedBoxScore.homeTeamName}
                      shortName={selectedBoxScore.homeShortName}
                      size="xs"
                      className="shrink-0"
                      testId={`boxscore-team-mark-${selectedBoxScore.homeTeamId}`}
                    />
                    <span className="font-heading text-xs text-dynasty-muted">{selectedBoxScore.homeShortName ?? selectedBoxScore.homeTeamName}</span>
                  </div>
                </div>
                <div className="font-data text-sm text-dynasty-muted">
                  {selectedBoxScore.label} | Day {selectedBoxScore.day}
                </div>
              </div>
              <div className="font-data text-2xl text-dynasty-text">
                {selectedBoxScore.awayScore}-{selectedBoxScore.homeScore}
              </div>
            </div>

            <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-3 text-sm text-dynasty-muted">
              {selectedBoxScore.summary}
            </div>

            <div>
              <div className="font-heading text-xs uppercase text-dynasty-muted">Notable performers</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {selectedBoxScore.notablePlayers.length > 0 ? selectedBoxScore.notablePlayers.map((player) => (
                  <div key={player.playerId} className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-3">
                    <div className="font-heading text-sm text-dynasty-text">{player.playerName}</div>
                    <div className="mt-1 font-data text-xs text-dynasty-muted">{player.position}</div>
                  </div>
                )) : (
                  <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-4 text-sm text-dynasty-muted">
                    No notable players recorded for this affiliate result.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-4 text-sm text-dynasty-muted">
            Select an affiliate result to inspect the latest box score summary.
          </div>
        )}
      </div>
    </div>
  );
}
