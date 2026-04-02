import type { GameRNG } from '../math/prng.js';
import {
  toDisplayRating,
  DISPLAY_MAX,
  DISPLAY_MIN,
} from '../player/attributes.js';
import {
  generatePlayer,
  type GeneratedPlayer,
  type Position,
} from '../player/generation.js';
import { calculateRule5EligibleAfterSeason } from '../roster/rule5.js';
import type { Scout } from './scoutingEngine.js';

export const DEFAULT_IFA_BONUS_POOL = 5;
export const IFA_POOL_MIN = 80;
export const IFA_POOL_MAX = 120;

export type InternationalRegion = 'latin_america' | 'caribbean' | 'asia';
export type InternationalNationality = 'latin' | 'asian';
export type IFAProspectStatus = 'available' | 'signed';

export interface InternationalProspect {
  id: string;
  season: number;
  firstName: string;
  lastName: string;
  age: number;
  position: Position;
  hitterAttributes: GeneratedPlayer['hitterAttributes'];
  pitcherAttributes: GeneratedPlayer['pitcherAttributes'];
  personality: GeneratedPlayer['personality'];
  nationality: InternationalNationality;
  region: InternationalRegion;
  country: string;
  overallRating: number;
  potentialRating: number;
  expectedBonus: number;
  status: IFAProspectStatus;
  signedTeamId: string | null;
  signedBonus: number | null;
}

export interface IFATeamBudget {
  baseAllocation: number;
  tradedIn: number;
  tradedOut: number;
  committed: number;
}

export interface InternationalScoutingReport {
  playerId: string;
  looks: number;
  accuracy: number;
  observedRatings: Record<string, number>;
  overallGrade: number;
  confidence: number;
  ceiling: number;
  floor: number;
  notes: string;
  reliability: number;
}

export interface IFAScoutingHistoryEntry {
  playerId: string;
  looks: number;
  report: InternationalScoutingReport;
}

export interface InternationalScoutingState {
  season: number;
  ifaPool: InternationalProspect[];
  budgets: Map<string, IFATeamBudget>;
  scoutingHistory: Map<string, IFAScoutingHistoryEntry[]>;
}

export interface SignIFAProspectResult {
  state: InternationalScoutingState;
  signedPlayer: GeneratedPlayer;
  signedProspect: InternationalProspect;
}

const REGION_COUNTRIES: Record<InternationalRegion, readonly string[]> = {
  latin_america: [
    'Dominican Republic',
    'Venezuela',
    'Colombia',
    'Mexico',
    'Panama',
    'Nicaragua',
  ],
  caribbean: [
    'Cuba',
    'Puerto Rico',
    'Curacao',
    'Aruba',
    'Bahamas',
  ],
  asia: [
    'Japan',
    'South Korea',
    'Taiwan',
  ],
};

const REGION_THRESHOLDS = [
  { region: 'latin_america' as const, max: 0.55 },
  { region: 'caribbean' as const, max: 0.75 },
  { region: 'asia' as const, max: 1 },
] as const;

const LATIN_FIRST_NAMES = [
  'Carlos', 'Miguel', 'Jose', 'Luis', 'Pedro', 'Juan', 'Rafael', 'Fernando',
  'Roberto', 'Alejandro', 'Diego', 'Andres', 'Eduardo', 'Pablo', 'Santiago', 'Adrian',
  'Victor', 'Manuel', 'Angel', 'Marco', 'Cristian', 'Wander', 'Ronald', 'Ariel',
];

const LATIN_LAST_NAMES = [
  'Rodriguez', 'Hernandez', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez',
  'Torres', 'Rivera', 'Gomez', 'Diaz', 'Cruz', 'Morales', 'Reyes', 'Ortiz',
  'Castillo', 'Jimenez', 'Vargas', 'Castro', 'Moreno', 'Soto', 'Cabrera', 'Valdez',
];

const CARIBBEAN_FIRST_NAMES = [
  'Yoel', 'Yordan', 'Adolis', 'Rangel', 'Dairon', 'Yusniel', 'Lazaro', 'Orelvis',
  'Jurickson', 'Xander', 'Ozzie', 'Jonathan', 'Anfernee', 'Shervyen', 'Jeter', 'Esteury',
];

