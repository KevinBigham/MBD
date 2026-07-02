import { useCallback, useEffect, useMemo, useState, type ComponentProps, type Dispatch, type SetStateAction } from 'react';
import { PITCHER_POSITIONS } from '@mbd/sim-core';
import type { DayOneOpeningPlan } from '@mbd/contracts';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import { RosterLineupPanel } from '../components/RosterLineupPanel';
import {
  buildBullpenPlanFromDepth,
  buildDepthChartGroups,
  buildDepthPlanFromRosterPlan,
  orderPlayersByPlan,
} from '../lib/rosterPlanTransforms';
import type { RosterPlanView } from './useRosterRouteData';

const PITCHER_POSITIONS_SET = new Set<string>(PITCHER_POSITIONS);

interface UpdateRosterPlanResult {
  success?: boolean;
  plan?: unknown;
}

interface UseRosterLineupControlsOptions {
  activeSaveId: string | null;
  activeSaveSlot: number | null;
  autosaveActiveGame: (options?: { season?: number }) => Promise<unknown>;
  mlbRoster: PlayerDTO[];
  rosterPlan: RosterPlanView | null;
  season: number;
  setRosterPlan: Dispatch<SetStateAction<RosterPlanView | null>>;
  updateRosterPlan?: (patch: Partial<DayOneOpeningPlan>) => Promise<UpdateRosterPlanResult | null | undefined>;
  userTeamId: string | null;
}

interface UseRosterLineupControlsResult {
  hitters: PlayerDTO[];
  lineupPanelProps: ComponentProps<typeof RosterLineupPanel>;
  pitchers: PlayerDTO[];
}

function toLineupPlayer(player: PlayerDTO) {
  return {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    position: player.position,
    displayRating: player.displayRating,
    letterGrade: player.letterGrade,
  };
}

export function useRosterLineupControls({
  activeSaveId,
  activeSaveSlot,
  autosaveActiveGame,
  mlbRoster,
  rosterPlan,
  season,
  setRosterPlan,
  updateRosterPlan,
  userTeamId,
}: UseRosterLineupControlsOptions): UseRosterLineupControlsResult {
  const [depthPlan, setDepthPlan] = useState<Record<string, string[]>>({});

  const depthPlanStorageKey = useMemo(() => {
    const saveKey = activeSaveSlot != null ? `slot-${activeSaveSlot}` : (activeSaveId ?? 'unsaved');
    return `mbd:roster-depth-plan:${saveKey}:${userTeamId}`;
  }, [activeSaveId, activeSaveSlot, userTeamId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(depthPlanStorageKey);
    if (!raw) {
      setDepthPlan({});
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setDepthPlan(typeof parsed === 'object' && parsed !== null ? parsed as Record<string, string[]> : {});
    } catch {
      setDepthPlan({});
    }
  }, [depthPlanStorageKey]);

  const persistDepthPlan = useCallback((nextDepthPlan: Record<string, string[]>) => {
    setDepthPlan(nextDepthPlan);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(depthPlanStorageKey, JSON.stringify(nextDepthPlan));
    }
  }, [depthPlanStorageKey]);

  const persistRosterPlan = useCallback(async (patch: Partial<DayOneOpeningPlan>) => {
    if (!updateRosterPlan) {
      return;
    }

    const result = await updateRosterPlan(patch);
    if (result?.success) {
      setRosterPlan(result.plan as RosterPlanView);
      await autosaveActiveGame({ season });
    }
  }, [autosaveActiveGame, season, setRosterPlan, updateRosterPlan]);

  const hitters = useMemo(
    () => mlbRoster.filter((player) => !PITCHER_POSITIONS_SET.has(player.position)),
    [mlbRoster],
  );
  const pitchers = useMemo(
    () => mlbRoster.filter((player) => PITCHER_POSITIONS_SET.has(player.position)),
    [mlbRoster],
  );
  const lineupPlayers = useMemo(
    () => orderPlayersByPlan(hitters, rosterPlan?.lineupPlayerIds ?? []).slice(0, 9),
    [hitters, rosterPlan?.lineupPlayerIds],
  );
  const rotationPlayers = useMemo(
    () => orderPlayersByPlan(
      pitchers.filter((player) => player.position === 'SP'),
      rosterPlan?.rotationPlayerIds ?? [],
    ).slice(0, 5),
    [pitchers, rosterPlan?.rotationPlayerIds],
  );
  const effectiveDepthPlan = useMemo(
    () => ({
      ...buildDepthPlanFromRosterPlan(rosterPlan),
      ...depthPlan,
    }),
    [depthPlan, rosterPlan],
  );
  const depthChartGroups = useMemo(
    () => buildDepthChartGroups(mlbRoster, effectiveDepthPlan),
    [effectiveDepthPlan, mlbRoster],
  );

  const handleLineupReorder = useCallback((orderedIds: string[]) => {
    void persistRosterPlan({ lineupPlayerIds: orderedIds.slice(0, 9) });
  }, [persistRosterPlan]);

  const handleRotationReorder = useCallback((orderedIds: string[]) => {
    void persistRosterPlan({ rotationPlayerIds: orderedIds.slice(0, 5) });
  }, [persistRosterPlan]);

  const handleDepthReorder = useCallback((position: string, orderedIds: string[]) => {
    const nextDepthPlan = {
      ...depthPlan,
      [position]: orderedIds,
    };
    persistDepthPlan(nextDepthPlan);

    if (!PITCHER_POSITIONS_SET.has(position)) {
      return;
    }

    const rotationPlayerIds = position === 'SP'
      ? orderedIds.slice(0, 5)
      : rosterPlan?.rotationPlayerIds ?? rotationPlayers.map((player) => player.id);
    void persistRosterPlan({
      rotationPlayerIds,
      bullpen: buildBullpenPlanFromDepth(mlbRoster, nextDepthPlan, rotationPlayerIds),
    });
  }, [depthPlan, mlbRoster, persistDepthPlan, persistRosterPlan, rosterPlan?.rotationPlayerIds, rotationPlayers]);

  const lineupPanelProps = useMemo<ComponentProps<typeof RosterLineupPanel>>(() => ({
    lineupPlayers: lineupPlayers.map(toLineupPlayer),
    rotationPlayers: rotationPlayers.map(toLineupPlayer),
    depthChartGroups,
    onLineupReorder: handleLineupReorder,
    onRotationReorder: handleRotationReorder,
    onDepthReorder: handleDepthReorder,
  }), [
    depthChartGroups,
    handleDepthReorder,
    handleLineupReorder,
    handleRotationReorder,
    lineupPlayers,
    rotationPlayers,
  ]);

  return {
    hitters,
    lineupPanelProps,
    pitchers,
  };
}
