import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import type { PressConferenceTopicCategory } from './pressConferences.js';

export interface HoldoutCoverageContext {
  player: GeneratedPlayer;
  season: number;
  day: number;
  teamName: string;
  moraleScore: number;
  rng?: GameRNG;
}

export interface HoldoutBriefing {
  id: string;
  topicId:
    | 'holdout_shock'
    | 'holdout_posturing'
    | 'holdout_pressure'
    | 'holdout_crisis'
    | 'holdout_resolution';
  topicCategory: Extract<PressConferenceTopicCategory, 'HOLDOUT'>;
  headline: string;
  body: string;
  priority: 1 | 2 | 3;
}

/** Minimum holdout length required before the resolution beat fires.
 *  Short (<=6 day) holdouts settle quietly without broadcast closure — only
 *  pressure (7-13 day) and crisis (>=14 day) tier disputes get resolution
 *  news so the press room stays signal-heavy, not chatty. */
const HOLDOUT_RESOLUTION_MIN_DAYS = 7;
const HOLDOUT_RESOLUTION_CRISIS_DAYS = 14;

interface HoldoutResolutionTemplateContext {
  readonly name: string;
  readonly teamName: string;
  readonly gap: string;
  readonly days: number;
  readonly tone: string;
  readonly severity: string;
  readonly resetVerb: string;
  readonly attendanceTag: string;
}

interface HoldoutResolutionVariant {
  readonly headline: (context: HoldoutResolutionTemplateContext) => string;
  readonly body: (context: HoldoutResolutionTemplateContext) => string;
}

const HOLDOUT_RESOLUTION_VARIANTS: readonly HoldoutResolutionVariant[] = [
  {
    headline: ({ name, days, teamName }) => `${name} closes a ${days}-day holdout with ${teamName}`,
    body: ({ name, gap, tone, severity }) => `${name} said the ${gap} gap is finally closed after a ${severity} standoff. The reunion read ${tone}, and the player framed the return as a chance to get the season moving again.`,
  },
  {
    headline: ({ name, teamName, days }) => `${teamName} finally get ${name} back after a ${days}-day holdout`,
    body: ({ name, gap, days, attendanceTag, tone }) => `${name} ended the dispute after ${days} days away. The ${gap} disagreement is off the board, ${attendanceTag}, and the tone around the report date felt ${tone}.`,
  },
  {
    headline: ({ teamName, name, days }) => `${teamName} settle a ${days}-day holdout and bring ${name} back`,
    body: ({ teamName, gap, days, tone }) => `${teamName} sold the settlement as a clubhouse reset. The ${gap} dispute lasted ${days} days, and team officials described the room as ${tone} once the paperwork was done.`,
  },
  {
    headline: ({ teamName, days }) => `${teamName} move past a ${days}-day holdout fight`,
    body: ({ name, gap, tone, resetVerb }) => `From the club perspective, the settlement is about ${resetVerb} structure. ${name} signed off on a deal that erased a ${gap} split, even if the reunion still sounded ${tone}.`,
  },
  {
    headline: ({ name, teamName, days }) => `Beat writers can finally retire the ${name}-${teamName} ${days}-day holdout file`,
    body: ({ days, gap, tone, severity }) => `On the beat, this resolution lands as a ${severity} correction: ${days} days of leverage, a ${gap} public divide, and a handshake that looked more ${tone} than celebratory.`,
  },
  {
    headline: ({ teamName, name, days }) => `${teamName} close the book on the ${name} ${days}-day holdout saga`,
    body: ({ days, gap, tone, attendanceTag }) => `The daily briefing no longer revolves around the ${gap} salary gap. After ${days} days of stalemate, ${attendanceTag}, and the room sounds ${tone} instead of exhausted.`,
  },
  {
    headline: ({ name, days }) => `Fans finally get ${name} back after the ${days}-day holdout thaw`,
    body: ({ name, teamName, days, gap, tone }) => `For fans, the math is simple: ${teamName} are done burning days over a ${gap} dispute. ${name} is back after ${days} days, even if the vibe around the return stays ${tone}.`,
  },
  {
    headline: ({ teamName, days }) => `${teamName} get the resolution they wanted after a ${days}-day holdout`,
    body: ({ name, days, severity, tone }) => `${name} returned after a ${severity} absence that dragged on for ${days} days. The settlement does not erase the memory of the standoff, but it does let a ${tone} clubhouse move forward.`,
  },
] as const;

