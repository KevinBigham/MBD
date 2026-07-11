export type StoragePressureLevel = 'normal' | 'warning' | 'critical' | 'unavailable';

export interface OriginStorageEstimate {
  status: 'available' | 'unavailable';
  usage: number | null;
  quota: number | null;
  percentage: number | null;
  pressure: StoragePressureLevel;
}

/**
 * Display an approximate percentage without rounding a value across one of
 * the policy boundaries used by `classifyOriginStorageEstimate`.
 */
export function formatOriginStoragePercentage(percentage: number): string {
  const rounded = percentage.toFixed(2);
  const roundedValue = Number(rounded);
  if (percentage < 80 && roundedValue >= 80) return '<80.00';
  if (percentage < 90 && roundedValue >= 90) return '<90.00';
  return rounded;
}

export function classifyOriginStorageEstimate(
  estimate: { usage?: unknown; quota?: unknown } | null | undefined,
  persistenceFailureKind?: string | null,
): OriginStorageEstimate {
  if (persistenceFailureKind === 'quota') {
    return { status: 'unavailable', usage: null, quota: null, percentage: null, pressure: 'critical' };
  }
  const usage = estimate?.usage;
  const quota = estimate?.quota;
  if (typeof usage !== 'number' || !Number.isFinite(usage) || usage < 0 || typeof quota !== 'number' || !Number.isFinite(quota) || quota <= 0) {
    return { status: 'unavailable', usage: null, quota: null, percentage: null, pressure: 'unavailable' };
  }
  const percentage = (usage / quota) * 100;
  return {
    status: 'available', usage, quota, percentage,
    pressure: percentage >= 90 ? 'critical' : percentage >= 80 ? 'warning' : 'normal',
  };
}

export async function readOriginStorageEstimate(persistenceFailureKind?: string | null): Promise<OriginStorageEstimate> {
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage;
  if (!storage?.estimate) return classifyOriginStorageEstimate(undefined, persistenceFailureKind);
  try {
    return classifyOriginStorageEstimate(await storage.estimate(), persistenceFailureKind);
  } catch {
    return classifyOriginStorageEstimate(undefined, persistenceFailureKind);
  }
}
