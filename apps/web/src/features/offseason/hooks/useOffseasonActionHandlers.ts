import { useCallback, useState } from 'react';
import type { OffseasonData } from './useOffseasonRouteData';

interface UseOffseasonActionHandlersOptions {
  advanceOffseason: () => Promise<unknown>;
  applyOffseasonData: (data: OffseasonData) => void;
  autosaveActiveGame: (options?: { season?: number }) => Promise<unknown>;
  fetchOffseason: () => Promise<OffseasonData | null>;
  issueQualifyingOffer: (playerId: string) => Promise<unknown>;
  lockRule5Protection: () => Promise<unknown>;
  makeRule5Pick: (playerId: string) => Promise<unknown>;
  passRule5Pick: () => Promise<unknown>;
  resolveQualifyingOffers: () => Promise<unknown>;
  resolveRule5OfferBack: (playerId: string, acceptReturn: boolean) => Promise<unknown>;
  season: number;
  skipOffseasonPhase: () => Promise<unknown>;
  toggleRule5Protection: (playerId: string) => Promise<unknown>;
}

interface UseOffseasonActionHandlersResult {
  advancing: boolean;
  handleAdvance: () => Promise<void>;
  handleIssueQualifyingOffer: (playerId: string) => Promise<void>;
  handleLockProtection: () => Promise<void>;
  handlePassRule5Pick: () => Promise<void>;
  handleResolveOfferBack: (playerId: string, acceptReturn: boolean) => Promise<void>;
  handleResolveQualifyingOffers: () => Promise<void>;
  handleRule5Pick: (playerId: string) => Promise<void>;
  handleSkip: () => Promise<void>;
  handleToggleProtection: (playerId: string) => Promise<void>;
}

function isOffseasonData(value: unknown): value is OffseasonData {
  return typeof value === 'object' && value !== null && 'currentPhase' in value && 'phaseResults' in value;
}

function isSuccessResult(value: unknown): value is { success: boolean } {
  return typeof value === 'object' && value !== null && 'success' in value;
}

export function useOffseasonActionHandlers({
  advanceOffseason,
  applyOffseasonData,
  autosaveActiveGame,
  fetchOffseason,
  issueQualifyingOffer,
  lockRule5Protection,
  makeRule5Pick,
  passRule5Pick,
  resolveQualifyingOffers,
  resolveRule5OfferBack,
  season,
  skipOffseasonPhase,
  toggleRule5Protection,
}: UseOffseasonActionHandlersOptions): UseOffseasonActionHandlersResult {
  const [advancing, setAdvancing] = useState(false);

  const autosaveSeason = useCallback(async () => {
    await autosaveActiveGame({ season });
  }, [autosaveActiveGame, season]);

  const handleAdvance = useCallback(async () => {
    setAdvancing(true);
    try {
      const data = await advanceOffseason();
      if (isOffseasonData(data)) {
        applyOffseasonData(data);
        await autosaveSeason();
      }
    } finally {
      setAdvancing(false);
    }
  }, [advanceOffseason, applyOffseasonData, autosaveSeason]);

  const handleSkip = useCallback(async () => {
    setAdvancing(true);
    try {
      const data = await skipOffseasonPhase();
      if (isOffseasonData(data)) {
        applyOffseasonData(data);
        await autosaveSeason();
      }
    } finally {
      setAdvancing(false);
    }
  }, [applyOffseasonData, autosaveSeason, skipOffseasonPhase]);

  const handleIssueQualifyingOffer = useCallback(async (playerId: string) => {
    setAdvancing(true);
    try {
      const result = await issueQualifyingOffer(playerId);
      if (isSuccessResult(result) && result.success) {
        await fetchOffseason();
        await autosaveSeason();
      }
    } finally {
      setAdvancing(false);
    }
  }, [autosaveSeason, fetchOffseason, issueQualifyingOffer]);

  const handleResolveQualifyingOffers = useCallback(async () => {
    setAdvancing(true);
    try {
      await resolveQualifyingOffers();
      await fetchOffseason();
      await autosaveSeason();
    } finally {
      setAdvancing(false);
    }
  }, [autosaveSeason, fetchOffseason, resolveQualifyingOffers]);

  const handleToggleProtection = useCallback(async (playerId: string) => {
    setAdvancing(true);
    try {
      const result = await toggleRule5Protection(playerId);
      if (isSuccessResult(result) && result.success) {
        await fetchOffseason();
        await autosaveSeason();
      }
    } finally {
      setAdvancing(false);
    }
  }, [autosaveSeason, fetchOffseason, toggleRule5Protection]);

  const handleLockProtection = useCallback(async () => {
    setAdvancing(true);
    try {
      const data = await lockRule5Protection();
      if (isOffseasonData(data)) {
        applyOffseasonData(data);
        await autosaveSeason();
      }
    } finally {
      setAdvancing(false);
    }
  }, [applyOffseasonData, autosaveSeason, lockRule5Protection]);

  const handleRule5Pick = useCallback(async (playerId: string) => {
    setAdvancing(true);
    try {
      const result = await makeRule5Pick(playerId);
      if (isSuccessResult(result) && result.success) {
        await fetchOffseason();
        await autosaveSeason();
      }
    } finally {
      setAdvancing(false);
    }
  }, [autosaveSeason, fetchOffseason, makeRule5Pick]);

  const handlePassRule5Pick = useCallback(async () => {
    setAdvancing(true);
    try {
      const result = await passRule5Pick();
      if (isSuccessResult(result) && result.success) {
        await fetchOffseason();
        await autosaveSeason();
      }
    } finally {
      setAdvancing(false);
    }
  }, [autosaveSeason, fetchOffseason, passRule5Pick]);

  const handleResolveOfferBack = useCallback(async (playerId: string, acceptReturn: boolean) => {
    setAdvancing(true);
    try {
      const result = await resolveRule5OfferBack(playerId, acceptReturn);
      if (isSuccessResult(result) && result.success) {
        await fetchOffseason();
        await autosaveSeason();
      }
    } finally {
      setAdvancing(false);
    }
  }, [autosaveSeason, fetchOffseason, resolveRule5OfferBack]);

  return {
    advancing,
    handleAdvance,
    handleIssueQualifyingOffer,
    handleLockProtection,
    handlePassRule5Pick,
    handleResolveOfferBack,
    handleResolveQualifyingOffers,
    handleRule5Pick,
    handleSkip,
    handleToggleProtection,
  };
}
