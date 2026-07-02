import { useEffect } from 'react';
import { getAudioEngine, type AudioEffectName } from '@/shared/lib/audio';
import type { TradeResultView } from '../components/TradeResultBanner';

interface UseTradeResultAudioOptions {
  tradeResult: TradeResultView | null;
  playEffect?: (effect: AudioEffectName) => void;
}

export function useTradeResultAudio({
  tradeResult,
  playEffect,
}: UseTradeResultAudioOptions) {
  useEffect(() => {
    if (tradeResult?.status !== 'accepted') {
      return;
    }

    (playEffect ?? ((effect) => getAudioEngine().playEffect(effect)))('trade_completed');
  }, [playEffect, tradeResult]);
}
