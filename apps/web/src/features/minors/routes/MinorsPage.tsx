import { useCallback, useEffect, useState } from 'react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

interface AffiliateOverviewView {
  affiliates: Array<{
    level: string;
    label: string;
    wins: number;
    losses: number;
    gamesPlayed: number;
    runDifferential: number;
    topPerformer: {
      playerId: string;
      playerName: string;
      statLine: string;
    } | null;
  }>;
  recentBoxScores: Array<{
    id: string;
    day: number;
    level: string;
    label: string;
    result: string;
    scoreline: string;
    summary: string;
  }>;
  waiverClaims: Array<{
    playerId: string;
    playerName: string;
    fromTeamName: string;
    toTeamName: string | null;
    status: string;
    salary: number;
    priorityIndex: number | null;
  }>;
}

interface AffiliateBoxScoreView {
  id: string;
  season: number;
  day: number;
  level: string;
  label: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  summary: string;
  notablePlayers: Array<{
    playerId: string;
    playerName: string;
    position: string;
  }>;
}

export default function MinorsPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { day, season, phase, userTeamId, isInitialized } = useGameStore();
  const [overview, setOverview] = useState<AffiliateOverviewView | null>(null);
  const [selectedBoxScoreId, setSelectedBoxScoreId] = useState<string | null>(null);
  const [selectedBoxScore, setSelectedBoxScore] = useState<AffiliateBoxScoreView | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    const nextOverview = await worker.getAffiliateOverview(userTeamId);
    const typedOverview = (nextOverview ?? null) as AffiliateOverviewView | null;
    setOverview(typedOverview);

    const defaultBoxScoreId = typedOverview?.recentBoxScores[0]?.id ?? null;
    setSelectedBoxScoreId((current) => current ?? defaultBoxScoreId);
  }, [isInitialized, userTeamId, worker, workerReady]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview, day, season, phase]);

  useEffect(() => {
    if (!workerReady || !isInitialized || !selectedBoxScoreId) {
      setSelectedBoxScore(null);
      return;
    }

    void worker.getAffiliateBoxScore(selectedBoxScoreId).then((boxScore) => {
      setSelectedBoxScore((boxScore ?? null) as AffiliateBoxScoreView | null);
    });
  }, [isInitialized, selectedBoxScoreId, worker, workerReady]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-dynasty-text">Minor League Hub</h1>
        <p className="font-data text-sm text-dynasty-muted">
          Affiliate standings, recent results, and waiver traffic for the player development pipeline.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4 xl:col-span-2">
          <div className="font-heading text-xs uppercase text-dynasty-muted">Affiliate standings</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(overview?.affiliates ?? []).map((affiliate) => (
              <div key={affiliate.level} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-heading text-sm text-dynasty-text">{affiliate.label}</div>
                    <div className="font-data text-xs text-dynasty-muted">
                      {affiliate.wins}-{affiliate.losses} in {affiliate.gamesPlayed} G
                    </div>
                  </div>
                  <div className={`font-data text-sm ${affiliate.runDifferential >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                    {affiliate.runDifferential >= 0 ? '+' : ''}{affiliate.runDifferential}
                  </div>
                </div>
                {affiliate.topPerformer && (
                  <div className="mt-3 text-sm text-dynasty-muted">
                    <span className="font-heading text-dynasty-text">{affiliate.topPerformer.playerName}</span>
                    {' '}| {affiliate.topPerformer.statLine}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="font-heading text-xs uppercase text-dynasty-muted">Waiver traffic</div>
          <div className="mt-3 space-y-3">
            {(overview?.waiverClaims ?? []).length > 0 ? (overview?.waiverClaims ?? []).map((claim) => (
              <div key={`${claim.playerId}-${claim.status}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="font-heading text-sm text-dynasty-text">{claim.playerName}</div>
                <div className="mt-1 text-xs text-dynasty-muted">
                  {claim.status.toUpperCase()} | {claim.fromTeamName}
                </div>
                <div className="mt-2 text-xs text-dynasty-muted">
                  ${claim.salary.toFixed(1)}M
                  {claim.priorityIndex ? ` | Priority ${claim.priorityIndex}` : ''}
                </div>
              </div>
            )) : (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-4 text-sm text-dynasty-muted">
                No recent waiver movement.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[22rem,minmax(0,1fr)]">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="font-heading text-xs uppercase text-dynasty-muted">Recent affiliate results</div>
          <div className="mt-3 space-y-3">
            {(overview?.recentBoxScores ?? []).length > 0 ? (overview?.recentBoxScores ?? []).map((boxScore) => (
              <button
                key={boxScore.id}
                type="button"
                onClick={() => setSelectedBoxScoreId(boxScore.id)}
                className={`w-full rounded border p-3 text-left transition-colors ${
                  selectedBoxScoreId === boxScore.id
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-dynasty-border bg-dynasty-elevated hover:border-dynasty-muted'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-heading text-sm text-dynasty-text">{boxScore.label}</div>
                    <div className="font-data text-xs text-dynasty-muted">Day {boxScore.day}</div>
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
    </div>
  );
}
