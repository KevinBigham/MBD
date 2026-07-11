interface SavePersistenceSummaryFormatOptions {
  locale?: string | string[];
  timeZone?: string;
}

function normalizePendingWrites(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function formatDurableTime(
  lastSavedAt: string | null,
  options: SavePersistenceSummaryFormatOptions,
): string | null {
  if (!lastSavedAt) return null;

  const timestamp = Date.parse(lastSavedAt);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;

  return new Intl.DateTimeFormat(options.locale, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: options.timeZone,
  }).format(new Date(timestamp));
}

export function formatSavePersistenceSummary(
  lastSavedAt: string | null,
  pendingWrites: number,
  options: SavePersistenceSummaryFormatOptions = {},
): string {
  const pending = normalizePendingWrites(pendingWrites);
  const queueLabel = `${pending} pending ${pending === 1 ? 'write' : 'writes'}`;
  const durableTime = formatDurableTime(lastSavedAt, options);

  return durableTime
    ? `Last saved ${durableTime} · ${queueLabel}`
    : `Not saved yet · ${queueLabel}`;
}
