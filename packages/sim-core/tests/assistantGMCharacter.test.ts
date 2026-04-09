import { describe, expect, it } from 'vitest';
import {
  createGameRNG,
  generateAssistantGM,
  generateFarewell,
  generateGreeting,
  getDialogueVoice,
  type AssistantGMBackground,
  type AssistantGMPersonality,
  type AssistantGMProfile,
  type GMPhilosophy,
} from '../src/index.js';

const BACKGROUNDS: AssistantGMBackground[] = [
  'former_player',
  'career_scout',
  'front_office_lifer',
  'analytics_pioneer',
  'old_school_baseball_man',
];

const PERSONALITIES: AssistantGMPersonality[] = [
  'straight_shooter',
  'dry_wit',
  'enthusiastic_mentor',
  'grizzled_veteran',
  'analytical_mind',
];

function countSentences(text: string): number {
  return text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .length;
}

function keywordSetForBackground(background: AssistantGMBackground): string[] {
  switch (background) {
    case 'former_player':
      return ['played', 'clubhouse', 'uniform'];
    case 'career_scout':
      return ['scout', 'kids', 'backfields'];
    case 'front_office_lifer':
      return ['front office', 'office', 'executive'];
    case 'analytics_pioneer':
      return ['numbers', 'data', 'models'];
    case 'old_school_baseball_man':
      return ['back in my day', 'old school', 'baseball man'];
  }
}

function philosophyKeywords(philosophy: GMPhilosophy): string[] {
  switch (philosophy.seasonGoal) {
    case 'championship':
      return ['championship', 'ring', 'title'];
    case 'playoff':
      return ['playoff', 'october', 'postseason'];
    case 'rebuild':
      return ['rebuild', 'patience', 'future'];
    case 'compete':
    default:
      return ['compete', 'fight', 'window'];
  }
}

function findProfiles(limit: number = 800): AssistantGMProfile[] {
  const profiles: AssistantGMProfile[] = [];
  for (let seed = 1; seed <= limit; seed++) {
    profiles.push(generateAssistantGM(createGameRNG(seed)));
  }
  return profiles;
}

describe('generateAssistantGM', () => {
  it('builds a valid deterministic assistant GM profile', () => {
    const profile = generateAssistantGM(createGameRNG(101));

    expect(profile.name.split(' ')).toHaveLength(2);
    expect(profile.nickname.length).toBeGreaterThan(0);
    expect(profile.age).toBeGreaterThanOrEqual(45);
    expect(profile.age).toBeLessThanOrEqual(70);
    expect(BACKGROUNDS).toContain(profile.background);
    expect(PERSONALITIES).toContain(profile.personality);
    expect(profile.yearsInBaseball).toBeGreaterThanOrEqual(18);
    expect(profile.yearsInBaseball).toBeLessThanOrEqual(45);
    expect(profile.catchphrase.length).toBeGreaterThan(0);
  });

  it('returns the same profile for the same seed', () => {
    expect(generateAssistantGM(createGameRNG(202))).toEqual(
      generateAssistantGM(createGameRNG(202)),
    );
  });

  it('returns a different profile for different seeds', () => {
    expect(generateAssistantGM(createGameRNG(203))).not.toEqual(
      generateAssistantGM(createGameRNG(204)),
    );
  });

  it('generates a bio with two to three sentences', () => {
    const profile = generateAssistantGM(createGameRNG(205));

    expect(countSentences(profile.bio)).toBeGreaterThanOrEqual(2);
    expect(countSentences(profile.bio)).toBeLessThanOrEqual(3);
  });

  it.each(BACKGROUNDS)('mentions the %s background in the generated bio', (background) => {
    const profile = findProfiles().find((candidate) => candidate.background === background);

    expect(profile).toBeDefined();
    expect(keywordSetForBackground(background).some((keyword) => profile!.bio.toLowerCase().includes(keyword))).toBe(true);
  });

  it('covers all five backgrounds across deterministic seeds', () => {
    const profiles = findProfiles(1000);

    expect(new Set(profiles.map((profile) => profile.background))).toEqual(new Set(BACKGROUNDS));
  });

  it('covers all five personalities across deterministic seeds', () => {
    const profiles = findProfiles(1000);

    expect(new Set(profiles.map((profile) => profile.personality))).toEqual(new Set(PERSONALITIES));
  });

  it.each(PERSONALITIES)('produces at least four catchphrases for %s across seeds', (personality) => {
    const catchphrases = new Set(
      findProfiles(1500)
        .filter((profile) => profile.personality === personality)
        .map((profile) => profile.catchphrase),
    );

    expect(catchphrases.size).toBeGreaterThanOrEqual(4);
  });

  it.each(PERSONALITIES)('returns a valid baseball philosophy for %s', (personality) => {
    const profile = findProfiles().find((candidate) => candidate.personality === personality);

    expect(profile).toBeDefined();
    expect(['pitching_wins', 'offense_wins', 'balanced']).toContain(profile!.baseballPhilosophy.pitchingOrHitting);
    expect(['grow_your_own', 'buy_stars', 'hybrid']).toContain(profile!.baseballPhilosophy.developmentVsFA);
    expect(['conservative', 'calculated', 'aggressive']).toContain(profile!.baseballPhilosophy.riskTolerance);
  });
});

