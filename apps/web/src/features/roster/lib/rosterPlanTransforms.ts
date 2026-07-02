import type { DayOneOpeningPlan } from '@mbd/contracts';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

type RosterPlanView = DayOneOpeningPlan;

const ROSTER_DEPTH_POSITIONS = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CL'] as const;

export function orderPlayersByPlan<T extends { id: string; displayRating: number }>(
  players: T[],
  orderedIds: string[] = [],
): T[] {
  const byId = new Map(players.map((player) => [player.id, player]));
  const ordered = orderedIds
    .map((playerId) => byId.get(playerId))
    .filter((player): player is T => player != null);
  const remaining = players
    .filter((player) => !orderedIds.includes(player.id))
    .sort((left, right) => right.displayRating - left.displayRating);
  return [...ordered, ...remaining];
}

export function buildBullpenPlanFromDepth(
  roster: PlayerDTO[],
  depthPlan: Record<string, string[]>,
  rotationPlayerIds: string[],
): NonNullable<DayOneOpeningPlan['bullpen']> {
  const relievers = orderPlayersByPlan(
    roster.filter((player) => player.position === 'RP' || player.position === 'CL'),
    [...(depthPlan.RP ?? []), ...(depthPlan.CL ?? [])],
  );
  const closers = orderPlayersByPlan(
    roster.filter((player) => player.position === 'CL'),
    depthPlan.CL ?? [],
  );
  const starters = orderPlayersByPlan(
    roster.filter((player) => player.position === 'SP'),
    depthPlan.SP ?? rotationPlayerIds,
  );
  const closerId = closers[0]?.id ?? relievers[0]?.id ?? null;
  const setupIds = relievers
    .filter((player) => player.id !== closerId && !rotationPlayerIds.includes(player.id))
    .slice(0, 2)
    .map((player) => player.id);
  const longReliefId = [
    ...starters.filter((player) => !rotationPlayerIds.includes(player.id)),
    ...relievers,
  ].find((player) => player.id !== closerId && !setupIds.includes(player.id))?.id ?? null;

  return { closerId, setupIds, longReliefId };
}

export function buildDepthPlanFromRosterPlan(plan: RosterPlanView | null): Record<string, string[]> {
  if (!plan) {
    return {};
  }

  return {
    SP: plan.rotationPlayerIds,
    RP: [
      plan.bullpen?.longReliefId,
      ...(plan.bullpen?.setupIds ?? []),
    ].filter((playerId): playerId is string => Boolean(playerId)),
    CL: plan.bullpen?.closerId ? [plan.bullpen.closerId] : [],
  };
}

export function buildDepthChartGroups(roster: PlayerDTO[], depthPlan: Record<string, string[]> = {}) {
  return ROSTER_DEPTH_POSITIONS
    .map((pos) => ({
      position: pos,
      players: orderPlayersByPlan(
        roster
          .filter((p) => p.position === pos)
          .sort((a, b) => b.displayRating - a.displayRating),
        depthPlan[pos] ?? [],
      )
        .map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          position: p.position,
          displayRating: p.displayRating,
          letterGrade: p.letterGrade,
        })),
    }))
    .filter((group) => group.players.length > 0);
}
