import { describe, expect, it } from 'vitest';
import {
  createGameRNG,
  generateChapterTips,
  generateDecisionExplanation,
  generateOnboardingHighlights,
  generateQuickReference,
  type AssistantGMProfile,
  type ChapterAssessmentData,
  type DecisionPoint,
  type FarmAssessment,
  type FinancialPlaybook,
  type GMPhilosophy,
  type OnboardingChapter,
  type OnboardingPressConferenceBriefing,
  type OwnerMeetingBriefing,
  type QuickReferenceCard,
  type RosterAssessment,
  type ScoutingBriefing,
  type SeasonStrategyBriefing,
  type StaffEvaluation,
} from '../src/index.js';

function makeProfile(overrides: Partial<AssistantGMProfile> = {}): AssistantGMProfile {
  return {
    name: 'Frank Mercer',
    nickname: 'Skip',
    age: 62,
    background: 'career_scout',
    personality: 'analytical_mind',
    baseballPhilosophy: {
      pitchingOrHitting: 'pitching_wins',
      developmentVsFA: 'grow_your_own',
      riskTolerance: 'calculated',
    },
    catchphrase: 'Patterns matter more than hunches.',
    yearsInBaseball: 34,
    bio: 'Frank Mercer has spent a lifetime in baseball. He came up as a scout. He trusts the evidence.',
    ...overrides,
  };
}

function makeRosterAssessment(overrides: Partial<RosterAssessment> = {}): RosterAssessment {
  return {
    stars: [
      {
        playerId: 'ace-1',
        name: 'Victor Ace',
        position: 'SP',
        age: 29,
        overallRating: 430,
        displayRating: 72,
        letterGrade: 'A',
        archetype: 'Workhorse Ace',
        spotlight: 'Victor Ace gives the roster a true frontline anchor.',
        contractYears: 2,
        annualSalary: 31,
      },
      {
        playerId: 'bat-1',
        name: 'Marcus Stone',
        position: '1B',
        age: 30,
        overallRating: 405,
        displayRating: 68,
        letterGrade: 'A',
        archetype: 'Power Bat',
        spotlight: 'Marcus Stone brings thunder in the middle of the order.',
        contractYears: 1,
        annualSalary: 27,
      },
    ],
    lineup: {
      overallGrade: 'A',
      hittersGrade: 'A',
      pitchingGrade: 'A',
      topStrength: 'elite rotation',
      biggestWeakness: 'shortstop defense',
      depthRating: 'adequate',
      balanceAssessment: 'The staff is sturdier than the lineup behind it.',
    },
    needs: [
      {
        position: 'SS',
        urgency: 'critical',
        currentBest: { name: 'Elijah Cross', rating: 248 },
        explanation: 'Elijah Cross is well below an average everyday baseline at SS.',
      },
    ],
    contracts: {
      totalPayroll: 172,
      extensionCandidates: [
        { name: 'Victor Ace', position: 'SP', contractYearsLeft: 2, salary: 31 },
      ],
      expiringDeals: [
        { name: 'Marcus Stone', position: '1B', salary: 27 },
      ],
      biggestContract: { name: 'Victor Ace', salary: 31, years: 2 },
      narrativeSummary: 'Victor Ace is the big decision on the books.',
    },
    rosterNarrative: 'Victor Ace and Marcus Stone are carrying the room.',
    aceStarter: {
      playerId: 'ace-1',
      name: 'Victor Ace',
      position: 'SP',
      age: 29,
      overallRating: 430,
      displayRating: 72,
      letterGrade: 'A',
      archetype: 'Workhorse Ace',
      spotlight: 'Victor Ace gives the roster a true frontline anchor.',
      contractYears: 2,
      annualSalary: 31,
    },
    cleanupHitter: {
      playerId: 'bat-1',
      name: 'Marcus Stone',
      position: '1B',
      age: 30,
      overallRating: 405,
      displayRating: 68,
      letterGrade: 'A',
      archetype: 'Power Bat',
      spotlight: 'Marcus Stone brings thunder in the middle of the order.',
      contractYears: 1,
      annualSalary: 27,
    },
    ...overrides,
  };
}

