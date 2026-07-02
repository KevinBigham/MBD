import { describe, it, expect } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import {
  generatePlayer,
  generateTeamRoster,
  generateLeaguePlayers,
  HITTER_POSITIONS,
  PITCHER_POSITIONS,
} from '../src/player/generation.js';
import type { AuthoredMinorLeaguePlayerContent, AuthoredRosterPlayerContent } from '../src/player/generation.js';
import { RATING_MIN, RATING_MAX, toDisplayRating, toInternalRating } from '../src/player/attributes.js';

const AUTHORED_MINOR_FIXTURE: readonly AuthoredMinorLeaguePlayerContent[] = [
  {
    teamId: 'nym',
    affiliateLevel: 'AA',
    firstName: 'Ari',
    lastName: 'Abarca',
    age: 22,
    position: 'SS',
    currentDisplayOVR: 45,
    floorDisplay: 40,
    ceilingDisplay: 75,
    contact: 45,
    power: 45,
    eye: 40,
    speed: 55,
    defense: 60,
    durability: 45,
    stuff: null,
    control: null,
    stamina: null,
    velocity: null,
    movement: null,
    workEthic: 61,
    mentalToughness: 60,
    leadership: 49,
    competitiveness: 62,
    developmentProgram: 'tools',
    developmentTrajectory: 'ahead_of_curve',
  },
  {
    teamId: 'nym',
    affiliateLevel: 'AA',
    firstName: 'Bento',
    lastName: 'Harrow',
    age: 23,
    position: 'SP',
    currentDisplayOVR: 45,
    floorDisplay: 40,
    ceilingDisplay: 65,
    contact: 20,
    power: 20,
    eye: 20,
    speed: 20,
    defense: 30,
    durability: 50,
    stuff: 50,
    control: 50,
    stamina: 55,
    velocity: 50,
    movement: 50,
    workEthic: 75,
    mentalToughness: 72,
    leadership: 61,
    competitiveness: 77,
    developmentProgram: 'refinement',
    developmentTrajectory: 'on_track',
  },
];

const AUTHORED_FULL_ROSTER_FIXTURE: readonly AuthoredRosterPlayerContent[] = [
  {
    contentId: 'auth-nym-mlb-001',
    teamId: 'nym',
    rosterLevel: 'MLB',
    firstName: 'Mara',
    lastName: 'Vega',
    age: 27,
    position: 'CF',
    currentDisplayOVR: 62,
    floorDisplay: 55,
    ceilingDisplay: 70,
    contact: 60,
    power: 55,
    eye: 60,
    speed: 65,
    defense: 70,
    durability: 60,
    stuff: null,
    control: null,
    stamina: null,
    velocity: null,
    movement: null,
    workEthic: 74,
    mentalToughness: 71,
    leadership: 69,
    competitiveness: 77,
    developmentProgram: 'mlb_prep',
    developmentTrajectory: 'on_track',
  },
  {
    contentId: 'auth-nym-aa-001',
    teamId: 'nym',
    rosterLevel: 'AA',
    firstName: 'Jonas',
    lastName: 'Keel',
    age: 22,
    position: 'SP',
    currentDisplayOVR: 44,
    floorDisplay: 38,
    ceilingDisplay: 67,
    contact: 20,
    power: 20,
    eye: 20,
    speed: 20,
    defense: 30,
    durability: 50,
    stuff: 48,
    control: 46,
    stamina: 58,
    velocity: 50,
    movement: 45,
    workEthic: 81,
    mentalToughness: 76,
    leadership: 58,
    competitiveness: 79,
    developmentProgram: 'stamina',
    developmentTrajectory: 'ahead_of_curve',
  },
];

