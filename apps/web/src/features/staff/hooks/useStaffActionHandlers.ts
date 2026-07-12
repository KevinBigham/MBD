import { useCallback, useState } from 'react';

interface UseStaffActionHandlersOptions {
  autosaveActiveGame: (context: { season: number }) => Promise<unknown>;
  fetchStaffData: () => Promise<void>;
  fireCoach: (coachId: string) => Promise<unknown>;
  hireCoach: (coachId: string) => Promise<unknown>;
  season: number;
}

interface UseStaffActionHandlersResult {
  busyCoachId: string | null;
  handleFire: (coachId: string) => Promise<void>;
  handleHire: (coachId: string) => Promise<void>;
}

function mutationSucceeded(value: unknown): value is { success: true } {
  return typeof value === 'object'
    && value !== null
    && 'success' in value
    && (value as { success?: unknown }).success === true;
}

function snapshotSaved(value: unknown): value is { saved: true } {
  return typeof value === 'object'
    && value !== null
    && 'saved' in value
    && (value as { saved?: unknown }).saved === true;
}

export function useStaffActionHandlers({
  autosaveActiveGame,
  fetchStaffData,
  fireCoach,
  hireCoach,
  season,
}: UseStaffActionHandlersOptions): UseStaffActionHandlersResult {
  const [busyCoachId, setBusyCoachId] = useState<string | null>(null);

  const runStaffAction = useCallback(async (
    coachId: string,
    action: (id: string) => Promise<unknown>,
  ) => {
    setBusyCoachId(coachId);
    try {
      const result = await action(coachId);
      if (!mutationSucceeded(result)) return;
      if (!snapshotSaved(await autosaveActiveGame({ season }))) return;
      await fetchStaffData();
    } finally {
      setBusyCoachId(null);
    }
  }, [autosaveActiveGame, fetchStaffData, season]);

  const handleHire = useCallback(async (coachId: string) => {
    await runStaffAction(coachId, hireCoach);
  }, [hireCoach, runStaffAction]);

  const handleFire = useCallback(async (coachId: string) => {
    await runStaffAction(coachId, fireCoach);
  }, [fireCoach, runStaffAction]);

  return {
    busyCoachId,
    handleFire,
    handleHire,
  };
}
