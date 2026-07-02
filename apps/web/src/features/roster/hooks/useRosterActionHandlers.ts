import { useCallback, useState } from 'react';
import { minorLevelLabel } from '@/shared/lib/labels';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { PendingRosterActionView } from '../components/RosterActionConfirmationModal';
import type { DFACandidateView } from '../components/RosterCompliancePanel';
import type { AffiliateOverviewView, PromotionCandidateView } from '../components/RosterMinorLeaguesPanel';

export interface PendingRosterAction extends PendingRosterActionView {
  run: () => Promise<unknown>;
}

interface UseRosterActionHandlersOptions {
  autosaveActiveGame: (context: { season: number }) => Promise<unknown>;
  claimOffWaivers: (playerId: string) => Promise<unknown>;
  demotePlayer: (playerId: string) => Promise<unknown>;
  designateForAssignment: (playerId: string) => Promise<unknown>;
  fetchRoster: () => Promise<void>;
  promotePlayer: (playerId: string) => Promise<unknown>;
  season: number;
}

interface UseRosterActionHandlersResult {
  actionMessage: string | null;
  busyAction: string | null;
  claimWaiver: (claim: AffiliateOverviewView['waiverClaims'][number]) => Promise<void>;
  clearPendingRosterAction: () => void;
  confirmRosterAction: () => Promise<void>;
  openDemoteAction: (player: PlayerDTO) => void;
  openDfaAction: (candidate: DFACandidateView) => void;
  openPromoteAction: (player: PlayerDTO, levelLabel: string) => void;
  openPromotionCandidateAction: (candidate: PromotionCandidateView) => void;
  pendingRosterAction: PendingRosterAction | null;
}

function moneyLabel(value: number): string {
  return `$${value.toFixed(1)}M`;
}

function rosterActionFailed(result: unknown): result is { success: false; error?: string } {
  return typeof result === 'object'
    && result !== null
    && 'success' in result
    && (result as { success?: unknown }).success === false;
}

export function useRosterActionHandlers({
  autosaveActiveGame,
  claimOffWaivers,
  demotePlayer,
  designateForAssignment,
  fetchRoster,
  promotePlayer,
  season,
}: UseRosterActionHandlersOptions): UseRosterActionHandlersResult {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pendingRosterAction, setPendingRosterAction] = useState<PendingRosterAction | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const runRosterAction = useCallback(async (actionId: string, operation: () => Promise<unknown>) => {
    setBusyAction(actionId);
    setActionMessage(null);
    try {
      const result = await operation();
      if (rosterActionFailed(result)) {
        setActionMessage(result.error ?? 'That roster move could not be completed.');
        return;
      }
      await fetchRoster();
      await autosaveActiveGame({ season });
    } finally {
      setBusyAction(null);
    }
  }, [autosaveActiveGame, fetchRoster, season]);

  const confirmRosterAction = useCallback(async () => {
    if (!pendingRosterAction) {
      return;
    }

    try {
      await runRosterAction(pendingRosterAction.actionId, pendingRosterAction.run);
    } finally {
      setPendingRosterAction(null);
    }
  }, [pendingRosterAction, runRosterAction]);

  const openDemoteAction = useCallback((player: PlayerDTO) => {
    setPendingRosterAction({
      kind: 'demote',
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      detail: `${player.position} | ${player.letterGrade} | Options used ${player.optionYearsUsed}${player.isOutOfOptions ? ' | Out of options' : ''}`,
      consequence: player.isOutOfOptions
        ? 'This player is out of options and may need to clear waivers before reaching the minors.'
        : 'This uses a minor-league assignment path and can change active-roster depth immediately.',
      confirmLabel: 'Confirm Demotion',
      actionId: `demote-${player.id}`,
      run: () => demotePlayer(player.id),
    });
  }, [demotePlayer]);

  const openPromoteAction = useCallback((player: PlayerDTO, levelLabel: string) => {
    setPendingRosterAction({
      kind: 'promote',
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      detail: `${levelLabel} | ${player.letterGrade} | OVR ${player.displayRating}`,
      consequence: 'This moves the player up the ladder immediately and may change 40-man or active-roster pressure.',
      confirmLabel: 'Confirm Promotion',
      actionId: `promote-${player.id}`,
      run: () => promotePlayer(player.id),
    });
  }, [promotePlayer]);

  const openPromotionCandidateAction = useCallback((candidate: PromotionCandidateView) => {
    setPendingRosterAction({
      kind: 'promote',
      playerId: candidate.playerId,
      playerName: candidate.playerName,
      position: candidate.position,
      detail: `${minorLevelLabel(candidate.currentLevel)} to ${minorLevelLabel(candidate.targetLevel)} | Score ${candidate.score}`,
      consequence: 'This changes the player assignment now and can start service-time, option, and active-depth consequences.',
      confirmLabel: 'Confirm Promotion',
      actionId: `promote-${candidate.playerId}`,
      run: () => promotePlayer(candidate.playerId),
    });
  }, [promotePlayer]);

  const claimWaiver = useCallback(async (claim: AffiliateOverviewView['waiverClaims'][number]) => {
    await runRosterAction(`claim-${claim.playerId}`, () => claimOffWaivers(claim.playerId));
  }, [claimOffWaivers, runRosterAction]);

  const openDfaAction = useCallback((candidate: DFACandidateView) => {
    setPendingRosterAction({
      kind: 'dfa',
      playerId: candidate.playerId,
      playerName: candidate.playerName,
      position: candidate.position,
      detail: `${candidate.position} | Age ${candidate.age} | ${moneyLabel(candidate.salary)}`,
      consequence: 'This removes the player from the active/40-man picture and exposes him to waiver-claim risk.',
      confirmLabel: 'Confirm DFA',
      actionId: `dfa-${candidate.playerId}`,
      run: () => designateForAssignment(candidate.playerId),
    });
  }, [designateForAssignment]);

  return {
    actionMessage,
    busyAction,
    claimWaiver,
    clearPendingRosterAction: () => setPendingRosterAction(null),
    confirmRosterAction,
    openDemoteAction,
    openDfaAction,
    openPromoteAction,
    openPromotionCandidateAction,
    pendingRosterAction,
  };
}
