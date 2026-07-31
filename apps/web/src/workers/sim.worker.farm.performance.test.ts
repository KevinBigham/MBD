// @vitest-environment node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createProspectBond, type GeneratedPlayer } from '@mbd/sim-core';
import { recordProspectBondDebuts } from './sim.worker.farm.js';

function player(id: string, rosterStatus: string): GeneratedPlayer {
  return { id, rosterStatus } as GeneratedPlayer;
}

function state(players: GeneratedPlayer[], bonds = [createProspectBond('p1', 1, 'AAA', 'Drafted Round 1, 1')]) {
  return {
    season: 4,
    players,
    prospectBonds: bonds,
    seasonStats: new Map<string, { pa?: number; ip?: number }>(),
  };
}

describe('recordProspectBondDebuts operation-local lookup', () => {
  it('preserves missing, already-debuted, MLB-without-stats, hitter, pitcher, and sorted mixed outcomes', () => {
    const alreadyDebuted = { ...createProspectBond('already', 1, 'MLB', 'MLB Debut, 2'), debutSeason: 2 };
    const input = state([
      player('duplicate', 'AAA'),
      player('duplicate', 'MLB'),
      player('hitter', 'MLB'),
      player('pitcher', 'MLB'),
      player('no-stats', 'MLB'),
    ], [
      createProspectBond('missing', 1, 'AAA', 'Drafted Round 1, 1'),
      createProspectBond('duplicate', 1, 'AAA', 'Drafted Round 1, 1'),
      alreadyDebuted,
      createProspectBond('hitter', 1, 'AAA', 'Drafted Round 1, 1'),
      createProspectBond('pitcher', 1, 'AAA', 'Drafted Round 1, 1'),
      createProspectBond('no-stats', 1, 'AAA', 'Drafted Round 1, 1'),
    ]);
    input.seasonStats.set('hitter', { pa: 1 });
    input.seasonStats.set('pitcher', { ip: 1 });

    expect(recordProspectBondDebuts(input as any)).toEqual(['hitter', 'pitcher']);
    expect(input.prospectBonds.map((bond) => bond.prospectId)).toEqual([
      'already', 'duplicate', 'hitter', 'missing', 'no-stats', 'pitcher',
    ]);
    expect(input.prospectBonds.find((bond) => bond.prospectId === 'duplicate')?.debutSeason).toBeNull();
    expect(input.prospectBonds.find((bond) => bond.prospectId === 'hitter')).toMatchObject({
      currentLevel: 'MLB', debutSeason: 4, bondStrength: 25, loyaltyModifier: 0.25,
    });
    expect(input.prospectBonds.find((bond) => bond.prospectId === 'pitcher')?.milestones).toContain('MLB Debut, 4');
    expect(input.prospectBonds.find((bond) => bond.prospectId === 'already')).toBe(alreadyDebuted);
  });

  it('uses a first-write operation-local player index instead of unresolved-bond linear finds', () => {
    const source = readFileSync(fileURLToPath(new URL('./sim.worker.farm.ts', import.meta.url)), 'utf8');
    const start = source.indexOf('export function recordProspectBondDebuts(');
    const bodyStart = source.indexOf('{', start);
    let depth = 0;
    let end = bodyStart;
    for (; end < source.length; end += 1) {
      if (source[end] === '{') depth += 1;
      if (source[end] === '}' && --depth === 0) break;
    }
    const body = source.slice(bodyStart, end + 1);
    expect(body).toContain('const playersById = new Map<string, GeneratedPlayer>()');
    expect(body).toContain('if (!playersById.has(player.id))');
    expect(body).toContain('const player = playersById.get(bond.prospectId)');
    expect(body).not.toContain('state.players.find((candidate) => candidate.id === bond.prospectId)');
  });
});