describe('getDialogueVoice', () => {
  const voiceExpectations: Record<AssistantGMPersonality, AssistantGMProfile['personality']> = {
    straight_shooter: 'straight_shooter',
    dry_wit: 'dry_wit',
    enthusiastic_mentor: 'enthusiastic_mentor',
    grizzled_veteran: 'grizzled_veteran',
    analytical_mind: 'analytical_mind',
  };

  it.each(PERSONALITIES)('maps %s to a consistent dialogue voice', (personality) => {
    const profile = findProfiles().find((candidate) => candidate.personality === personality);
    const voice = getDialogueVoice(profile!);

    expect(profile?.personality).toBe(voiceExpectations[personality]);
    expect(['casual', 'professional', 'folksy']).toContain(voice.formality);
    expect(typeof voice.usesAnalogy).toBe('boolean');
    expect(typeof voice.usesStats).toBe('boolean');
    expect(['reserved', 'moderate', 'expressive']).toContain(voice.emotionalRange);
  });

  it('returns identical dialogue voices for the same profile', () => {
    const profile = generateAssistantGM(createGameRNG(301));

    expect(getDialogueVoice(profile)).toEqual(getDialogueVoice(profile));
  });
});

describe('generateGreeting', () => {
  it('includes the GM name and team name', () => {
    const profile = generateAssistantGM(createGameRNG(401));
    const greeting = generateGreeting(createGameRNG(402), profile, 'Casey Harper', 'Chicago Whales');

    expect(greeting).toContain('Casey Harper');
    expect(greeting).toContain('Chicago Whales');
  });

  it.each(BACKGROUNDS)('references the assistant GM background for %s', (background) => {
    const profile = findProfiles().find((candidate) => candidate.background === background)!;
    const greeting = generateGreeting(createGameRNG(403), profile, 'Jordan Lee', 'Portland Pines');

    expect(keywordSetForBackground(background).some((keyword) => greeting.toLowerCase().includes(keyword))).toBe(true);
  });

  it('is deterministic for the same seed and profile', () => {
    const profile = generateAssistantGM(createGameRNG(404));

    expect(generateGreeting(createGameRNG(405), profile, 'Jordan Lee', 'Portland Pines')).toBe(
      generateGreeting(createGameRNG(405), profile, 'Jordan Lee', 'Portland Pines'),
    );
  });
});

describe('generateFarewell', () => {
  const philosophies: GMPhilosophy[] = [
    {
      developmentStyle: 'aggressive',
      spendingStyle: 'big_spender',
      tradeApproach: 'buyer',
      scoutingFocus: 'international',
      seasonGoal: 'championship',
      mediaTone: 'confident',
    },
    {
      developmentStyle: 'patient',
      spendingStyle: 'penny_pincher',
      tradeApproach: 'seller',
      scoutingFocus: 'draft',
      seasonGoal: 'rebuild',
      mediaTone: 'humble',
    },
    {
      developmentStyle: 'balanced',
      spendingStyle: 'balanced',
      tradeApproach: 'opportunistic',
      scoutingFocus: 'pro_scouting',
      seasonGoal: 'playoff',
      mediaTone: 'measured',
    },
  ];

  it.each(philosophies)('references the chosen philosophy for %o', (philosophy) => {
    const profile = generateAssistantGM(createGameRNG(501));
    const farewell = generateFarewell(createGameRNG(502), profile, 'Casey Harper', philosophy);

    expect(farewell).toContain('Casey Harper');
    expect(philosophyKeywords(philosophy).some((keyword) => farewell.toLowerCase().includes(keyword))).toBe(true);
  });

  it('is deterministic for the same seed and philosophy', () => {
    const profile = generateAssistantGM(createGameRNG(503));
    const philosophy = philosophies[0]!;

    expect(generateFarewell(createGameRNG(504), profile, 'Casey Harper', philosophy)).toBe(
      generateFarewell(createGameRNG(504), profile, 'Casey Harper', philosophy),
    );
  });
});
