import { RATING_MAX, toDisplayRating } from './attributes.js';
import type { GeneratedPlayer } from './generation.js';

interface AttributeDescriptor {
  readonly attribute: string;
  readonly label: string;
}

export interface SimilarPlayer {
  playerId: string;
  playerName: string;
  similarityScore: number;
  sharedStrengths: string[];
  primaryDifference: string;
}

export interface SimilarityResult {
  targetPlayerId: string;
  comparisons: SimilarPlayer[];
}

export interface PlayerArchetype {
  archetype: string;
  description: string;
}

const DEFAULT_MAX_RESULTS = 5;

const HITTER_ATTRIBUTE_DESCRIPTORS: readonly AttributeDescriptor[] = [
  { attribute: 'contact', label: 'Contact' },
  { attribute: 'power', label: 'Power' },
  { attribute: 'eye', label: 'Eye' },
  { attribute: 'speed', label: 'Speed' },
  { attribute: 'defense', label: 'Defense' },
  { attribute: 'durability', label: 'Durability' },
] as const;

const PITCHER_ATTRIBUTE_DESCRIPTORS: readonly AttributeDescriptor[] = [
  { attribute: 'stuff', label: 'Stuff' },
  { attribute: 'control', label: 'Control' },
  { attribute: 'stamina', label: 'Stamina' },
  { attribute: 'velocity', label: 'Velocity' },
  { attribute: 'movement', label: 'Movement' },
] as const;

function isPitcher(player: GeneratedPlayer): boolean {
  return player.pitcherAttributes !== null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getAttributeDescriptors(player: GeneratedPlayer): readonly AttributeDescriptor[] {
  return isPitcher(player) ? PITCHER_ATTRIBUTE_DESCRIPTORS : HITTER_ATTRIBUTE_DESCRIPTORS;
}

function getAttributeValue(player: GeneratedPlayer, descriptor: AttributeDescriptor): number {
  if (isPitcher(player)) {
    return player.pitcherAttributes?.[descriptor.attribute as keyof NonNullable<GeneratedPlayer['pitcherAttributes']>] ?? 0;
  }

  return player.hitterAttributes[descriptor.attribute as keyof GeneratedPlayer['hitterAttributes']];
}

function getPlayerName(player: GeneratedPlayer): string {
  return `${player.firstName} ${player.lastName}`;
}

function getSharedStrengths(
  target: GeneratedPlayer,
  candidate: GeneratedPlayer,
  descriptors: readonly AttributeDescriptor[],
): string[] {
  return descriptors
    .filter((descriptor) => (
      toDisplayRating(getAttributeValue(target, descriptor)) >= 60
      && toDisplayRating(getAttributeValue(candidate, descriptor)) >= 60
    ))
    .map((descriptor) => descriptor.label);
}

function getPrimaryDifference(
  target: GeneratedPlayer,
  candidate: GeneratedPlayer,
  descriptors: readonly AttributeDescriptor[],
): string {
  const largestGap = descriptors.reduce((current, descriptor, index) => {
    const difference = Math.abs(
      toDisplayRating(getAttributeValue(target, descriptor))
      - toDisplayRating(getAttributeValue(candidate, descriptor)),
    );

    if (
      difference > current.difference
      || (difference === current.difference && index < current.index)
    ) {
      return {
        difference,
        index,
        descriptor,
      };
    }

    return current;
  }, {
    difference: -1,
    index: Number.POSITIVE_INFINITY,
    descriptor: descriptors[0]!,
  });

  if (largestGap.difference <= 0) {
    return 'No meaningful gap';
  }

  return largestGap.descriptor.label;
}

function calculateSimilarityScore(
  target: GeneratedPlayer,
  candidate: GeneratedPlayer,
  descriptors: readonly AttributeDescriptor[],
): number {
  const sumSquares = descriptors.reduce((sum, descriptor) => {
    const left = getAttributeValue(target, descriptor) / RATING_MAX;
    const right = getAttributeValue(candidate, descriptor) / RATING_MAX;
    const difference = left - right;

    return sum + (difference * difference);
  }, 0);

  const distance = Math.sqrt(sumSquares / descriptors.length);
  return clamp(Math.round((1 - distance) * 100), 0, 100);
}

export function findSimilarPlayers(
  target: GeneratedPlayer,
  candidates: GeneratedPlayer[],
  maxResults: number = DEFAULT_MAX_RESULTS,
): SimilarityResult {
  const limit = Math.max(0, maxResults);
  const targetIsPitcher = isPitcher(target);
  const descriptors = getAttributeDescriptors(target);

  const comparisons = candidates
    .map((candidate) => {
      const sameRole = targetIsPitcher === isPitcher(candidate);
      const similarityScore = sameRole
        ? calculateSimilarityScore(target, candidate, descriptors)
        : 0;

      return {
        playerId: candidate.id,
        playerName: getPlayerName(candidate),
        similarityScore,
        sharedStrengths: sameRole ? getSharedStrengths(target, candidate, descriptors) : [],
        primaryDifference: sameRole
          ? getPrimaryDifference(target, candidate, descriptors)
          : 'Different primary role',
      };
    })
    .sort((left, right) => {
      if (left.similarityScore !== right.similarityScore) {
        return right.similarityScore - left.similarityScore;
      }

      return left.playerId.localeCompare(right.playerId);
    })
    .slice(0, limit);

  return {
    targetPlayerId: target.id,
    comparisons,
  };
}

export function getPlayerArchetype(player: GeneratedPlayer): PlayerArchetype {
  if (isPitcher(player)) {
    const attrs = player.pitcherAttributes!;

    if (attrs.stuff >= 400 && attrs.velocity >= 400) {
      return {
        archetype: 'Power Arm',
        description: 'Overwhelms hitters with premium stuff and velocity.',
      };
    }

    if (attrs.control >= 400 && attrs.stuff < 350) {
      return {
        archetype: 'Finesse Pitcher',
        description: 'Wins with command, sequencing, and weak contact.',
      };
    }

    if (attrs.stamina >= 400) {
      return {
        archetype: 'Workhorse',
        description: 'Built to carry innings deep into games and through the season.',
      };
    }

    if (attrs.movement >= 400 && attrs.control >= 350) {
      return {
        archetype: 'Crafty Veteran',
        description: 'Lives on movement and precision more than raw overpowering stuff.',
      };
    }

    return {
      archetype: 'Balanced',
      description: 'Offers a rounded pitching mix without a single defining extreme.',
    };
  }

  const attrs = player.hitterAttributes;

  if (
    attrs.contact >= 300
    && attrs.power >= 300
    && attrs.eye >= 300
    && attrs.speed >= 300
    && attrs.defense >= 300
    && attrs.durability >= 300
  ) {
    return {
      archetype: 'Five-Tool Player',
      description: 'Brings impact across every major part of the hitter profile.',
    };
  }

  if (attrs.power >= 400) {
    return {
      archetype: 'Power Slugger',
      description: 'Built to do damage with top-end raw power.',
    };
  }

  if (attrs.contact >= 400 && attrs.power < 300) {
    return {
      archetype: 'Contact Specialist',
      description: 'Prioritizes bat-to-ball skill and line-drive consistency.',
    };
  }

  if (attrs.speed >= 400) {
    return {
      archetype: 'Speed Demon',
      description: 'Creates pressure with elite speed and range.',
    };
  }

  if (attrs.defense >= 400) {
    return {
      archetype: 'Defensive Wizard',
      description: 'Separates from peers with standout glove work.',
    };
  }

  return {
    archetype: 'Balanced',
    description: 'Contributes in multiple areas without one dominant carrying tool.',
  };
}
