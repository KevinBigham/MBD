import { describe, expect, it } from 'vitest';
import {
  createGameRNG,
  reactToDevelopmentStyle,
  reactToMediaTone,
  reactToScoutingFocus,
  reactToSeasonGoal,
  reactToSpendingStyle,
  reactToTradeApproach,
  type AssistantGMProfile,
  type ChoiceReaction,
} from '../src/index.js';

function makeProfile(overrides: Partial<AssistantGMProfile> = {}): AssistantGMProfile {
  return {
    name: 'Frank Mercer',
    nickname: 'Skip',
    age: 62,
    background: 'front_office_lifer',
    personality: 'straight_shooter',
    baseballPhilosophy: {
      pitchingOrHitting: 'balanced',
      developmentVsFA: 'grow_your_own',
      riskTolerance: 'calculated',
    },
    catchphrase: 'The truth plays in every park.',
    yearsInBaseball: 34,
    bio: 'Frank Mercer spent decades in front offices and still prefers the plain version of the truth.',
    ...overrides,
  };
}

function expectDialogueShape(reaction: ChoiceReaction): void {
  expect(reaction.dialogueLines.length).toBeGreaterThanOrEqual(1);
  expect(reaction.dialogueLines.length).toBeLessThanOrEqual(2);
  expect(reaction.dialogueLines.every((line) => line.speaker === 'assistant_gm')).toBe(true);
}

describe('reactToSeasonGoal', () => {
  it('strongly agrees with a championship goal for a strong team', () => {
    const reaction = reactToSeasonGoal(createGameRNG(1401), makeProfile(), 'championship', 88);

    expect(reaction.agreement).toBe('strongly_agree');
    expect(reaction.dialogueLines.some((line) => line.tone === 'excited' || line.tone === 'encouraging')).toBe(true);
    expect(reaction.alternativeSuggestion).toBeNull();
  });

  it('disagrees with a championship goal for a weak team', () => {
    const reaction = reactToSeasonGoal(createGameRNG(1402), makeProfile(), 'championship', 52);

    expect(['disagree', 'strongly_disagree']).toContain(reaction.agreement);
    expect(reaction.dialogueLines.some((line) => line.tone === 'cautionary' || line.tone === 'concerned')).toBe(true);
    expect(reaction.alternativeSuggestion).not.toBeNull();
  });

  it('strongly disagrees with a rebuild goal for a strong team', () => {
    const reaction = reactToSeasonGoal(createGameRNG(1403), makeProfile(), 'rebuild', 84);

    expect(reaction.agreement).toBe('strongly_disagree');
    expect(reaction.alternativeSuggestion).not.toBeNull();
  });

  it('agrees with a rebuild goal for a weak team', () => {
    const reaction = reactToSeasonGoal(createGameRNG(1404), makeProfile(), 'rebuild', 48);

    expect(['agree', 'strongly_agree']).toContain(reaction.agreement);
    expect(reaction.alternativeSuggestion).toBeNull();
  });

  it('changes disagreement phrasing by personality', () => {
    const straight = reactToSeasonGoal(createGameRNG(1405), makeProfile({ personality: 'straight_shooter' }), 'championship', 50);
    const mentor = reactToSeasonGoal(createGameRNG(1405), makeProfile({ personality: 'enthusiastic_mentor' }), 'championship', 50);

    expect(straight.dialogueLines[0]?.text).not.toBe(mentor.dialogueLines[0]?.text);
  });

  it('records the strength number in referencedStat', () => {
    const reaction = reactToSeasonGoal(createGameRNG(1406), makeProfile(), 'playoff', 74);

    expect(reaction.dialogueLines.some((line) => line.referencedStat?.includes('74'))).toBe(true);
  });
});

describe('reactToDevelopmentStyle', () => {
  it('agrees with aggressive development for a strong farm', () => {
    const reaction = reactToDevelopmentStyle(createGameRNG(1411), makeProfile(), 'aggressive', 'A');

    expect(['agree', 'strongly_agree']).toContain(reaction.agreement);
    expect(reaction.alternativeSuggestion).toBeNull();
  });

  it('disagrees with aggressive development for a weak farm', () => {
    const reaction = reactToDevelopmentStyle(createGameRNG(1412), makeProfile(), 'aggressive', 'D');

    expect(['disagree', 'strongly_disagree']).toContain(reaction.agreement);
    expect(reaction.alternativeSuggestion).not.toBeNull();
  });

  it('agrees with patient development for a weak farm', () => {
    const reaction = reactToDevelopmentStyle(createGameRNG(1413), makeProfile(), 'patient', 'D');

    expect(['agree', 'strongly_agree']).toContain(reaction.agreement);
  });

  it('references the farm grade in dialogue', () => {
    const reaction = reactToDevelopmentStyle(createGameRNG(1414), makeProfile(), 'balanced', 'B');

    expect(reaction.dialogueLines.some((line) => line.referencedStat === 'farm grade B')).toBe(true);
  });
});

