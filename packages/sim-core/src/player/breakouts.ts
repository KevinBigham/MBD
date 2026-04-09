import type { GeneratedPlayer } from './generation.js';

export interface BreakoutEvent {
  playerId: string;
  teamId: string;
  delta: number;
  timestamp: string;
  summary: string;
}

export function detectProspectBreakouts(
  beforePlayers: GeneratedPlayer[],
  afterPlayers: GeneratedPlayer[],
  timestamp: string,
): BreakoutEvent[] {
  const beforeById = new Map(beforePlayers.map((player) => [player.id, player]));
  const results: BreakoutEvent[] = [];

  for (const after of afterPlayers) {
    const before = beforeById.get(after.id);
    if (!before) continue;
    const delta = after.overallRating - before.overallRating;
    const isStillDeveloping =
      before.developmentPhase === 'Prospect' ||
      before.developmentPhase === 'Ascent' ||
      before.developmentPhase === 'Prime';
    if (isStillDeveloping && delta >= 30) {
      results.push({
        playerId: after.id,
        teamId: after.teamId,
        delta,
        timestamp,
        summary: `${after.firstName} ${after.lastName} looks like a breakout candidate after a ${delta}-point jump.`,
      });
    }
  }

  return results.sort((left, right) =>
    right.delta - left.delta
    || left.playerId.localeCompare(right.playerId),
  );
}
