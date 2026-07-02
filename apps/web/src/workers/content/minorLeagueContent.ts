import type {
  AuthoredRosterPlayerContent,
  DevelopmentProgram,
  DevelopmentTrajectory,
  MinorLeagueRosterLevel,
  Position,
  RosterLevel,
} from '@mbd/sim-core';
import rawPackData from './minorLeagueContentPack.v1.json';

type PriorityTypeCode = 'T' | 'D';

type RawAffiliateTuple = readonly [
  teamId: string,
  level: MinorLeagueRosterLevel,
  affiliateName: string,
  shortName: string,
  identityNote: string,
];

type RawPlayerTuple = readonly [
  prospectRank: number | null,
  priorityTypeCode: PriorityTypeCode,
  teamId: string,
  affiliateLevel: MinorLeagueRosterLevel,
  firstName: string,
  lastName: string,
  age: number,
  position: Position,
  currentDisplayOVR: number,
  floorDisplay: number,
  ceilingDisplay: number,
  contact: number | null,
  power: number | null,
  eye: number | null,
  speed: number | null,
  defense: number | null,
  durability: number | null,
  stuff: number | null,
  control: number | null,
  stamina: number | null,
  velocity: number | null,
  movement: number | null,
  workEthic: number,
  mentalToughness: number,
  leadership: number,
  competitiveness: number,
  developmentProgram: DevelopmentProgram,
  developmentTrajectory: DevelopmentTrajectory,
  role: string,
  scoutingNote: string,
];

interface MinorLeagueContentPackJson {
  readonly version: number;
  readonly sourceFiles: readonly string[];
  readonly affiliateCount: number;
  readonly playerCount: number;
  readonly affiliates: readonly RawAffiliateTuple[];
  readonly players: readonly RawPlayerTuple[];
}

export interface MinorLeagueAffiliateContent {
  readonly teamId: string;
  readonly level: MinorLeagueRosterLevel;
  readonly affiliateName: string;
  readonly shortName: string;
  readonly identityNote: string;
}

export interface MinorLeagueAffiliateIdentityView {
  readonly label: string;
  readonly shortName: string;
  readonly identityNote: string | null;
}

export interface MinorLeaguePlayerContent extends AuthoredRosterPlayerContent {
  readonly contentId: string;
  readonly rosterLevel: RosterLevel;
  readonly affiliateLevel: RosterLevel;
  readonly prospectRank: number | null;
  readonly priorityType: 'Top Prospect' | 'Depth / Role Player';
  readonly role: string;
  readonly scoutingNote: string;
}

const rawPack = rawPackData as unknown as MinorLeagueContentPackJson;

const ROSTER_LEVEL_ORDER = ['MLB', 'AAA', 'AA', 'A_PLUS', 'A', 'ROOKIE', 'INTERNATIONAL'] as const;
const ROSTER_LEVEL_COUNTS: Record<RosterLevel, number> = {
  MLB: 28,
  AAA: 28,
  AA: 28,
  A_PLUS: 25,
  A: 25,
  ROOKIE: 20,
  INTERNATIONAL: 15,
};
const LEVEL_SLUGS: Record<RosterLevel, string> = {
  MLB: 'mlb',
  AAA: 'aaa',
  AA: 'aa',
  A_PLUS: 'a-plus',
  A: 'a',
  ROOKIE: 'rookie',
  INTERNATIONAL: 'international',
};
const LEVEL_AGE_RANGES: Record<RosterLevel, readonly [number, number]> = {
  MLB: [24, 38],
  AAA: [23, 32],
  AA: [21, 27],
  A_PLUS: [20, 25],
  A: [19, 23],
  ROOKIE: [18, 21],
  INTERNATIONAL: [17, 20],
};
const LEVEL_CURRENT_BANDS: Record<RosterLevel, readonly [number, number]> = {
  MLB: [39, 60],
  AAA: [40, 55],
  AA: [35, 50],
  A_PLUS: [30, 45],
  A: [25, 40],
  ROOKIE: [20, 35],
  INTERNATIONAL: [20, 35],
};
const LEVEL_CEILING_MAX: Record<RosterLevel, number> = {
  MLB: 78,
  AAA: 65,
  AA: 70,
  A_PLUS: 75,
  A: 70,
  ROOKIE: 75,
  INTERNATIONAL: 80,
};
const HITTER_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as const;
const PITCHER_POSITIONS = ['SP', 'RP', 'CL'] as const;
const ROSTER_POSITION_SEQUENCE = [...HITTER_POSITIONS, ...PITCHER_POSITIONS] as const;
const MLB_POSITION_SEQUENCE: readonly Position[] = [
  'C', 'C',
  '1B', '1B',
  '2B', '2B',
  '3B', '3B',
  'SS', 'SS',
  'LF', 'LF',
  'CF', 'CF',
  'RF', 'RF',
  'DH',
  'SP', 'SP', 'SP', 'SP', 'SP',
  'RP', 'RP', 'RP', 'RP', 'RP',
  'CL',
];
const POWER_POSITIONS = new Set<Position>(['1B', '3B', 'LF', 'RF', 'DH']);
const DEFENSE_POSITIONS = new Set<Position>(['C', '2B', 'SS', 'CF']);
const GENERATED_SOURCE_FILE = 'MBD_Minor_League_Content_Pack_v1_Materializer';

