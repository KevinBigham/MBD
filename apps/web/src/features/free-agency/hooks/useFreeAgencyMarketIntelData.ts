import { useEffect, useState } from 'react';
import type { MarketReport } from '../components/MarketIntelPlayerReportCard';

export interface FreeAgencyMarketSummary {
  totalProjectedSpending: number;
  hottestPosition: string;
  topFreeAgents: Array<{ name: string; projectedAAV: number }>;
  positionDemand: Record<string, number>;
}

export interface FreeAgencyMarketIntelligenceData {
  reports: MarketReport[];
  summary: FreeAgencyMarketSummary;
  totalFreeAgents: number;
}

interface UseFreeAgencyMarketIntelDataOptions {
  getFreeAgencyMarketIntelligence: () => Promise<unknown>;
}

interface UseFreeAgencyMarketIntelDataResult {
  data: FreeAgencyMarketIntelligenceData | null;
  loading: boolean;
}

export function useFreeAgencyMarketIntelData({
  getFreeAgencyMarketIntelligence,
}: UseFreeAgencyMarketIntelDataOptions): UseFreeAgencyMarketIntelDataResult {
  const [data, setData] = useState<FreeAgencyMarketIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await getFreeAgencyMarketIntelligence();
        if (!cancelled) {
          setData((result ?? null) as FreeAgencyMarketIntelligenceData | null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [getFreeAgencyMarketIntelligence]);

  return { data, loading };
}