function makeFarmAssessment(overrides: Partial<FarmAssessment> = {}): FarmAssessment {
  return {
    topProspects: [
      {
        playerId: 'prospect-1',
        name: 'Julian Vega',
        position: 'CF',
        age: 21,
        level: 'AAA',
        overallRating: 302,
        ceiling: 392,
        ceilingGrade: 'A',
        archetype: 'Impact Center Fielder',
        readiness: 'ready_now',
        breakoutProbability: 71,
        spotlight: 'Julian Vega carries a premium ceiling with a 71% breakout indicator.',
      },
    ],
    pipeline: {
      grade: 'B',
      readyCount: 2,
      developingCount: 4,
      rawCount: 3,
      positionBalance: 'balanced',
      depthDescription: 'The pipeline has usable talent, but not all of it is close to conversion.',
    },
    farmNarrative: 'Julian Vega is the closest help.',
    developmentOptions: [
      { id: 'aggressive', label: 'Aggressive Promotions', description: 'Promote fast.' },
      { id: 'patient', label: 'Patient Development', description: 'Let the minors breathe.' },
      { id: 'balanced', label: 'Balanced Growth', description: 'Mix both lanes.' },
    ],
    closestToMLB: {
      playerId: 'prospect-1',
      name: 'Julian Vega',
      position: 'CF',
      age: 21,
      level: 'AAA',
      overallRating: 302,
      ceiling: 392,
      ceilingGrade: 'A',
      archetype: 'Impact Center Fielder',
      readiness: 'ready_now',
      breakoutProbability: 71,
      spotlight: 'Julian Vega carries a premium ceiling with a 71% breakout indicator.',
    },
    highestCeiling: {
      playerId: 'prospect-1',
      name: 'Julian Vega',
      position: 'CF',
      age: 21,
      level: 'AAA',
      overallRating: 302,
      ceiling: 392,
      ceilingGrade: 'A',
      archetype: 'Impact Center Fielder',
      readiness: 'ready_now',
      breakoutProbability: 71,
      spotlight: 'Julian Vega carries a premium ceiling with a 71% breakout indicator.',
    },
    ...overrides,
  };
}

function makeStaffEvaluation(overrides: Partial<StaffEvaluation> = {}): StaffEvaluation {
  return {
    keyCoaches: [
      {
        coachId: 'mgr',
        name: 'Alan Boone',
        role: 'manager',
        teachingGrade: 'A',
        impactGrade: 'A',
        specialty: 'leadership',
        spotlight: 'Alan Boone sets the tone.',
      },
    ],
    strengths: {
      overallGrade: 'B',
      bestArea: 'pitching instruction',
      weakestArea: 'hitting instruction',
      teachingAverage: 0.71,
      budgetUtilization: 0.82,
      narrativeSummary: 'The staff is strongest in pitching instruction and weakest in hitting instruction.',
    },
    staffBudget: 14,
    staffPayroll: 11.5,
    budgetRemaining: 2.5,
    ...overrides,
  };
}

function makeFinancialPlaybook(overrides: Partial<FinancialPlaybook> = {}): FinancialPlaybook {
  return {
    payroll: {
      totalPayroll: 172,
      hitterPayroll: 91,
      pitcherPayroll: 81,
      topPaidPlayer: { name: 'Victor Ace', salary: 31 },
      averageSalary: 12.3,
      medianSalary: 9.5,
    },
    extensions: [
      {
        playerId: 'ace-1',
        name: 'Victor Ace',
        position: 'SP',
        urgency: 'extend_now',
        yearsRemaining: 2,
        currentSalary: 31,
        estimatedMarketValue: 38,
        reason: 'Core-caliber performance is approaching the final control window.',
      },
    ],
    flexibility: {
      grade: 'B',
      availableSpace: 24,
      luxuryTaxRoom: 19,
      canAddStar: false,
      canAddRole: true,
      narrativeSummary: 'The club has 24 million in budget room and 19 million before the tax threshold.',
    },
    spendingOptions: [
      { id: 'big_spender', label: 'Big Spender', description: 'Spend.' },
      { id: 'penny_pincher', label: 'Penny Pincher', description: 'Save.' },
      { id: 'balanced', label: 'Balanced', description: 'Choose spots.' },
    ],
    ...overrides,
  };
}

