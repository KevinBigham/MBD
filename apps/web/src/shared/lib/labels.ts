const SPECIAL_MOMENT_LABELS: Record<string, string> = {
  deadline_buyer: 'Deadline Buyer',
  deadline_seller: 'Deadline Seller',
  championship_run: 'Championship Run',
  contention_collapse: 'Contention Collapse',
};

export function humanizeLabel(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function momentTypeLabel(type: string): string {
  return SPECIAL_MOMENT_LABELS[type] ?? humanizeLabel(type);
}
