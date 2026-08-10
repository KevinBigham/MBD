import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import type { DraftProspect, DraftClass } from './draftPool.js';
import { DRAFT_ROUNDS } from './draftPool.js';
import type { DraftPick, DraftResult } from './draftAI.js';
import { aiSelectPick } from './draftAI.js';

/** Run the full 20-round draft harness used by simulation tests and batch tools. */
export function simulateFullDraft(
  rng: GameRNG,
  draftClass: DraftClass,
  draftOrder: string[],
  teamRosters: Map<string, GeneratedPlayer[]>,
  userTeamId: string,
  userPicks?: Map<number, DraftProspect>,
): DraftResult {
  const picks: DraftPick[] = [];
  const available = [...draftClass.prospects];
  let overallPickNumber = 0;
  const rosters = new Map<string, GeneratedPlayer[]>();
  for (const [teamId, roster] of teamRosters) rosters.set(teamId, [...roster]);

  for (let round = 1; round <= DRAFT_ROUNDS; round++) {
    for (const teamId of draftOrder) {
      if (available.length === 0) break;
      overallPickNumber++;
      let selectedProspect: DraftProspect;
      if (teamId === userTeamId && userPicks?.has(round)) {
        selectedProspect = userPicks.get(round)!;
        const index = available.findIndex((candidate) => candidate.player.id === selectedProspect.player.id);
        if (index >= 0) available.splice(index, 1);
      } else {
        selectedProspect = aiSelectPick(rng, teamId, available, rosters.get(teamId) ?? []);
        const index = available.indexOf(selectedProspect);
        if (index >= 0) available.splice(index, 1);
      }
      const draftedProspect: DraftProspect = {
        ...selectedProspect,
        player: { ...selectedProspect.player, teamId },
      };
      const teamRoster = rosters.get(teamId) ?? [];
      teamRoster.push(draftedProspect.player);
      rosters.set(teamId, teamRoster);
      picks.push({ round, pickNumber: overallPickNumber, teamId, prospect: draftedProspect });
    }
    if (available.length === 0) break;
  }
  return { picks, undrafted: available };
}
