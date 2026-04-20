import { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import type { GMPersonality } from '../trade/tradeAI.js';
import type { PressConferenceTopicCategory } from './pressConferences.js';

export interface ArbitrationPressConferenceContext {
  player: GeneratedPlayer;
  season: number;
  teamId: string;
  teamName: string;
  gmPersonality: GMPersonality;
  moraleScore: number;
}

export interface ArbitrationPressConference {
  id: string;
  topicId: 'team_won_vs_star' | 'player_won_underdog' | 'super_two_debut' | 'escalator_streak';
  topicCategory: Extract<PressConferenceTopicCategory, 'ARBITRATION'>;
  headline: string;
  body: string;
  priority: 2 | 3;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.max(1, hash >>> 0);
}

function formatMoney(value: number): string {
  return `$${value.toFixed(1)}M`;
}

function playerName(player: Pick<GeneratedPlayer, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`;
}

function latestEntry(context: ArbitrationPressConferenceContext) {
  const entries = context.player.arbitrationHistory.filter((entry) => entry.season === context.season);
  return entries[entries.length - 1] ?? null;
}

function consecutivePlayerWins(player: GeneratedPlayer): number {
  let streak = 0;
  for (let index = player.arbitrationHistory.length - 1; index >= 0; index -= 1) {
    if (player.arbitrationHistory[index]?.teamWon) {
      break;
    }
    streak += 1;
  }
  return streak;
}

function gmLead(personality: GMPersonality): string {
  switch (personality) {
    case 'aggressive':
      return 'The GM pushed back hard on the filing optics.';
    case 'conservative':
      return 'The GM kept the tone measured and procedural.';
    case 'prospect_hugger':
      return 'The GM framed the case around long-term roster discipline.';
    case 'win_now':
      return 'The GM argued the roster window demanded clarity now.';
    default:
      return 'The GM kept returning to the club valuation models.';
  }
}

function proxyAgentDescriptor(player: GeneratedPlayer, moraleScore: number, salaryGap: number): string {
  if (moraleScore <= 35 || salaryGap >= 2.5 || player.personality.competitiveness >= 80) {
    return 'combative';
  }
  if (player.personality.mentalToughness >= 70) {
    return 'unyielding';
  }
  return 'measured';
}

function pickVariant<T>(rng: GameRNG, values: readonly T[]): T {
  return values[rng.nextInt(0, values.length - 1)]!;
}

export function generateArbitrationPressConference(
  context: ArbitrationPressConferenceContext,
): ArbitrationPressConference {
  const entry = latestEntry(context);
  if (!entry) {
    throw new Error('generateArbitrationPressConference requires a current-season arbitration entry.');
  }

  const rng = new GameRNG(hashString(`${context.player.id}:${context.season}:${context.teamId}`));
  const name = playerName(context.player);
  const salaryGap = Math.max(0, entry.playerAsk - entry.teamOffer);
  const agentDescriptor = proxyAgentDescriptor(context.player, context.moraleScore, salaryGap);
  const streak = consecutivePlayerWins(context.player);
  const superTwoDebut = context.player.superTwoQualified && context.player.arbitrationHistory.length === 1;

  let topicId: ArbitrationPressConference['topicId'];
  if (superTwoDebut) {
    topicId = 'super_two_debut';
  } else if (!entry.teamWon && streak >= 3) {
    topicId = 'escalator_streak';
  } else if (entry.teamWon) {
    topicId = 'team_won_vs_star';
  } else {
    topicId = 'player_won_underdog';
  }

  const question = pickVariant(rng, (() => {
    switch (topicId) {
      case 'super_two_debut':
        return [
          `Why did ${context.teamName} let a Super Two case become a public fight this early?`,
          `How did ${name}'s early arbitration clock turn into today's headline?`,
        ] as const;
      case 'escalator_streak':
        return [
          `Is ${name} starting to own the room every winter?`,
          `What does another player-side win say about the club's filing strategy?`,
        ] as const;
      case 'team_won_vs_star':
        return [
          `Why did the club draw such a hard line with ${name}?`,
          `Was today's filing result about discipline or leverage?`,
        ] as const;
      case 'player_won_underdog':
        return [
          `Did ${name} just reset the tone for the entire arbitration board?`,
          `How did the player side beat the club's projection today?`,
        ] as const;
    }
  })());

  const gmQuote = pickVariant(rng, (() => {
    switch (topicId) {
      case 'super_two_debut':
        return [
          'We knew the Super Two timing would raise the temperature, but the filing still had to fit our board.',
          'A first hearing always lands loudly. We stayed with the number our process supported.',
        ] as const;
      case 'escalator_streak':
        return [
          'Past hearings do not dictate this one, even if the room wants that story.',
          'Every filing stands on its own, even when a streak makes for easy headlines.',
        ] as const;
      case 'team_won_vs_star':
        return [
          'The filing was about consistency, not theatrics.',
          'We respected the player and still held our line where the valuation said we should.',
        ] as const;
      case 'player_won_underdog':
        return [
          'We can disagree on the path and still move forward with the player.',
          'The panel heard both cases. We are turning the page and preparing for Opening Day.',
        ] as const;
    }
  })());

  const agentQuote = pickVariant(rng, (() => {
    switch (topicId) {
      case 'super_two_debut':
        return [
          `The ${agentDescriptor} agent called it an early test of how the organization values impact talent.`,
          `The ${agentDescriptor} agent said a Super Two player should not have to fight this hard for market respect.`,
        ] as const;
      case 'escalator_streak':
        return [
          `The ${agentDescriptor} agent said the record now speaks louder than the club's talking points.`,
          `The ${agentDescriptor} agent framed the result as another correction of a low filing.`,
        ] as const;
      case 'team_won_vs_star':
        return [
          `The ${agentDescriptor} agent insisted the player still outperformed the filing by a wide margin in the market.`,
          `The ${agentDescriptor} agent called the result a narrow win on paper, not a reset of the player's value.`,
        ] as const;
      case 'player_won_underdog':
        return [
          `The ${agentDescriptor} agent argued the award recognized the full value of the season.`,
          `The ${agentDescriptor} agent said the panel saw through a conservative filing.`,
        ] as const;
    }
  })());

  const headline = (() => {
    switch (topicId) {
      case 'super_two_debut':
        return `${name}'s Super Two hearing becomes the first arbitration flashpoint of the winter`;
      case 'escalator_streak':
        return `${name} turns another arbitration win into a running winter storyline`;
      case 'team_won_vs_star':
        return `${name} arbitration fallout sets the room on edge in ${context.teamName}`;
      case 'player_won_underdog':
        return `${name} wins the hearing and shifts the public tone around ${context.teamName}`;
    }
  })();

  return {
    id: `press-conference-arbitration-${context.player.id}-${context.season}-${context.teamId}`,
    topicId,
    topicCategory: 'ARBITRATION',
    headline,
    body: `${question} ${gmLead(context.gmPersonality)} GM: "${gmQuote}" The ${agentDescriptor} agent answered with: "${agentQuote}" Awarded salary: ${formatMoney(entry.awardedSalary)}.`,
    priority: topicId === 'super_two_debut' || topicId === 'escalator_streak' ? 2 : 3,
  };
}