describe('reactToSpendingStyle', () => {
  it('agrees with big spending when flexibility is strong', () => {
    const reaction = reactToSpendingStyle(createGameRNG(1421), makeProfile(), 'big_spender', 'A');

    expect(['agree', 'strongly_agree']).toContain(reaction.agreement);
  });

  it('strongly disagrees with big spending when flexibility is poor', () => {
    const reaction = reactToSpendingStyle(createGameRNG(1422), makeProfile(), 'big_spender', 'F');

    expect(reaction.agreement).toBe('strongly_disagree');
    expect(reaction.alternativeSuggestion).not.toBeNull();
  });

  it('agrees with penny pinching when flexibility is poor', () => {
    const reaction = reactToSpendingStyle(createGameRNG(1423), makeProfile(), 'penny_pincher', 'F');

    expect(['agree', 'strongly_agree']).toContain(reaction.agreement);
  });
});

describe('reactToTradeApproach', () => {
  it('strongly agrees with buying in a win-now window', () => {
    const reaction = reactToTradeApproach(createGameRNG(1431), makeProfile(), 'buyer', 'win_now');

    expect(reaction.agreement).toBe('strongly_agree');
  });

  it('strongly disagrees with selling in a win-now window', () => {
    const reaction = reactToTradeApproach(createGameRNG(1432), makeProfile(), 'seller', 'win_now');

    expect(reaction.agreement).toBe('strongly_disagree');
    expect(reaction.alternativeSuggestion).toBe('buyer');
  });

  it('keeps opportunistic trade posture out of strongly_disagree territory', () => {
    const reaction = reactToTradeApproach(createGameRNG(1433), makeProfile(), 'opportunistic', 'transitioning');

    expect(reaction.agreement).not.toBe('strongly_disagree');
  });
});

describe('reactToScoutingFocus', () => {
  it('agrees with draft focus for a weak farm', () => {
    const reaction = reactToScoutingFocus(createGameRNG(1441), makeProfile(), 'draft', 'D');

    expect(['agree', 'strongly_agree']).toContain(reaction.agreement);
  });

  it('prefers pro scouting when the farm is already strong', () => {
    const reaction = reactToScoutingFocus(createGameRNG(1442), makeProfile(), 'pro_scouting', 'A');

    expect(['agree', 'strongly_agree']).toContain(reaction.agreement);
  });

  it('provides an alternative suggestion when it disagrees', () => {
    const reaction = reactToScoutingFocus(createGameRNG(1443), makeProfile(), 'international', 'F');

    if (reaction.agreement === 'disagree' || reaction.agreement === 'strongly_disagree') {
      expect(reaction.alternativeSuggestion).not.toBeNull();
    }
  });
});

describe('reactToMediaTone', () => {
  it('returns a reaction for confident media tone', () => {
    const reaction = reactToMediaTone(createGameRNG(1451), makeProfile(), 'confident');

    expectDialogueShape(reaction);
    expect(reaction.dialogueLines.some((line) => line.referencedStat === 'media tone confident')).toBe(true);
  });

  it('lets analytical personalities prefer measured tone', () => {
    const reaction = reactToMediaTone(createGameRNG(1452), makeProfile({ personality: 'analytical_mind' }), 'measured');

    expect(['agree', 'strongly_agree']).toContain(reaction.agreement);
  });
});

describe('choice reactions general behavior', () => {
  it('only sets alternativeSuggestion on disagreement states', () => {
    const agreeReaction = reactToSeasonGoal(createGameRNG(1461), makeProfile(), 'playoff', 74);
    const disagreeReaction = reactToSeasonGoal(createGameRNG(1462), makeProfile(), 'rebuild', 88);

    expect(agreeReaction.alternativeSuggestion).toBeNull();
    expect(disagreeReaction.alternativeSuggestion).not.toBeNull();
  });

  it('keeps every reaction to 1-2 dialogue lines', () => {
    const reactions = [
      reactToSeasonGoal(createGameRNG(1463), makeProfile(), 'championship', 82),
      reactToDevelopmentStyle(createGameRNG(1464), makeProfile(), 'aggressive', 'B'),
      reactToSpendingStyle(createGameRNG(1465), makeProfile(), 'balanced', 'B'),
      reactToTradeApproach(createGameRNG(1466), makeProfile(), 'opportunistic', 'stable_contender'),
      reactToScoutingFocus(createGameRNG(1467), makeProfile(), 'draft', 'C'),
      reactToMediaTone(createGameRNG(1468), makeProfile(), 'humble'),
    ];

    reactions.forEach(expectDialogueShape);
  });

  it('is deterministic for the same seed and inputs', () => {
    expect(reactToTradeApproach(createGameRNG(1469), makeProfile(), 'buyer', 'win_now')).toEqual(
      reactToTradeApproach(createGameRNG(1469), makeProfile(), 'buyer', 'win_now'),
    );
  });
});
