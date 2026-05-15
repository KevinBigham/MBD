// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CURRENT_GAME_SNAPSHOT_VERSION } from '@mbd/contracts';
import type { GMPhilosophy, StaffHireChoices } from '@mbd/sim-core';

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

function startGame(seed: number) {
  return api.newGame({
    seed,
    userTeamId: 'nym',
    gmName: 'General Manager',
    difficulty: 'standard',
    saveSlot: 1,
    dayOneExperience: 'full',
  });
}

function buildPhilosophy(overrides: Partial<GMPhilosophy> = {}): GMPhilosophy {
  return {
    seasonGoal: 'playoff',
    developmentStyle: 'balanced',
    spendingStyle: 'balanced',
    tradeApproach: 'buyer',
    scoutingFocus: 'draft',
    mediaTone: 'confident',
    ...overrides,
  };
}

afterEach(() => {
  setState(null);
  vi.restoreAllMocks();
});

describe('revised onboarding worker API', () => {
  it('returns the fixed AGM candidate slate without requiring a game state', async () => {
    const candidates = await api.getAGMCandidates();

    expect(candidates.map((candidate) => candidate.id)).toEqual([
      'marcus_chen',
      'walt_kowalski',
      'elena_vargas',
    ]);
    expect(candidates.map((candidate) => candidate.name)).toEqual([
      'Marcus Chen',
      'Walter Kowalski',
      'Elena Vargas',
    ]);
  });

  it('initializes revised onboarding data from the selected AGM and generated hiring slates', async () => {
    startGame(801);

    const data = await api.getRevisedOnboardingData('walt_kowalski');

    expect(data.script.agm.id).toBe('walt_kowalski');
    expect(Object.keys(data.script.chapters)).toContain('owners_office');
    expect(Object.keys(data.script.chapters)).toContain('press_conference');
    expect(data.staffSlate.managerCandidates).toHaveLength(3);
    expect(data.staffSlate.pitchingCoachCandidates).toHaveLength(2);
    expect(data.staffSlate.hittingCoachCandidates).toHaveLength(2);
    expect(data.scoutingSlate.candidates).toHaveLength(3);
    expect(data.chapterData.owner.seasonGoalOptions.length).toBeGreaterThan(0);
    expect(data.chapterData.farm.developmentOptions.length).toBeGreaterThan(0);
  });

  it('stages revised staff and scouting hires, then completes onboarding into franchise state', async () => {
    startGame(802);

    const data = await api.getRevisedOnboardingData('elena_vargas');
    const hires: StaffHireChoices = {
      managerId: data.staffSlate.managerCandidates[0].id,
      pitchingCoachId: data.staffSlate.pitchingCoachCandidates[0].id,
      hittingCoachId: data.staffSlate.hittingCoachCandidates[0].id,
    };
    const scout = data.scoutingSlate.candidates[1];

    await api.applyStaffHires(hires);
    await api.applyScoutingHire(scout.id);
    await api.completeRevisedOnboarding({
      selectedAGMId: 'elena_vargas',
      staffHires: hires,
      scoutingHire: scout.id,
      gmPhilosophy: buildPhilosophy({ scoutingFocus: 'draft' }),
    });

    const state = requireState();
    const coachingStaff = state.coachingStaffs.get('nym') ?? [];

    expect(state.franchise.assistantGMId).toBe('elena_vargas');
    expect(state.franchise.scoutingDirector?.id).toBe(scout.id);
    expect(state.franchise.gmPhilosophy?.scoutingFocus).toBe(scout.specialty);
    expect(state.franchise.gmPhilosophy?.seasonGoal).toBe('playoff');
    expect(state.franchise.onboarding.welcomeBriefingSeen).toBe(true);
    expect(coachingStaff.some((coach) => coach.id === hires.managerId)).toBe(true);
    expect(coachingStaff.some((coach) => coach.id === hires.pitchingCoachId)).toBe(true);
    expect(coachingStaff.some((coach) => coach.id === hires.hittingCoachId)).toBe(true);
  });

  it('exports revised onboarding completion through current-schema snapshots', async () => {
    startGame(803);

    const data = await api.getRevisedOnboardingData('marcus_chen');
    const hires: StaffHireChoices = {
      managerId: data.staffSlate.managerCandidates[1].id,
      pitchingCoachId: data.staffSlate.pitchingCoachCandidates[1].id,
      hittingCoachId: data.staffSlate.hittingCoachCandidates[1].id,
    };
    const scout = data.scoutingSlate.candidates[0];

    await api.applyStaffHires(hires);
    await api.applyScoutingHire(scout.id);
    await api.completeRevisedOnboarding({
      selectedAGMId: 'marcus_chen',
      staffHires: hires,
      scoutingHire: scout.id,
      gmPhilosophy: buildPhilosophy({ seasonGoal: 'championship' }),
    });

    const snapshot = await api.exportSnapshot();

    expect(snapshot.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(snapshot.franchise.assistantGMId).toBe('marcus_chen');
    expect(snapshot.franchise.scoutingDirector?.id).toBe(scout.id);
    expect(snapshot.franchise.onboarding.welcomeBriefingSeen).toBe(true);
  });
});
