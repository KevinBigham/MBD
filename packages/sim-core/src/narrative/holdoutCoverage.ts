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
  topicId: 'holdout_shock' | 'holdout_posturing' | 'holdout_pressure' | 'holdout_crisis';
  topicCategory: Extract<PressConferenceTopicCategory, 'HOLDOUT'>;
  headline: string;
  body: string;
  priority: 1 | 2 | 3;
}

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