function makeScoutingBriefing(overrides: Partial<ScoutingBriefing> = {}): ScoutingBriefing {
  return {
    divisionReports: [
      {
        teamId: 'bos',
        teamName: 'Boston Harbors',
        overallThreatLevel: 'dangerous',
        starPlayer: { name: 'Roman Hale', position: 'RF', rating: 418 },
        keyStrength: 'middle-of-the-order impact',
        exploitableWeakness: 'shallow bullpen',
        headToHeadOutlook: 'Boston Harbors will stress every soft spot in the roster.',
      },
    ],
    leagueThreats: [
      { teamId: 'lax', teamName: 'Los Angeles Stars', projectedWins: 96, threatLevel: 'favorite' },
    ],
    scoutingFocusOptions: [
      { id: 'draft', label: 'Draft', description: 'Domestic coverage.' },
      { id: 'international', label: 'International', description: 'Overseas coverage.' },
      { id: 'pro_scouting', label: 'Pro Scouting', description: 'Trade and free-agent coverage.' },
    ],
    intelNarrative: 'Boston Harbors is the division benchmark.',
    ...overrides,
  };
}

function makeSeasonStrategy(overrides: Partial<SeasonStrategyBriefing> = {}): SeasonStrategyBriefing {
  return {
    competitiveWindow: 'win_now',
    recommendedSeasonGoal: 'championship',
    recommendedTradeApproach: 'buyer',
    priorityList: [
      {
        id: 'push_current_window',
        title: 'Push Current Window',
        description: 'Lean into the major-league roster.',
        score: 95,
      },
    ],
    strategyOptions: [
      { id: 'buyer', label: 'Buyer', description: 'Push chips in.' },
      { id: 'seller', label: 'Seller', description: 'Trade short-term pieces.' },
      { id: 'opportunistic', label: 'Opportunistic', description: 'Stay flexible.' },
    ],
    summaryNarrative: 'The club projects as win now.',
    ...overrides,
  };
}

function makeOwnerMeeting(overrides: Partial<OwnerMeetingBriefing> = {}): OwnerMeetingBriefing {
  return {
    ownerGreeting: 'Welcome to the chair.',
    ownerPersonality: {
      archetype: 'win_now_mogul',
      expectationLevel: 'championship',
      personalityDescription: 'Ownership expects October baseball immediately.',
    },
    expectations: 'Ownership is not interested in a soft launch. The standard is a credible championship push right away.',
    budgetOverview: {
      totalBudget: 196,
      currentPayroll: 172,
      availableSpace: 24,
      luxuryTaxDistance: 19,
      spendingGrade: 'B',
      narrativeSummary: 'The budget picture is manageable, with 24 million available.',
    },
    marketContext: 'This is a large-market franchise operating under a permanent spotlight.',
    divisionOutlook: 'Boston Harbors profile as the immediate division benchmark.',
    seasonGoalOptions: [
      { id: 'championship', label: 'Championship', description: 'Push for a title.' },
      { id: 'playoff', label: 'Playoff Berth', description: 'Reach October.' },
      { id: 'compete', label: 'Compete', description: 'Stay relevant.' },
      { id: 'rebuild', label: 'Rebuild', description: 'Reset the timeline.' },
    ],
    ...overrides,
  };
}

