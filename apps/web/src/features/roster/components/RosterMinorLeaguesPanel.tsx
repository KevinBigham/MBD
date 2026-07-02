import { Link } from 'react-router-dom';
import { AFFILIATE_LEVELS } from '@mbd/sim-core';
import { AffiliateIdentityMark } from '@/shared/components/AffiliateIdentityMark';
import { DensePanel } from '@/shared/components/DensePanel';
import { humanizeLabel, minorLevelLabel } from '@/shared/lib/labels';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import { RosterMinorLevelTable } from './RosterMinorLevelTable';

export interface PromotionCandidateView {
  playerId: string;
  playerName: string;
  position: string;
  currentLevel: string;
  targetLevel: string;
  score: number;
  reason: string;
}

export interface AffiliateOverviewView {
  affiliates: Array<{
    teamId: string;
    level: string;
    label: string;
    shortName?: string;
    identityNote?: string | null;
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
    teamId: string;
    day: number;
    level: string;
    label: string;
    shortName?: string;
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

interface RosterMinorLeaguesPanelProps {
  promotionCandidates: PromotionCandidateView[];
  affiliateOverview: AffiliateOverviewView | null;
  minors: Record<string, PlayerDTO[]>;
  busyAction: string | null;
  onRequestPromotion: (candidate: PromotionCandidateView) => void;
  onPromotePlayer: (player: PlayerDTO, levelLabel: string) => void;
  onClaimWaiver: (claim: AffiliateOverviewView['waiverClaims'][number]) => void;
}

const MINOR_LEVELS = [...AFFILIATE_LEVELS, 'INTERNATIONAL'].map((key) => ({
  key,
  label: minorLevelLabel(key),
}));

export function RosterMinorLeaguesPanel({
  promotionCandidates,
  affiliateOverview,
  minors,
  busyAction,
  onRequestPromotion,
  onPromotePlayer,
  onClaimWaiver,
}: RosterMinorLeaguesPanelProps) {
  return (
    <div className="space-y-6">
      <DensePanel
        title="Promotion recommendations"
        subtitle="Best ready-now minor leaguers based on affiliate performance and age-to-level fit."
        subtitleClassName="font-heading text-sm normal-case tracking-normal text-dynasty-text"
        meta={(
          <Link to="/minors" className="font-heading text-xs text-accent-info hover:text-accent-primary">
            Open affiliate hub
          </Link>
        )}
        bodyClassName="grid gap-3 lg:grid-cols-2"
      >
        {promotionCandidates.length > 0 ? promotionCandidates.map((candidate) => (
          <div key={candidate.playerId} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-heading text-sm text-dynasty-text">{candidate.playerName}</div>
                <div className="font-data text-xs text-dynasty-muted">
                  {candidate.position} | {minorLevelLabel(candidate.currentLevel)} to {minorLevelLabel(candidate.targetLevel)}
                </div>
              </div>
              <div className="font-data text-sm text-accent-success">Score {candidate.score}</div>
            </div>
            <div className="mt-2 text-sm text-dynasty-muted">{candidate.reason}</div>
            <button
              type="button"
              onClick={() => onRequestPromotion(candidate)}
              disabled={busyAction === `promote-${candidate.playerId}`}
              className="mt-3 rounded border border-accent-success/50 px-3 py-1.5 font-heading text-xs text-accent-success transition-colors hover:bg-accent-success/10 disabled:opacity-50"
            >
              Promote
            </button>
          </div>
        )) : (
          <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-4 text-sm text-dynasty-muted">
            No affiliate bats or arms are forcing a promotion today.
          </div>
        )}
      </DensePanel>

      {affiliateOverview && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <DensePanel
              title="Affiliate snapshot"
              className="lg:col-span-2"
              bodyClassName="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
            >
              {affiliateOverview.affiliates.map((affiliate) => {
                const affiliateLabel = affiliate.label ?? minorLevelLabel(affiliate.level);

                return (
                  <div key={affiliate.level} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <AffiliateIdentityMark
                          teamId={affiliate.teamId}
                          level={affiliate.level}
                          label={affiliateLabel}
                          shortName={affiliate.shortName}
                          className="shrink-0"
                          testId={`roster-affiliate-mark-${affiliate.teamId}-${affiliate.level}`}
                        />
                        <div className="min-w-0">
                          <div className="font-heading text-sm text-dynasty-text">{affiliateLabel}</div>
                          <div className="font-data text-xs text-dynasty-muted">
                            {affiliate.wins}-{affiliate.losses} in {affiliate.gamesPlayed} G
                          </div>
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
                    {affiliate.identityNote && (
                      <div className="mt-3 text-xs text-dynasty-muted">{affiliate.identityNote}</div>
                    )}
                  </div>
                );
              })}
            </DensePanel>

            <DensePanel title="Waiver wire" bodyClassName="space-y-3">
              {affiliateOverview.waiverClaims.length > 0 ? affiliateOverview.waiverClaims.map((claim) => (
                <div key={`${claim.playerId}-${claim.status}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                  <div className="font-heading text-sm text-dynasty-text">{claim.playerName}</div>
                  <div className="mt-1 text-xs text-dynasty-muted">
                    {claim.status === 'pending' ? 'Pending claim' : humanizeLabel(claim.status)} | {claim.fromTeamName}
                  </div>
                  <div className="mt-2 text-xs text-dynasty-muted">
                    ${claim.salary.toFixed(1)}M
                    {claim.priorityIndex ? ` | Priority ${claim.priorityIndex}` : ''}
                  </div>
                  {claim.status === 'pending' && (
                    <button
                      type="button"
                      data-mobile-critical-control="roster-waiver-claim"
                      onClick={() => onClaimWaiver(claim)}
                      disabled={busyAction === `claim-${claim.playerId}`}
                      className="mobile-critical-control mt-3 rounded border border-accent-info/50 px-3 py-1.5 font-heading text-xs text-accent-info transition-colors hover:bg-accent-info/10 disabled:opacity-50"
                    >
                      Claim {claim.playerName}
                    </button>
                  )}
                </div>
              )) : (
                <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-4 text-sm text-dynasty-muted">
                  No active waiver claims right now.
                </div>
              )}
            </DensePanel>
          </div>

          <DensePanel title="Recent affiliate results" bodyClassName="grid gap-3 lg:grid-cols-3">
            {affiliateOverview.recentBoxScores.length > 0 ? affiliateOverview.recentBoxScores.slice(0, 9).map((boxScore) => {
              const affiliateLabel = boxScore.label ?? minorLevelLabel(boxScore.level);

              return (
                <div key={boxScore.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <AffiliateIdentityMark
                        teamId={boxScore.teamId}
                        level={boxScore.level}
                        label={affiliateLabel}
                        shortName={boxScore.shortName}
                        className="shrink-0"
                        testId={`roster-affiliate-result-mark-${boxScore.teamId}-${boxScore.id}`}
                      />
                      <div className="min-w-0">
                        <div className="font-heading text-sm text-dynasty-text">{affiliateLabel}</div>
                        <div className="font-data text-xs text-dynasty-muted">Day {boxScore.day}</div>
                      </div>
                    </div>
                    <div className={`font-data text-sm ${boxScore.result === 'W' ? 'text-accent-success' : 'text-accent-danger'}`}>
                      {boxScore.result}
                    </div>
                  </div>
                  <div className="mt-2 font-data text-sm text-dynasty-text">{boxScore.scoreline}</div>
                  <div className="mt-1 text-sm text-dynasty-muted">{boxScore.summary}</div>
                </div>
              );
            }) : (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-4 text-sm text-dynasty-muted">
                Affiliate schedules have not opened yet.
              </div>
            )}
          </DensePanel>
        </>
      )}

      {MINOR_LEVELS.map((level) => (
        <RosterMinorLevelTable
          key={level.key}
          levelKey={level.key}
          levelLabel={level.label}
          players={minors[level.key] ?? []}
          busyAction={busyAction}
          onPromotePlayer={onPromotePlayer}
        />
      ))}
    </div>
  );
}
