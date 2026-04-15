import type {
  CareerStatsLedger,
  PlayerNicknameState,
  PlayerStoryArc,
  ScoutConflict,
  SignatureMoment,
} from '@mbd/contracts';
import { toDisplayRating, type MilestoneAlert } from '@mbd/sim-core';
import type { PlayerAdvancedStatsDTO as PlayerAdvancedStatsView } from '@/workers/sim.worker.stats';
import type { PersonalityProfileDTO as PersonalityProfileView } from '@/workers/sim.worker.narrative';

export type { PlayerAdvancedStatsView, PersonalityProfileView };

export type PlayerProfileTab = 'stats' | 'development' | 'scouting' | 'moments' | 'storyArcs' | 'history' | 'personality';

export const PLAYER_PROFILE_TABS: PlayerProfileTab[] = [
  'stats',
  'development',
  'scouting',
  'moments',
  'storyArcs',
  'history',
  'personality',
];

export interface PlayerSeasonStatsView {
  pa: number;
  ab: number;
  hits: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  k: number;
  runs: number;
  hbp: number;
  sacFlies: number;
  avg: string;
  ip: number;
  earnedRuns: number;
  strikeouts: number;
  walks: number;
  hitsAllowed: number;
  homeRunsAllowed: number;
  hitBatters: number;
  flyBallsAllowed: number;
  wins: number;
  losses: number;
  era: string;
}

export interface PlayerProfilePlayerView {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  position: string;
  overallRating: number;
  displayRating: number;
  letterGrade: string;
  rosterStatus: string;
  teamId: string;
  serviceTimeDays: number;
  optionYearsUsed: number;
  isOutOfOptions: boolean;
  minorLeagueLevel: string | null;
  ceiling: number | null;
  floor: number | null;
  developmentProgram: string | null;
  developmentTrajectory: string;
  personalityTraits?: string[];
  contract: {
    years: number;
    annualSalary: number;
    totalValue: number;
    noTradeClause: boolean;
    noTradeClauseType: string;
    playerOption: boolean;
    teamOption: boolean;
    optOutYears: number[];
    signingBonus: number;
    buyoutAmount: number;
    deferredMoney: Array<{ yearOffset: number; amount: number }>;
  };
  extensionHistory: Array<{
    season: number;
    teamId: string;
    years: number;
    annualSalary: number;
    totalValue: number;
    outcome: string;
  }>;
  stats: PlayerSeasonStatsView | null;
  advanced: PlayerAdvancedStatsView | null;
  historical?: boolean;
  historicalSummary?: {
    playerId: string;
    fullName: string;
    position: string;
    lastKnownTeamId: string;
    active: boolean;
    retiredSeason: number | null;
    seasonsPlayed: number;
    personalityTraits: string[];
  } | null;
  activeStory?: {
    arcType: string;
    phase: 'setup' | 'rising' | 'climax' | 'resolution';
    startSeason: number;
    startDay: number;
    latestMilestone: string | null;
  } | null;
  storyHistory?: Array<{
    arcType: string;
    phase: 'setup' | 'rising' | 'climax' | 'resolution';
    startSeason: number;
    startDay: number;
    resolvedSeason: number | null;
    milestones: string[];
  }>;
}

export interface DevelopmentReportsView {
  playerId: string;
  history: Array<{
    season: number;
    month: number;
    trajectory: string;
    summary: string;
    overallRating: number;
  }>;
  recommendations: Array<{
    playerId: string;
    teamId: string;
    fromPosition: string;
    toPosition: string;
    confidence: number;
    reason: string;
  }>;
  minorLeagueProgression: Array<{
    season: number;
    level: string;
    gamesPlayed: number;
    pa: number;
    hits: number;
    hr: number;
    rbi: number;
    avg: number;
    ip: number;
    era: number;
    k: number;
    bb: number;
  }>;
  prospectBond: {
    prospectId: string;
    draftedSeason: number;
    debutSeason: number | null;
    currentLevel: string;
    bondStrength: number;
    milestones: string[];
    loyaltyModifier: number;
  } | null;
  activeSetback: {
    type: 'mental_block' | 'nagging_injury' | 'off_field_distraction' | 'hot_streak';
    overallModifier: number;
    startSeason: number;
    startMonth: number;
    endSeason: number;
    endMonth: number;
    summary: string;
    active: boolean;
  } | null;
  debutFlashback: {
    playerId: string;
    playerName: string;
    draftSeason: number;
    draftRound: number;
    originalGrade: number;
    debutSeason: number;
    debutOverall: number;
    journeyHighlights: string[];
  } | null;
}