function priorityTypeFromCode(code: PriorityTypeCode): MinorLeaguePlayerContent['priorityType'] {
  return code === 'T' ? 'Top Prospect' : 'Depth / Role Player';
}

function contentIdForSlot(teamId: string, level: RosterLevel, slotIndex: number): string {
  return `auth-${teamId}-${LEVEL_SLUGS[level]}-${String(slotIndex + 1).padStart(3, '0')}`;
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function boundedValue(seed: string, min: number, max: number): number {
  return min + (stableHash(seed) % (max - min + 1));
}

function clampDisplay(value: number): number {
  return Math.max(20, Math.min(80, value));
}

function positionsForRosterLevel(level: RosterLevel): readonly Position[] {
  if (level === 'MLB') {
    return MLB_POSITION_SEQUENCE;
  }

  return Array.from({ length: ROSTER_LEVEL_COUNTS[level] }, (_, index) =>
    ROSTER_POSITION_SEQUENCE[index % ROSTER_POSITION_SEQUENCE.length]!,
  );
}

const AFFILIATE_CONTENT_ROWS = rawPack.affiliates.map(([
    teamId,
    level,
    affiliateName,
    shortName,
    identityNote,
  ]): MinorLeagueAffiliateContent => ({
    teamId,
    level,
    affiliateName,
    shortName,
    identityNote,
  }));

const AFFILIATE_CONTENT_BY_KEY = new Map(
  AFFILIATE_CONTENT_ROWS.map((affiliate) => [`${affiliate.teamId}:${affiliate.level}`, affiliate]),
);

function mapRawPlayerTuple([
    prospectRank,
    priorityTypeCode,
    teamId,
    affiliateLevel,
    firstName,
    lastName,
    age,
    position,
    currentDisplayOVR,
    floorDisplay,
    ceilingDisplay,
    contact,
    power,
    eye,
    speed,
    defense,
    durability,
    stuff,
    control,
    stamina,
    velocity,
    movement,
    workEthic,
    mentalToughness,
    leadership,
    competitiveness,
    developmentProgram,
    developmentTrajectory,
    role,
    scoutingNote,
  ]: RawPlayerTuple): Omit<MinorLeaguePlayerContent, 'contentId' | 'rosterLevel'> {
  return {
    prospectRank,
    priorityType: priorityTypeFromCode(priorityTypeCode),
    teamId,
    affiliateLevel,
    firstName,
    lastName,
    age,
    position,
    currentDisplayOVR,
    floorDisplay,
    ceilingDisplay,
    contact,
    power,
    eye,
    speed,
    defense,
    durability,
    stuff,
    control,
    stamina,
    velocity,
    movement,
    workEthic,
    mentalToughness,
    leadership,
    competitiveness,
    developmentProgram,
    developmentTrajectory,
    role,
    scoutingNote,
  };
}

const SEED_PLAYERS = rawPack.players.map(mapRawPlayerTuple);

const FIRST_NAME_POOL = Array.from(new Set(SEED_PLAYERS.map((player) => player.firstName)));
const LAST_NAME_POOL = Array.from(new Set(SEED_PLAYERS.map((player) => player.lastName)));

function playerNameKey(firstName: string, lastName: string): string {
  return `${firstName.toLowerCase()}:${lastName.toLowerCase()}`;
}

function pickGeneratedName(
  teamId: string,
  level: RosterLevel,
  slotIndex: number,
  usedNames: ReadonlySet<string>,
): { firstName: string; lastName: string } {
  const base = stableHash(`${teamId}:${level}:${slotIndex}`);
  const firstStart = base % FIRST_NAME_POOL.length;
  const lastStart = Math.floor(base / FIRST_NAME_POOL.length) % LAST_NAME_POOL.length;

  for (let offset = 0; offset < FIRST_NAME_POOL.length * LAST_NAME_POOL.length; offset += 1) {
    const firstName = FIRST_NAME_POOL[(firstStart + offset) % FIRST_NAME_POOL.length]!;
    const lastName = LAST_NAME_POOL[(lastStart + (offset * 7)) % LAST_NAME_POOL.length]!;
    if (!usedNames.has(playerNameKey(firstName, lastName))) {
      return { firstName, lastName };
    }
  }

  return {
    firstName: `Prospect${slotIndex + 1}`,
    lastName: teamId.toUpperCase(),
  };
}

function makeHitterAttributes(
  level: RosterLevel,
  position: Position,
  currentDisplayOVR: number,
  seed: string,
): Pick<MinorLeaguePlayerContent, 'contact' | 'power' | 'eye' | 'speed' | 'defense' | 'durability'> {
  const athleticBias = DEFENSE_POSITIONS.has(position) ? 5 : 0;
  const powerBias = POWER_POSITIONS.has(position) ? 5 : 0;
  const mlbPolish = level === 'MLB' ? 6 : 0;
  const mlbPowerPolish = level === 'MLB' ? 1 : 0;

  return {
    contact: clampDisplay(currentDisplayOVR + boundedValue(`${seed}:contact`, -4, 5) + mlbPolish),
    power: clampDisplay(currentDisplayOVR + boundedValue(`${seed}:power`, -5, 5) + powerBias + mlbPowerPolish),
    eye: clampDisplay(currentDisplayOVR + boundedValue(`${seed}:eye`, -4, 5) + mlbPolish),
    speed: clampDisplay(currentDisplayOVR + boundedValue(`${seed}:speed`, -6, 6) + athleticBias),
    defense: clampDisplay(currentDisplayOVR + boundedValue(`${seed}:defense`, -5, 6) + athleticBias),
    durability: clampDisplay(currentDisplayOVR + boundedValue(`${seed}:durability`, -3, 6)),
  };
}

function makePitcherAttributes(
  level: RosterLevel,
  position: Position,
  currentDisplayOVR: number,
  seed: string,
): Pick<MinorLeaguePlayerContent, 'stuff' | 'control' | 'stamina' | 'velocity' | 'movement'> {
  const starterBias = position === 'SP' ? 6 : 0;
  const reliefBias = position === 'RP' || position === 'CL' ? 5 : 0;
  const closerBias = position === 'CL' ? 4 : 0;
  const mlbPitchingPolish = level === 'MLB' ? 5 : 0;

  return {
    stuff: clampDisplay(currentDisplayOVR + boundedValue(`${seed}:stuff`, -4, 6) + reliefBias + closerBias + mlbPitchingPolish),
    control: clampDisplay(currentDisplayOVR + boundedValue(`${seed}:control`, -5, 5) + mlbPitchingPolish),
    stamina: clampDisplay(currentDisplayOVR + boundedValue(`${seed}:stamina`, -5, 5) + starterBias - reliefBias + mlbPitchingPolish),
    velocity: clampDisplay(currentDisplayOVR + boundedValue(`${seed}:velocity`, -4, 6) + reliefBias + mlbPitchingPolish),
    movement: clampDisplay(currentDisplayOVR + boundedValue(`${seed}:movement`, -5, 5) + mlbPitchingPolish),
  };
}

function developmentProgramFor(level: RosterLevel, position: Position, seed: string): DevelopmentProgram {
  if (level === 'MLB') {
    return 'mlb_prep';
  }
  if (position === 'SP') {
    return boundedValue(`${seed}:sp`, 0, 1) === 0 ? 'stamina' : 'control';
  }
  if (position === 'RP' || position === 'CL') {
    return boundedValue(`${seed}:relief`, 0, 1) === 0 ? 'velocity' : 'breaking';
  }
  if (DEFENSE_POSITIONS.has(position)) {
    return boundedValue(`${seed}:defense-program`, 0, 1) === 0 ? 'defense' : 'tools';
  }
  if (POWER_POSITIONS.has(position)) {
    return boundedValue(`${seed}:power-program`, 0, 1) === 0 ? 'power' : 'fundamentals';
  }
  return boundedValue(`${seed}:program`, 0, 1) === 0 ? 'contact' : 'fundamentals';
}

function trajectoryFor(level: RosterLevel, currentDisplayOVR: number, ceilingDisplay: number, seed: string): DevelopmentTrajectory {
  if (level === 'MLB') {
    return 'on_track';
  }
  if (ceilingDisplay - currentDisplayOVR >= 25 && boundedValue(`${seed}:ahead`, 0, 2) === 0) {
    return 'ahead_of_curve';
  }
  if ((level === 'ROOKIE' || level === 'INTERNATIONAL') && boundedValue(`${seed}:risk`, 0, 4) === 0) {
    return 'bust_risk';
  }
  if (boundedValue(`${seed}:below`, 0, 11) === 0) {
    return 'below_expectations';
  }
  return 'on_track';
}

function roleFor(level: RosterLevel, position: Position, currentDisplayOVR: number, ceilingDisplay: number): string {
  if (level === 'MLB') {
    if (currentDisplayOVR >= 58) {
      return position === 'SP' ? 'Major-league rotation anchor' : 'Major-league lineup regular';
    }
    return position === 'SP' || position === 'RP' || position === 'CL'
      ? 'Major-league staff depth'
      : 'Major-league role player';
  }
  if (ceilingDisplay >= 65 && currentDisplayOVR <= 45) {
    return 'Development prospect with everyday upside';
  }
  if (position === 'SP') {
    return 'Rotation-depth development arm';
  }
  if (position === 'RP' || position === 'CL') {
    return 'Bullpen-depth development arm';
  }
  if (DEFENSE_POSITIONS.has(position)) {
    return 'Up-the-middle depth and glove development';
  }
  return 'Organizational depth with carrying-tool focus';
}

function scoutingNoteFor(
  teamId: string,
  level: RosterLevel,
  position: Position,
  developmentProgram: DevelopmentProgram,
  role: string,
): string {
  if (level === 'MLB') {
    return `${role} with an authored roster identity for the parent club; ${developmentProgram.replace('_', ' ')} keeps the profile stable for new-game balance.`;
  }

  const affiliateNote = AFFILIATE_CONTENT_BY_KEY.get(`${teamId}:${level}`)?.identityNote
    ?? 'Affiliate development context stays tied to the club identity.';
  const positionNote = position === 'SP'
    ? 'Starter traits are shaped around workload and strike throwing.'
    : position === 'RP' || position === 'CL'
      ? 'Relief traits emphasize one carrying weapon and leverage temperament.'
      : DEFENSE_POSITIONS.has(position)
        ? 'Defensive value and decision speed are the foundation.'
        : 'The offensive profile needs one carrying tool to force promotions.';

  return `${positionNote} ${affiliateNote}`;
}

function makeGeneratedPlayerContent(
  teamId: string,
  level: RosterLevel,
  position: Position,
  slotIndex: number,
  usedNames: ReadonlySet<string>,
): MinorLeaguePlayerContent {
  const seed = `${teamId}:${level}:${position}:${slotIndex}`;
  const [minAge, maxAge] = LEVEL_AGE_RANGES[level];
  const [minCurrent, maxCurrent] = LEVEL_CURRENT_BANDS[level];
  const currentDisplayOVR = boundedValue(`${seed}:ovr`, minCurrent, maxCurrent);
  const ceilingLift = level === 'MLB'
    ? boundedValue(`${seed}:ceiling`, 0, 8)
    : boundedValue(`${seed}:ceiling`, 7, level === 'INTERNATIONAL' ? 32 : 24);
  const ceilingDisplay = Math.min(LEVEL_CEILING_MAX[level], Math.max(currentDisplayOVR, currentDisplayOVR + ceilingLift));
  const floorDisplay = Math.max(20, Math.min(currentDisplayOVR, currentDisplayOVR - boundedValue(`${seed}:floor`, 2, 8)));
  const age = boundedValue(`${seed}:age`, minAge, maxAge);
  const name = pickGeneratedName(teamId, level, slotIndex, usedNames);
  const pitcher = PITCHER_POSITIONS.includes(position as (typeof PITCHER_POSITIONS)[number]);
  const hitterAttributes = pitcher
    ? {
      contact: 20,
      power: 20,
      eye: 20,
      speed: 20,
      defense: 30,
      durability: clampDisplay(currentDisplayOVR + boundedValue(`${seed}:pitcher-durability`, -2, 6)),
    }
    : makeHitterAttributes(level, position, currentDisplayOVR, seed);
  const pitcherAttributes = pitcher
    ? makePitcherAttributes(level, position, currentDisplayOVR, seed)
    : {
      stuff: null,
      control: null,
      stamina: null,
      velocity: null,
      movement: null,
    };
  const developmentProgram = developmentProgramFor(level, position, seed);
  const developmentTrajectory = trajectoryFor(level, currentDisplayOVR, ceilingDisplay, seed);
  const role = roleFor(level, position, currentDisplayOVR, ceilingDisplay);

  return {
    contentId: contentIdForSlot(teamId, level, slotIndex),
    prospectRank: null,
    priorityType: 'Depth / Role Player',
    teamId,
    rosterLevel: level,
    affiliateLevel: level,
    ...name,
    age,
    position,
    currentDisplayOVR,
    floorDisplay,
    ceilingDisplay,
    ...hitterAttributes,
    ...pitcherAttributes,
    workEthic: boundedValue(`${seed}:work`, 50, 95),
    mentalToughness: boundedValue(`${seed}:mental`, 48, 95),
    leadership: boundedValue(`${seed}:leadership`, 40, 90),
    competitiveness: boundedValue(`${seed}:compete`, 55, 98),
    developmentProgram,
    developmentTrajectory,
    role,
    scoutingNote: scoutingNoteFor(teamId, level, position, developmentProgram, role),
  };
}

function materializeReviewedSeedPlayer(
  seedPlayer: Omit<MinorLeaguePlayerContent, 'contentId' | 'rosterLevel'>,
  contentId: string,
  level: RosterLevel,
): MinorLeaguePlayerContent {
  return {
    ...seedPlayer,
    contentId,
    rosterLevel: level,
    affiliateLevel: level,
  };
}

function materializeTeamLevelPlayers(
  teamId: string,
  level: RosterLevel,
  seedPlayers: readonly Omit<MinorLeaguePlayerContent, 'contentId' | 'rosterLevel'>[],
  usedNames: Set<string>,
): readonly MinorLeaguePlayerContent[] {
  const targetPositions = positionsForRosterLevel(level);
  const slots: Array<MinorLeaguePlayerContent | null> = Array.from({ length: targetPositions.length }, () => null);

  for (const seedPlayer of seedPlayers) {
    const matchingIndex = targetPositions.findIndex((position, index) =>
      slots[index] == null && position === seedPlayer.position,
    );
    const fallbackIndex = matchingIndex >= 0 ? matchingIndex : slots.findIndex((slot) => slot == null);
    if (fallbackIndex < 0) {
      continue;
    }
    const materialized = materializeReviewedSeedPlayer(
      seedPlayer,
      contentIdForSlot(teamId, level, fallbackIndex),
      level,
    );
    slots[fallbackIndex] = materialized;
    usedNames.add(playerNameKey(materialized.firstName, materialized.lastName));
  }

  return slots.map((slot, slotIndex) => {
    if (slot) {
      return slot;
    }

    const generated = makeGeneratedPlayerContent(
      teamId,
      level,
      targetPositions[slotIndex]!,
      slotIndex,
      usedNames,
    );
    usedNames.add(playerNameKey(generated.firstName, generated.lastName));
    return generated;
  });
}

function materializePlayerContent(): readonly MinorLeaguePlayerContent[] {
  const seedPlayersByTeamLevel = new Map<string, Array<Omit<MinorLeaguePlayerContent, 'contentId' | 'rosterLevel'>>>();
  for (const player of SEED_PLAYERS) {
    const key = `${player.teamId}:${player.affiliateLevel}`;
    const players = seedPlayersByTeamLevel.get(key) ?? [];
    players.push(player);
    seedPlayersByTeamLevel.set(key, players);
  }

  const players: MinorLeaguePlayerContent[] = [];
  const teamIds = Array.from(new Set(AFFILIATE_CONTENT_ROWS.map((affiliate) => affiliate.teamId)));
  for (const teamId of teamIds) {
    const usedNames = new Set(
      SEED_PLAYERS
        .filter((player) => player.teamId === teamId)
        .map((player) => playerNameKey(player.firstName, player.lastName)),
    );
    for (const level of ROSTER_LEVEL_ORDER) {
      players.push(...materializeTeamLevelPlayers(
        teamId,
        level,
        seedPlayersByTeamLevel.get(`${teamId}:${level}`) ?? [],
        usedNames,
      ));
    }
  }

  return players;
}

const MATERIALIZED_PLAYERS = materializePlayerContent();

export const MINOR_LEAGUE_CONTENT_PACK = {
  version: rawPack.version,
  sourceFiles: [...rawPack.sourceFiles, GENERATED_SOURCE_FILE],
  affiliateCount: rawPack.affiliateCount,
  seedPlayerCount: rawPack.playerCount,
  playerCount: MATERIALIZED_PLAYERS.length,
  affiliates: AFFILIATE_CONTENT_ROWS,
  players: MATERIALIZED_PLAYERS,
} as const;

function playerIdentityKey(teamId: string, firstName: string, lastName: string): string {
  return `${teamId}:${firstName.toLowerCase()}:${lastName.toLowerCase()}`;
}

const PLAYER_CONTENT_BY_IDENTITY = new Map(
  MINOR_LEAGUE_CONTENT_PACK.players.map((player) => [
    playerIdentityKey(player.teamId, player.firstName, player.lastName),
    player,
  ]),
);

const PLAYER_CONTENT_BY_TEAM = new Map<string, MinorLeaguePlayerContent[]>();
for (const player of MINOR_LEAGUE_CONTENT_PACK.players) {
  const players = PLAYER_CONTENT_BY_TEAM.get(player.teamId) ?? [];
  players.push(player);
  PLAYER_CONTENT_BY_TEAM.set(player.teamId, players);
}

export function getMinorLeagueAffiliateContent(
  teamId: string,
  level: string,
): MinorLeagueAffiliateContent | null {
  return AFFILIATE_CONTENT_BY_KEY.get(`${teamId}:${level}`) ?? null;
}

export function getMinorLeagueAffiliateIdentityView(
  teamId: string,
  level: string,
  fallbackLabel: string,
): MinorLeagueAffiliateIdentityView {
  const content = getMinorLeagueAffiliateContent(teamId, level);
  return {
    label: content?.affiliateName ?? fallbackLabel,
    shortName: content?.shortName ?? fallbackLabel,
    identityNote: content?.identityNote ?? null,
  };
}

export function getMinorLeagueAffiliateOpponentLabel(
  teamId: string,
  level: string,
  fallbackLabel: string,
): string {
  return getMinorLeagueAffiliateContent(teamId, level)?.shortName ?? fallbackLabel;
}

export function getMinorLeaguePlayerContentForTeam(teamId: string): readonly MinorLeaguePlayerContent[] {
  return PLAYER_CONTENT_BY_TEAM.get(teamId) ?? [];
}

export function getMinorLeaguePlayerContentByIdentity(
  teamId: string,
  firstName: string,
  lastName: string,
): MinorLeaguePlayerContent | null {
  return PLAYER_CONTENT_BY_IDENTITY.get(playerIdentityKey(teamId, firstName, lastName)) ?? null;
}

export function getMinorLeaguePlayerGenerationContent():
  ReadonlyMap<string, readonly AuthoredRosterPlayerContent[]> {
  return PLAYER_CONTENT_BY_TEAM;
}
