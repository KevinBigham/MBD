import { describe, expect, it } from 'vitest';
import {
  CHAPTER_ORDER,
  createGameRNG,
  generateChapterIntro,
  generateChapterTransition,
  generateFarmReaction,
  generateFinancialReaction,
  generateOwnerReaction,
  generatePressReaction,
  generateRosterReaction,
  generateScoutingReaction,
  generateStaffReaction,
  generateStrategyReaction,
  type AssistantGMProfile,
  type DialogueLine,
  type DialogueTone,
  type FarmAssessment,
  type FinancialPlaybook,
  type OnboardingChapter,
  type OnboardingPressConferenceBriefing,
  type OwnerMeetingBriefing,
  type RosterAssessment,
  type ScoutingBriefing,
  type SeasonStrategyBriefing,
  type StaffEvaluation,
} from '../src/index.js';

const VALID_TONES: DialogueTone[] = [
  'informative',
  'encouraging',
  'cautionary',
  'excited',
  'concerned',
  'humorous',
  'serious',
  'philosophical',
];

function makeProfile(overrides: Partial<AssistantGMProfile> = {}): AssistantGMProfile {
  return {
    name: 'Frank Mercer',
    nickname: 'Skip',
    age: 62,
    background: 'former_player',
    personality: 'straight_shooter',
    baseballPhilosophy: {
      pitchingOrHitting: 'pitching_wins',
      developmentVsFA: 'grow_your_own',
      riskTolerance: 'calculated',
    },
    catchphrase: 'The truth plays in every park.',
    yearsInBaseball: 34,
    bio: 'Frank Mercer has spent a lifetime in baseball. He played long enough to trust what the clubhouse tells him. He still believes pitching travels.',
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
        playerId: 'slugger-1',
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
      {
        position: 'LF',
        urgency: 'moderate',
        currentBest: { name: 'Seth Cole', rating: 291 },
        explanation: 'Seth Cole can hold LF for now, but it remains an upgrade target.',
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
      playerId: 'slugger-1',
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
      {
        playerId: 'prospect-2',
        name: 'Nico Flores',
        position: 'SP',
        age: 20,
        level: 'AA',
        overallRating: 286,
        ceiling: 401,
        ceilingGrade: 'A',
        archetype: 'Frontline Starter',
        readiness: 'one_year',
        breakoutProbability: 62,
        spotlight: 'Nico Flores is not far behind.',
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
    farmNarrative: 'Julian Vega is the closest help and Nico Flores owns the biggest ceiling.',
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
      playerId: 'prospect-2',
      name: 'Nico Flores',
      position: 'SP',
      age: 20,
      level: 'AA',
      overallRating: 286,
      ceiling: 401,
      ceilingGrade: 'A',
      archetype: 'Frontline Starter',
      readiness: 'one_year',
      breakoutProbability: 62,
      spotlight: 'Nico Flores is not far behind.',
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
        spotlight: 'Alan Boone sets the tone for leadership and game management.',
      },
      {
        coachId: 'pit',
        name: 'Carlos Mendoza',
        role: 'pitching_coach',
        teachingGrade: 'A',
        impactGrade: 'B',
        specialty: 'power',
        spotlight: 'Carlos Mendoza anchors pitching instruction.',
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
      {
        playerId: 'bat-1',
        name: 'Marcus Stone',
        position: '1B',
        urgency: 'monitor',
        yearsRemaining: 1,
        currentSalary: 27,
        estimatedMarketValue: 29,
        reason: 'The player is useful enough to track, but there is still time before urgency spikes.',
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
      {
        teamId: 'phi',
        teamName: 'Philadelphia Founders',
        overallThreatLevel: 'competitive',
        starPlayer: { name: 'Cole Barrett', position: 'SP', rating: 386 },
        keyStrength: 'elite rotation',
        exploitableWeakness: 'offensive depth',
        headToHeadOutlook: 'Philadelphia Founders can be contained if the lineup pressure holds.',
      },
    ],
    leagueThreats: [
      { teamId: 'bos', teamName: 'Boston Harbors', projectedWins: 91, threatLevel: 'contender' },
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
      {
        id: 'extend_core_players',
        title: 'Extend Core Players',
        description: 'Lock in the stars.',
        score: 83,
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

function lineTexts(lines: DialogueLine[]): string {
  return lines.map((line) => line.text).join(' ');
}

describe('generateChapterIntro', () => {
  it.each(CHAPTER_ORDER.map((chapter) => chapter.id))('returns 2-3 lines for %s', (chapter) => {
    const lines = generateChapterIntro(createGameRNG(1001), makeProfile(), chapter, 'Chicago Whales');

    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines.length).toBeLessThanOrEqual(3);
    expect(lines.every((line) => line.speaker === 'assistant_gm')).toBe(true);
    expect(lines.every((line) => VALID_TONES.includes(line.tone))).toBe(true);
  });

  it('gives enthusiastic mentors at least one excited or encouraging intro tone', () => {
    const lines = generateChapterIntro(
      createGameRNG(1002),
      makeProfile({ personality: 'enthusiastic_mentor' }),
      'know_your_stars',
      'Chicago Whales',
    );

    expect(lines.some((line) => line.tone === 'excited' || line.tone === 'encouraging')).toBe(true);
  });

  it('gives grizzled veterans at least one serious or philosophical intro tone', () => {
    const lines = generateChapterIntro(
      createGameRNG(1003),
      makeProfile({ personality: 'grizzled_veteran', background: 'old_school_baseball_man' }),
      'know_your_stars',
      'Chicago Whales',
    );

    expect(lines.some((line) => line.tone === 'serious' || line.tone === 'philosophical')).toBe(true);
  });

  it('changes phrasing across personalities for the same chapter and team', () => {
    const straight = lineTexts(generateChapterIntro(createGameRNG(1004), makeProfile({ personality: 'straight_shooter' }), 'the_farm', 'Chicago Whales'));
    const mentor = lineTexts(generateChapterIntro(createGameRNG(1004), makeProfile({ personality: 'enthusiastic_mentor' }), 'the_farm', 'Chicago Whales'));

    expect(straight).not.toBe(mentor);
  });
});

describe('chapter reactions', () => {
  it('roster reaction references a specific star player and the biggest need', () => {
    const lines = generateRosterReaction(createGameRNG(1101), makeProfile(), makeRosterAssessment());

    expect(lineTexts(lines)).toContain('Victor Ace');
    expect(lineTexts(lines).toLowerCase()).toContain('shortstop');
    expect(lines.some((line) => line.referencedPlayerName === 'Victor Ace')).toBe(true);
  });

  it('roster reaction finds a bright spot even for a weak club', () => {
    const lines = generateRosterReaction(
      createGameRNG(1102),
      makeProfile({ personality: 'grizzled_veteran' }),
      makeRosterAssessment({
        lineup: {
          ...makeRosterAssessment().lineup,
          overallGrade: 'D',
          hittersGrade: 'D',
          pitchingGrade: 'C',
          topStrength: 'ace-driven pitching',
          biggestWeakness: 'shallow bullpen',
        },
      }),
    );

    expect(lineTexts(lines)).toContain('Victor Ace');
    expect(lines.some((line) => line.tone === 'cautionary' || line.tone === 'concerned')).toBe(true);
  });

  it('farm reaction references the closest prospect and a breakout probability', () => {
    const lines = generateFarmReaction(createGameRNG(1103), makeProfile(), makeFarmAssessment());

    expect(lineTexts(lines)).toContain('Julian Vega');
    expect(lineTexts(lines)).toContain('71%');
    expect(lines.some((line) => line.referencedPlayerName === 'Julian Vega')).toBe(true);
  });

  it('staff reaction names a key coach and the weakest area', () => {
    const lines = generateStaffReaction(createGameRNG(1104), makeProfile(), makeStaffEvaluation());

    expect(lineTexts(lines)).toContain('Alan Boone');
    expect(lineTexts(lines).toLowerCase()).toContain('hitting instruction');
    expect(lines.some((line) => line.referencedPlayerName === 'Alan Boone')).toBe(true);
  });

  it('financial reaction names the extension priority and budget room', () => {
    const lines = generateFinancialReaction(createGameRNG(1105), makeProfile(), makeFinancialPlaybook());

    expect(lineTexts(lines)).toContain('Victor Ace');
    expect(lineTexts(lines)).toContain('24');
    expect(lines.some((line) => line.referencedStat?.includes('24'))).toBe(true);
  });

  it('scouting reaction identifies the most dangerous rival and star', () => {
    const lines = generateScoutingReaction(createGameRNG(1106), makeProfile({ personality: 'dry_wit' }), makeScoutingBriefing());

    expect(lineTexts(lines)).toContain('Boston Harbors');
    expect(lineTexts(lines)).toContain('Roman Hale');
    expect(lines.some((line) => line.referencedPlayerName === 'Roman Hale')).toBe(true);
  });

  it('strategy reaction responds differently to win now and rebuild paths', () => {
    const winNow = lineTexts(generateStrategyReaction(createGameRNG(1107), makeProfile(), makeSeasonStrategy()));
    const rebuild = lineTexts(
      generateStrategyReaction(
        createGameRNG(1107),
        makeProfile(),
        makeSeasonStrategy({
          competitiveWindow: 'rebuild',
          recommendedSeasonGoal: 'rebuild',
          recommendedTradeApproach: 'seller',
          summaryNarrative: 'The club is rebuilding.',
        }),
      ),
    );

    expect(winNow).not.toBe(rebuild);
    expect(winNow.toLowerCase()).toContain('championship');
    expect(rebuild.toLowerCase()).toContain('rebuild');
  });

  it('owner reaction addresses expectations and budget pressure', () => {
    const lines = generateOwnerReaction(createGameRNG(1108), makeProfile(), makeOwnerMeeting());

    expect(lineTexts(lines).toLowerCase()).toContain('championship');
    expect(lineTexts(lines)).toContain('24');
    expect(lines.some((line) => line.referencedStat?.includes('24'))).toBe(true);
  });

  it('press reaction references the recommended tone and a notable player question', () => {
    const lines = generatePressReaction(createGameRNG(1109), makeProfile(), makePressBriefing());

    expect(lineTexts(lines)).toContain('Victor Ace');
    expect(lineTexts(lines).toLowerCase()).toContain('confident');
    expect(lines.some((line) => line.referencedPlayerName === 'Victor Ace')).toBe(true);
  });

  it('keeps all reaction tones inside the dialogue enum', () => {
    const reactionSets = [
      generateRosterReaction(createGameRNG(1110), makeProfile(), makeRosterAssessment()),
      generateFarmReaction(createGameRNG(1111), makeProfile(), makeFarmAssessment()),
      generateStaffReaction(createGameRNG(1112), makeProfile(), makeStaffEvaluation()),
      generateFinancialReaction(createGameRNG(1113), makeProfile(), makeFinancialPlaybook()),
      generateScoutingReaction(createGameRNG(1114), makeProfile(), makeScoutingBriefing()),
      generateStrategyReaction(createGameRNG(1115), makeProfile(), makeSeasonStrategy()),
      generateOwnerReaction(createGameRNG(1116), makeProfile(), makeOwnerMeeting()),
      generatePressReaction(createGameRNG(1117), makeProfile(), makePressBriefing()),
    ];

    expect(reactionSets.flat().every((line) => VALID_TONES.includes(line.tone))).toBe(true);
  });

  it('is deterministic for the same seed and assessment data', () => {
    expect(generateRosterReaction(createGameRNG(1118), makeProfile(), makeRosterAssessment())).toEqual(
      generateRosterReaction(createGameRNG(1118), makeProfile(), makeRosterAssessment()),
    );
  });

  it('changes phrasing across personalities for the same roster data', () => {
    const straight = lineTexts(
      generateRosterReaction(createGameRNG(1119), makeProfile({ personality: 'straight_shooter' }), makeRosterAssessment()),
    );
    const witty = lineTexts(
      generateRosterReaction(createGameRNG(1119), makeProfile({ personality: 'dry_wit' }), makeRosterAssessment()),
    );

    expect(straight).not.toBe(witty);
  });

  it('leans more cautionary for grizzled veterans', () => {
    const lines = generateFinancialReaction(
      createGameRNG(1120),
      makeProfile({ personality: 'grizzled_veteran', background: 'old_school_baseball_man' }),
      makeFinancialPlaybook(),
    );

    expect(lines.some((line) => line.tone === 'cautionary' || line.tone === 'serious')).toBe(true);
  });

  it('leans more encouraging for enthusiastic mentors', () => {
    const lines = generateFarmReaction(
      createGameRNG(1121),
      makeProfile({ personality: 'enthusiastic_mentor' }),
      makeFarmAssessment(),
    );

    expect(lines.some((line) => line.tone === 'encouraging' || line.tone === 'excited')).toBe(true);
  });
});

describe('generateChapterTransition', () => {
  const transitions = CHAPTER_ORDER.slice(0, -1).map((chapter, index) => [chapter.id, CHAPTER_ORDER[index + 1]!.id] as const);

  it.each(transitions)('bridges from %s to %s', (fromChapter, toChapter) => {
    const line = generateChapterTransition(createGameRNG(1200), makeProfile(), fromChapter, toChapter);

    expect(line.speaker).toBe('assistant_gm');
    expect(VALID_TONES).toContain(line.tone);
    expect(line.text.length).toBeGreaterThan(0);
  });

  it('mentions the next chapter topic when moving from roster to farm', () => {
    const line = generateChapterTransition(createGameRNG(1201), makeProfile(), 'know_your_stars', 'the_farm');

    expect(line.text.toLowerCase()).toContain('farm');
  });

  it('mentions strategy when moving from scouting to season strategy', () => {
    const line = generateChapterTransition(createGameRNG(1202), makeProfile(), 'scouting_intel', 'season_strategy');

    expect(line.text.toLowerCase()).toContain('strategy');
  });

  it('is deterministic for the same seed and chapter pair', () => {
    expect(
      generateChapterTransition(createGameRNG(1203), makeProfile(), 'financial_playbook', 'scouting_intel'),
    ).toEqual(
      generateChapterTransition(createGameRNG(1203), makeProfile(), 'financial_playbook', 'scouting_intel'),
    );
  });
});
