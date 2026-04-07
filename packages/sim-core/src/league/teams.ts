/**
 * @module teams
 * All 32 franchise teams with divisions, cities, abbreviations.
 * Uses top US metros with original names — zero MLB overlap.
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
  // Atlantic East
  { id: 'nym', name: 'Tycoons',       city: 'New York',      abbreviation: 'NYT', division: 'AL_EAST', parkFactor: 1.01 },
  { id: 'phi', name: 'Liberty Bells',  city: 'Philadelphia',  abbreviation: 'PHI', division: 'AL_EAST', parkFactor: 1.02 },
  { id: 'bos', name: "Noreasters",    city: 'Boston',        abbreviation: 'BOS', division: 'AL_EAST', parkFactor: 1.04 },
  { id: 'bal', name: 'Crab Cakes',     city: 'Baltimore',     abbreviation: 'BAL', division: 'AL_EAST', parkFactor: 0.99 },
  { id: 'wsh', name: 'Monuments',      city: 'Washington',    abbreviation: 'WSH', division: 'AL_EAST', parkFactor: 1.00 },
  // Atlantic Central
  { id: 'chi', name: 'Deep Dish',      city: 'Chicago',       abbreviation: 'CHI', division: 'AL_CENTRAL', parkFactor: 1.03 },
  { id: 'det', name: 'Motor Kings',    city: 'Detroit',       abbreviation: 'DET', division: 'AL_CENTRAL', parkFactor: 0.99 },
  { id: 'cle', name: 'Forge',          city: 'Cleveland',     abbreviation: 'CLE', division: 'AL_CENTRAL', parkFactor: 0.98 },
  { id: 'col', name: 'Buckeyes',       city: 'Columbus',      abbreviation: 'CLB', division: 'AL_CENTRAL', parkFactor: 1.00 },
  { id: 'pit', name: 'Smokestack',     city: 'Pittsburgh',    abbreviation: 'PIT', division: 'AL_CENTRAL', parkFactor: 0.98 },
  // Atlantic West
  { id: 'kc',  name: 'BBQ Fountains',  city: 'Kansas City',   abbreviation: 'KCF', division: 'AL_WEST', parkFactor: 1.00 },
  { id: 'msp', name: 'Frost Giants',   city: 'Minneapolis',   abbreviation: 'MSP', division: 'AL_WEST', parkFactor: 1.01 },
  { id: 'stl', name: 'Archers',        city: 'St. Louis',     abbreviation: 'STL', division: 'AL_WEST', parkFactor: 0.99 },
  { id: 'ind', name: 'Speedsters',     city: 'Indianapolis',  abbreviation: 'IND', division: 'AL_WEST', parkFactor: 1.00 },
  { id: 'mil', name: 'Suds',           city: 'Milwaukee',     abbreviation: 'MIL', division: 'AL_WEST', parkFactor: 1.00 },
  { id: 'nas', name: 'Honky Tonks',    city: 'Nashville',     abbreviation: 'NAS', division: 'AL_WEST', parkFactor: 1.01 },
  // National East
  { id: 'mia', name: 'Hurricanes',     city: 'Miami',         abbreviation: 'MIA', division: 'NL_EAST', parkFactor: 0.96 },
  { id: 'atl', name: 'Peach Kings',    city: 'Atlanta',       abbreviation: 'ATL', division: 'NL_EAST', parkFactor: 1.01 },
  { id: 'cha', name: 'Hornets',        city: 'Charlotte',     abbreviation: 'CHA', division: 'NL_EAST', parkFactor: 1.00 },
  { id: 'orl', name: 'Thunder',        city: 'Orlando',       abbreviation: 'ORL', division: 'NL_EAST', parkFactor: 1.00 },
  { id: 'ral', name: 'Pines',          city: 'Raleigh',       abbreviation: 'RAL', division: 'NL_EAST', parkFactor: 0.99 },
  // National Central
  { id: 'hou', name: 'Space Cowboys',  city: 'Houston',       abbreviation: 'HOU', division: 'NL_CENTRAL', parkFactor: 1.02 },
  { id: 'dal', name: 'Lone Stars',     city: 'Dallas',        abbreviation: 'DAL', division: 'NL_CENTRAL', parkFactor: 1.03 },
  { id: 'sat', name: 'Riverwalk',      city: 'San Antonio',   abbreviation: 'SAT', division: 'NL_CENTRAL', parkFactor: 1.00 },
  { id: 'den', name: 'Altitude',       city: 'Denver',        abbreviation: 'DEN', division: 'NL_CENTRAL', parkFactor: 1.12 },
  { id: 'aus', name: 'Bat Colony',     city: 'Austin',        abbreviation: 'AUS', division: 'NL_CENTRAL', parkFactor: 1.01 },
  // National West
  { id: 'lax', name: 'Sunset Strip',   city: 'Los Angeles',   abbreviation: 'LAX', division: 'NL_WEST', parkFactor: 0.99 },
  { id: 'sfb', name: 'Sourdoughs',     city: 'San Francisco', abbreviation: 'SFB', division: 'NL_WEST', parkFactor: 0.95 },
  { id: 'phx', name: 'Dust Devils',    city: 'Phoenix',       abbreviation: 'PHX', division: 'NL_WEST', parkFactor: 1.02 },
  { id: 'sea', name: 'Drizzle',        city: 'Seattle',       abbreviation: 'SEA', division: 'NL_WEST', parkFactor: 0.97 },
  { id: 'sdg', name: 'Surf Hounds',    city: 'San Diego',     abbreviation: 'SDG', division: 'NL_WEST', parkFactor: 0.97 },
  { id: 'por', name: 'Sasquatch',      city: 'Portland',      abbreviation: 'POR', division: 'NL_WEST', parkFactor: 1.00 },
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
