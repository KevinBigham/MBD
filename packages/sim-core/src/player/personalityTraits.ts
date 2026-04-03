import { GameRNG } from '../math/prng.js';

export const PERSONALITY_TRAITS = [
  'Leader',
  'Clutch Performer',
  'Mentor',
  'Hard Worker',
  'Fan Favorite',
  'Clubhouse Comedian',
  'Iron Will',
  'Cool Under Pressure',
  'Team First',
  'Quiet Professional',
  'Media Darling',
  'Superstitious',
  'Streaky',
  'Flashy',
  'Diva',
  'Hot Head',
  'Injury Prone Mentality',
  'Party Animal',
  'Moody',
  'Mercenary',
] as const;

export const POSITIVE_CHEMISTRY_TRAITS = new Set<string>([
  'Leader',
  'Mentor',
  'Hard Worker',
  'Fan Favorite',
  'Clubhouse Comedian',
  'Iron Will',
  'Cool Under Pressure',
  'Team First',
  'Quiet Professional',
]);

export const NEGATIVE_CHEMISTRY_TRAITS = new Set<string>([
  'Diva',
  'Hot Head',
  'Party Animal',
  'Moody',
  'Mercenary',
]);

export const CLUBHOUSE_LEADER_TRAITS = new Set<string>([
  'Leader',
  'Mentor',
  'Team First',
  'Hard Worker',
]);

export const PLAYOFF_COMPOSURE_TRAITS = new Set<string>([
  'Clutch Performer',
  'Iron Will',
  'Cool Under Pressure',
  'Leader',
]);

export const VOLATILE_PERFORMANCE_TRAITS = new Set<string>([
  'Hot Head',
  'Moody',
  'Party Animal',
  'Streaky',
]);

interface PersonalitySnapshot {
  workEthic: number;
  mentalToughness: number;
  leadership: number;
  competitiveness: number;
}

