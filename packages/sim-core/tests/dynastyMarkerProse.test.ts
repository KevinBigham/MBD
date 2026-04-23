import { describe, expect, it } from 'vitest';
import {
  DYNASTY_MARKER_BODY_VARIANTS,
  DYNASTY_MARKER_HEADLINE_VARIANTS,
  pickStableDynastyMarkerBody,
  pickStableDynastyMarkerHeadline,
  type DynastyMarkerTopicId,
} from '../src/narrative/dynastyMarkerProse.js';

const context = {
  teamLabel: 'New York Voyagers',
  startingSeason: 8,
  endingSeason: 10,
  priorWins: 94,
  currentWins: 79,
  priorSeason: 9,
  streakLength: 5,
  streakStartSeason: 6,
  currentSeason: 10,
};

describe('dynastyMarkerProse', () => {
  it('returns the same headline and body for the same team, season, and topic', () => {
    const first = {
      headline: pickStableDynastyMarkerHeadline('three_peat', context, 'nym', 10),
      body: pickStableDynastyMarkerBody('three_peat', context, 'nym', 10),
    };
    const second = {
      headline: pickStableDynastyMarkerHeadline('three_peat', context, 'nym', 10),
      body: pickStableDynastyMarkerBody('three_peat', context, 'nym', 10),
    };

    expect(first).toEqual(second);
  });

  it.each([
    'three_peat',
    'era_ending_collapse',
    'perennial_contender',
  ] as const satisfies readonly DynastyMarkerTopicId[])('provides at least three headline and body variants for %s', (topicId) => {
    expect(DYNASTY_MARKER_HEADLINE_VARIANTS[topicId]).toHaveLength(3);
    expect(DYNASTY_MARKER_BODY_VARIANTS[topicId]).toHaveLength(3);
  });
});
