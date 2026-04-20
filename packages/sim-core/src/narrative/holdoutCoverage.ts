import type { GeneratedPlayer } from '../player/generation.js';
import type { PressConferenceTopicCategory } from './pressConferences.js';

export interface HoldoutCoverageContext {
  player: GeneratedPlayer;
  season: number;
  day: number;
  teamName: string;
  moraleScore: number;
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

  if (isCrisis) {
    return {
      id: `briefing-holdout-resolution-${context.player.id}-${context.season}-${context.day}`,
      topicId: 'holdout_resolution',
      topicCategory: 'HOLDOUT',
      headline: `${name} ends a ${days}-day holdout and reports to ${context.teamName}`,
      body: `The ${gap} dispute is closed. The reunion read ${tone}; ${context.teamName} is still weighing the damage from the extended absence.`,
      priority: 1,
    };
  }

  return {
    id: `briefing-holdout-resolution-${context.player.id}-${context.season}-${context.day}`,
    topicId: 'holdout_resolution',
    topicCategory: 'HOLDOUT',
    headline: `${name} closes a ${days}-day holdout with ${context.teamName}`,
    body: `The ${gap} gap is settled; ${name} reported to camp with a ${tone} tone. Last offseason's pressure beat is off the board.`,
    priority: 2,
  };
}
