// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('comlink', () => ({
  expose: () => {},
}));

vi.mock('../shared/lib/saveSystem.js', () => ({
  createBranchSave: vi.fn(),
  deleteSaveById: vi.fn(),
  listBranches: vi.fn(),
  loadGameById: vi.fn(),
  saveGameById: vi.fn(),
}));

import { api } from './sim.worker';
import { requireState, setState } from './sim.worker.helpers';

function startGame(seed: number, dayOneExperience: 'full' | 'quick' = 'full') {
  return api.newGame({
    seed,
    userTeamId: 'nym',
    gmName: 'General Manager',
    difficulty: 'standard',
    saveSlot: 1,
    dayOneExperience,
  });
}

afterEach(() => {
  setState(null);
  vi.restoreAllMocks();
});

describe('day one worker API', () => {
  it('initializes the full Day One session with owner-first framing and team-card metadata', async () => {
    startGame(701, 'full');

    const session = await api.getDayOneSession();

    expect(session.mode).toBe('full');
    expect(session.currentStep).toBe('owner_intro');
    expect(session.teamCard.teamId).toBe('nym');
    expect(session.teamCard.archetype).toBeTruthy();
    expect(session.ownerScene.title).toBeTruthy();
    expect(session.stepCopy.headline).toBeTruthy();
    expect(session.stepCopy.body).toBeTruthy();
    expect(session.agmCandidates).toHaveLength(3);
    expect(session.selectedAGM).toBeNull();
  });

  it('persists Day One decisions, roster plan, and crisis response through completion', async () => {
    startGame(702, 'full');

    await api.advanceDayOneIntro();
    await api.chooseDayOneAGM('walt_kowalski');
    await api.advanceDayOneOrgReview();
    await api.setDayOneSeasonGoal('playoff');
    await api.setDayOneBudgetAllocation('future_flex');
    await api.setDayOneOpeningPlan({
      lineupPlayerIds: ['p1', 'p2', 'p3'],
      rotationPlayerIds: ['sp1', 'sp2', 'sp3', 'sp4', 'sp5'],
      bullpen: {
        closerId: 'rp1',
        setupIds: ['rp2', 'rp3'],
        longReliefId: 'rp4',
      },
    });
    await api.setDayOneDevelopmentPlan({
      developmentStyle: 'patient',
      promotionStance: 'measured',
    });

    const beforeCrisis = await api.getDayOneSession();
    expect(beforeCrisis.currentStep).toBe('crisis');
    expect(beforeCrisis.crisis).not.toBeNull();
    expect(beforeCrisis.projectedImpacts.length).toBeGreaterThan(0);
    expect(beforeCrisis.stepCopy.headline).toBeTruthy();

    await api.resolveDayOneCrisis(beforeCrisis.crisis!.responseOptions[0]!.id);
    const recapSession = await api.getDayOneSession();
    expect(recapSession.currentStep).toBe('recap');
    expect(recapSession.teaser).not.toBeNull();
    expect(recapSession.teaser?.aprilWatchItems).toHaveLength(3);
    expect(recapSession.stepCopy.headline).toBeTruthy();

    await api.finishDayOne();

    const state = requireState();
    expect(state.franchise.assistantGMId).toBe('walt_kowalski');
    expect(state.franchise.gmPhilosophy?.seasonGoal).toBe('playoff');
    expect(state.franchise.dayOne.status).toBe('complete');
    expect(state.franchise.dayOne.budgetAllocation).toBe('future_flex');
    expect(state.franchise.dayOne.promotionStance).toBe('measured');
    expect(state.franchise.dayOne.openingDayPlan?.bullpen?.closerId).toBe('rp1');
    expect(state.franchise.dayOne.crisisResponseId).toBeTruthy();
    expect(state.franchise.onboarding.welcomeBriefingSeen).toBe(true);
  });

  it('keeps Quick Start to team selection plus AGM, then auto-resolves the rest with a recap', async () => {
    startGame(703, 'quick');

    let session = await api.getDayOneSession();
    expect(session.mode).toBe('quick');
    expect(session.currentStep).toBe('agm_select');

    await api.chooseDayOneAGM('marcus_chen');

    session = await api.getDayOneSession();
    expect(session.currentStep).toBe('complete');
    expect(session.recap).not.toBeNull();
    expect(session.teaser).not.toBeNull();
    expect(session.teaser?.aprilWatchItems).toHaveLength(3);
    expect(session.selectedAGM?.id).toBe('marcus_chen');
    expect(session.choices.seasonGoal).toBeTruthy();
    expect(session.choices.budgetAllocation).toBeTruthy();
    expect(session.choices.openingDayPlan).not.toBeNull();
  });

  it('exports Day One state through current-schema snapshots', async () => {
    startGame(704, 'quick');

    await api.chooseDayOneAGM('elena_vargas');
    await api.finishDayOne();

    const snapshot = await api.exportSnapshot();

    expect(snapshot.schemaVersion).toBe(19);
    expect(snapshot.franchise.dayOne.experience).toBe('quick');
    expect(snapshot.franchise.dayOne.selectedAGMId).toBe('elena_vargas');
    expect(snapshot.franchise.dayOne.status).toBe('complete');
  });
});
