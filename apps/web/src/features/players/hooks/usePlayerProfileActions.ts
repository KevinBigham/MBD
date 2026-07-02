import { useCallback, useState } from 'react';
import {
  formatMinorLevel,
  moneyLabel,
  type PlayerProfileView,
} from '../components/playerProfileShared';
import type {
  PendingProfileRosterAction,
  PlayerProfileActionState,
  PlayerProfileBusyAction,
  PlayerProfileRosterAction,
} from '../components/PlayerProfileActionsPanel';

type PlayerProfileActionPlayer = NonNullable<PlayerProfileView['player']>;

interface ExtensionOfferView {
  years: number;
  annualSalary: number;
  totalValue: number;
  noTradeClause: boolean;
  noTradeClauseType: 'none' | 'partial' | 'full';
  playerOption: boolean;
  teamOption: boolean;
  optOutYears: number[];
  signingBonus: number;
  buyoutAmount: number;
  deferredMoney: Array<{ yearOffset: number; amount: number }>;
}

interface ExtensionResponseView {
  status: 'accepted' | 'rejected' | 'countered';
  counterOffer?: ExtensionOfferView;
  rounds: Array<{
    playerDemand?: ExtensionOfferView;
  }>;
}

interface RosterActionView {
  success: boolean;
  error?: string;
}

interface PlayerProfileActionWorker {
  getExtensionOffer: (playerId: string, years: number) => Promise<unknown>;
  negotiateExtension: (playerId: string, offer: ExtensionOfferView) => Promise<unknown>;
  promotePlayer: (playerId: string) => Promise<unknown>;
  demotePlayer: (playerId: string) => Promise<unknown>;
  designateForAssignment: (playerId: string) => Promise<unknown>;
}

interface UsePlayerProfileActionsOptions {
  player: PlayerProfileActionPlayer | null;
  worker: PlayerProfileActionWorker;
  season: number;
  fetchProfile: () => Promise<void>;
  autosaveActiveGame: (options: { season: number }) => Promise<unknown>;
}

export function usePlayerProfileActions({
  player,
  worker,
  season,
  fetchProfile,
  autosaveActiveGame,
}: UsePlayerProfileActionsOptions) {
  const [actionState, setActionState] = useState<PlayerProfileActionState | null>(null);
  const [busyAction, setBusyAction] = useState<PlayerProfileBusyAction>(null);
  const [pendingRosterAction, setPendingRosterAction] = useState<PendingProfileRosterAction | null>(null);

  const handleRosterAction = useCallback(async (
    action: PlayerProfileRosterAction,
  ) => {
    if (!player) {
      return;
    }

    setBusyAction(action);
    setActionState(null);
    try {
      const result = (action === 'promote'
        ? await worker.promotePlayer(player.id)
        : action === 'demote'
          ? await worker.demotePlayer(player.id)
          : await worker.designateForAssignment(player.id)) as RosterActionView;

      if (!result.success) {
        setActionState({
          tone: 'error',
          message: result.error ?? 'The roster move could not be completed.',
        });
        return;
      }

      setActionState({
        tone: 'success',
        message: action === 'promote'
          ? 'Player promoted and profile refreshed.'
          : action === 'demote'
            ? 'Player optioned and profile refreshed.'
            : 'Player designated for assignment and profile refreshed.',
      });
      await fetchProfile();
      await autosaveActiveGame({ season });
    } finally {
      setBusyAction(null);
    }
  }, [autosaveActiveGame, fetchProfile, player, season, worker]);

  const requestRosterAction = useCallback((action: PlayerProfileRosterAction) => {
    if (!player) {
      return;
    }

    setPendingRosterAction({
      action,
      title: action === 'promote'
        ? 'Promote to MLB'
        : action === 'demote'
          ? 'Option to Minors'
          : 'Designate for Assignment',
      detail: `${player.position} | ${formatMinorLevel(player.rosterStatus)} | Options used ${player.optionYearsUsed}${player.isOutOfOptions ? ' | Out of options' : ''}`,
      consequence: action === 'dfa'
        ? 'This removes the player from your roster picture and exposes him to waiver-claim risk.'
        : action === 'demote' && player.isOutOfOptions
          ? 'This player is out of options and may need to clear waivers before reaching the minors.'
          : 'This updates the live roster assignment and can change active-depth, service-time, and option consequences.',
    });
  }, [player]);

  const confirmPendingRosterAction = useCallback(async () => {
    if (!pendingRosterAction) {
      return;
    }

    const action = pendingRosterAction.action;
    setPendingRosterAction(null);
    await handleRosterAction(action);
  }, [handleRosterAction, pendingRosterAction]);

  const handleExtend = useCallback(async () => {
    if (!player) {
      return;
    }

    setBusyAction('extend');
    setActionState(null);
    try {
      const offer = await worker.getExtensionOffer(player.id, 5) as ExtensionOfferView | null;
      if (!offer) {
        setActionState({
          tone: 'error',
          message: 'No five-year extension framework is available for this player.',
        });
        return;
      }

      const result = await worker.negotiateExtension(player.id, offer) as ExtensionResponseView | null;
      if (!result) {
        setActionState({
          tone: 'error',
          message: 'The extension negotiation could not be started.',
        });
        return;
      }

      if (result.status === 'accepted') {
        setActionState({
          tone: 'success',
          message: `Extension accepted at ${moneyLabel(offer.annualSalary)} AAV for ${offer.years} years.`,
        });
      } else if (result.status === 'countered') {
        const counter = result.counterOffer ?? result.rounds.at(-1)?.playerDemand;
        setActionState({
          tone: 'info',
          message: counter
            ? `Counteroffer received: ${moneyLabel(counter.annualSalary)} AAV over ${counter.years} years.`
            : 'Counteroffer received from the player camp.',
        });
      } else {
        setActionState({
          tone: 'error',
          message: 'The player rejected the initial five-year extension offer.',
        });
      }

      await fetchProfile();
      await autosaveActiveGame({ season });
    } finally {
      setBusyAction(null);
    }
  }, [autosaveActiveGame, fetchProfile, player, season, worker]);

  return {
    actionState,
    busyAction,
    pendingRosterAction,
    handleExtend,
    requestRosterAction,
    cancelRosterAction: () => setPendingRosterAction(null),
    confirmPendingRosterAction,
  };
}
