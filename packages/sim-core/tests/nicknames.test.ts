import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { GeneratedPlayer } from '../src/index.js';
import {
  type NicknameCareerStats,
  type NicknameId,
  type NicknameSeasonHistoryEntry,
  NICKNAME_TRIGGERS,
  evaluateNicknames,
  getNicknameDisplayText,
} from '../src/moments/nicknames.js';

function createPlayer(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  return {
    id: 'player-1',
    firstName: 'Pat',
    lastName: 'Legend',
    age: 28,
    position: 'RF',
    hitterAttributes: {
      contact: 300,
      power: 300,
      eye: 300,
      speed: 300,
      defense: 300,
      durability: 300,
    },
    pitcherAttributes: null,
    personality: {
      workEthic: 70,
      mentalToughness: 70,
      leadership: 70,
      competitiveness: 70,
    },
    contract: {
      years: 3,
      annualSalary: 15,
      noTradeClause: false,
      playerOption: false,
      teamOption: false,
    },
    rosterStatus: 'MLB',
    developmentPhase: 'Prime',
    teamId: 'bos',
    nationality: 'american',
    overallRating: 75,
    rule5EligibleAfterSeason: 5,
    serviceTimeDays: 800,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: null,
    ...overrides,
  };
}

function createCareerStats(overrides: Partial<NicknameCareerStats> = {}): NicknameCareerStats {
  return {
    debutAge: 22,
    currentAge: 28,
    currentOverall: 75,
    peakOverall: 78,
    potentialRating: 82,
    leadership: 70,
    careerWar: 18,
    championships: 0,
    yearsWithCurrentTeam: 3,
    goldGloveAwards: 0,
    captainSeasons: 0,
    careerBatting: {
      hits: 900,
      hr: 180,
    },
    careerPitching: null,
    careerPlayoffBatting: {
      pa: 0,
      ab: 0,
      hits: 0,
      doubles: 0,
      triples: 0,
      hr: 0,
      bb: 0,
      hbp: 0,
      sacFlies: 0,
    },
    ...overrides,
  };
}

function createSeason(overrides: Partial<NicknameSeasonHistoryEntry> = {}): NicknameSeasonHistoryEntry {
  return {
    season: 1,
    age: 22,
    teamId: 'bos',
    gamesPlayed: 140,
    pa: 600,
    hits: 160,
    hr: 22,
    battingWalks: 55,
    battingStrikeouts: 110,
    stolenBases: 18,
    saves: 0,
    blownSaves: 0,
    wins: 0,
    era: 0,
    pitchingStrikeouts: 0,
    injuryCount: 0,
    overallStart: 68,
    overallEnd: 72,
    wasOnMlbRoster: true,
    ledLeagueInStolenBases: false,
    ...overrides,
  };
}

function evaluate(
  careerStats: Partial<NicknameCareerStats> = {},
  seasonHistory: NicknameSeasonHistoryEntry[] = [],
  playerOverrides: Partial<GeneratedPlayer> = {},
  selectionSeed?: string | number,
) {
  return evaluateNicknames(
    createPlayer(playerOverrides),
    createCareerStats(careerStats),
    seasonHistory,
    selectionSeed,
  );
}

function earnedIds(result: ReturnType<typeof evaluate>): NicknameId[] {
  return result.earnedNicknames.map((nickname) => nickname.id);
}

const HOT_STREAK_IDS = [
  'the_inferno',
  'on_a_heater',
  'torch_mode',
  'wildfire',
  'smoke_show',
  'red_hot',
  'barrelstorm',
  'the_oven',
] as const;

const COLD_STREAK_IDS = [
  'deep_freeze',
  'the_yips',
  'snow_day',
  'slump_merchant',
  'warning_track',
  'the_icebox',
  'whiff_machine',
  'cold_spell',
] as const;

const POWER_STYLE_IDS = [
  'big_boomer',
  'the_hammer',
  'thunderstick',
  'moonshot',
  'light_tower',
  'the_anvil',
  'launch_code',
  'big_fly_machine',
] as const;

