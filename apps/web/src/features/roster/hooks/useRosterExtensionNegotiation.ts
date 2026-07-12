import { useCallback, useState } from 'react';
import type { ExtensionContractTerms } from '@mbd/sim-core';
import type { ExtensionCandidateView } from '../components/ExtensionCommandCenter';
import type { ExtensionOfferView, ExtensionResponseView } from '../components/RosterExtensionNegotiationModal';

interface UseRosterExtensionNegotiationOptions {
  autosaveActiveGame: (context: { season: number }) => Promise<unknown>;
  fetchRoster: () => Promise<void>;
  getExtensionOffer: (playerId: string, years: number) => Promise<unknown>;
  negotiateExtension: (playerId: string, offer: ExtensionContractTerms) => Promise<unknown>;
  season: number;
}

interface UseRosterExtensionNegotiationResult {
  closeNegotiation: () => void;
  extensionBusyAction: string | null;
  extensionOffer: ExtensionOfferView | null;
  negotiationResponse: ExtensionResponseView | null;
  offerNoTrade: boolean;
  offerOptOut: boolean;
  offerSalary: string;
  offerSigningBonus: string;
  offerYears: number;
  openNegotiation: (candidate: ExtensionCandidateView) => Promise<void>;
  selectedExtension: ExtensionCandidateView | null;
  setOfferNoTrade: (enabled: boolean) => void;
  setOfferOptOut: (enabled: boolean) => void;
  setOfferSalary: (salary: string) => void;
  setOfferSigningBonus: (signingBonus: string) => void;
  setOfferYears: (years: number) => void;
  submitExtensionOffer: () => Promise<void>;
}

function snapshotSaved(value: unknown): value is { saved: true } {
  return typeof value === 'object'
    && value !== null
    && 'saved' in value
    && (value as { saved?: unknown }).saved === true;
}

export function useRosterExtensionNegotiation({
  autosaveActiveGame,
  fetchRoster,
  getExtensionOffer,
  negotiateExtension,
  season,
}: UseRosterExtensionNegotiationOptions): UseRosterExtensionNegotiationResult {
  const [selectedExtension, setSelectedExtension] = useState<ExtensionCandidateView | null>(null);
  const [extensionOffer, setExtensionOffer] = useState<ExtensionOfferView | null>(null);
  const [offerYears, setOfferYears] = useState(5);
  const [offerSalary, setOfferSalary] = useState('');
  const [offerSigningBonus, setOfferSigningBonus] = useState('');
  const [offerNoTrade, setOfferNoTrade] = useState(false);
  const [offerOptOut, setOfferOptOut] = useState(false);
  const [extensionBusyAction, setExtensionBusyAction] = useState<string | null>(null);
  const [negotiationResponse, setNegotiationResponse] = useState<ExtensionResponseView | null>(null);

  const openNegotiation = useCallback(async (candidate: ExtensionCandidateView) => {
    const offer = await getExtensionOffer(candidate.playerId, 5);
    if (!offer) return;

    const offerView = offer as ExtensionOfferView;
    setSelectedExtension(candidate);
    setExtensionOffer(offerView);
    setOfferYears(offerView.years);
    setOfferSalary(offerView.annualSalary.toFixed(1));
    setOfferSigningBonus((offerView.signingBonus ?? 0).toFixed(1));
    setOfferNoTrade(offerView.noTradeClause);
    setOfferOptOut((offerView.optOutYears ?? []).length > 0);
    setNegotiationResponse(null);
  }, [getExtensionOffer]);

  const closeNegotiation = useCallback(() => {
    setSelectedExtension(null);
    setExtensionOffer(null);
    setNegotiationResponse(null);
  }, []);

  const submitExtensionOffer = useCallback(async () => {
    if (!selectedExtension || !extensionOffer) return;

    const annualSalary = Number.parseFloat(offerSalary) || extensionOffer.annualSalary;
    setExtensionBusyAction(`extension-${selectedExtension.playerId}`);
    try {
      const nextOffer: ExtensionContractTerms = {
        ...extensionOffer,
        years: offerYears,
        annualSalary,
        totalValue: annualSalary * offerYears,
        signingBonus: Number.parseFloat(offerSigningBonus) || 0,
        noTradeClause: offerNoTrade,
        noTradeClauseType: offerNoTrade ? 'full' : 'none',
        optOutYears: offerOptOut ? [Math.max(2, offerYears - 1)] : [],
      };
      const response = await negotiateExtension(selectedExtension.playerId, nextOffer);
      if (!response || !snapshotSaved(await autosaveActiveGame({ season }))) return;
      setNegotiationResponse(response as ExtensionResponseView);
      if ((response as ExtensionResponseView).status === 'accepted') {
        await fetchRoster();
      }
    } finally {
      setExtensionBusyAction(null);
    }
  }, [
    autosaveActiveGame,
    extensionOffer,
    fetchRoster,
    negotiateExtension,
    offerNoTrade,
    offerOptOut,
    offerSalary,
    offerSigningBonus,
    offerYears,
    selectedExtension,
    season,
  ]);

  return {
    closeNegotiation,
    extensionBusyAction,
    extensionOffer,
    negotiationResponse,
    offerNoTrade,
    offerOptOut,
    offerSalary,
    offerSigningBonus,
    offerYears,
    openNegotiation,
    selectedExtension,
    setOfferNoTrade,
    setOfferOptOut,
    setOfferSalary,
    setOfferSigningBonus,
    setOfferYears,
    submitExtensionOffer,
  };
}
