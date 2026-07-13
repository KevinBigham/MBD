export interface FinanceContractEntry {
  playerId: string;
  name: string;
  position: string;
  rosterStatus: string;
  annualSalary: number;
  yearsRemaining: number;
  noTradeClause: boolean;
  playerOption: boolean;
  teamOption: boolean;
}

export function formatDollars(millions: number): string {
  const value = millions * 1_000_000;
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

export function formatMoney(millions: number): string {
  return `$${millions.toFixed(2)}M`;
}

export function isExtensionPriorityContract(contract: FinanceContractEntry): boolean {
  return contract.rosterStatus === 'MLB' && contract.yearsRemaining <= 2 && contract.annualSalary >= 1;
}
