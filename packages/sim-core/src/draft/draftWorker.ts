import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import { HITTER_POSITIONS, PITCHER_POSITIONS } from '../player/generation.js';
import type { DraftProspect } from './draftPool.js';

const MIN_POSITION_DEPTH: Record<string, number> = { C: 2, '1B': 2, '2B': 2, '3B': 2, SS: 2, LF: 2, CF: 2, RF: 2, DH: 1, SP: 5, RP: 4, CL: 1 };
const NEED_SCORE = [25, 50, 70, 90];
const STRATEGIES = ['balanced', 'board', 'college_secure', 'need_first', 'pitching', 'premium_athletes', 'upside'] as const;
type Strategy = (typeof STRATEGIES)[number];
type Weights = readonly [number, number, number, number, number, number, number];
const WEIGHTS: Record<Strategy, Weights> = {
  balanced: [.6, .25, .15, .04, 0, 0, 0], board: [.64, .18, .12, .06, 0, 0, 1.5], college_secure: [.56, .22, .22, .02, -2, 0, 0],
  need_first: [.5, .36, .1, .04, 0, 0, 0], pitching: [.54, .22, .12, .06, 0, 4, 0], premium_athletes: [.54, .2, .11, .1, 1, 0, 4], upside: [.56, .18, .06, .2, 2, 0, 2],
};
const TEAM_STRATEGY: Record<string, number> = { nym: 1, phi: 2, bos: 1, bal: 5, wsh: 2, chi: 1, det: 3, cle: 4, col: 0, pit: 6, kc: 5, msp: 4, stl: 2, ind: 5, mil: 0, nas: 6, mia: 6, atl: 5, cha: 0, orl: 6, ral: 2, hou: 1, dal: 3, sat: 4, den: 5, aus: 6, lax: 1, sfb: 2, phx: 3, sea: 4, sdg: 0, por: 5 };

export function determineDraftOrder(records: Array<{ teamId: string; wins: number; losses: number }>): string[] {
  return [...records].sort((a, b) => {
    const ap = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : .5;
    const bp = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : .5;
    return ap !== bp ? ap - bp : a.wins !== b.wins ? a.wins - b.wins : a.teamId.localeCompare(b.teamId);
  }).map((record) => record.teamId);
}

export function evaluateTeamNeeds(roster: GeneratedPlayer[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const player of roster) counts.set(player.position, (counts.get(player.position) ?? 0) + 1);
  const quality = new Map<string, number>();
  for (const position of [...HITTER_POSITIONS, ...PITCHER_POSITIONS]) {
    const players = roster.filter((player) => player.position === position).sort((a, b) => b.overallRating - a.overallRating);
    const top = Math.min(players.length, MIN_POSITION_DEPTH[position] ?? 2);
    quality.set(position, top ? players.slice(0, top).reduce((sum, player) => sum + player.overallRating, 0) / top : 0);
  }
  const needs = new Map<string, number>();
  for (const position of [...HITTER_POSITIONS, ...PITCHER_POSITIONS]) {
    const count = counts.get(position) ?? 0;
    const depth = MIN_POSITION_DEPTH[position] ?? 2;
    const base = NEED_SCORE[count === 0 ? 3 : count < depth ? 2 : count === depth ? 1 : 0] ?? 25;
    const penalty = Math.max(0, 50 - Math.min(100, (quality.get(position)! / 550) * 100)) * .6;
    needs.set(position, Math.round(Math.min(100, base + penalty)));
  }
  return needs;
}

function visibleScore(prospect: DraftProspect, strategy: Weights, needs: ReadonlyMap<string, number>): number {
  const { player } = prospect;
  const sorted = [...needs.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const need = player.position === sorted[0]?.[0] ? 10 : player.position === sorted[1]?.[0] ? 5 : 0;
  const youth = Math.max(0, Math.min(1, (21 - player.age) / 4));
  const prep = prospect.background === 'high_school' ? 1 : prospect.background === 'college_underclass' ? .5 : 0;
  const risk = Math.min(20, prospect.scoutingGrade / 80 * 8 + youth * 6 + prep * 6);
  const background = prospect.background === 'college_senior' ? -1 : prospect.background === 'high_school' ? 1 : 0;
  const pitcher = player.position === 'SP' || player.position === 'RP' || player.position === 'CL';
  const premium = player.position === 'C' || player.position === 'SS' || player.position === 'CF';
  const bpa = prospect.scoutingGrade * strategy[0];
  const adjustment = need * strategy[1] + prospect.signability * 20 * strategy[2] + risk * strategy[3] + background * strategy[4] + (pitcher ? strategy[5] : 0) + (premium ? strategy[6] : 0) - bpa * (1 - strategy[0]);
  return bpa + Math.max(-8, Math.min(8, adjustment));
}

export function aiSelectPick(rng: GameRNG, teamId: string, prospects: DraftProspect[], roster: GeneratedPlayer[]): DraftProspect {
  if (!prospects.length) throw new Error(`aiSelectPick: no available prospects for team ${teamId}`);
  if (prospects.length === 1) return prospects[0]!;
  const strategy = WEIGHTS[STRATEGIES[TEAM_STRATEGY[teamId] ?? 0] ?? 'balanced'];
  const needs = evaluateTeamNeeds(roster);
  let best = [...prospects].sort((a, b) => a.player.id.localeCompare(b.player.id))[0]!;
  let bestScore = -Infinity;
  for (const prospect of [...prospects].sort((a, b) => a.player.id.localeCompare(b.player.id))) {
    const score = visibleScore(prospect, strategy, needs) + rng.nextFloat() * .5;
    if (score > bestScore) { bestScore = score; best = prospect; }
  }
  return best;
}
