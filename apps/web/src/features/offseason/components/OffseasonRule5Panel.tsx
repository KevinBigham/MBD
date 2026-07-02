import { ArrowRightLeft, ShieldAlert, ShieldCheck, Undo2, type LucideIcon } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { OffseasonRule5BoardPanel } from './OffseasonRule5BoardPanel';

export interface Rule5PlayerView {
  playerId: string;
  teamId: string;
  playerName: string;
  position: string;
  age: number;
  overallRating: number;
  rosterStatus: string;
  rule5EligibleAfterSeason: number;
}

export interface Rule5SelectionView {
  playerId: string;
  playerName: string;
  originalTeamId: string;
  draftingTeamId: string;
  overallPick: number;
  round: number;
}

export interface Rule5ObligationView {
  playerId: string;
  originalTeamId: string;
  draftingTeamId: string;
  draftedAfterSeason: number;
  status: 'active' | 'returned' | 'cleared';
}

export interface Rule5OfferBackStateView {
  playerId: string;
  originalTeamId: string;
  draftingTeamId: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface Rule5View {
  phase: 'protection_audit' | 'rule5_draft' | 'complete';
  currentTeamId: string | null;
  draftOrder: string[];
  consecutivePasses: number;
  protectedCount: number;
  protectedLimit: number;
  protectedPlayers: Rule5PlayerView[];
  eligiblePlayers: Rule5PlayerView[];
  selections: Rule5SelectionView[];
  obligations: Rule5ObligationView[];
  offerBackStates: Rule5OfferBackStateView[];
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function playerLine(player: Rule5PlayerView): string {
  return `${player.playerName} | ${player.position} | Age ${player.age} | OVR ${player.overallRating}`;
}

export function OffseasonRule5Panel({
  rule5,
  userTeamId,
  advancing,
  onToggleProtection,
  onLockProtection,
  onRule5Pick,
  onPassRule5Pick,
  onResolveOfferBack,
}: {
  rule5: Rule5View;
  userTeamId: string | null;
  advancing: boolean;
  onToggleProtection: (playerId: string) => void | Promise<void>;
  onLockProtection: () => void | Promise<void>;
  onRule5Pick: (playerId: string) => void | Promise<void>;
  onPassRule5Pick: () => void | Promise<void>;
  onResolveOfferBack: (playerId: string, acceptReturn: boolean) => void | Promise<void>;
}) {
  const userProtectedPlayers = rule5.protectedPlayers;
  const userAtRiskPlayers = rule5.eligiblePlayers.filter((player) => player.teamId === userTeamId);
  const rule5Pool = rule5.eligiblePlayers.filter((player) => player.teamId !== userTeamId);
  const userOnClock = rule5.phase === 'rule5_draft' && rule5.currentTeamId === userTeamId;
  const pendingOfferBackStates = rule5.offerBackStates.filter((entry) => entry.status === 'pending');

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
          <div className="flex items-start justify-between gap-4 border-b border-dynasty-border px-4 py-3">
            <div>
              <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-dynasty-text">
                Protection Audit
              </h2>
              <p className="mt-1 font-heading text-xs text-dynasty-muted">
                Keep eligible prospects off the board by adding them to the 40-man.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 font-data text-xs text-dynasty-textBright">
                40-Man {rule5.protectedCount}/{rule5.protectedLimit}
              </span>
              {rule5.phase === 'protection_audit' && (
                <button
                  type="button"
                  onClick={() => void onLockProtection()}
                  disabled={advancing}
                  className="rounded bg-accent-primary px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-accent-primary/80 disabled:opacity-50"
                >
                  Lock Audit
                </button>
              )}
            </div>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <Rule5Section
              title="Protected"
              icon={ShieldCheck}
              emptyLabel="No protected Rule 5 prospects."
              items={userProtectedPlayers}
              actionLabel="Unprotect"
              disabled={advancing || rule5.phase !== 'protection_audit'}
              onAction={onToggleProtection}
            />
            <Rule5Section
              title="At Risk"
              icon={ShieldAlert}
              emptyLabel="No exposed Rule 5 players on your farm."
              items={userAtRiskPlayers}
              actionLabel="Protect"
              disabled={advancing || rule5.phase !== 'protection_audit' || rule5.protectedCount >= rule5.protectedLimit}
              onAction={onToggleProtection}
            />
          </div>
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
          <div className="flex items-start justify-between gap-4 border-b border-dynasty-border px-4 py-3">
            <div>
              <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-dynasty-text">
                Active Obligations
              </h2>
              <p className="mt-1 font-heading text-xs text-dynasty-muted">
                Drafted Rule 5 players must stay on the MLB roster until the obligation clears.
              </p>
            </div>
            <span className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 font-data text-xs text-dynasty-textBright">
              {rule5.obligations.length} tracked
            </span>
          </div>
          <div className="space-y-2 p-4">
            {rule5.obligations.length > 0 ? (
              rule5.obligations.map((obligation) => (
                <div
                  key={obligation.playerId}
                  className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-data text-xs text-dynasty-textBright">
                      {teamLabel(obligation.draftingTeamId)} owes MLB roster time to {obligation.playerId}
                    </div>
                    <span className="rounded border border-dynasty-border px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                      {obligation.status}
                    </span>
                  </div>
                  <div className="mt-1 font-heading text-xs text-dynasty-muted">
                    From {teamLabel(obligation.originalTeamId)} after Season {obligation.draftedAfterSeason}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-3 font-heading text-sm text-dynasty-muted">
                No active Rule 5 obligations.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <OffseasonRule5BoardPanel
          rule5={rule5}
          rule5Pool={rule5Pool}
          userOnClock={userOnClock}
          advancing={advancing}
          onRule5Pick={onRule5Pick}
          onPassRule5Pick={onPassRule5Pick}
        />

        {pendingOfferBackStates.length > 0 && (
          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
            <div className="border-b border-dynasty-border px-4 py-3">
              <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-dynasty-text">
                Offer-Back Queue
              </h2>
              <p className="mt-1 font-heading text-xs text-dynasty-muted">
                Resolve Rule 5 offer-back decisions before a drafted player leaves the active roster.
              </p>
            </div>
            <div className="space-y-3 p-4">
              {pendingOfferBackStates.map((offerBack) => (
                <div
                  key={offerBack.playerId}
                  className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-3"
                >
                  <div className="font-data text-xs text-dynasty-textBright">
                    Offer back {offerBack.playerId} to {teamLabel(offerBack.originalTeamId)}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void onResolveOfferBack(offerBack.playerId, true)}
                      disabled={advancing}
                      className="flex items-center gap-1 rounded bg-accent-primary px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-accent-primary/80 disabled:opacity-50"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Return Player
                    </button>
                    <button
                      type="button"
                      onClick={() => void onResolveOfferBack(offerBack.playerId, false)}
                      disabled={advancing}
                      className="flex items-center gap-1 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] text-dynasty-text transition-colors hover:border-accent-primary hover:text-accent-primary disabled:opacity-50"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      Original Club Declines
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Rule5Section({
  title,
  icon: Icon,
  items,
  emptyLabel,
  actionLabel,
  disabled,
  onAction,
}: {
  title: string;
  icon: LucideIcon;
  items: Rule5PlayerView[];
  emptyLabel: string;
  actionLabel: string;
  disabled: boolean;
  onAction: (playerId: string) => void | Promise<void>;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {items.length > 0 ? (
        items.map((player) => (
          <div
            key={player.playerId}
            className="flex items-center justify-between gap-3 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2"
          >
            <div>
              <div className="font-data text-xs text-dynasty-textBright">
                {playerLine(player)}
              </div>
              <div className="mt-1 font-heading text-xs text-dynasty-muted">
                Eligible after Season {player.rule5EligibleAfterSeason}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void onAction(player.playerId)}
              disabled={disabled}
              className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] text-dynasty-text transition-colors hover:border-accent-primary hover:text-accent-primary disabled:opacity-50"
            >
              {actionLabel}
            </button>
          </div>
        ))
      ) : (
        <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-3 font-heading text-sm text-dynasty-muted">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}
