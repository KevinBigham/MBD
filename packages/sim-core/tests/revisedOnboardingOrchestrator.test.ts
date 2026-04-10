import { describe, expect, it } from 'vitest';
import {
  REVISED_CHAPTER_ORDER,
  createGameRNG,
  generateCoachingStaff,
  generateScoutingHiringSlate,
  generateScoutingStaff,
  generateStaffHiringSlate,
  generateRevisedOnboardingScript,
  selectAGM,
  type AllChapterData,
} from '../src/index.js';

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
        expiringDeals: [],
        biggestContract: { name: 'Victor Ace', salary: 31, years: 2 },
        narrativeSummary: 'Victor Ace is the big decision on the books.',
      },
      rosterNarrative: 'Victor Ace is carrying the room.',
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
      cleanupHitter: null,
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
        'What do you need from the farm this year?',
      ],
      recommendedTone: 'confident',
      finalNarrative: 'The recommended operating posture is buyer.',
    },
  };
}

function createHiringContext() {
  return {
    teamId: 'nym',
    teamName: 'New York Tycoons',
    coachingStaff: generateCoachingStaff(createGameRNG(401), 'nym'),
    scoutingStaff: generateScoutingStaff(createGameRNG(402), 'nym'),
  };
}

function makeContext(agmId: 'marcus_chen' | 'walt_kowalski' | 'elena_vargas') {
  const hiringContext = createHiringContext();
  return {
    selectedAGM: selectAGM(agmId),
    gmName: 'Casey Harper',
    teamName: 'Chicago Whales',
    allChapterData: makeAllChapterData(),
    staffSlate: generateStaffHiringSlate(hiringContext, createGameRNG(403)),
    scoutingSlate: generateScoutingHiringSlate(hiringContext, createGameRNG(404)),
  };
}

describe('generateRevisedOnboardingScript', () => {
  it('creates scripts for all three fixed AGMs with all nine chapters populated', () => {
    for (const agmId of ['marcus_chen', 'walt_kowalski', 'elena_vargas'] as const) {
      const script = generateRevisedOnboardingScript(createGameRNG(410), makeContext(agmId));

      expect(script.agm.id).toBe(agmId);
      expect(Object.keys(script.chapters)).toEqual(REVISED_CHAPTER_ORDER.map((chapter) => chapter.id));
      for (const chapterId of REVISED_CHAPTER_ORDER.map((chapter) => chapter.id)) {
        expect(script.chapters[chapterId].intro.length).toBeGreaterThan(0);
        expect(script.chapters[chapterId].reaction.length).toBeGreaterThan(0);
      }
    }
  });

  it('pre-generates staff opinions that differ by AGM archetype', () => {
    const analyticsScript = generateRevisedOnboardingScript(createGameRNG(411), makeContext('marcus_chen'));
    const oldSchoolScript = generateRevisedOnboardingScript(createGameRNG(411), makeContext('walt_kowalski'));
    const analyticsManagerId = analyticsScript.chapters.hire_coaches.candidateIds[0]!;

    expect(analyticsScript.staffOpinions[analyticsManagerId]?.agreementLevel).not.toBe(
      oldSchoolScript.staffOpinions[analyticsManagerId]?.agreementLevel,
    );
  });

  it('is deterministic for the same seed and selected AGM', () => {
    expect(
      generateRevisedOnboardingScript(createGameRNG(412), makeContext('elena_vargas')),
    ).toEqual(
      generateRevisedOnboardingScript(createGameRNG(412), makeContext('elena_vargas')),
    );
  });
});