function makePressBriefing(overrides: Partial<OnboardingPressConferenceBriefing> = {}): OnboardingPressConferenceBriefing {
  return {
    openingStatementOptions: [
      { id: 'confident', label: 'Confident', statement: 'We are here to win now.' },
      { id: 'humble', label: 'Humble', statement: 'We need to earn it.' },
      { id: 'measured', label: 'Measured', statement: 'We know our lane.' },
    ],
    likelyQuestions: [
      'How quickly do you expect Victor Ace to shape the season?',
      'What do you need from Marcus Stone to justify the goal?',
    ],
    recommendedTone: 'confident',
    finalNarrative: 'The recommended operating posture is buyer.',
    ...overrides,
  };
}

function makeAllChapterData() {
  return {
    owner: makeOwnerMeeting(),
    roster: makeRosterAssessment(),
    farm: makeFarmAssessment(),
    staff: makeStaffEvaluation(),
    financial: makeFinancialPlaybook(),
    scouting: makeScoutingBriefing(),
    strategy: makeSeasonStrategy(),
    press: makePressBriefing(),
  };
}

function makeDecision(id: string, chapter: OnboardingChapter): DecisionPoint {
  return {
    id,
    chapter,
    question: `How should we handle ${id}?`,
    options: ['first', 'second', 'third'],
    stakes: `${id} changes the next two seasons.`,
  };
}

describe('generateChapterTips', () => {
  const chapterCases: Array<[OnboardingChapter, ChapterAssessmentData]> = [
    ['owners_office', { owner: makeOwnerMeeting() }],
    ['know_your_stars', { roster: makeRosterAssessment() }],
    ['the_farm', { farm: makeFarmAssessment() }],
    ['coaching_staff', { staff: makeStaffEvaluation() }],
    ['financial_playbook', { financial: makeFinancialPlaybook() }],
    ['scouting_intel', { scouting: makeScoutingBriefing() }],
    ['season_strategy', { strategy: makeSeasonStrategy() }],
    ['press_conference', { press: makePressBriefing() }],
  ];

  it.each(chapterCases)('returns 2-4 tips for %s', (chapter, data) => {
    const tips = generateChapterTips(makeProfile(), chapter, data);

    expect(tips.length).toBeGreaterThanOrEqual(2);
    expect(tips.length).toBeLessThanOrEqual(4);
    expect(tips.every((tip) => tip.chapter === chapter)).toBe(true);
  });

  it('roster tips reference a star and a position need', () => {
    const tips = generateChapterTips(makeProfile(), 'know_your_stars', { roster: makeRosterAssessment() });
    const text = tips.map((tip) => `${tip.title} ${tip.body}`).join(' ');

    expect(text).toContain('Victor Ace');
    expect(text.toLowerCase()).toContain('shortstop');
  });

  it('financial crisis gets high-importance tips', () => {
    const tips = generateChapterTips(
      makeProfile(),
      'financial_playbook',
      {
        financial: makeFinancialPlaybook({
          flexibility: {
            grade: 'F',
            availableSpace: -8,
            luxuryTaxRoom: -3,
            canAddStar: false,
            canAddRole: false,
            narrativeSummary: 'The club is underwater.',
          },
        }),
      },
    );

    expect(tips.some((tip) => tip.importance === 'high')).toBe(true);
  });

  it('scouting tips reference the top rival', () => {
    const tips = generateChapterTips(makeProfile(), 'scouting_intel', { scouting: makeScoutingBriefing() });

    expect(tips.some((tip) => tip.body.includes('Boston Harbors'))).toBe(true);
  });

  it('strategy tips reference the recommended path', () => {
    const tips = generateChapterTips(makeProfile(), 'season_strategy', { strategy: makeSeasonStrategy() });

    expect(tips.some((tip) => tip.body.toLowerCase().includes('buyer') || tip.body.toLowerCase().includes('championship'))).toBe(true);
  });

  it('press tips reference the recommended media tone', () => {
    const tips = generateChapterTips(makeProfile(), 'press_conference', { press: makePressBriefing() });

    expect(tips.some((tip) => tip.body.toLowerCase().includes('confident'))).toBe(true);
  });
});