export interface PlayerScoutingReportView {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  teamName: string;
  isPitcher: boolean;
  grades: Record<string, number>;
  confidence: number;
  overall: number;
  ceiling: number;
  floor: number;
  notes: string;
  scoutName: string;
  date: string;
  reliability: number;
}

export interface PlayerProfileView {
  player: PlayerProfilePlayerView | null;
  personalityProfile: PersonalityProfileView | null;
  developmentReports: DevelopmentReportsView | null;
  careerStats: CareerStatsLedger | null;
  moments: SignatureMoment[];
  nicknames: PlayerNicknameState | null;
  storyArcs: PlayerStoryArc[];
  milestoneAlerts: MilestoneAlert[];
  scoutConflict: ScoutConflict | null;
  scoutingReport: PlayerScoutingReportView | null;
  scoutingHistoryNote: string;
}

export const PITCHER_POSITIONS = new Set(['SP', 'RP', 'CL']);

export function normalizePlayerProfileTab(value: string | null): PlayerProfileTab {
  return PLAYER_PROFILE_TABS.includes(value as PlayerProfileTab) ? value as PlayerProfileTab : 'stats';
}

export function labelize(value: string): string {
  return value.replaceAll('_', ' ');
}

export function moneyLabel(value: number): string {
  return `$${value.toFixed(1)}M`;
}

export function displayBand(value: number | null): number {
  if (value == null) return 0;
  return value > 100 ? toDisplayRating(value) : value;
}

export function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-accent-success/20 text-accent-success';
    case 'B': return 'bg-accent-info/20 text-accent-info';
    case 'C': return 'bg-accent-warning/20 text-accent-warning';
    case 'D': return 'bg-accent-danger/20 text-accent-danger';
    default: return 'bg-dynasty-border text-dynasty-muted';
  }
}

export function moraleTone(score: number): string {
  if (score >= 70) return 'text-accent-success';
  if (score >= 55) return 'text-accent-info';
  if (score >= 40) return 'text-accent-warning';
  return 'text-accent-danger';
}

export function badgeVariantForTrajectory(trajectory: string): 'success' | 'info' | 'warning' | 'outline' {
  switch (trajectory) {
    case 'ahead_of_curve':
    case 'improving':
      return 'success';
    case 'stalling':
    case 'on_track':
      return 'info';
    case 'declining':
      return 'warning';
    default:
      return 'outline';
  }
}

export function badgeVariantForStoryPhase(
  phase: NonNullable<PlayerProfilePlayerView['activeStory']>['phase'],
): 'success' | 'info' | 'warning' | 'outline' {
  switch (phase) {
    case 'climax':
      return 'warning';
    case 'rising':
      return 'info';
    case 'resolution':
      return 'success';
    default:
      return 'outline';
  }
}

export function storyPhaseProgress(
  phase: PlayerStoryArc['phase'],
): number {
  switch (phase) {
    case 'setup':
      return 25;
    case 'rising':
      return 50;
    case 'climax':
      return 80;
    case 'resolution':
      return 100;
  }
}

export function badgeVariantForSetback(
  type: NonNullable<DevelopmentReportsView['activeSetback']>['type'],
): 'success' | 'warning' | 'outline' {
  return type === 'hot_streak' ? 'success' : 'warning';
}

export function formatMonth(month: number): string {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return labels[Math.max(0, Math.min(labels.length - 1, month - 1))] ?? `M${month}`;
}

export function formatMinorLevel(level: string): string {
  return level === 'A_PLUS' ? 'A+' : labelize(level);
}

export function formatDecimal(value: number | null | undefined, digits: number): string {
  if (value == null) return '--';
  return value.toFixed(digits);
}

export function formatInnings(outs: number): string {
  const innings = Math.floor(outs / 3);
  const remainder = outs % 3;
  return `${innings}.${remainder}`;
}

export function isPitcherProfile(player: Pick<PlayerProfilePlayerView, 'position'>): boolean {
  return PITCHER_POSITIONS.has(player.position);
}
