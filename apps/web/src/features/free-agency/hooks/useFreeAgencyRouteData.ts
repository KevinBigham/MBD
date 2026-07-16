import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OwnerPayrollPolicy } from '@mbd/sim-core';
import type {
  DemandFilter,
  FreeAgencyMarketAgent,
  PositionFilter,
  SortKey,
} from '../components/FreeAgencyMarketBoardPanel';

type FreeAgentRow = FreeAgencyMarketAgent;

interface RawFreeAgentRow {
  id?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  age?: number;
  displayRating?: number;
  letterGrade?: string;
  marketValue?: number;
  demandLevel?: string;
  qualifyingOffer?: FreeAgentRow['qualifyingOffer'];
  player?: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    age: number;
    overallRating: number;
  };
}

export interface FinanceOverview {
  totalPayroll: number;
  budget: number;
  capSpace: number;
  ownerPayrollPolicy?: OwnerPayrollPolicy;
}

export interface FreeAgencyRouteDataOptions {
  getFinanceOverview: () => Promise<unknown>;
  getFreeAgents: (limit?: number) => Promise<unknown>;
  isInitialized: boolean;
  phase: string;
  workerReady: boolean;
}

export interface FreeAgencyRouteDataResult {
  agents: FreeAgentRow[];
  demandFilter: DemandFilter;
  fetchFreeAgents: () => Promise<void>;
  filteredAgents: FreeAgentRow[];
  finance: FinanceOverview | null;
  handleSortKeyChange: (nextSortKey: SortKey) => void;
  loading: boolean;
  positionFilter: PositionFilter;
  removeAgentById: (playerId: string) => void;
  searchQuery: string;
  setDemandFilter: (filter: DemandFilter) => void;
  setPositionFilter: (filter: PositionFilter) => void;
  setSearchQuery: (query: string) => void;
  sortDesc: boolean;
  sortKey: SortKey;
}

const HITTER_POS = new Set(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH']);

function normalizeFreeAgent(row: RawFreeAgentRow): FreeAgentRow {
  if (row.player) {
    return {
      id: row.player.id,
      firstName: row.player.firstName,
      lastName: row.player.lastName,
      position: row.player.position,
      age: row.player.age,
      displayRating: Math.round(row.player.overallRating / 5),
      letterGrade: row.letterGrade ?? 'B',
      marketValue: row.marketValue ?? 0,
      demandLevel: row.demandLevel ?? 'moderate',
      qualifyingOffer: row.qualifyingOffer ?? null,
    };
  }

  return {
    id: row.id ?? '',
    firstName: row.firstName ?? 'Unknown',
    lastName: row.lastName ?? 'Player',
    position: row.position ?? 'UTIL',
    age: row.age ?? 0,
    displayRating: row.displayRating ?? 0,
    letterGrade: row.letterGrade ?? 'C',
    marketValue: row.marketValue ?? 0,
    demandLevel: row.demandLevel ?? 'moderate',
    qualifyingOffer: row.qualifyingOffer ?? null,
  };
}

function compareAgents(left: FreeAgentRow, right: FreeAgentRow, sortKey: SortKey): number {
  switch (sortKey) {
    case 'age':
      return left.age - right.age;
    case 'displayRating':
      return left.displayRating - right.displayRating;
    case 'marketValue':
      return left.marketValue - right.marketValue;
    case 'name':
      return `${left.lastName}, ${left.firstName}`.localeCompare(`${right.lastName}, ${right.firstName}`);
    default:
      return 0;
  }
}

export function useFreeAgencyRouteData({
  getFinanceOverview,
  getFreeAgents,
  isInitialized,
  phase,
  workerReady,
}: FreeAgencyRouteDataOptions): FreeAgencyRouteDataResult {
  const [agents, setAgents] = useState<FreeAgentRow[]>([]);
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all');
  const [demandFilter, setDemandFilter] = useState<DemandFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('marketValue');
  const [sortDesc, setSortDesc] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [finance, setFinance] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFreeAgents = useCallback(async () => {
    if (!isInitialized || !workerReady) return;

    setLoading(true);
    try {
      const data = await getFreeAgents(200);
      setAgents(((data ?? []) as RawFreeAgentRow[])
        .map(normalizeFreeAgent)
        .filter((agent) => agent.id));
      const nextFinance = await getFinanceOverview();
      setFinance((nextFinance ?? null) as FinanceOverview | null);
    } catch {
      // Leave the current market visible if this worker surface is temporarily unavailable.
    } finally {
      setLoading(false);
    }
  }, [getFinanceOverview, getFreeAgents, isInitialized, workerReady]);

  useEffect(() => {
    void fetchFreeAgents();
  }, [fetchFreeAgents, phase]);

  const filteredAgents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return agents
      .filter((agent) => {
        if (positionFilter === 'hitters' && !HITTER_POS.has(agent.position)) return false;
        if (positionFilter === 'pitchers' && HITTER_POS.has(agent.position)) return false;
        if (demandFilter !== 'all' && agent.demandLevel !== demandFilter) return false;
        if (query) {
          const haystack = `${agent.firstName} ${agent.lastName} ${agent.position}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((left, right) => {
        const cmp = compareAgents(left, right, sortKey);
        return sortDesc ? -cmp : cmp;
      });
  }, [agents, demandFilter, positionFilter, searchQuery, sortDesc, sortKey]);

  const handleSortKeyChange = useCallback((nextSortKey: SortKey) => {
    setSortKey((current) => {
      if (current === nextSortKey) {
        setSortDesc((value) => !value);
        return current;
      }
      setSortDesc(nextSortKey !== 'name');
      return nextSortKey;
    });
  }, []);

  const removeAgentById = useCallback((playerId: string) => {
    setAgents((currentAgents) => currentAgents.filter((agent) => agent.id !== playerId));
  }, []);

  return {
    agents,
    demandFilter,
    fetchFreeAgents,
    filteredAgents,
    finance,
    handleSortKeyChange,
    loading,
    positionFilter,
    removeAgentById,
    searchQuery,
    setDemandFilter,
    setPositionFilter,
    setSearchQuery,
    sortDesc,
    sortKey,
  };
}
