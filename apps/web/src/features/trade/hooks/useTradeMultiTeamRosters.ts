import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { MultiTeamLaneState } from '../components/MultiTeamLaneCard';
import { sortPlayerList } from '../lib/tradeBuilderTransforms';

interface UseTradeMultiTeamRostersOptions {
  isOpen: boolean;
  isInitialized: boolean;
  workerReady: boolean;
  lanes: MultiTeamLaneState[];
  getTeamRoster: (teamId: string) => Promise<unknown>;
}

interface UseTradeMultiTeamRostersResult {
  multiTeamRosters: Record<string, PlayerDTO[]>;
  setMultiTeamRosters: Dispatch<SetStateAction<Record<string, PlayerDTO[]>>>;
}

export function useTradeMultiTeamRosters({
  isOpen,
  isInitialized,
  workerReady,
  lanes,
  getTeamRoster,
}: UseTradeMultiTeamRostersOptions): UseTradeMultiTeamRostersResult {
  const [multiTeamRosters, setMultiTeamRosters] = useState<Record<string, PlayerDTO[]>>({});

  useEffect(() => {
    if (!isOpen || !isInitialized || !workerReady) {
      return;
    }

    const distinctTeamIds = [...new Set(lanes.map((lane) => lane.teamId).filter(Boolean))];
    const missingTeamIds = distinctTeamIds.filter((teamId) => multiTeamRosters[teamId] == null);
    if (missingTeamIds.length === 0) {
      return;
    }

    let cancelled = false;

    const loadRosters = async () => {
      const entries = await Promise.all(
        missingTeamIds.map(async (teamId) => {
          const roster = await getTeamRoster(teamId);
          return [teamId, sortPlayerList((roster as PlayerDTO[]) ?? [])] as const;
        }),
      );

      if (cancelled) {
        return;
      }

      setMultiTeamRosters((current) => {
        const next = { ...current };
        for (const [teamId, roster] of entries) {
          next[teamId] = roster;
        }
        return next;
      });
    };

    void loadRosters();

    return () => {
      cancelled = true;
    };
  }, [getTeamRoster, isInitialized, isOpen, lanes, multiTeamRosters, workerReady]);

  return {
    multiTeamRosters,
    setMultiTeamRosters,
  };
}