describe('generatePlayer', () => {
  it('generates a player with valid attributes', () => {
    const rng = new GameRNG(42);
    const player = generatePlayer(rng, 'SS', 'nym', 'MLB');

    expect(player.id).toBeTruthy();
    expect(player.firstName).toBeTruthy();
    expect(player.lastName).toBeTruthy();
    expect(player.position).toBe('SS');
    expect(player.teamId).toBe('nym');
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
    const player = generatePlayer(rng, 'SP', 'lax', 'MLB');

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
    const p1 = generatePlayer(rng1, 'SS', 'nym', 'MLB');
    const p2 = generatePlayer(rng2, 'SS', 'nym', 'MLB');

    expect(p1.firstName).toBe(p2.firstName);
    expect(p1.lastName).toBe(p2.lastName);
    expect(p1.hitterAttributes).toEqual(p2.hitterAttributes);
    expect(p1.overallRating).toBe(p2.overallRating);
  });

  it('assigns 2-3 deterministic personality traits to generated players', () => {
    const rng1 = new GameRNG(909);
    const rng2 = new GameRNG(909);
    const p1 = generatePlayer(rng1, 'SS', 'nym', 'MLB');
    const p2 = generatePlayer(rng2, 'SS', 'nym', 'MLB');

    expect(p1.personalityTraits).toEqual(p2.personalityTraits);
    expect(p1.personalityTraits?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(p1.personalityTraits?.length ?? 0).toBeLessThanOrEqual(3);
    expect(new Set(p1.personalityTraits ?? []).size).toBe(p1.personalityTraits?.length ?? 0);
  });

  it('generates younger players for lower minor leagues', () => {
    const rng = new GameRNG(77);
    const mlb = generatePlayer(rng, 'SS', 'nym', 'MLB');
    const rng2 = new GameRNG(77);
    const rookie = generatePlayer(rng2, 'SS', 'nym', 'ROOKIE');

    // MLB players are generally older than ROOKIE players
    // (Statistical tendency, not absolute guarantee due to randomness)
    expect(mlb.age).toBeGreaterThanOrEqual(24);
    expect(rookie.age).toBeLessThanOrEqual(21);
  });
});

describe('generateTeamRoster', () => {
  it('generates a roster of ~170 players', () => {
    const rng = new GameRNG(42);
    const roster = generateTeamRoster(rng, 'nym');

    // MLB: 28 (from template) + minors: 141 = ~169
    expect(roster.length).toBeGreaterThan(140);
    expect(roster.length).toBeLessThan(200);
  });

  it('includes players at all roster levels', () => {
    const rng = new GameRNG(42);
    const roster = generateTeamRoster(rng, 'lax');

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

  it('overlays authored minor-league starter content into generated team rosters', () => {
    const roster = generateTeamRoster(new GameRNG(42), 'nym', {
      minorLeaguePlayers: AUTHORED_MINOR_FIXTURE,
    });
    const authoredNames = new Set(['Ari Abarca', 'Bento Harrow']);
    const authoredPlayers = roster.filter((player) => authoredNames.has(`${player.firstName} ${player.lastName}`));
    const ari = roster.find((player) => player.firstName === 'Ari' && player.lastName === 'Abarca');
    const bento = roster.find((player) => player.firstName === 'Bento' && player.lastName === 'Harrow');

    expect(authoredPlayers).toHaveLength(2);
    expect(ari).toMatchObject({
      teamId: 'nym',
      rosterStatus: 'AA',
      minorLeagueLevel: 'AA',
      age: 22,
      position: 'SS',
      developmentProgram: 'tools',
      developmentTrajectory: 'ahead_of_curve',
    });
    expect(toDisplayRating(ari?.overallRating ?? 0)).toBe(45);
    expect(toDisplayRating(ari?.floor ?? 0)).toBe(40);
    expect(toDisplayRating(ari?.ceiling ?? 0)).toBe(75);
    expect(toDisplayRating(ari?.hitterAttributes.defense ?? 0)).toBe(60);
    expect(bento?.pitcherAttributes).not.toBeNull();
    expect(toDisplayRating(bento?.pitcherAttributes?.stamina ?? 0)).toBe(55);
  });

  it('overlays authored full-roster content into MLB and minor slots with stable ids', () => {
    const roster = generateTeamRoster(new GameRNG(42), 'nym', {
      authoredPlayers: AUTHORED_FULL_ROSTER_FIXTURE,
    });
    const mara = roster.find((player) => player.id === 'auth-nym-mlb-001');
    const jonas = roster.find((player) => player.id === 'auth-nym-aa-001');

    expect(mara).toMatchObject({
      teamId: 'nym',
      rosterStatus: 'MLB',
      minorLeagueLevel: null,
      firstName: 'Mara',
      lastName: 'Vega',
      age: 27,
      position: 'CF',
      developmentProgram: 'mlb_prep',
      developmentTrajectory: 'on_track',
    });
    expect(toDisplayRating(mara?.overallRating ?? 0)).toBe(62);
    expect(toDisplayRating(mara?.hitterAttributes.defense ?? 0)).toBe(70);

    expect(jonas).toMatchObject({
      teamId: 'nym',
      rosterStatus: 'AA',
      minorLeagueLevel: 'AA',
      firstName: 'Jonas',
      lastName: 'Keel',
      age: 22,
      position: 'SP',
      developmentProgram: 'stamina',
      developmentTrajectory: 'ahead_of_curve',
    });
    expect(jonas?.pitcherAttributes).not.toBeNull();
    expect(toDisplayRating(jonas?.pitcherAttributes?.stamina ?? 0)).toBe(58);
  });
});

describe('KC BBQ Fountains overrides', () => {
  it('writes authored phenom grades on the internal scale', () => {
    const roster = generateTeamRoster(new GameRNG(42), 'kc');

    const fontaine = roster.find(p => p.firstName === 'Marcus' && p.lastName === 'Fontaine');
    expect(fontaine).toBeDefined();
    expect(fontaine?.pitcherAttributes?.stuff).toBe(toInternalRating(78));
    expect(fontaine?.pitcherAttributes?.control).toBe(toInternalRating(72));
    expect(toDisplayRating(fontaine?.pitcherAttributes?.stuff ?? 0)).toBe(78);
    expect(toDisplayRating(fontaine?.hitterAttributes.power ?? 0)).toBe(70);

    const fuentes = roster.find(p => p.firstName === 'Alejandro' && p.lastName === 'Fuentes');
    expect(fuentes).toBeDefined();
    expect(fuentes?.hitterAttributes.contact).toBe(toInternalRating(72));
    expect(toDisplayRating(fuentes?.hitterAttributes.defense ?? 0)).toBe(75);
  });

  it('boosts SP staff and infield defense above the same-seed baseline instead of crushing them', () => {
    // Same seed, non-KC team: identical roster before overrides.
    const kc = generateTeamRoster(new GameRNG(42), 'kc');
    const baseline = generateTeamRoster(new GameRNG(42), 'nym');

    const kcSPs = kc.filter(p => p.position === 'SP' && p.rosterStatus === 'MLB' && p.lastName !== 'Fontaine');
    const baseSPs = baseline.filter(p => p.position === 'SP' && p.rosterStatus === 'MLB');
    expect(kcSPs.length).toBeGreaterThan(0);
    expect(baseSPs.length).toBe(kcSPs.length + 1);

    kcSPs.forEach((kcSP, i) => {
      const base = baseSPs[i + 1]!; // baseline index 0 is the slot Fontaine replaced
      for (const attr of ['stuff', 'control', 'velocity', 'movement'] as const) {
        expect(kcSP.pitcherAttributes![attr]).toBeGreaterThan(base.pitcherAttributes![attr]);
        expect(kcSP.pitcherAttributes![attr]).toBeLessThanOrEqual(RATING_MAX);
      }
      expect(kcSP.overallRating).toBeGreaterThan(base.overallRating);
    });

    const infield = new Set(['SS', '2B', '3B', '1B', 'C']);
    const kcInfield = kc.filter(p => p.rosterStatus === 'MLB' && infield.has(p.position));
    const baseInfield = baseline.filter(p => p.rosterStatus === 'MLB' && infield.has(p.position));
    expect(kcInfield.length).toBe(baseInfield.length);
    baseInfield.forEach((base, i) => {
      const kcP = kcInfield[i]!;
      if (kcP.lastName === 'Fuentes') return; // authored SS handled above
      expect(kcP.hitterAttributes.defense).toBeGreaterThan(base.hitterAttributes.defense);
      expect(kcP.hitterAttributes.defense).toBeLessThanOrEqual(RATING_MAX);
    });
  });
});

describe('generateLeaguePlayers', () => {
  it('generates players for all teams', () => {
    const rng = new GameRNG(42);
    const teamIds = ['nym', 'bos', 'lax'];
    const players = generateLeaguePlayers(rng, teamIds);

    expect(players.length).toBeGreaterThan(400);

    const teams = new Set(players.map(p => p.teamId));
    expect(teams.size).toBe(3);
  });
});