const CARIBBEAN_LAST_NAMES = [
  'Guerrero', 'Acuna', 'Devers', 'Arozarena', 'Cespedes', 'Rosario', 'Brito', 'Mesa',
  'Albies', 'Bogaerts', 'Profar', 'Balcazar', 'Nunez', 'Simeon', 'Made', 'Ruiz',
];

const ASIAN_FIRST_NAMES = [
  'Shohei', 'Yu', 'Masahiro', 'Kenta', 'Yoshinobu', 'Kodai', 'Roki', 'Shota',
  'Yusei', 'Seiya', 'Yuki', 'Hyun-jin', 'Ha-seong', 'Ji-man', 'Kwang-hyun', 'Wei-Yin',
  'Chien-Ming', 'Hao-Yu', 'Jung-ho', 'Seong-jun',
];

const ASIAN_LAST_NAMES = [
  'Ohtani', 'Darvish', 'Tanaka', 'Maeda', 'Yamamoto', 'Senga', 'Sasaki', 'Imanaga',
  'Kikuchi', 'Yoshida', 'Ryu', 'Kim', 'Choi', 'Park', 'Chen', 'Wang',
  'Lee', 'Lin', 'Kang', 'Shin',
];

const IFA_POSITION_WEIGHTS: readonly Position[] = [
  'SP', 'SP', 'SP', 'RP', 'CL',
  'C', '1B', '2B', '3B', 'SS',
  'LF', 'CF', 'RF',
];

const AGE_WEIGHTS = [
  { age: 16, max: 0.18 },
  { age: 17, max: 0.36 },
  { age: 18, max: 0.56 },
  { age: 19, max: 0.73 },
  { age: 20, max: 0.86 },
  { age: 21, max: 0.95 },
  { age: 22, max: 1 },
] as const;

function clampDisplay(value: number): number {
  return Math.max(DISPLAY_MIN, Math.min(DISPLAY_MAX, Math.round(value)));
}

function pickRegion(rng: GameRNG): InternationalRegion {
  const roll = rng.nextFloat();
  for (const threshold of REGION_THRESHOLDS) {
    if (roll <= threshold.max) {
      return threshold.region;
    }
  }
  return 'asia';
}

function pickAge(rng: GameRNG): number {
  const roll = rng.nextFloat();
  for (const weight of AGE_WEIGHTS) {
    if (roll <= weight.max) {
      return weight.age;
    }
  }
  return 22;
}

function pickPosition(rng: GameRNG): Position {
  return IFA_POSITION_WEIGHTS[rng.nextInt(0, IFA_POSITION_WEIGHTS.length - 1)]!;
}

function pickCountry(rng: GameRNG, region: InternationalRegion): string {
  const countries = REGION_COUNTRIES[region];
  return countries[rng.nextInt(0, countries.length - 1)]!;
}

function pickNames(
  rng: GameRNG,
  region: InternationalRegion,
): { firstName: string; lastName: string; nationality: InternationalNationality } {
  if (region === 'asia') {
    return {
      firstName: ASIAN_FIRST_NAMES[rng.nextInt(0, ASIAN_FIRST_NAMES.length - 1)]!,
      lastName: ASIAN_LAST_NAMES[rng.nextInt(0, ASIAN_LAST_NAMES.length - 1)]!,
      nationality: 'asian',
    };
  }

  const firstPool = region === 'caribbean' ? CARIBBEAN_FIRST_NAMES : LATIN_FIRST_NAMES;
  const lastPool = region === 'caribbean' ? CARIBBEAN_LAST_NAMES : LATIN_LAST_NAMES;
  return {
    firstName: firstPool[rng.nextInt(0, firstPool.length - 1)]!,
    lastName: lastPool[rng.nextInt(0, lastPool.length - 1)]!,
    nationality: 'latin',
  };
}

function calculatePotentialRating(rng: GameRNG, overallRating: number, age: number, workEthic: number): number {
  const youthBonus = Math.max(10, (22 - age) * 8);
  const makeupBonus = Math.round(workEthic / 4);
  const volatility = Math.round(rng.nextGaussian(18, 8));
  return Math.max(overallRating, Math.min(550, overallRating + youthBonus + makeupBonus + volatility));
}

function calculateExpectedBonus(overallRating: number, potentialRating: number, age: number): number {
  const overallValue = (overallRating / 550) * 0.9;
  const upsideValue = (potentialRating / 550) * 0.9;
  const ageBonus = Math.max(0, (20 - age) * 0.08);
  return Math.round(Math.max(0.15, overallValue + upsideValue + ageBonus) * 100) / 100;
}

