import { describe, expect, it } from 'vitest';
import {
  SCENARIO_LIBRARY,
  SCENARIO_OBJECTIVES,
  evaluateObjectiveProgress,
  getScenarioObjectives,
} from '../src/index.js';

function makeContext(overrides: Partial<Parameters<typeof evaluateObjectiveProgress>[1]> = {}) {
  return {
    seasonsPlayed: 1,
    winsBySeason: [72],
    playoffAppearances: 0,
    championships: 0,
    topProspectsDeveloped: 0,
    payrollHistory: [118],
    allStarCounts: [1],
    tradeCount: 1,
    recordBookEntries: 0,
    ...overrides,
  };
}

describe('scenario objectives', () => {
  it('covers all scenarios in the scenario library', () => {
    expect(Object.keys(SCENARIO_OBJECTIVES).sort()).toEqual(
      SCENARIO_LIBRARY.map((scenario) => scenario.id).sort(),
    );
  });

  it.each(SCENARIO_LIBRARY.map((scenario) => [scenario.id]))('defines between three and five objectives for %s', (scenarioId) => {
    const objectiveCount = SCENARIO_OBJECTIVES[scenarioId]?.objectives.length ?? 0;
    expect(objectiveCount).toBeGreaterThanOrEqual(3);
    expect(objectiveCount).toBeLessThanOrEqual(5);
  });

  it('returns null for an invalid scenario id', () => {
    expect(getScenarioObjectives('unknown-scenario')).toBeNull();
  });

  it('returns zeroed current progress from getScenarioObjectives', () => {
    const objectiveSet = getScenarioObjectives('underdog');

    expect(objectiveSet).not.toBeNull();
    expect(objectiveSet?.completionPercentage).toBe(0);
    expect(objectiveSet?.objectives.every((objective) => objective.currentValue === 0)).toBe(true);
    expect(objectiveSet?.objectives.every((objective) => objective.completed === false)).toBe(true);
  });

  it('marks underdog objectives complete when their targets are met', () => {
    const progress = evaluateObjectiveProgress('underdog', makeContext({
      seasonsPlayed: 2,
      winsBySeason: [82, 79],
      playoffAppearances: 1,
      topProspectsDeveloped: 1,
    }));

    expect(progress.objectives.every((objective) => objective.completed)).toBe(true);
    expect(progress.completionPercentage).toBe(100);
  });

  it('calculates partial completion percentages correctly', () => {
    const progress = evaluateObjectiveProgress('dynasty', makeContext({
      seasonsPlayed: 5,
      winsBySeason: [95, 91, 88, 86, 90],
      championships: 1,
      payrollHistory: [210, 205, 202, 208, 203],
      allStarCounts: [4, 3, 2, 2, 4],
    }));

    expect(progress.objectives.filter((objective) => objective.completed)).toHaveLength(1);
    expect(progress.completionPercentage).toBe(33);
  });

  it('tracks moneyball payroll restraint and contention objectives', () => {
    const progress = evaluateObjectiveProgress('moneyball', makeContext({
      seasonsPlayed: 3,
      winsBySeason: [84, 90, 92],
      playoffAppearances: 1,
      payrollHistory: [119, 117, 121],
    }));

    expect(progress.objectives.some((objective) =>
      objective.label.toLowerCase().includes('bottom-five payroll') && objective.completed
    )).toBe(true);
    expect(progress.objectives.some((objective) =>
      objective.category === 'playoffs' && objective.completed
    )).toBe(true);
  });

  it('tracks trade shark objectives from trades and titles', () => {
    const progress = evaluateObjectiveProgress('trade_shark', makeContext({
      seasonsPlayed: 4,
      tradeCount: 12,
      championships: 1,
      winsBySeason: [88, 91, 95, 97],
    }));

    expect(progress.objectives.some((objective) => objective.category === 'roster' && objective.completed)).toBe(true);
    expect(progress.objectives.some((objective) => objective.category === 'playoffs' && objective.completed)).toBe(true);
  });

  it('exposes non-empty strategy tips for every scenario', () => {
    for (const scenario of SCENARIO_LIBRARY) {
      const objectiveSet = getScenarioObjectives(scenario.id);
      expect(objectiveSet?.strategyTips.length).toBeGreaterThanOrEqual(2);
      expect(objectiveSet?.strategyTips.every((tip) => tip.trim().length > 0)).toBe(true);
    }
  });

  it('exposes non-empty difficulty explanations for every scenario', () => {
    for (const scenario of SCENARIO_LIBRARY) {
      const objectiveSet = getScenarioObjectives(scenario.id);
      expect(objectiveSet?.difficultyExplanation.trim().length).toBeGreaterThan(0);
    }
  });
});
