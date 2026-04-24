export interface StableCapstoneProseKey {
  readonly playerId: string;
  readonly season: number;
  readonly ceremonyType: string;
  readonly branch: string;
  readonly slot?: string;
}

export function hashStableProseKey(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function stableCapstoneProseKey(key: StableCapstoneProseKey): string {
  return [
    key.playerId,
    key.season,
    key.ceremonyType,
    key.branch,
    key.slot ?? 'main',
  ].join('|');
}

export function pickStableProseVariant<T>(
  variants: readonly T[],
  key: StableCapstoneProseKey,
): T {
  if (variants.length === 0) {
    throw new Error(`No capstone prose variants configured for ${key.ceremonyType}:${key.branch}`);
  }
  return variants[hashStableProseKey(stableCapstoneProseKey(key)) % variants.length]!;
}

export function renderStableTemplate(
  template: string,
  values: Readonly<Record<string, string | number | null | undefined>>,
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(values)) {
    rendered = rendered.replaceAll(`{${key}}`, value == null || value === '' ? 'the club' : String(value));
  }
  return rendered;
}