function buildReportNotes(prospect: InternationalProspect, looks: number): string {
  const lookLabel = looks > 1 ? `${looks} looks` : 'first look';
  return `${prospect.country} ${prospect.position} with ${lookLabel}. Bonus market projects around $${prospect.expectedBonus.toFixed(2)}M.`;
}

function attributeEntries(
  prospect: InternationalProspect,
): Array<[string, number]> {
  if (prospect.pitcherAttributes) {
    return Object.entries(prospect.pitcherAttributes);
  }

  return Object.entries(prospect.hitterAttributes);
}

export function scoutQualityToAccuracy(quality: number): number {
  const clamped = Math.max(0, Math.min(100, quality));
  return Math.max(0.5, Math.min(0.95, 0.5 + (clamped / 100) * 0.45));
}

export function getInternationalScoutAccuracy(staff: Scout[]): number {
  if (staff.length === 0) return 0.5;
  const averageQuality = staff.reduce((sum, scout) => sum + scout.quality, 0) / staff.length;
  return scoutQualityToAccuracy(averageQuality);
}

export function generateIFAPool(
  rng: GameRNG,
  season: number,
  count: number = rng.nextInt(IFA_POOL_MIN, IFA_POOL_MAX),
): InternationalProspect[] {
  const prospects: InternationalProspect[] = [];

  for (let index = 0; index < count; index += 1) {
    const region = pickRegion(rng);
    const { firstName, lastName, nationality } = pickNames(rng, region);
    const basePlayer = generatePlayer(rng.fork(), pickPosition(rng), 'ifa', 'INTERNATIONAL');
    const age = pickAge(rng);
    const overallRating = basePlayer.overallRating;
    const potentialRating = calculatePotentialRating(
      rng,
      overallRating,
      age,
      basePlayer.personality.workEthic,
    );

    prospects.push({
      id: basePlayer.id,
      season,
      firstName,
      lastName,
      age,
      position: basePlayer.position,
      hitterAttributes: basePlayer.hitterAttributes,
      pitcherAttributes: basePlayer.pitcherAttributes,
      personality: basePlayer.personality,
      nationality,
      region,
      country: pickCountry(rng, region),
      overallRating,
      potentialRating,
      expectedBonus: calculateExpectedBonus(overallRating, potentialRating, age),
      status: 'available',
      signedTeamId: null,
      signedBonus: null,
    });
  }

  return prospects;
}

export function createInternationalScoutingState(
  rng: GameRNG,
  teamIds: string[],
  season: number,
  baseAllocation: number = DEFAULT_IFA_BONUS_POOL,
): InternationalScoutingState {
  const budgets = new Map<string, IFATeamBudget>();
  for (const teamId of teamIds) {
    budgets.set(teamId, {
      baseAllocation,
      tradedIn: 0,
      tradedOut: 0,
      committed: 0,
    });
  }

  return {
    season,
    ifaPool: generateIFAPool(rng, season),
    budgets,
    scoutingHistory: new Map(),
  };
}

export function getAvailableIFAProspects(state: InternationalScoutingState): InternationalProspect[] {
  return state.ifaPool.filter((prospect) => prospect.status === 'available');
}

export function getRemainingIFABudget(budget: IFATeamBudget): number {
  return Math.round((budget.baseAllocation + budget.tradedIn - budget.tradedOut - budget.committed) * 100) / 100;
}

export function scoutIFAProspect(
  rng: GameRNG,
  prospect: InternationalProspect,
  accuracy: number,
  looks: number,
): InternationalScoutingReport {
  const normalizedLooks = Math.max(1, looks);
  const normalizedAccuracy = Math.max(0.5, Math.min(0.95, accuracy));
  const noiseStdDev = Math.max(1, 18 * (1 - normalizedAccuracy) / Math.sqrt(normalizedLooks));
  const observedRatings: Record<string, number> = {};

  for (const [attribute, rating] of attributeEntries(prospect)) {
    observedRatings[attribute] = clampDisplay(toDisplayRating(rating) + rng.nextGaussian(0, noiseStdDev));
  }

  const overallGrade = clampDisplay(
    toDisplayRating(prospect.overallRating) + rng.nextGaussian(0, noiseStdDev),
  );
  const confidence = Math.max(1, Math.round(noiseStdDev));

  return {
    playerId: prospect.id,
    looks: normalizedLooks,
    accuracy: normalizedAccuracy,
    observedRatings,
    overallGrade,
    confidence,
    ceiling: clampDisplay(toDisplayRating(prospect.potentialRating) + rng.nextGaussian(0, noiseStdDev / 2)),
    floor: clampDisplay(toDisplayRating(prospect.overallRating) - confidence),
    notes: buildReportNotes(prospect, normalizedLooks),
    reliability: normalizedAccuracy,
  };
}