const CONTACT_STYLE_IDS = [
  'slapdash',
  'the_surgeon',
  'silk_bat',
  'needle_threader',
  'line_driver',
  'bat_control',
  'the_metronome',
  'table_setter',
] as const;

const SPEED_STYLE_IDS = [
  'cheetah',
  'the_blur',
  'jetstream',
  'green_light',
  'first_to_third',
  'dust_trail',
  'burner',
  'quicksilver',
] as const;

function hasNicknameInSet(
  result: ReturnType<typeof evaluate>,
  ids: readonly string[],
): boolean {
  return result.earnedNicknames.some((nickname) => ids.includes(nickname.id));
}

describe('NICKNAME_TRIGGERS', () => {
  it('defines all legacy and wave-3 triggers in display-priority order', () => {
    expect(NICKNAME_TRIGGERS).toHaveLength(60);
    expect(NICKNAME_TRIGGERS[0]?.displayText).toBe('Mr. 3000');
    expect(NICKNAME_TRIGGERS.find((trigger) => trigger.id === 'the_inferno')?.displayText).toBe('The Inferno');
    expect(NICKNAME_TRIGGERS.find((trigger) => trigger.id === 'the_hammer')?.displayText).toBe('The Hammer');
  });

  it('maps every trigger id to non-empty display text', () => {
    for (const trigger of NICKNAME_TRIGGERS) {
      expect(getNicknameDisplayText(trigger.id)).toBe(trigger.displayText);
      expect(trigger.priority).toBeGreaterThan(0);
    }
  });
});

describe('getNicknameDisplayText', () => {
  it('returns the expected display labels', () => {
    expect(getNicknameDisplayText('mr_3000')).toBe('Mr. 3000');
    expect(getNicknameDisplayText('mr_october')).toBe('Mr. October');
    expect(getNicknameDisplayText('doctor_k')).toBe('Doctor K');
    expect(getNicknameDisplayText('snakebit')).toBe('Snakebit');
    expect(getNicknameDisplayText('the_inferno' as NicknameId)).toBe('The Inferno');
    expect(getNicknameDisplayText('cheetah' as NicknameId)).toBe('Cheetah');
  });
});

