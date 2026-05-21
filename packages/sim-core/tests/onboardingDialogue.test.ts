import { describe, expect, it } from 'vitest';
import { AGM_CANDIDATES } from '../src/onboarding/agmCandidates.js';
import { ROUND_THREE_DIALOGUE } from '../src/onboarding/roundThreeDialogue.js';

const PLACEHOLDER_TOKEN_PATTERN = /\[[A-Z_]+\]/;

describe('onboarding dialogue polish', () => {
  it('does not expose placeholder tokens in revised round three dialogue', () => {
    const lines = Object.values(ROUND_THREE_DIALOGUE)
      .flatMap((chapters) => Object.values(chapters))
      .flat()
      .map((line) => line.text);

    expect(lines).not.toContainEqual(expect.stringMatching(PLACEHOLDER_TOKEN_PATTERN));
  });

  it('does not expose placeholder tokens in AGM candidate catchphrases', () => {
    const catchphrases = AGM_CANDIDATES.flatMap((candidate) => candidate.catchphrases);

    expect(catchphrases).not.toContainEqual(expect.stringMatching(PLACEHOLDER_TOKEN_PATTERN));
  });
});