export function tradeIFABonusPool(
  state: InternationalScoutingState,
  fromTeamId: string,
  toTeamId: string,
  amount: number,
): InternationalScoutingState {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('IFA pool trade amount must be positive.');
  }

  if (fromTeamId === toTeamId) {
    throw new Error('IFA pool space must be traded between two teams.');
  }

  const fromBudget = state.budgets.get(fromTeamId);
  const toBudget = state.budgets.get(toTeamId);
  if (!fromBudget || !toBudget) {
    throw new Error('IFA budget not found for one or both teams.');
  }

  if (amount > getRemainingIFABudget(fromBudget)) {
    throw new Error('Cannot trade more IFA pool space than is currently available.');
  }

  const budgets = new Map(state.budgets);
  budgets.set(fromTeamId, {
    ...fromBudget,
    tradedOut: Math.round((fromBudget.tradedOut + amount) * 100) / 100,
  });
  budgets.set(toTeamId, {
    ...toBudget,
    tradedIn: Math.round((toBudget.tradedIn + amount) * 100) / 100,
  });

  return {
    ...state,
    budgets,
  };
}

function toSignedProspect(
  prospect: InternationalProspect,
  teamId: string,
  bonusAmount: number,
): InternationalProspect {
  return {
    ...prospect,
    status: 'signed',
    signedTeamId: teamId,
    signedBonus: Math.round(bonusAmount * 100) / 100,
  };
}

export function convertIFAProspectToPlayer(
  prospect: InternationalProspect,
  teamId: string,
): GeneratedPlayer {
  return {
    id: prospect.id,
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    age: prospect.age,
    position: prospect.position,
    hitterAttributes: prospect.hitterAttributes,
    pitcherAttributes: prospect.pitcherAttributes,
    personality: prospect.personality,
    contract: {
      years: 0,
      annualSalary: 0.5,
      noTradeClause: false,
      playerOption: false,
      teamOption: false,
    },
    rosterStatus: 'ROOKIE',
    developmentPhase: 'Prospect',
    teamId,
    nationality: prospect.nationality,
    overallRating: prospect.overallRating,
    rule5EligibleAfterSeason: calculateRule5EligibleAfterSeason(prospect.season, prospect.age),
    serviceTimeDays: 0,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: 'ROOKIE',
  };
}

export function signIFAProspect(
  state: InternationalScoutingState,
  teamId: string,
  playerId: string,
  bonusAmount: number,
): SignIFAProspectResult {
  if (!Number.isFinite(bonusAmount) || bonusAmount <= 0) {
    throw new Error('IFA signing bonus must be positive.');
  }

  const budget = state.budgets.get(teamId);
  if (!budget) {
    throw new Error(`Missing IFA budget for team ${teamId}.`);
  }

  if (bonusAmount > getRemainingIFABudget(budget)) {
    throw new Error('Signing bonus exceeds the available IFA bonus pool.');
  }

  const prospect = state.ifaPool.find((candidate) => candidate.id === playerId);
  if (!prospect) {
    throw new Error(`IFA prospect ${playerId} was not found.`);
  }

  if (prospect.status === 'signed') {
    throw new Error('IFA prospect has already signed.');
  }

  const signedProspect = toSignedProspect(prospect, teamId, bonusAmount);
  const budgets = new Map(state.budgets);
  budgets.set(teamId, {
    ...budget,
    committed: Math.round((budget.committed + bonusAmount) * 100) / 100,
  });

  return {
    state: {
      ...state,
      ifaPool: state.ifaPool.map((candidate) =>
        candidate.id === playerId ? signedProspect : candidate),
      budgets,
    },
    signedPlayer: convertIFAProspectToPlayer(signedProspect, teamId),
    signedProspect,
  };
}
