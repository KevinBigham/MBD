import { describe, it, expect } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import {
  generatePlayer,
  generateTeamRoster,
  generateLeaguePlayers,
  HITTER_POSITIONS,
  PITCHER_POSITIONS,
} from '../src/player/generation.js';
import { RATING_MIN, RATING_MAX } from '../src/player/attributes.js';

describe('generatePlayer', () => {
  it('generates a player with valid attributes', () => {
    const rng = new GameRNG(42);
    const player = generatePlayer(rng, 'SS', 'nyy', 'MLB');

    expect(player.id).toBeTruthy();
    expect(player.firstName).toBeTruthy();
    expect(player.lastName).toBeTruthy();
    expect(player.position).toBe('SS');
    expect(player.teamId).toBe('nyy');
    expect(player.rosterStatus).toBe('MLB');
    expect(player.age).toBeGreaterThanOrEqual(24);
    expect(player.age).toBeLessThanOrEqual(38);
  });

  it('generates hitter attributes within valid range', () => {
    const rng = new GameRNG(123);
    const player = generatePlayer(rng, '1B', 'bos', 'MLB');

    expect(player.hitterAttributes.contact).toBeGreaterThanOrEqual(RATING_MIN);
    expect(player.hitterAttributes.contact).toBeLessThanOrEqual(RATING_MAX);
    expect(player.hitterAttributes.power).toBeGreaterThanOrEqual(RATING_MIN);
    expect(player.hitterAttributes.power).toBeLessThanOrEqual(RATING_MAX);
  });

  it('generates pitcher attributes for pitcher positions', () => {
    const rng = new GameRNG(99);
    const player = generatePlayer(rng, 'SP', 'lad', 'MLB');

    expect(player.pitcherAttributes).not.toBeNull();
    expect(player.pitcherAttributes!.stuff).toBeGreaterThanOrEqual(RATING_MIN);
    expect(player.pitcherAttributes!.stuff).toBeLessThanOrEqual(RATING_MAX);
  });

  it('does not generate pitcher attributes for hitters', () => {
    const rng = new GameRNG(88);
    const player = generatePlayer(rng, 'CF', 'nym', 'MLB');
    expect(player.pitcherAttributes).toBeNull();
  });

  it('is deterministic with same seed', () => {
    const rng1 = new GameRNG(555);
    const rng2 = new GameRNG(555);
    const p1 = generatePlayer(rng1, 'SS', 'nyy', 'MLB');
    const p2 = generatePlayer(rng2, 'SS', 'nyy', 'MLB');

    expect(p1.firstName).toBe(p2.firstName);
    expect(p1.lastName).toBe(p2.lastName);
    expect(p1.hitterAttributes).toEqual(p2.hitterAttributes);
    expect(p1.overallRating).toBe(p2.overallRating);
  });

  it('assigns 2-3 deterministic personality traits to generated players', () => {
    const rng1 = new GameRNG(909);
    const rng2 = new GameRNG(909);
    const p1 = generatePlayer(rng1, 'SS', 'nyy', 'MLB');
    const p2 = generatePlayer(rng2, 'SS', 'nyy', 'MLB');

    expect(p1.personalityTraits).toEqual(p2.personalityTraits);
    expect(p1.personalityTraits?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(p1.personalityTraits?.length ?? 0).toBeLessThanOrEqual(3);
    expect(new Set(p1.personalityTraits ?? []).size).toBe(p1.personalityTraits?.length ?? 0);
  });

  it('generates younger players for lower minor leagues', () => {
    const rng = new GameRNG(77);
    const mlb = generatePlayer(rng, 'SS', 'nyy', 'MLB');
    const rng2 = new GameRNG(77);
    const rookie = generatePlayer(rng2, 'SS', 'nyy', 'ROOKIE');

    // MLB players are generally older than ROOKIE players
    // (Statistical tendency, not absolute guarantee due to randomness)
    expect(mlb.age).toBeGreaterThanOrEqual(24);
    expect(rookie.age).toBeLessThanOrEqual(21);
  });
});

describe('generateTeamRoster', () => {
  it('generates a roster of ~170 players', () => {
    const rng = new GameRNG(42);
    const roster = generateTeamRoster(rng, 'nyy');

    // MLB: 28 (from template) + minors: 141 = ~169
    expect(roster.length).toBeGreaterThan(140);
    expect(roster.length).toBeLessThan(200);
  });

  it('includes players at all roster levels', () => {
    const rng = new GameRNG(42);
    const roster = generateTeamRoster(rng, 'lad');

    const levels = new Set(roster.map(p => p.rosterStatus));
    expect(levels.has('MLB')).toBe(true);
    expect(levels.has('AAA')).toBe(true);
    expect(levels.has('AA')).toBe(true);
    expect(levels.has('ROOKIE')).toBe(true);
  });

  it('includes both hitters and pitchers', () => {
    const rng = new GameRNG(42);
    const roster = generateTeamRoster(rng, 'bos');

    const hitters = roster.filter(p =>
      (HITTER_POSITIONS as readonly string[]).includes(p.position)
    );
    const pitchers = roster.filter(p =>
      (PITCHER_POSITIONS as readonly string[]).includes(p.position)
    );

    expect(hitters.length).toBeGreaterThan(0);
    expect(pitchers.length).toBeGreaterThan(0);
  });
});

describe('generateLeaguePlayers', () => {
  it('generates players for all teams', () => {
    const rng = new GameRNG(42);
    const teamIds = ['nyy', 'bos', 'lad'];
    const players = generateLeaguePlayers(rng, teamIds);

    expect(players.length).toBeGreaterThan(400);

    const teams = new Set(players.map(p => p.teamId));
    expect(teams.size).toBe(3);
  });
});