describe('generateDecisionExplanation', () => {
  const decisionCases: Array<[string, OnboardingChapter]> = [
    ['season_goal', 'owners_office'],
    ['development_style', 'the_farm'],
    ['spending_style', 'financial_playbook'],
    ['trade_approach', 'season_strategy'],
    ['scouting_focus', 'scouting_intel'],
    ['media_tone', 'press_conference'],
  ];

  it.each(decisionCases)('returns coaching for %s', (id, chapter) => {
    const explanation = generateDecisionExplanation(makeProfile(), makeDecision(id, chapter));

    expect(explanation.decisionId).toBe(id);
    expect(explanation.recommendation.length).toBeGreaterThan(0);
    expect(explanation.reasoning.length).toBeGreaterThan(0);
    expect(explanation.tradeoff.length).toBeGreaterThan(0);
    expect(explanation.assistantQuote.length).toBeGreaterThan(0);
  });

  it('keeps quotes in the assistant voice', () => {
    const explanation = generateDecisionExplanation(
      makeProfile({ personality: 'grizzled_veteran' }),
      makeDecision('season_goal', 'owners_office'),
    );

    expect(explanation.assistantQuote.toLowerCase()).toContain('season');
  });
});

describe('generateOnboardingHighlights', () => {
  it('returns 5-8 ranked highlights', () => {
    const highlights = generateOnboardingHighlights(createGameRNG(1301), makeProfile(), makeAllChapterData());

    expect(highlights.length).toBeGreaterThanOrEqual(5);
    expect(highlights.length).toBeLessThanOrEqual(8);
    expect(highlights.map((highlight) => highlight.rank)).toEqual(
      Array.from({ length: highlights.length }, (_, index) => index + 1),
    );
  });

  it('includes roster, financial, and rival items', () => {
    const highlights = generateOnboardingHighlights(createGameRNG(1302), makeProfile(), makeAllChapterData());
    const categories = highlights.map((highlight) => highlight.category);

    expect(categories).toContain('roster');
    expect(categories).toContain('finance');
    expect(categories).toContain('rival');
  });

  it('marks action-required items when urgency is obvious', () => {
    const highlights = generateOnboardingHighlights(createGameRNG(1303), makeProfile(), makeAllChapterData());

    expect(highlights.some((highlight) => highlight.actionRequired)).toBe(true);
  });

  it('is deterministic for the same seed and inputs', () => {
    expect(generateOnboardingHighlights(createGameRNG(1304), makeProfile(), makeAllChapterData())).toEqual(
      generateOnboardingHighlights(createGameRNG(1304), makeProfile(), makeAllChapterData()),
    );
  });
});

describe('generateQuickReference', () => {
  const philosophy: GMPhilosophy = {
    developmentStyle: 'aggressive',
    spendingStyle: 'balanced',
    tradeApproach: 'buyer',
    scoutingFocus: 'pro_scouting',
    seasonGoal: 'championship',
    mediaTone: 'confident',
  };

  function populatedFields(card: QuickReferenceCard): string[] {
    return Object.values(card);
  }

  it('fills every quick-reference field', () => {
    const card = generateQuickReference(makeAllChapterData(), philosophy);

    expect(populatedFields(card).every((value) => value.length > 0)).toBe(true);
  });

  it('reflects the philosophy-driven recommended path', () => {
    const card = generateQuickReference(makeAllChapterData(), philosophy);

    expect(card.recommendedPath.toLowerCase()).toContain('championship');
    expect(card.assistantAdvice.toLowerCase()).toContain('buyer');
  });

  it('is deterministic for the same data and philosophy', () => {
    expect(generateQuickReference(makeAllChapterData(), philosophy)).toEqual(
      generateQuickReference(makeAllChapterData(), philosophy),
    );
  });
});