function playerName(player: Pick<GeneratedPlayer, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`;
}

function formatMoney(value: number): string {
  return `$${value.toFixed(1)}M`;
}

function moraleDescriptor(score: number): string {
  if (score <= 35) return 'frayed';
  if (score <= 50) return 'tense';
  return 'controlled';
}

function resolutionToneDescriptor(score: number): string {
  if (score <= 35) return 'terse';
  if (score <= 50) return 'professional';
  return 'cordial';
}

function agentDescriptor(player: GeneratedPlayer, moraleScore: number): string {
  if (moraleScore <= 35 || player.personality.competitiveness >= 80) {
    return 'hard-line';
  }
  if (player.personality.mentalToughness >= 70) {
    return 'patient';
  }
  return 'measured';
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickVariantIndex(
  count: number,
  context: HoldoutCoverageContext,
  topicId: HoldoutBriefing['topicId'],
): number {
  if (count <= 1) {
    return 0;
  }
  if (context.rng) {
    return context.rng.nextInt(0, count - 1);
  }

  const holdout = context.player.holdoutState;
  const stableKey = [
    context.player.id,
    context.season,
    context.day,
    topicId,
    holdout?.holdoutDays ?? 0,
    holdout?.salaryGap ?? 0,
    context.moraleScore,
  ].join(':');
  return hashString(stableKey) % count;
}

export function generateHoldoutBriefing(
  context: HoldoutCoverageContext,
): HoldoutBriefing | null {
  const holdout = context.player.holdoutState;
  if (!holdout) {
    return null;
  }

  const name = playerName(context.player);
  const tone = moraleDescriptor(context.moraleScore);
  const agentTone = agentDescriptor(context.player, context.moraleScore);
  const gap = formatMoney(holdout.salaryGap);

  if (holdout.holdoutDays <= 2) {
    return {
      id: `briefing-holdout-${context.player.id}-${context.season}-${context.day}`,
      topicId: 'holdout_shock',
      topicCategory: 'HOLDOUT',
      headline: `${name} opens a holdout after a ${gap} gap with ${context.teamName}`,
      body: `${name} rejected the club's position immediately. The ${agentTone} agent is framing the dispute as a statement about respect, while the mood around camp feels ${tone}.`,
      priority: 3,
    };
  }

  if (holdout.holdoutDays <= 6) {
    return {
      id: `briefing-holdout-${context.player.id}-${context.season}-${context.day}`,
      topicId: 'holdout_posturing',
      topicCategory: 'HOLDOUT',
      headline: `${name}'s holdout moves into the posturing phase for ${context.teamName}`,
      body: `The ${agentTone} agent is leaking the ${gap} difference into the public record. Club officials are trying to keep the room ${tone}, but the standoff is no longer quiet.`,
      priority: 2,
    };
  }

  if (holdout.holdoutDays <= 13) {
    return {
      id: `briefing-holdout-${context.player.id}-${context.season}-${context.day}`,
      topicId: 'holdout_pressure',
      topicCategory: 'HOLDOUT',
      headline: `${name}'s holdout starts to press on ${context.teamName}`,
      body: `With ${holdout.holdoutDays} service days already at stake, the ${agentTone} agent is holding the line and the clubhouse temperature is turning ${tone}. Ownership pressure is starting to bleed into the daily briefing.`,
      priority: 2,
    };
  }

  return {
    id: `briefing-holdout-${context.player.id}-${context.season}-${context.day}`,
    topicId: 'holdout_crisis',
    topicCategory: 'HOLDOUT',
    headline: `${name} holdout pressure is climbing in ${context.teamName}`,
    body: `The dispute has hardened into a crisis beat. The ${agentTone} agent still points to the ${gap} gulf, and the clubhouse tone is now openly ${tone}.`,
    priority: 1,
  };
}

/**
 * Emit a resolution briefing when a serious holdout (>= 7 days) ends.
 * Returns null for short holdouts so brief disputes settle quietly without
 * cluttering the press room. Call this BEFORE the worker clears holdoutState
 * so the briefing has access to the carried-over `holdoutDays` / `salaryGap`.
 */
export function generateHoldoutResolutionBriefing(
  context: HoldoutCoverageContext,
): HoldoutBriefing | null {
  const holdout = context.player.holdoutState;
  if (!holdout) {
    return null;
  }

  if (holdout.holdoutDays < HOLDOUT_RESOLUTION_MIN_DAYS) {
    return null;
  }

  const name = playerName(context.player);
  const tone = resolutionToneDescriptor(context.moraleScore);
  const gap = formatMoney(holdout.salaryGap);
  const days = holdout.holdoutDays;
  const isCrisis = days >= HOLDOUT_RESOLUTION_CRISIS_DAYS;
  const templateContext: HoldoutResolutionTemplateContext = {
    name,
    teamName: context.teamName,
    gap,
    days,
    tone,
    severity: isCrisis ? 'full-blown' : 'week-plus',
    resetVerb: isCrisis ? 're-establishing' : 'restoring',
    attendanceTag: isCrisis ? `${name} reported after a bruising absence` : `${name} reported before the fight got any longer`,
  };
  const variant = HOLDOUT_RESOLUTION_VARIANTS[
    pickVariantIndex(HOLDOUT_RESOLUTION_VARIANTS.length, context, 'holdout_resolution')
  ]!;

  if (isCrisis) {
    return {
      id: `briefing-holdout-resolution-${context.player.id}-${context.season}-${context.day}`,
      topicId: 'holdout_resolution',
      topicCategory: 'HOLDOUT',
      headline: variant.headline(templateContext),
      body: variant.body(templateContext),
      priority: 1,
    };
  }

  return {
    id: `briefing-holdout-resolution-${context.player.id}-${context.season}-${context.day}`,
    topicId: 'holdout_resolution',
    topicCategory: 'HOLDOUT',
    headline: variant.headline(templateContext),
    body: variant.body(templateContext),
    priority: 2,
  };
}
