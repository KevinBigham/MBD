import { describe, expect, it } from 'vitest';
import {
  AGM_CANDIDATES,
  ONBOARDING_MODE,
  createGameRNG,
  generateAssistantGM,
  selectAGM,
  toAssistantGMProfile,
  type AGMCandidateId,
} from '../src/index.js';

describe('AGM candidate selection', () => {
  it('defaults onboarding mode to the fixed selection flow', () => {
    expect(ONBOARDING_MODE).toBe('selection');
  });

  it('defines exactly three fixed AGM candidates with stable ids', () => {
    expect(AGM_CANDIDATES).toHaveLength(3);
    expect(AGM_CANDIDATES.map((candidate) => candidate.id)).toEqual<AGMCandidateId[]>([
      'marcus_chen',
      'walt_kowalski',
      'elena_vargas',
    ]);
    expect(AGM_CANDIDATES.filter((candidate) => candidate.gender === 'female')).toHaveLength(1);
    expect(AGM_CANDIDATES.filter((candidate) => candidate.gender === 'male')).toHaveLength(2);
  });

  it('keeps every candidate card fully populated for the selection screen', () => {
    for (const candidate of AGM_CANDIDATES) {
      expect(candidate.strengths).toHaveLength(3);
      expect(candidate.weaknesses).toHaveLength(2);
      expect(candidate.catchphrases).toHaveLength(5);
      expect(candidate.bio.length).toBeGreaterThan(40);
      expect(candidate.selectionScreenBio.length).toBeGreaterThan(40);
    }
  });

  it('selects an AGM deterministically by id', () => {
    expect(selectAGM('walt_kowalski')).toEqual(AGM_CANDIDATES[1]);
  });

  it('maps a fixed AGM candidate into the legacy assistant GM profile shape', () => {
    const candidate = selectAGM('elena_vargas');
    const profile = toAssistantGMProfile(candidate);

    expect(profile.name).toBe(candidate.name);
    expect(profile.nickname).toBe(candidate.nickname);
    expect(profile.background).toBe(candidate.background);
    expect(profile.personality).toBe(candidate.personality);
    expect(profile.baseballPhilosophy).toEqual(candidate.philosophy);
    expect(profile.catchphrase).toBe(candidate.catchphrases[0]);
    expect(profile.bio).toBe(candidate.bio);
  });

  it('keeps the procedural assistant GM generator working as a fallback path', () => {
    const profile = generateAssistantGM(createGameRNG(222));

    expect(profile.name).toContain(' ');
    expect(profile.catchphrase.length).toBeGreaterThan(0);
  });
});