export interface PersonalityTraitContext {
  id?: string;
  age: number;
  position: string;
  rosterStatus: string;
  personality: PersonalitySnapshot;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isPitcher(position: string): boolean {
  return position === 'SP' || position === 'RP' || position === 'CL';
}

function isPremiumDefender(position: string): boolean {
  return position === 'C' || position === 'SS' || position === 'CF';
}

function hasTraitLike(traits: string[], options: Iterable<string>): boolean {
  const optionSet = new Set(options);
  return traits.some((trait) => optionSet.has(trait));
}

function weightForTrait(
  trait: (typeof PERSONALITY_TRAITS)[number],
  context: PersonalityTraitContext,
): number {
  const { workEthic, mentalToughness, leadership, competitiveness } = context.personality;
  const olderPlayerBonus = context.age >= 30 ? 0.9 : context.age >= 27 ? 0.45 : 0;
  const youngerPlayerBonus = context.age <= 24 ? 0.55 : 0;
  const mlbBonus = context.rosterStatus === 'MLB' ? 0.35 : 0;
  const pitcherBonus = isPitcher(context.position) ? 0.3 : 0;
  const premiumDefenseBonus = isPremiumDefender(context.position) ? 0.3 : 0;

  switch (trait) {
    case 'Leader':
      return 0.25 + leadership / 36 + mentalToughness / 180 + olderPlayerBonus + premiumDefenseBonus;
    case 'Clutch Performer':
      return 0.35 + mentalToughness / 38 + competitiveness / 110 + pitcherBonus * 0.5;
    case 'Mentor':
      return 0.2 + leadership / 42 + workEthic / 95 + olderPlayerBonus + mlbBonus;
    case 'Hard Worker':
      return 0.4 + workEthic / 24;
    case 'Fan Favorite':
      return 0.3 + leadership / 90 + competitiveness / 120 + premiumDefenseBonus + mlbBonus;
    case 'Clubhouse Comedian':
      return 0.45 + leadership / 140 + mentalToughness / 180;
    case 'Iron Will':
      return 0.25 + mentalToughness / 24 + competitiveness / 130;
    case 'Cool Under Pressure':
      return 0.25 + mentalToughness / 26 + pitcherBonus * 0.35;
    case 'Team First':
      return 0.3 + leadership / 34 + workEthic / 72 - competitiveness / 450;
    case 'Quiet Professional':
      return 0.55 + workEthic / 72 + mentalToughness / 120;
    case 'Media Darling':
      return 0.5 + leadership / 120 + competitiveness / 150 + mlbBonus;
    case 'Superstitious':
      return 0.85 + competitiveness / 260;
    case 'Streaky':
      return 0.35 + competitiveness / 130 + (100 - mentalToughness) / 120 + youngerPlayerBonus * 0.35;
    case 'Flashy':
      return 0.25 + competitiveness / 75 + premiumDefenseBonus * 0.4;
    case 'Diva':
      return 0.15 + competitiveness / 90 + (100 - leadership) / 38 + (context.position === '1B' || context.position === 'DH' ? 0.4 : 0);
    case 'Hot Head':
      return 0.15 + competitiveness / 88 + (100 - mentalToughness) / 34;
    case 'Injury Prone Mentality':
      return 0.2 + (100 - mentalToughness) / 40 + (100 - workEthic) / 115;
    case 'Party Animal':
      return 0.15 + competitiveness / 115 + (100 - workEthic) / 36;
    case 'Moody':
      return 0.25 + (100 - mentalToughness) / 42 + (100 - leadership) / 78;
    case 'Mercenary':
      return 0.15 + competitiveness / 120 + (100 - leadership) / 40 + olderPlayerBonus + mlbBonus;
    default:
      return 1;
  }
}

function pickWeightedTrait(rng: GameRNG, traits: string[], context: PersonalityTraitContext): string {
  const weighted = traits.map((trait) => ({
    trait,
    weight: Math.max(0.05, weightForTrait(trait as (typeof PERSONALITY_TRAITS)[number], context)),
  }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng.nextFloat() * total;

  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.trait;
    }
  }

  return weighted[weighted.length - 1]!.trait;
}

function chooseFallbackPositiveTrait(context: PersonalityTraitContext): string {
  const preferred = ['Leader', 'Hard Worker', 'Team First', 'Quiet Professional', 'Mentor'];
  return preferred
    .map((trait) => ({
      trait,
      weight: weightForTrait(trait as (typeof PERSONALITY_TRAITS)[number], context),
    }))
    .sort((left, right) => right.weight - left.weight)[0]?.trait ?? 'Quiet Professional';
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.max(1, hash >>> 0);
}

export function assignPersonalityTraits(
  rng: GameRNG,
  context: PersonalityTraitContext,
): string[] {
  const desiredCount = rng.nextFloat() < 0.45 ? 2 : 3;
  const traits: string[] = [];
  const available = [...PERSONALITY_TRAITS];

  while (traits.length < desiredCount && available.length > 0) {
    const nextTrait = pickWeightedTrait(rng, available, context);
    traits.push(nextTrait);
    available.splice(available.indexOf(nextTrait as (typeof PERSONALITY_TRAITS)[number]), 1);
  }

  if (!hasTraitLike(traits, POSITIVE_CHEMISTRY_TRAITS)) {
    traits[traits.length - 1] = chooseFallbackPositiveTrait(context);
  }

  return Array.from(new Set(traits)).slice(0, desiredCount);
}

export function deriveDeterministicPersonalityTraits(
  context: PersonalityTraitContext,
): string[] {
  const seed = hashSeed([
    context.id ?? 'player',
    context.age,
    context.position,
    context.rosterStatus,
    context.personality.workEthic,
    context.personality.mentalToughness,
    context.personality.leadership,
    context.personality.competitiveness,
  ].join(':'));
  return assignPersonalityTraits(new GameRNG(seed), context);
}

export function countMatchingTraits(
  traits: string[] | undefined,
  matchingTraits: Iterable<string>,
): number {
  if (!traits || traits.length === 0) {
    return 0;
  }

  const matchSet = new Set(matchingTraits);
  return traits.filter((trait) => matchSet.has(trait)).length;
}

export function calculatePlayoffComposureModifier(
  lineup: Array<{ personalityTraits?: string[] }>,
): number {
  const clutchCount = lineup.reduce(
    (sum, player) => sum + countMatchingTraits(player.personalityTraits, PLAYOFF_COMPOSURE_TRAITS),
    0,
  );
  const volatileCount = lineup.reduce(
    (sum, player) => sum + countMatchingTraits(player.personalityTraits, VOLATILE_PERFORMANCE_TRAITS),
    0,
  );
  const rawModifier = 1 + clutchCount * 0.0025 - volatileCount * 0.0015;
  return clamp(Number(rawModifier.toFixed(4)), 0.985, 1.025);
}
