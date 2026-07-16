import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OwnerPayrollPolicy } from '@mbd/sim-core';
import {
  isExtensionPriorityContract,
  type FinanceContractEntry,
} from '../components/financePresentation';
import type {
  FinanceContractFilter,
  FinanceContractSortKey,
} from '../components/FinanceContractTablePanel';

export interface FinanceData {
  totalPayroll: number;
  mlbPayroll: number;
  minorsPayroll: number;
  luxuryTaxPayroll: number;
  luxuryTax: number;
  budget: number;
  capSpace: number;
  budgetRoom: number;
  ownerPayrollPolicy: OwnerPayrollPolicy;
  futureCommitments: number[];
  coachingPayroll: number;
  contracts: FinanceContractEntry[];
}

type SortDir = 'asc' | 'desc';

export interface FinanceRouteDataOptions {
  day: number;
  getFinanceOverview: () => Promise<unknown>;
  isInitialized: boolean;
  phase: string;
  season: number;
  workerReady: boolean;
}

export interface FinanceRouteDataResult {
  contractFilter: FinanceContractFilter;
  contractFilterCounts: Record<FinanceContractFilter, number>;
  data: FinanceData | null;
  handleSort: (key: FinanceContractSortKey) => void;
  setContractFilter: (filter: FinanceContractFilter) => void;
  sortIndicator: (key: FinanceContractSortKey) => string;
  visibleContracts: FinanceContractEntry[];
}

const EMPTY_CONTRACT_FILTER_COUNTS: Record<FinanceContractFilter, number> = {
  mlb: 0,
  minors: 0,
  expiring: 0,
  high_salary: 0,
  clauses: 0,
  extension_priority: 0,
  all: 0,
};

function contractMatchesFilter(contract: FinanceContractEntry, filter: FinanceContractFilter, highSalaryFloor: number): boolean {
  switch (filter) {
    case 'mlb':
      return contract.rosterStatus === 'MLB';
    case 'minors':
      return contract.rosterStatus !== 'MLB';
    case 'expiring':
      return contract.yearsRemaining <= 1;
    case 'high_salary':
      return contract.annualSalary >= highSalaryFloor;
    case 'clauses':
      return contract.noTradeClause || contract.playerOption;
    case 'extension_priority':
      return isExtensionPriorityContract(contract);
    case 'all':
      return true;
  }
}

export function useFinanceRouteData({
  day,
  getFinanceOverview,
  isInitialized,
  phase,
  season,
  workerReady,
}: FinanceRouteDataOptions): FinanceRouteDataResult {
  const [data, setData] = useState<FinanceData | null>(null);
  const [sortKey, setSortKey] = useState<FinanceContractSortKey>('annualSalary');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [contractFilter, setContractFilter] = useState<FinanceContractFilter>('mlb');

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    const result = await getFinanceOverview();
    setData(result as FinanceData);
  }, [getFinanceOverview, isInitialized, workerReady]);

  useEffect(() => {
    void fetchData();
  }, [day, fetchData, phase, season]);

  const handleSort = useCallback((key: FinanceContractSortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir(key === 'name' || key === 'position' ? 'asc' : 'desc');
      return key;
    });
  }, []);

  const highSalaryFloor = useMemo(() => {
    if (!data || data.contracts.length === 0) return 15;
    const salaries = data.contracts.map((contract) => contract.annualSalary).sort((left, right) => right - left);
    return Math.max(8, salaries[Math.min(salaries.length - 1, 14)] ?? 15);
  }, [data]);

  const filteredContracts = useMemo(() => {
    if (!data) return [];
    return data.contracts.filter((contract) => contractMatchesFilter(contract, contractFilter, highSalaryFloor));
  }, [contractFilter, data, highSalaryFloor]);

  const visibleContracts = useMemo(() => {
    const sorted = [...filteredContracts];
    sorted.sort((left, right) => {
      let cmp: number;
      switch (sortKey) {
        case 'name':
          cmp = left.name.localeCompare(right.name);
          break;
        case 'position':
          cmp = left.position.localeCompare(right.position);
          break;
        case 'annualSalary':
          cmp = left.annualSalary - right.annualSalary;
          break;
        case 'yearsRemaining':
          cmp = left.yearsRemaining - right.yearsRemaining;
          break;
        default:
          cmp = 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredContracts, sortDir, sortKey]);

  const contractFilterCounts = useMemo(() => {
    if (!data) return EMPTY_CONTRACT_FILTER_COUNTS;

    return {
      mlb: data.contracts.filter((contract) => contractMatchesFilter(contract, 'mlb', highSalaryFloor)).length,
      minors: data.contracts.filter((contract) => contractMatchesFilter(contract, 'minors', highSalaryFloor)).length,
      expiring: data.contracts.filter((contract) => contractMatchesFilter(contract, 'expiring', highSalaryFloor)).length,
      high_salary: data.contracts.filter((contract) => contractMatchesFilter(contract, 'high_salary', highSalaryFloor)).length,
      clauses: data.contracts.filter((contract) => contractMatchesFilter(contract, 'clauses', highSalaryFloor)).length,
      extension_priority: data.contracts.filter((contract) => contractMatchesFilter(contract, 'extension_priority', highSalaryFloor)).length,
      all: data.contracts.length,
    };
  }, [data, highSalaryFloor]);

  const sortIndicator = useCallback(
    (key: FinanceContractSortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''),
    [sortDir, sortKey],
  );

  return {
    contractFilter,
    contractFilterCounts,
    data,
    handleSort,
    setContractFilter,
    sortIndicator,
    visibleContracts,
  };
}
