/**
 * @module attributeDescriptors
 * Canonical attribute tables + accessors shared by `similarity.ts` and
 * `comparison.ts`. The ORDER of entries is a public contract — it drives
 * tie-breaks in `getPrimaryDifference` and `rankPlayerAttributes`. Do not
 * reorder without checking the determinism snapshot.
 */
import type { GeneratedPlayer } from './generation.js';

export interface AttributeDescriptor {
  readonly attribute: string;
  readonly label: string;
}

export const HITTER_ATTRIBUTE_DESCRIPTORS: readonly AttributeDescriptor[] = [
  { attribute: 'contact', label: 'Contact' },
  { attribute: 'power', label: 'Power' },
  { attribute: 'eye', label: 'Eye' },
  { attribute: 'speed', label: 'Speed' },
  { attribute: 'defense', label: 'Defense' },
  { attribute: 'durability', label: 'Durability' },
] as const;

export const PITCHER_ATTRIBUTE_DESCRIPTORS: readonly AttributeDescriptor[] = [
  { attribute: 'stuff', label: 'Stuff' },
  { attribute: 'control', label: 'Control' },
  { attribute: 'stamina', label: 'Stamina' },
  { attribute: 'velocity', label: 'Velocity' },
  { attribute: 'movement', label: 'Movement' },
] as const;

export function isPitcher(player: GeneratedPlayer): boolean {
  return player.pitcherAttributes !== null;
}

export function getAttributeDescriptors(player: GeneratedPlayer): readonly AttributeDescriptor[] {
  return isPitcher(player) ? PITCHER_ATTRIBUTE_DESCRIPTORS : HITTER_ATTRIBUTE_DESCRIPTORS;
}

export function getAttributeValue(player: GeneratedPlayer, descriptor: AttributeDescriptor): number {
  if (isPitcher(player)) {
    return player.pitcherAttributes?.[descriptor.attribute as keyof NonNullable<GeneratedPlayer['pitcherAttributes']>] ?? 0;
  }

  return player.hitterAttributes[descriptor.attribute as keyof GeneratedPlayer['hitterAttributes']];
}