describe('evaluateNicknames', () => {
  it('returns no nicknames when nothing qualifies', () => {
    const result = evaluate();

    expect(result.earnedNicknames).toEqual([]);
    expect(result.primaryNickname).toBeNull();
    expect(result.badgeNicknames).toEqual([]);
  });

  it('earns The Flash when the player leads the league in stolen bases three of four years', () => {
    const result = evaluate({}, [
      createSeason({ season: 1, ledLeagueInStolenBases: true }),
      createSeason({ season: 2, ledLeagueInStolenBases: true }),
      createSeason({ season: 3, ledLeagueInStolenBases: false }),
      createSeason({ season: 4, ledLeagueInStolenBases: true }),
    ]);

    expect(earnedIds(result)).toContain('the_flash');
  });

  it('does not earn The Flash at two of four years', () => {
    const result = evaluate({}, [
      createSeason({ season: 1, ledLeagueInStolenBases: true }),
      createSeason({ season: 2, ledLeagueInStolenBases: false }),
      createSeason({ season: 3, ledLeagueInStolenBases: false }),
      createSeason({ season: 4, ledLeagueInStolenBases: true }),
    ]);

    expect(earnedIds(result)).not.toContain('the_flash');
  });

  it('earns Cardiac Kid with five blown saves in a season', () => {
    const result = evaluate({}, [
      createSeason({ blownSaves: 5 }),
    ], { position: 'CL', pitcherAttributes: { stuff: 320, control: 280, stamina: 180, velocity: 320, movement: 300 } });

    expect(earnedIds(result)).toContain('cardiac_kid');
  });

  it('does not earn Cardiac Kid at four blown saves', () => {
    const result = evaluate({}, [
      createSeason({ blownSaves: 4 }),
    ]);

    expect(earnedIds(result)).not.toContain('cardiac_kid');
  });

  it('earns Mr. October with playoff OPS above 1.000 and at least 50 PA', () => {
    const result = evaluate({
      careerPlayoffBatting: {
        pa: 60,
        ab: 50,
        hits: 20,
        doubles: 5,
        triples: 0,
        hr: 5,
        bb: 10,
        hbp: 0,
        sacFlies: 0,
      },
    });

    expect(earnedIds(result)).toContain('mr_october');
  });

  it('does not earn Mr. October below the playoff PA minimum', () => {
    const result = evaluate({
      careerPlayoffBatting: {
        pa: 49,
        ab: 40,
        hits: 18,
        doubles: 3,
        triples: 0,
        hr: 4,
        bb: 9,
        hbp: 0,
        sacFlies: 0,
      },
    });

    expect(earnedIds(result)).not.toContain('mr_october');
  });

  it('earns The Professor with a BB-K ratio above 2.0 for three straight years', () => {
    const result = evaluate({}, [
      createSeason({ season: 1, battingWalks: 90, battingStrikeouts: 30 }),
      createSeason({ season: 2, battingWalks: 80, battingStrikeouts: 30 }),
      createSeason({ season: 3, battingWalks: 70, battingStrikeouts: 30 }),
    ]);

    expect(earnedIds(result)).toContain('the_professor');
  });

  it('does not earn The Professor when the streak is interrupted', () => {
    const result = evaluate({}, [
      createSeason({ season: 1, battingWalks: 90, battingStrikeouts: 30 }),
      createSeason({ season: 2, battingWalks: 50, battingStrikeouts: 30 }),
      createSeason({ season: 3, battingWalks: 70, battingStrikeouts: 30 }),
    ]);

    expect(earnedIds(result)).not.toContain('the_professor');
  });

  it('earns Iron Man with 155 games played in five straight seasons', () => {
    const result = evaluate({}, [
      createSeason({ season: 1, gamesPlayed: 155 }),
      createSeason({ season: 2, gamesPlayed: 156 }),
      createSeason({ season: 3, gamesPlayed: 157 }),
      createSeason({ season: 4, gamesPlayed: 160 }),
      createSeason({ season: 5, gamesPlayed: 162 }),
    ]);

    expect(earnedIds(result)).toContain('iron_man');
  });

  it('does not earn Iron Man when only four seasons clear the threshold', () => {
    const result = evaluate({}, [
      createSeason({ season: 1, gamesPlayed: 155 }),
      createSeason({ season: 2, gamesPlayed: 156 }),
      createSeason({ season: 3, gamesPlayed: 157 }),
      createSeason({ season: 4, gamesPlayed: 160 }),
      createSeason({ season: 5, gamesPlayed: 154 }),
    ]);

    expect(earnedIds(result)).not.toContain('iron_man');
  });

  it('earns Doctor K with 250 strikeouts in a season', () => {
    const result = evaluate({ careerPitching: { wins: 120, strikeouts: 2100, saves: 0 } }, [
      createSeason({ pitchingStrikeouts: 250 }),
    ], {
      position: 'SP',
      pitcherAttributes: { stuff: 330, control: 300, stamina: 340, velocity: 320, movement: 290 },
      hitterAttributes: { contact: 50, power: 50, eye: 50, speed: 50, defense: 50, durability: 320 },
    });

    expect(earnedIds(result)).toContain('doctor_k');
  });

  it('does not earn Doctor K at 249 strikeouts', () => {
    const result = evaluate({ careerPitching: { wins: 120, strikeouts: 2100, saves: 0 } }, [
      createSeason({ pitchingStrikeouts: 249 }),
    ]);

    expect(earnedIds(result)).not.toContain('doctor_k');
  });

  it('earns The Kid for a teenage debut while still under 24', () => {
    const result = evaluate({
      debutAge: 19,
      currentAge: 23,
    });

    expect(earnedIds(result)).toContain('the_kid');
  });

  it('does not earn The Kid once the player turns 24', () => {
    const result = evaluate({
      debutAge: 19,
      currentAge: 24,
    });

    expect(earnedIds(result)).not.toContain('the_kid');
  });

  it('earns Old Reliable for a strong age-35 season after ten years with one club', () => {
    const result = evaluate({
      currentAge: 35,
      currentOverall: 71,
      yearsWithCurrentTeam: 10,
    }, [
      createSeason({ season: 1, teamId: 'bos' }),
      createSeason({ season: 2, teamId: 'bos' }),
      createSeason({ season: 3, teamId: 'bos' }),
    ]);

    expect(earnedIds(result)).toContain('old_reliable');
  });

  it('does not earn Old Reliable before age 35', () => {
    const result = evaluate({
      currentAge: 34,
      currentOverall: 75,
      yearsWithCurrentTeam: 12,
    }, [
      createSeason({ season: 1, teamId: 'bos' }),
      createSeason({ season: 2, teamId: 'bos' }),
    ]);

    expect(earnedIds(result)).not.toContain('old_reliable');
  });

  it('earns The Natural after reaching 75 overall by age 23 with 80 potential', () => {
    const result = evaluate({
      potentialRating: 80,
    }, [
      createSeason({ season: 1, age: 22, overallEnd: 75 }),
    ]);

    expect(earnedIds(result)).toContain('the_natural');
  });

  it('does not earn The Natural when the breakout comes after age 23', () => {
    const result = evaluate({
      potentialRating: 80,
    }, [
      createSeason({ season: 1, age: 24, overallEnd: 75 }),
    ]);

    expect(earnedIds(result)).not.toContain('the_natural');
  });

  it('earns Crash after three injuries in one season', () => {
    const result = evaluate({}, [
      createSeason({ injuryCount: 3 }),
    ]);

    expect(earnedIds(result)).toContain('crash');
  });

  it('does not earn Crash at two injuries', () => {
    const result = evaluate({}, [
      createSeason({ injuryCount: 2 }),
    ]);

    expect(earnedIds(result)).not.toContain('crash');
  });

  it('earns The Vulture with 15 wins and an ERA above 4.50', () => {
    const result = evaluate({ careerPitching: { wins: 150, strikeouts: 1800, saves: 0 } }, [
      createSeason({ wins: 15, era: 4.51 }),
    ], { position: 'SP' });

    expect(earnedIds(result)).toContain('the_vulture');
  });

  it('does not earn The Vulture at a 4.50 ERA', () => {
    const result = evaluate({ careerPitching: { wins: 150, strikeouts: 1800, saves: 0 } }, [
      createSeason({ wins: 15, era: 4.5 }),
    ], { position: 'SP' });

    expect(earnedIds(result)).not.toContain('the_vulture');
  });

  it('earns Captain with three captain seasons and leadership above 80', () => {
    const result = evaluate({
      captainSeasons: 3,
      leadership: 81,
    });

    expect(earnedIds(result)).toContain('captain');
  });

  it('does not earn Captain at leadership 80', () => {
    const result = evaluate({
      captainSeasons: 3,
      leadership: 80,
    });

    expect(earnedIds(result)).not.toContain('captain');
  });

  it('earns The Ghost for an MLB-roster season with fewer than 100 plate appearances', () => {
    const result = evaluate({}, [
      createSeason({ wasOnMlbRoster: true, pa: 99 }),
    ]);

    expect(earnedIds(result)).toContain('the_ghost');
  });

  it('does not earn The Ghost when the player is not on the MLB roster', () => {
    const result = evaluate({}, [
      createSeason({ wasOnMlbRoster: false, pa: 40 }),
    ]);

    expect(earnedIds(result)).not.toContain('the_ghost');
  });

  it('earns Mr. 3000 at exactly 3000 career hits', () => {
    const result = evaluate({
      careerBatting: { hits: 3000, hr: 250 },
    });

    expect(earnedIds(result)).toContain('mr_3000');
  });

  it('does not earn Mr. 3000 at 2999 hits', () => {
    const result = evaluate({
      careerBatting: { hits: 2999, hr: 250 },
    });

    expect(earnedIds(result)).not.toContain('mr_3000');
  });

  it('earns The Closer with forty saves in three straight seasons', () => {
    const result = evaluate({ careerPitching: { wins: 20, strikeouts: 600, saves: 140 } }, [
      createSeason({ season: 1, saves: 40 }),
      createSeason({ season: 2, saves: 42 }),
      createSeason({ season: 3, saves: 45 }),
    ], { position: 'CL' });

    expect(earnedIds(result)).toContain('the_closer');
  });

  it('does not earn The Closer when the save streak is broken', () => {
    const result = evaluate({ careerPitching: { wins: 20, strikeouts: 600, saves: 140 } }, [
      createSeason({ season: 1, saves: 40 }),
      createSeason({ season: 2, saves: 39 }),
      createSeason({ season: 3, saves: 45 }),
    ], { position: 'CL' });

    expect(earnedIds(result)).not.toContain('the_closer');
  });

  it('earns Boom or Bust with more than 35 homers and more than 180 strikeouts', () => {
    const result = evaluate({}, [
      createSeason({ hr: 36, battingStrikeouts: 181 }),
    ]);

    expect(earnedIds(result)).toContain('boom_or_bust');
  });

  it('does not earn Boom or Bust at exactly 35 homers', () => {
    const result = evaluate({}, [
      createSeason({ hr: 35, battingStrikeouts: 181 }),
    ]);

    expect(earnedIds(result)).not.toContain('boom_or_bust');
  });

  it('earns The Wall with five Gold Gloves', () => {
    const result = evaluate({
      goldGloveAwards: 5,
    });

    expect(earnedIds(result)).toContain('the_wall');
  });

  it('does not earn The Wall with four Gold Gloves', () => {
    const result = evaluate({
      goldGloveAwards: 4,
    });

    expect(earnedIds(result)).not.toContain('the_wall');
  });

  it('earns Phoenix after a drop greater than fifteen followed by a recovery greater than ten', () => {
    const result = evaluate({}, [
      createSeason({ season: 1, overallStart: 80, overallEnd: 60 }),
      createSeason({ season: 2, overallStart: 60, overallEnd: 72 }),
    ]);

    expect(earnedIds(result)).toContain('phoenix');
  });

  it('does not earn Phoenix when the recovery is only ten overall points', () => {
    const result = evaluate({}, [
      createSeason({ season: 1, overallStart: 80, overallEnd: 60 }),
      createSeason({ season: 2, overallStart: 60, overallEnd: 70 }),
    ]);

    expect(earnedIds(result)).not.toContain('phoenix');
  });

  it('earns The Franchise with ten years, one team, and fifty WAR', () => {
    const result = evaluate({
      yearsWithCurrentTeam: 10,
      careerWar: 50,
    }, [
      createSeason({ season: 1, teamId: 'bos' }),
      createSeason({ season: 2, teamId: 'bos' }),
      createSeason({ season: 3, teamId: 'bos' }),
    ]);

    expect(earnedIds(result)).toContain('the_franchise');
  });

  it('does not earn The Franchise when the player has multiple teams in the history', () => {
    const result = evaluate({
      yearsWithCurrentTeam: 10,
      careerWar: 60,
    }, [
      createSeason({ season: 1, teamId: 'bos' }),
      createSeason({ season: 2, teamId: 'nym' }),
    ]);

    expect(earnedIds(result)).not.toContain('the_franchise');
  });

  it('earns Snakebit with more than 40 WAR and zero championships', () => {
    const result = evaluate({
      careerWar: 41,
      championships: 0,
    });

    expect(earnedIds(result)).toContain('snakebit');
  });

  it('does not earn Snakebit after winning a championship', () => {
    const result = evaluate({
      careerWar: 41,
      championships: 1,
    });

    expect(earnedIds(result)).not.toContain('snakebit');
  });

  it('assigns a fire-category nickname to hot hitters and varies deterministically by seed', () => {
    const seasonHistory = [
      createSeason({
        season: 5,
        pa: 660,
        hits: 172,
        hr: 41,
        battingWalks: 78,
        battingStrikeouts: 112,
        overallStart: 76,
        overallEnd: 82,
      }),
    ];
    const seeds = Array.from({ length: 20 }, (_, index) => `hot-seed-${index + 1}`);
    const hotIds = new Set(
      seeds.map((seed) => {
        const result = evaluate(
          { careerBatting: { hits: 1400, hr: 260 } },
          seasonHistory,
          {
            hitterAttributes: {
              contact: 290,
              power: 360,
              eye: 300,
              speed: 210,
              defense: 280,
              durability: 310,
            },
          },
          seed,
        );

        expect(hasNicknameInSet(result, HOT_STREAK_IDS)).toBe(true);
        return result.earnedNicknames.find((nickname) => HOT_STREAK_IDS.includes(nickname.id))?.id;
      }),
    );

    expect(hotIds.size).toBeGreaterThanOrEqual(4);
  });

  it('assigns a humor-category nickname to cold hitters and varies deterministically by seed', () => {
    const seasonHistory = [
      createSeason({
        season: 5,
        pa: 545,
        hits: 104,
        hr: 12,
        battingWalks: 29,
        battingStrikeouts: 184,
        injuryCount: 2,
        overallStart: 79,
        overallEnd: 71,
      }),
    ];
    const seeds = Array.from({ length: 20 }, (_, index) => `cold-seed-${index + 1}`);
    const coldIds = new Set(
      seeds.map((seed) => {
        const result = evaluate(
          { careerBatting: { hits: 980, hr: 150 } },
          seasonHistory,
          {
            hitterAttributes: {
              contact: 250,
              power: 250,
              eye: 240,
              speed: 220,
              defense: 260,
              durability: 240,
            },
          },
          seed,
        );

        expect(hasNicknameInSet(result, COLD_STREAK_IDS)).toBe(true);
        return result.earnedNicknames.find((nickname) => COLD_STREAK_IDS.includes(nickname.id))?.id;
      }),
    );

    expect(coldIds.size).toBeGreaterThanOrEqual(4);
  });

  it('assigns a power-style nickname to sluggers', () => {
    const result = evaluate(
      { careerBatting: { hits: 1250, hr: 275 } },
      [
        createSeason({
          season: 6,
          pa: 650,
          hr: 39,
          hits: 155,
          battingStrikeouts: 145,
        }),
      ],
      {
        hitterAttributes: {
          contact: 260,
          power: 360,
          eye: 300,
          speed: 190,
          defense: 260,
          durability: 300,
        },
      },
      'slugger-seed',
    );

    expect(hasNicknameInSet(result, POWER_STYLE_IDS)).toBe(true);
  });

  it('assigns a contact-style nickname to bat-control hitters', () => {
    const result = evaluate(
      { careerBatting: { hits: 1325, hr: 95 } },
      [
        createSeason({
          season: 6,
          pa: 635,
          hits: 188,
          hr: 14,
          battingWalks: 68,
          battingStrikeouts: 54,
        }),
      ],
      {
        hitterAttributes: {
          contact: 360,
          power: 220,
          eye: 315,
          speed: 240,
          defense: 270,
          durability: 300,
        },
      },
      'contact-seed',
    );

    expect(hasNicknameInSet(result, CONTACT_STYLE_IDS)).toBe(true);
    expect(hasNicknameInSet(result, POWER_STYLE_IDS)).toBe(false);
  });

  it('assigns a speed-style nickname to burners', () => {
    const result = evaluate(
      { careerBatting: { hits: 1180, hr: 55 } },
      [
        createSeason({
          season: 6,
          pa: 620,
          hits: 164,
          hr: 8,
          stolenBases: 61,
          ledLeagueInStolenBases: true,
        }),
      ],
      {
        hitterAttributes: {
          contact: 295,
          power: 180,
          eye: 265,
          speed: 365,
          defense: 290,
          durability: 305,
        },
      },
      'speed-seed',
    );

    expect(hasNicknameInSet(result, SPEED_STYLE_IDS)).toBe(true);
    expect(hasNicknameInSet(result, CONTACT_STYLE_IDS)).toBe(false);
  });

  it('sorts multiple earned nicknames by priority and limits badge nicknames to three', () => {
    const result = evaluate({
      currentAge: 35,
      currentOverall: 75,
      yearsWithCurrentTeam: 12,
      careerWar: 60,
      championships: 0,
      goldGloveAwards: 5,
      careerBatting: { hits: 3000, hr: 420 },
      careerPlayoffBatting: {
        pa: 55,
        ab: 45,
        hits: 18,
        doubles: 4,
        triples: 0,
        hr: 5,
        bb: 10,
        hbp: 0,
        sacFlies: 0,
      },
    }, [
      createSeason({ season: 1, teamId: 'bos', gamesPlayed: 155 }),
      createSeason({ season: 2, teamId: 'bos', gamesPlayed: 156 }),
      createSeason({ season: 3, teamId: 'bos', gamesPlayed: 157 }),
      createSeason({ season: 4, teamId: 'bos', gamesPlayed: 158 }),
      createSeason({ season: 5, teamId: 'bos', gamesPlayed: 159 }),
    ]);

    expect(result.primaryNickname?.id).toBe('mr_3000');
    expect(result.badgeNicknames).toHaveLength(3);
    expect(result.badgeNicknames.map((nickname) => nickname.id)).toEqual([
      'the_franchise',
      'mr_october',
      'the_wall',
    ]);
  });

  it('is deterministic for identical inputs', () => {
    const careerStats = createCareerStats({
      careerBatting: { hits: 3000, hr: 400 },
      careerWar: 60,
      yearsWithCurrentTeam: 12,
    });
    const seasons = [
      createSeason({ season: 1, teamId: 'bos' }),
      createSeason({ season: 2, teamId: 'bos' }),
      createSeason({ season: 3, teamId: 'bos' }),
    ];

    const first = evaluateNicknames(createPlayer(), careerStats, seasons);
    const second = evaluateNicknames(createPlayer(), careerStats, seasons);

    expect(first).toEqual(second);
  });

  it('matches The Flash window logic for arbitrary four-season windows', () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.boolean(), fc.boolean(), fc.boolean(), fc.boolean()),
        (window) => {
          const result = evaluate({}, window.map((value, index) => (
            createSeason({ season: index + 1, ledLeagueInStolenBases: value })
          )));
          expect(earnedIds(result).includes('the_flash')).toBe(window.filter(Boolean).length >= 3);
        },
      ),
      { numRuns: 25 },
    );
  });

  it('matches The Professor straight-year rule for arbitrary ratio windows', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: 0, max: 200 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 200 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 200 }),
          fc.integer({ min: 0, max: 100 }),
        ),
        ([bb1, k1, bb2, k2, bb3, k3]) => {
          const seasons = [
            createSeason({ season: 1, battingWalks: bb1, battingStrikeouts: k1 }),
            createSeason({ season: 2, battingWalks: bb2, battingStrikeouts: k2 }),
            createSeason({ season: 3, battingWalks: bb3, battingStrikeouts: k3 }),
          ];
          const qualifies = [bb1 / Math.max(1, k1), bb2 / Math.max(1, k2), bb3 / Math.max(1, k3)].every((ratio) => ratio > 2);
          const result = evaluate({}, seasons);
          expect(earnedIds(result).includes('the_professor')).toBe(qualifies);
        },
      ),
      { numRuns: 25 },
    );
  });
});

describe('nickname barrel exports', () => {
  it('re-exports the nickname APIs from sim-core root', async () => {
    const root = await import('../src/index.js');

    expect(root.evaluateNicknames).toBeTypeOf('function');
    expect(root.getNicknameDisplayText).toBeTypeOf('function');
    expect(root.NICKNAME_TRIGGERS).toHaveLength(60);
  });
});
