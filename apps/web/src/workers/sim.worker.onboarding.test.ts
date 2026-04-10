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

function startGame(seed: number = 123) {
  return api.newGame({
    seed,
    userTeamId: 'nym',
    gmName: 'General Manager',
    difficulty: 'standard',
    saveSlot: 1,
  });
}

afterEach(() => {
  setState(null);
  vi.restoreAllMocks();
});

describe('revised onboarding worker API', () => {
  it('returns the fixed AGM candidates and a revised onboarding bundle for a selected AGM', async () => {
    startGame(501);

    const candidates = await api.getAGMCandidates();
    const onboarding = await api.getRevisedOnboardingData('marcus_chen');

    expect(candidates).toHaveLength(3);
    expect(candidates.map((candidate) => candidate.id)).toEqual(['marcus_chen', 'walt_kowalski', 'elena_vargas']);
    expect(onboarding.script.agm.id).toBe('marcus_chen');
    expect(onboarding.staffSlate.managerCandidates).toHaveLength(3);
    expect(onboarding.scoutingSlate.candidates).toHaveLength(3);
  });

  it('stages revised onboarding hires and persists them on completion', async () => {
    startGame(502);

    const onboarding = await api.getRevisedOnboardingData('walt_kowalski');
    const hires = {
      managerId: onboarding.staffSlate.managerCandidates[1].id,
      pitchingCoachId: onboarding.staffSlate.pitchingCoachCandidates[0].id,
      hittingCoachId: onboarding.staffSlate.hittingCoachCandidates[1].id,
    };
    const scoutingDirectorId = onboarding.scoutingSlate.candidates[2].id;

    await api.applyStaffHires(hires);
    await api.applyScoutingHire(scoutingDirectorId);
    await api.completeRevisedOnboarding({
      selectedAGMId: 'walt_kowalski',
      staffHires: hires,
      scoutingHire: scoutingDirectorId,
      gmPhilosophy: {
        seasonGoal: 'playoff',
        developmentStyle: 'patient',
        spendingStyle: 'balanced',
        tradeApproach: 'opportunistic',
        scoutingFocus: 'pro_scouting',
        mediaTone: 'measured',
      },
    });

    const state = requireState();
    const manager = (state.coachingStaffs.get(state.userTeamId) ?? []).find((coach) => coach.role === 'manager');

    expect(state.franchise.assistantGMId).toBe('walt_kowalski');
    expect(state.franchise.scoutingDirector?.id).toBe(scoutingDirectorId);
    expect(state.franchise.gmPhilosophy?.scoutingFocus).toBe('pro_scouting');
    expect(state.franchise.onboarding.welcomeBriefingSeen).toBe(true);
    expect(manager?.id).toBe(hires.managerId);
  });

  it('exports revised onboarding state through schema version 16 snapshots', async () => {
    startGame(503);

    const onboarding = await api.getRevisedOnboardingData('elena_vargas');
    const hires = {
      managerId: onboarding.staffSlate.managerCandidates[0].id,
      pitchingCoachId: onboarding.staffSlate.pitchingCoachCandidates[0].id,
      hittingCoachId: onboarding.staffSlate.hittingCoachCandidates[0].id,
    };
    const scoutingDirectorId = onboarding.scoutingSlate.candidates[1].id;

    await api.applyStaffHires(hires);
    await api.applyScoutingHire(scoutingDirectorId);
    await api.completeRevisedOnboarding({
      selectedAGMId: 'elena_vargas',
      staffHires: hires,
      scoutingHire: scoutingDirectorId,
      gmPhilosophy: {
        seasonGoal: 'championship',
        developmentStyle: 'aggressive',
        spendingStyle: 'big_spender',
        tradeApproach: 'buyer',
        scoutingFocus: 'international',
        mediaTone: 'confident',
      },
    });

    const snapshot = await api.exportSnapshot();

    expect(snapshot.schemaVersion).toBe(16);
    expect(snapshot.franchise.assistantGMId).toBe('elena_vargas');
    expect(snapshot.franchise.scoutingDirector?.specialty).toBe('international');
  });
});
