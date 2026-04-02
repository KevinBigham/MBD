/**
 * @module teams
 * All 32 MLB teams with divisions, cities, abbreviations.
 * Used for league initialization and lookups.
 */

export type Division = 'AL_EAST' | 'AL_CENTRAL' | 'AL_WEST' | 'NL_EAST' | 'NL_CENTRAL' | 'NL_WEST';
export type OwnerArchetype = 'win_now' | 'patient_builder' | 'penny_pincher';

export interface TeamDef {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly abbreviation: string;
  readonly division: Division;
  readonly parkFactor: number;
}

export const TEAMS: readonly TeamDef[] = [
  // AL East
  { id: 'bal', name: 'Orioles',    city: 'Baltimore',    abbreviation: 'BAL', division: 'AL_EAST', parkFactor: 0.99 },
  { id: 'bos', name: 'Red Sox',    city: 'Boston',       abbreviation: 'BOS', division: 'AL_EAST', parkFactor: 1.04 },
  { id: 'nyy', name: 'Yankees',    city: 'New York',     abbreviation: 'NYY', division: 'AL_EAST', parkFactor: 1.01 },
  { id: 'tb',  name: 'Rays',       city: 'Tampa Bay',    abbreviation: 'TBR', division: 'AL_EAST', parkFactor: 0.97 },
  { id: 'tor', name: 'Blue Jays',  city: 'Toronto',      abbreviation: 'TOR', division: 'AL_EAST', parkFactor: 1.02 },
  // AL Central
  { id: 'cws', name: 'White Sox',  city: 'Chicago',      abbreviation: 'CWS', division: 'AL_CENTRAL', parkFactor: 1.03 },
  { id: 'cle', name: 'Guardians',  city: 'Cleveland',    abbreviation: 'CLE', division: 'AL_CENTRAL', parkFactor: 0.98 },
  { id: 'det', name: 'Tigers',     city: 'Detroit',      abbreviation: 'DET', division: 'AL_CENTRAL', parkFactor: 0.99 },
  { id: 'kc',  name: 'Royals',     city: 'Kansas City',  abbreviation: 'KCR', division: 'AL_CENTRAL', parkFactor: 1.00 },
  { id: 'min', name: 'Twins',      city: 'Minnesota',    abbreviation: 'MIN', division: 'AL_CENTRAL', parkFactor: 1.01 },
  // AL West
  { id: 'hou', name: 'Astros',     city: 'Houston',      abbreviation: 'HOU', division: 'AL_WEST', parkFactor: 1.02 },
  { id: 'laa', name: 'Angels',     city: 'Los Angeles',  abbreviation: 'LAA', division: 'AL_WEST', parkFactor: 1.00 },
  { id: 'oak', name: 'Athletics',  city: 'Oakland',      abbreviation: 'OAK', division: 'AL_WEST', parkFactor: 0.95 },
  { id: 'sea', name: 'Mariners',   city: 'Seattle',      abbreviation: 'SEA', division: 'AL_WEST', parkFactor: 0.97 },
  { id: 'tex', name: 'Rangers',    city: 'Texas',        abbreviation: 'TEX', division: 'AL_WEST', parkFactor: 1.03 },
  // NL East
  { id: 'atl', name: 'Braves',     city: 'Atlanta',      abbreviation: 'ATL', division: 'NL_EAST', parkFactor: 1.01 },
  { id: 'mia', name: 'Marlins',    city: 'Miami',        abbreviation: 'MIA', division: 'NL_EAST', parkFactor: 0.96 },
  { id: 'nym', name: 'Mets',       city: 'New York',     abbreviation: 'NYM', division: 'NL_EAST', parkFactor: 0.99 },
  { id: 'phi', name: 'Phillies',   city: 'Philadelphia', abbreviation: 'PHI', division: 'NL_EAST', parkFactor: 1.02 },
  { id: 'wsh', name: 'Nationals',  city: 'Washington',   abbreviation: 'WSH', division: 'NL_EAST', parkFactor: 1.00 },
  // NL Central
  { id: 'chc', name: 'Cubs',       city: 'Chicago',      abbreviation: 'CHC', division: 'NL_CENTRAL', parkFactor: 1.01 },
  { id: 'cin', name: 'Reds',       city: 'Cincinnati',   abbreviation: 'CIN', division: 'NL_CENTRAL', parkFactor: 1.04 },
  { id: 'mil', name: 'Brewers',    city: 'Milwaukee',    abbreviation: 'MIL', division: 'NL_CENTRAL', parkFactor: 1.00 },
  { id: 'pit', name: 'Pirates',    city: 'Pittsburgh',   abbreviation: 'PIT', division: 'NL_CENTRAL', parkFactor: 0.98 },
  { id: 'stl', name: 'Cardinals',  city: 'St. Louis',    abbreviation: 'STL', division: 'NL_CENTRAL', parkFactor: 0.99 },
  // NL West
  { id: 'ari', name: 'Diamondbacks', city: 'Arizona',    abbreviation: 'ARI', division: 'NL_WEST', parkFactor: 1.02 },
  { id: 'col', name: 'Rockies',    city: 'Colorado',     abbreviation: 'COL', division: 'NL_WEST', parkFactor: 1.12 },
  { id: 'lad', name: 'Dodgers',    city: 'Los Angeles',  abbreviation: 'LAD', division: 'NL_WEST', parkFactor: 0.99 },
  { id: 'sd',  name: 'Padres',     city: 'San Diego',    abbreviation: 'SDP', division: 'NL_WEST', parkFactor: 0.97 },
  { id: 'sf',  name: 'Giants',     city: 'San Francisco', abbreviation: 'SFG', division: 'NL_WEST', parkFactor: 0.95 },
  // Extra 2 teams to reach 32
  { id: 'mtl', name: 'Expos',      city: 'Montreal',     abbreviation: 'MTL', division: 'NL_EAST', parkFactor: 0.98 },
  { id: 'por', name: 'Evergreens', city: 'Portland',     abbreviation: 'POR', division: 'AL_WEST', parkFactor: 1.00 },
];

/** Get all teams in a given division. */
export function getTeamsByDivision(division: Division): readonly TeamDef[] {
  return TEAMS.filter(t => t.division === division);
}

/** Get all division names. */
export const DIVISIONS: readonly Division[] = [
  'AL_EAST', 'AL_CENTRAL', 'AL_WEST',
  'NL_EAST', 'NL_CENTRAL', 'NL_WEST',
];

/** Get a team by ID. */
export function getTeamById(id: string): TeamDef | undefined {
  return TEAMS.find(t => t.id === id);
}
