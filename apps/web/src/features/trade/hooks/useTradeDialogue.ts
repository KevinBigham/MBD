import { useEffect, useState } from 'react';
import type { TradeDialogueView } from '../components/TradeActivityColumn';

interface UseTradeDialogueOptions {
  selectedTeam: string;
  isInitialized: boolean;
  workerReady: boolean;
  tradeMarketOpen: boolean;
  offerTotal: number;
  requestTotal: number;
  activeCounterOfferId: string | null;
  getTradeDialogue: (
    teamId: string,
    offerTotal: number,
    requestTotal: number,
    mode: 'proposal' | 'counter',
  ) => Promise<unknown>;
}

export function useTradeDialogue({
  selectedTeam,
  isInitialized,
  workerReady,
  tradeMarketOpen,
  offerTotal,
  requestTotal,
  activeCounterOfferId,
  getTradeDialogue,
}: UseTradeDialogueOptions): TradeDialogueView | null {
  const [gmDialogue, setGmDialogue] = useState<TradeDialogueView | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!selectedTeam || !isInitialized || !workerReady || !tradeMarketOpen) {
      setGmDialogue(null);
      return () => {
        cancelled = true;
      };
    }

    const loadDialogue = async () => {
      const dialogue = await getTradeDialogue(
        selectedTeam,
        offerTotal,
        requestTotal,
        activeCounterOfferId ? 'counter' : 'proposal',
      );

      if (!cancelled) {
        setGmDialogue((dialogue as TradeDialogueView) ?? null);
      }
    };

    void loadDialogue();

    return () => {
      cancelled = true;
    };
  }, [
    activeCounterOfferId,
    getTradeDialogue,
    isInitialized,
    offerTotal,
    requestTotal,
    selectedTeam,
    tradeMarketOpen,
    workerReady,
  ]);

  return gmDialogue;
}
