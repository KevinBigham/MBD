import { describe, expect, it } from 'vitest';
import { GameRNG, TEAMS, generateLeaguePlayers, toInternalRating } from '@mbd/sim-core';
import type { RosterLevel } from '@mbd/sim-core';
import {
  MINOR_LEAGUE_CONTENT_PACK,
  type MinorLeaguePlayerContent,
  getMinorLeagueAffiliateContent,
  getMinorLeaguePlayerContentByIdentity,
  getMinorLeaguePlayerContentForTeam,
  getMinorLeaguePlayerGenerationContent,
} from './minorLeagueContent';

const EXPECTED_LEVELS = ['A', 'AA', 'AAA', 'A_PLUS', 'INTERNATIONAL', 'ROOKIE'];
const EXPECTED_ROSTER_LEVEL_COUNTS: Record<RosterLevel, number> = {
  MLB: 28,
  AAA: 28,
  AA: 28,
  A_PLUS: 25,
  A: 25,
  ROOKIE: 20,
  INTERNATIONAL: 15,
};
const EXPECTED_MATERIALIZED_PLAYER_COUNT = TEAMS.length
  * Object.values(EXPECTED_ROSTER_LEVEL_COUNTS).reduce((sum, count) => sum + count, 0);
const LEGAL_POSITIONS = new Set(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CL']);
const LEVEL_AGE_RANGES: Record<RosterLevel, readonly [number, number]> = {
  MLB: [24, 38],
  AAA: [23, 32],
  AA: [21, 27],
  A_PLUS: [20, 25],
  A: [19, 23],
  ROOKIE: [18, 21],
  INTERNATIONAL: [17, 20],
};

function rosterLevelFor(player: MinorLeaguePlayerContent): RosterLevel {
  const maybeFullRoster = player as MinorLeaguePlayerContent & { readonly rosterLevel?: RosterLevel };
  return maybeFullRoster.rosterLevel ?? player.affiliateLevel;
}

function contentIdFor(player: MinorLeaguePlayerContent): string | null {
  return (player as MinorLeaguePlayerContent & { readonly contentId?: string }).contentId ?? null;
}

describe('minorLeagueContent worker pack', () => {
  it('ships the reviewed starter content as a versioned compact full-roster pack', () => {
    expect(MINOR_LEAGUE_CONTENT_PACK).toMatchObject({
      version: 1,
      affiliateCount: 192,
      seedPlayerCount: 640,
      playerCount: EXPECTED_MATERIALIZED_PLAYER_COUNT,
      sourceFiles: [
        'MBD_Minor_League_Affiliate_Names.csv',
        'MBD_Minor_League_Player_Content_Starter_Extended.csv',
        'MBD_Minor_League_Content_Pack_v1_Materializer',
      ],
    });
    expect(MINOR_LEAGUE_CONTENT_PACK.affiliates).toHaveLength(192);
    expect(MINOR_LEAGUE_CONTENT_PACK.players).toHaveLength(EXPECTED_MATERIALIZED_PLAYER_COUNT);
  });

  it('keeps affiliate and full authored-player coverage stable for every organization', () => {
    for (const team of TEAMS) {
      const affiliates = MINOR_LEAGUE_CONTENT_PACK.affiliates.filter((affiliate) => affiliate.teamId === team.id);
      const players = getMinorLeaguePlayerContentForTeam(team.id);

      expect(affiliates.map((affiliate) => affiliate.level).sort()).toEqual(EXPECTED_LEVELS);
      expect(players).toHaveLength(169);

      for (const [level, expectedCount] of Object.entries(EXPECTED_ROSTER_LEVEL_COUNTS) as Array<[RosterLevel, number]>) {
        expect(players.filter((player) => rosterLevelFor(player) === level)).toHaveLength(expectedCount);
      }
    }
  });

  it('indexes affiliate identities and prospect notes for worker views', () => {
    expect(getMinorLeagueAffiliateContent('nym', 'AAA')).toMatchObject({
      affiliateName: 'Newark Market Makers',
      shortName: 'Market Makers',
      identityNote: expect.stringContaining('Near-ready bats'),
    });
    expect(getMinorLeaguePlayerContentByIdentity('nym', 'Ari', 'Abarca')).toMatchObject({
      affiliateLevel: 'AA',
      position: 'SS',
      role: 'Top ranked prospect / potential impact regular',
      scoutingNote: expect.stringContaining('Up-the-middle athlete'),
    });
  });

  it('uses approved originality-review replacements while preserving affiliate keys', () => {
    expect(getMinorLeagueAffiliateContent('hou', 'AAA')).toMatchObject({
      affiliateName: 'Corpus Navigators',
      shortName: 'Navigators',
    });
    expect(getMinorLeagueAffiliateContent('hou', 'A_PLUS')).toMatchObject({
      affiliateName: 'The Woodlands Starbreakers',
      shortName: 'Starbreakers',
    });
    expect(getMinorLeagueAffiliateContent('cha', 'INTERNATIONAL')).toMatchObject({
      affiliateName: 'San Juan Loom Academy',
      shortName: 'Loom Academy',
    });
    expect(getMinorLeagueAffiliateContent('col', 'INTERNATIONAL')).toMatchObject({
      affiliateName: 'Puerto Plata Wayfinder Academy',
      shortName: 'Wayfinder Academy',
    });
    expect(getMinorLeagueAffiliateContent('orl', 'INTERNATIONAL')).toMatchObject({
      affiliateName: 'Santo Domingo Sunburst Academy',
      shortName: 'Sunburst Academy',
    });
    expect(getMinorLeagueAffiliateContent('phi', 'ROOKIE')).toMatchObject({
      affiliateName: 'Valley Forge Riveters',
      shortName: 'Riveters',
    });
    expect(getMinorLeagueAffiliateContent('ral', 'ROOKIE')).toMatchObject({
      affiliateName: 'Cary Sprouts',
      shortName: 'Sprouts',
    });
  });

  it('does not ship duplicate affiliate short names', () => {
    const shortNames = MINOR_LEAGUE_CONTENT_PACK.affiliates.map((affiliate) => affiliate.shortName);
    expect(new Set(shortNames).size).toBe(shortNames.length);
  });

  it('exposes generation rows without duplicate player identities', () => {
    const identities = new Set<string>();
    for (const player of MINOR_LEAGUE_CONTENT_PACK.players) {
      const key = `${player.teamId}:${player.firstName.toLowerCase()}:${player.lastName.toLowerCase()}`;
      expect(identities.has(key), key).toBe(false);
      identities.add(key);
    }

    expect(getMinorLeaguePlayerGenerationContent().get('nym')).toHaveLength(169);
  });

  it('materializes legal, deterministic authored roster rows with stable content ids', () => {
    const contentIds = new Set<string>();

    for (const player of MINOR_LEAGUE_CONTENT_PACK.players) {
      const rosterLevel = rosterLevelFor(player);
      const contentId = contentIdFor(player);
      const [minAge, maxAge] = LEVEL_AGE_RANGES[rosterLevel];

      expect(contentId).toMatch(/^auth-[a-z]+-(mlb|aaa|aa|a-plus|a|rookie|international)-\d{3}$/);
      expect(contentIds.has(contentId!)).toBe(false);
      contentIds.add(contentId!);
      expect(LEGAL_POSITIONS.has(player.position)).toBe(true);
      expect(player.age).toBeGreaterThanOrEqual(minAge);
      expect(player.age).toBeLessThanOrEqual(maxAge);
      expect(player.currentDisplayOVR).toBeGreaterThanOrEqual(20);
      expect(player.currentDisplayOVR).toBeLessThanOrEqual(80);
      expect(player.floorDisplay).toBeGreaterThanOrEqual(20);
      expect(player.floorDisplay).toBeLessThanOrEqual(player.currentDisplayOVR);
      expect(player.ceilingDisplay).toBeGreaterThanOrEqual(player.currentDisplayOVR);
      expect(player.ceilingDisplay).toBeLessThanOrEqual(80);
    }

    expect(contentIds.size).toBe(EXPECTED_MATERIALIZED_PLAYER_COUNT);
    expect(getMinorLeaguePlayerContentForTeam('nym').slice(0, 4).map(contentIdFor)).toEqual([
      'auth-nym-mlb-001',
      'auth-nym-mlb-002',
      'auth-nym-mlb-003',
      'auth-nym-mlb-004',
    ]);
  });
});

describe('KC BBQ Fountains shipped identity', () => {
  // KC is the deliberately overpowered flagship franchise. These assertions
  // pin the design decision that the phenom overrides survive the authored
  // content pack overlay and reach real games — the overlay silently erased
  // them once before.
  const shippedRoster = (teamId: string) =>
    generateLeaguePlayers(new GameRNG(20260702), [teamId], {
      authoredPlayersByTeam: getMinorLeaguePlayerGenerationContent(),
    }).filter((player) => player.rosterStatus === 'MLB');

  const authoredRowById = (teamId: string) => new Map(
    getMinorLeaguePlayerContentForTeam(teamId).map((row) => [row.contentId, row]),
  );

  it('ships Fontaine and Fuentes on the KC MLB roster at full authored strength', () => {
    const kcMlb = shippedRoster('kc');

    const fontaine = kcMlb.find((p) => p.firstName === 'Marcus' && p.lastName === 'Fontaine');
    expect(fontaine).toBeDefined();
    expect(fontaine?.position).toBe('SP');
    expect(fontaine?.age).toBe(23);
    expect(fontaine?.overallRating).toBe(toInternalRating(75));
    expect(fontaine?.pitcherAttributes?.stuff).toBe(toInternalRating(78));
    expect(fontaine?.hitterAttributes.power).toBe(toInternalRating(70));

    const fuentes = kcMlb.find((p) => p.firstName === 'Alejandro' && p.lastName === 'Fuentes');
    expect(fuentes).toBeDefined();
    expect(fuentes?.position).toBe('SS');
    expect(fuentes?.age).toBe(25);
    expect(fuentes?.overallRating).toBe(toInternalRating(70));
    expect(fuentes?.hitterAttributes.defense).toBe(toInternalRating(75));
  });

  it('boosts the rest of the KC staff and infield above their authored pack baselines', () => {
    const kcMlb = shippedRoster('kc');
    const rows = authoredRowById('kc');

    const supportingSPs = kcMlb.filter((p) => p.position === 'SP' && p.lastName !== 'Fontaine');
    expect(supportingSPs.length).toBeGreaterThan(0);
    for (const sp of supportingSPs) {
      const row = rows.get(sp.id);
      expect(row).toBeDefined();
      expect(sp.pitcherAttributes?.stuff).toBeGreaterThan(toInternalRating(row!.stuff!));
      expect(sp.overallRating).toBeGreaterThan(toInternalRating(row!.currentDisplayOVR));
    }

    const infield = new Set(['C', '1B', '2B', '3B', 'SS']);
    const supportingInfield = kcMlb.filter((p) => infield.has(p.position) && p.lastName !== 'Fuentes');
    expect(supportingInfield.length).toBeGreaterThan(0);
    for (const player of supportingInfield) {
      const row = rows.get(player.id);
      expect(row).toBeDefined();
      expect(player.hitterAttributes.defense).toBeGreaterThan(toInternalRating(row!.defense!));
    }
  });

  it('leaves every other franchise exactly on its authored pack values', () => {
    const nymMlb = shippedRoster('nym');
    const rows = authoredRowById('nym');

    expect(nymMlb.length).toBeGreaterThan(0);
    for (const player of nymMlb) {
      const row = rows.get(player.id);
      expect(row).toBeDefined();
      expect(`${player.firstName} ${player.lastName}`).toBe(`${row!.firstName} ${row!.lastName}`);
      expect(player.overallRating).toBe(toInternalRating(row!.currentDisplayOVR));
    }
  });
});
