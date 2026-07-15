import { useCallback, useMemo, useState } from 'react';
import type { AudioEffectName } from '@/shared/lib/audio';
import type { FreeAgencyMarketAgent } from '../components/FreeAgencyMarketBoardPanel';
import type { FreeAgencyOfferBudget } from '../components/FreeAgencyContractOfferPanel';
import type { FinanceOverview } from './useFreeAgencyRouteData';

type FreeAgentRow = FreeAgencyMarketAgent;

interface ContractOfferResult {
  accepted: boolean;
  reason?: string;
  qualifyingOfferCompensation?: {
    tier: 'premium' | 'standard';
    forfeitedRound: number;
    forfeitedOriginalTeamId: string;
  } | null;
}

export interface FreeAgencyOfferActionsOptions {
  /** Legacy test/caller compatibility; exact-save signing no longer invokes it. */
  autosaveActiveGame?: (context: { season: number }) => Promise<unknown>;
  fetchFreeAgents: () => Promise<void>;
  finance: FinanceOverview | null;
  makeContractOffer: (playerId: string, years: number, salary: number) => Promise<ContractOfferResult>;
  playEffect: (name: AudioEffectName) => void;
  publishDurablePresentation: () => void;
  removeAgentById: (playerId: string) => void;
  /** Legacy test/caller compatibility; exact-save signing no longer invokes it. */
  season?: number;
}

export interface FreeAgencyOfferActionsResult {
  handleOffer: () => Promise<void>;
  handleSelectPlayer: (agent: FreeAgentRow) => void;
  offerBudget: FreeAgencyOfferBudget | null;
  offerResult: string | null;
  offerSalary: number;
  offerYears: number;
  selectedPlayer: FreeAgentRow | null;
  setOfferSalary: (value: number) => void;
  setOfferYears: (value: number) => void;
}

export function useFreeAgencyOfferActions({
  fetchFreeAgents,
  finance,
  makeContractOffer,
  playEffect,
  publishDurablePresentation,
  removeAgentById,
}: FreeAgencyOfferActionsOptions): FreeAgencyOfferActionsResult {
  const [selectedPlayer, setSelectedPlayer] = useState<FreeAgentRow | null>(null);
  const [offerYears, setOfferYears] = useState(3);
  const [offerSalary, setOfferSalary] = useState(10);
  const [offerResult, setOfferResult] = useState<string | null>(null);

  const offerBudget = useMemo<FreeAgencyOfferBudget | null>(() => {
    if (!finance) return null;
    const projectedPayroll = finance.totalPayroll + offerSalary;
    return {
      projectedPayroll,
      budgetRoom: finance.budget - projectedPayroll,
      taxRoom: finance.capSpace - offerSalary,
    };
  }, [finance, offerSalary]);

  const handleOffer = useCallback(async () => {
    if (!selectedPlayer) return;

    let result: ContractOfferResult;
    try {
      result = await makeContractOffer(selectedPlayer.id, offerYears, offerSalary);
    } catch {
      setOfferResult('Contract offers not available yet.');
      return;
    }

    if (!result.accepted) {
      setOfferResult(`Rejected: ${result.reason}`);
      return;
    }

    // Exact-save execution resolves only after the accepted snapshot is
    // durable, so presentation can publish without a second autosave lane.
    publishDurablePresentation();
    const compensationCopy = result.qualifyingOfferCompensation
      ? ` Draft compensation: ${result.qualifyingOfferCompensation.tier} award issued; Round ${result.qualifyingOfferCompensation.forfeitedRound} (${result.qualifyingOfferCompensation.forfeitedOriginalTeamId.toUpperCase()} origin) forfeited.`
      : '';
    setOfferResult(`Signed! ${selectedPlayer.firstName} ${selectedPlayer.lastName} joins your team.${compensationCopy}`);
    playEffect('free_agent_signed');
    removeAgentById(selectedPlayer.id);
    setSelectedPlayer(null);
    try {
      await fetchFreeAgents();
    } catch {
      // The accepted mutation is already durably saved. Keep that truth
      // visible even when a read-only market refresh is temporarily down.
    }
  }, [
    fetchFreeAgents,
    makeContractOffer,
    offerSalary,
    offerYears,
    playEffect,
    publishDurablePresentation,
    removeAgentById,
    selectedPlayer,
  ]);

  const handleSelectPlayer = useCallback((agent: FreeAgentRow) => {
    setSelectedPlayer(agent);
    setOfferResult(null);
  }, []);

  return {
    handleOffer,
    handleSelectPlayer,
    offerBudget,
    offerResult,
    offerSalary,
    offerYears,
    selectedPlayer,
    setOfferSalary,
    setOfferYears,
  };
}
