import { describe, expect, it } from 'vitest';
import {
  CHAPTER_ORDER,
  createGameRNG,
  generateChapterScript,
  generateFullOnboardingScript,
  type AllChapterData,
  type AssistantGMProfile,
  type GMPhilosophy,
  type OnboardingScriptContext,
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

function makeAllChapterData(): AllChapterData {
  return {
    owner: {
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
    },
    roster: {
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
    },
    farm: {
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
    },
    staff: {
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
    },
    financial: {
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
    },
    scouting: {
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
    },
    strategy: {
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
    },
    press: {
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
    },
  };
}

function makeContext(overrides: Partial<OnboardingScriptContext> = {}): OnboardingScriptContext {
  return {
    gmName: 'Casey Harper',
    teamName: 'Chicago Whales',
    teamId: 'chw',
    allChapterData: makeAllChapterData(),
    philosophy: {
      developmentStyle: 'aggressive',
      spendingStyle: 'balanced',
      tradeApproach: 'buyer',
      scoutingFocus: 'pro_scouting',
      seasonGoal: 'championship',
      mediaTone: 'confident',
    } satisfies GMPhilosophy,
    ...overrides,
  };
}

describe('generateChapterScript', () => {
  it.each([
    ['owners_office', 'owner'],
    ['know_your_stars', 'roster'],
    ['the_farm', 'farm'],
    ['coaching_staff', 'staff'],
    ['financial_playbook', 'financial'],
    ['scouting_intel', 'scouting'],
    ['season_strategy', 'strategy'],
    ['press_conference', 'press'],
  ] as const)('stores only sparse chapter data for %s', (chapterId, expectedKey) => {
    const script = generateChapterScript(
      createGameRNG(1501),
      makeProfile(),
      chapterId,
      makeAllChapterData(),
      'Chicago Whales',
    );

    expect(script.chapter.id).toBe(chapterId);
    expect(Object.keys(script.assessmentData)).toEqual([expectedKey]);
  });

  it.each([
    ['owners_office', ['championship', 'playoff', 'compete', 'rebuild']],
    ['the_farm', ['aggressive', 'patient', 'balanced']],
    ['financial_playbook', ['big_spender', 'penny_pincher', 'balanced']],
    ['scouting_intel', ['draft', 'international', 'pro_scouting']],
    ['season_strategy', ['buyer', 'seller', 'opportunistic']],
    ['press_conference', ['confident', 'humble', 'measured']],
  ] as const)('pre-generates expected option reactions for %s', (chapterId, expectedKeys) => {
    const script = generateChapterScript(
      createGameRNG(1502),
      makeProfile(),
      chapterId,
      makeAllChapterData(),
      'Chicago Whales',
    );

    expect(Object.keys(script.choiceReactions)).toEqual(expectedKeys);
  });

  it.each([
    'know_your_stars',
    'coaching_staff',
  ] as const)('leaves choice reactions empty for %s', (chapterId) => {
    const script = generateChapterScript(
      createGameRNG(1503),
      makeProfile(),
      chapterId,
      makeAllChapterData(),
      'Chicago Whales',
    );

    expect(script.choiceReactions).toEqual({});
  });
});

describe('generateFullOnboardingScript', () => {
  it('returns exactly eight chapter scripts in chapter order', () => {
    const script = generateFullOnboardingScript(createGameRNG(1511), makeContext());

    expect(script.chapters).toHaveLength(8);
    expect(script.chapters.map((chapter) => chapter.chapter.id)).toEqual(CHAPTER_ORDER.map((chapter) => chapter.id));
  });

  it('includes a greeting and a farewell', () => {
    const script = generateFullOnboardingScript(createGameRNG(1512), makeContext());

    expect(script.greeting.length).toBeGreaterThan(0);
    expect(script.farewell.length).toBeGreaterThan(0);
    expect(script.farewell.toLowerCase()).toContain('championship');
  });

  it('generates intros and reactions for every chapter', () => {
    const script = generateFullOnboardingScript(createGameRNG(1513), makeContext());

    script.chapters.forEach((chapter) => {
      expect(chapter.intro.length).toBeGreaterThanOrEqual(2);
      expect(chapter.reaction.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('uses null transition only for the last chapter', () => {
    const script = generateFullOnboardingScript(createGameRNG(1514), makeContext());

    script.chapters.slice(0, -1).forEach((chapter) => expect(chapter.transition).not.toBeNull());
    expect(script.chapters.at(-1)?.transition).toBeNull();
  });

  it('includes ranked highlights and a populated quick-reference card', () => {
    const script = generateFullOnboardingScript(createGameRNG(1515), makeContext());

    expect(script.highlights.length).toBeGreaterThanOrEqual(5);
    expect(script.highlights.length).toBeLessThanOrEqual(8);
    expect(Object.values(script.quickReference).every((value) => value.length > 0)).toBe(true);
  });

  it('counts total dialogue lines accurately', () => {
    const script = generateFullOnboardingScript(createGameRNG(1516), makeContext());
    const computed = 2 + script.chapters.reduce((sum, chapter) => (
      sum
      + chapter.intro.length
      + chapter.reaction.length
      + (chapter.transition == null ? 0 : 1)
    ), 0);

    expect(script.totalDialogueLines).toBe(computed);
  });

  it('keeps the assistant profile consistent across the script', () => {
    const script = generateFullOnboardingScript(createGameRNG(1517), makeContext());

    expect(script.greeting).toContain(script.assistantProfile.name);
    expect(script.assistantProfile.catchphrase.length).toBeGreaterThan(0);
  });

  it('pre-generates chapter choice reactions with the expected option keys', () => {
    const script = generateFullOnboardingScript(createGameRNG(1518), makeContext());
    const chapterById = new Map(script.chapters.map((chapter) => [chapter.chapter.id, chapter]));

    expect(Object.keys(chapterById.get('owners_office')!.choiceReactions)).toEqual(['championship', 'playoff', 'compete', 'rebuild']);
    expect(Object.keys(chapterById.get('the_farm')!.choiceReactions)).toEqual(['aggressive', 'patient', 'balanced']);
    expect(Object.keys(chapterById.get('financial_playbook')!.choiceReactions)).toEqual(['big_spender', 'penny_pincher', 'balanced']);
    expect(Object.keys(chapterById.get('scouting_intel')!.choiceReactions)).toEqual(['draft', 'international', 'pro_scouting']);
    expect(Object.keys(chapterById.get('season_strategy')!.choiceReactions)).toEqual(['buyer', 'seller', 'opportunistic']);
    expect(Object.keys(chapterById.get('press_conference')!.choiceReactions)).toEqual(['confident', 'humble', 'measured']);
  });

  it('is deterministic for the same seed and context', () => {
    expect(generateFullOnboardingScript(createGameRNG(1519), makeContext())).toEqual(
      generateFullOnboardingScript(createGameRNG(1519), makeContext()),
    );
  });

  it.each([
    ['owners_office', 'owner'],
    ['know_your_stars', 'roster'],
    ['the_farm', 'farm'],
    ['coaching_staff', 'staff'],
    ['financial_playbook', 'financial'],
    ['scouting_intel', 'scouting'],
    ['season_strategy', 'strategy'],
    ['press_conference', 'press'],
  ] as const)('keeps %s chapter data sparse inside the full script', (chapterId, expectedKey) => {
    const script = generateFullOnboardingScript(createGameRNG(1520), makeContext());
    const chapter = script.chapters.find((entry) => entry.chapter.id === chapterId);

    expect(chapter).toBeDefined();
    expect(Object.keys(chapter!.assessmentData)).toEqual([expectedKey]);
  });

  it('connects every transition to the next chapter in order', () => {
    const script = generateFullOnboardingScript(createGameRNG(1521), makeContext());

    script.chapters.slice(0, -1).forEach((chapter, index) => {
      expect(chapter.transition?.emphasis).toBe(
        `${CHAPTER_ORDER[index]!.id}->${CHAPTER_ORDER[index + 1]!.id}`,
      );
    });
  });

  it('ranks highlights sequentially from one', () => {
    const script = generateFullOnboardingScript(createGameRNG(1522), makeContext());

    expect(script.highlights.map((highlight) => highlight.rank)).toEqual(
      script.highlights.map((_, index) => index + 1),
    );
  });

  it('threads the selected philosophy into the quick-reference recommendation', () => {
    const script = generateFullOnboardingScript(
      createGameRNG(1523),
      makeContext({
        philosophy: {
          developmentStyle: 'patient',
          spendingStyle: 'penny_pincher',
          tradeApproach: 'seller',
          scoutingFocus: 'draft',
          seasonGoal: 'rebuild',
          mediaTone: 'humble',
        },
      }),
    );

    expect(script.quickReference.recommendedPath).toContain('rebuild');
    expect(script.quickReference.recommendedPath).toContain('seller');
  });
});
