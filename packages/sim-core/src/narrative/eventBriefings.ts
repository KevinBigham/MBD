import type { BriefingItem } from '@mbd/contracts';
import type { GameRNG } from '../math/prng.js';
import type { Moment } from '../moments/momentDetector.js';
import type { GeneratedPlayer } from '../player/generation.js';
import type { GMPersonality } from '../trade/tradeAI.js';

export const EXTENSION_SIGNED_MIN_YEARS = 4;
export const EXTENSION_SIGNED_MIN_AAV = 20;
export const EXTENSION_SIGNED_MIN_TOTAL_VALUE = 80;
export const REBUILD_ANNOUNCEMENT_WIN_PCT_THRESHOLD = 0.4;

export interface ExtensionSignedBriefingContext {
  readonly player: GeneratedPlayer;
  readonly season: number;
  readonly day: number;
  readonly teamName: string;
  readonly rng?: GameRNG;
}

export interface RebuildAnnouncementBriefingContext {
  readonly teamId: string;
  readonly teamName: string;
  readonly season: number;
  readonly day: number;
  readonly wins: number;
  readonly losses: number;
  readonly gmPersonality: GMPersonality;
  readonly teamMoments?: readonly Moment[];
  readonly rng?: GameRNG;
}

interface ExtensionTemplateContext {
  readonly name: string;
  readonly teamName: string;
  readonly years: number;
  readonly annualSalary: string;
  readonly totalValue: string;
}

interface RebuildTemplateContext {
  readonly teamName: string;
  readonly reason: string;
  readonly gmLead: string;
  readonly winPctLabel: string;
}

interface BriefingVariant<Context> {
  readonly headline: (context: Context) => string;
  readonly body: (context: Context) => string;
}

const EXTENSION_SIGNED_VARIANTS: readonly BriefingVariant<ExtensionTemplateContext>[] = [
  {
    headline: ({ name, teamName }) => `${teamName} lock in ${name} on a long extension`,
    body: ({ name, years, annualSalary, totalValue }) => `${name} agreed to stay on a ${years}-year commitment worth ${totalValue}. The deal lands at ${annualSalary} per year and reads like a franchise-anchor decision, not a placeholder move.`,
  },
  {
    headline: ({ name, years }) => `${name} stays put on a ${years}-year extension`,
    body: ({ name, teamName, annualSalary, totalValue }) => `The club and ${name} turned a negotiation beat into a long-term answer. ${teamName} now have the player secured at ${annualSalary} annually, with ${totalValue} committed overall.`,
  },
  {
    headline: ({ teamName, name }) => `${teamName} close their biggest extension question with ${name}`,
    body: ({ years, annualSalary, totalValue }) => `From the team perspective, this was about keeping a core piece off the future rumor board. The final number settled at ${totalValue} across ${years} years, or ${annualSalary} a season.`,
  },
  {
    headline: ({ name, teamName }) => `Beat writers get a clean answer on ${name} and ${teamName}`,
    body: ({ years, totalValue, annualSalary }) => `On the beat, the extension reads as a statement of intent: ${years} years, ${totalValue}, and an annual average of ${annualSalary}. This was the kind of negotiation that reshapes the calendar around one player.`,
  },
  {
    headline: ({ teamName }) => `${teamName} make the kind of extension fans remember`,
    body: ({ name, years, totalValue }) => `Fans wanted proof the front office would pay to keep the core intact, and ${name}'s ${years}-year, ${totalValue} extension is exactly that kind of receipt.`,
  },
  {
    headline: ({ name }) => `${name} cashes in without reaching the open market`,
    body: ({ teamName, years, annualSalary }) => `${teamName} kept the negotiation in-house and landed a ${years}-year pact that pays ${annualSalary} a season. The message is clear: this player was not meant to test free agency soon.`,
  },
  {
    headline: ({ teamName, name }) => `${teamName} plant a long-term flag with ${name}`,
    body: ({ totalValue, years, annualSalary }) => `The deal is heavy enough to move the room: ${totalValue} total, ${years} years, ${annualSalary} average annual value. This was a long-view commitment more than a short-term patch.`,
  },
  {
    headline: ({ name, teamName }) => `${name} and ${teamName} erase extension suspense`,
    body: ({ years, totalValue, annualSalary }) => `Any lingering extension suspense is gone. The final agreement stretches ${years} years for ${totalValue}, and the ${annualSalary} annual figure says both sides treated this as star-level business.`,
  },
] as const;

const REBUILD_ANNOUNCEMENT_VARIANTS: readonly BriefingVariant<RebuildTemplateContext>[] = [
  {
    headline: ({ teamName }) => `${teamName} stop dancing around the rebuild label`,
    body: ({ reason, gmLead, winPctLabel }) => `${gmLead} The club is leaning into a rebuild now, not later. ${reason} A ${winPctLabel} pace made the message harder to dodge.`,
  },
  {
    headline: ({ teamName }) => `${teamName} frame the next phase as a longer reset`,
    body: ({ gmLead, reason }) => `${gmLead} The organization is no longer selling a quick fix. ${reason} The public line now sounds like patience, asset collection, and fewer shortcuts.`,
  },
  {
    headline: ({ teamName }) => `Front office language turns openly rebuild-oriented in ${teamName}`,
    body: ({ gmLead, reason, winPctLabel }) => `From the podium, ${gmLead.toLowerCase()} ${reason} The ${winPctLabel} record pace made it easier to explain why the club is widening the timeline instead of chasing cosmetic upgrades.`,
  },
  {
    headline: ({ teamName }) => `${teamName} tell fans this reset is real`,
    body: ({ reason, gmLead }) => `${gmLead} Fans finally got the plainspoken version: this is a rebuild, and the organization expects some short-term discomfort while the core is reworked. ${reason}`,
  },
  {
    headline: ({ teamName }) => `${teamName} acknowledge the roster needs a deeper teardown`,
    body: ({ gmLead, reason, winPctLabel }) => `${gmLead} The language now matches the standings. ${reason} A ${winPctLabel} pace is no longer something the club is trying to explain away with small-sample optimism.`,
  },
  {
    headline: ({ teamName }) => `Beat writers hear a clear rebuild message out of ${teamName}`,
    body: ({ reason, gmLead }) => `On the beat, the key shift is tone. ${gmLead} ${reason} This sounds less like damage control and more like the organization setting expectations for a slower climb.`,
  },
  {
    headline: ({ teamName }) => `${teamName} pivot from defending the roster to rebuilding it`,
    body: ({ gmLead, reason }) => `${gmLead} The club is no longer treating this as a patch job. ${reason} The reset is being sold as structural, not symbolic.`,
  },
  {
    headline: ({ teamName }) => `${teamName} move the conversation toward patience and runway`,
    body: ({ winPctLabel, reason, gmLead }) => `${gmLead} With the club playing at a ${winPctLabel} clip, the new message is patience over urgency. ${reason}`,
  },
] as const;

function playerName(player: Pick<GeneratedPlayer, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`;
}

function formatMoney(value: number): string {
  return `$${value.toFixed(1)}M`;
}

function winPct(wins: number, losses: number): number {
  const totalGames = wins + losses;
  if (totalGames <= 0) {
    return 0;
  }
  return wins / totalGames;
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
  rng: GameRNG | undefined,
  stableKey: string,
): number {
  if (count <= 1) {
    return 0;
  }
  if (rng) {
    return rng.nextInt(0, count - 1);
  }
  return hashString(stableKey) % count;
}

function gmLead(personality: GMPersonality): string {
  switch (personality) {
    case 'aggressive':
      return 'The GM described the change as a necessary hard pivot.';
    case 'conservative':
      return 'The GM leaned on caution and patience in the explanation.';
    case 'analytical':
      return 'The GM framed the announcement as a data-backed reset.';
    case 'prospect_hugger':
      return 'The GM kept returning to development runway and prospect volume.';
    case 'win_now':
      return 'Even a win-now executive admitted the timeline had to shift.';
  }
}

function currentSeasonAcceptedExtension(
  player: GeneratedPlayer,
  season: number,
) {
  return [...(player.extensionHistory ?? [])]
    .filter((entry) => entry.season === season && entry.outcome === 'accepted')
    .sort((left, right) => right.totalValue - left.totalValue || right.years - left.years)[0] ?? null;
}

function isBigExtension(
  years: number,
  annualSalary: number,
  totalValue: number,
): boolean {
  return years >= EXTENSION_SIGNED_MIN_YEARS
    && (annualSalary >= EXTENSION_SIGNED_MIN_AAV || totalValue >= EXTENSION_SIGNED_MIN_TOTAL_VALUE);
}

function hasCurrentSeasonFireSale(
  teamMoments: readonly Moment[] | undefined,
  season: number,
): boolean {
  return teamMoments?.some((moment) => moment.season === season && moment.type === 'fire_sale') ?? false;
}

export function generateExtensionSignedBriefing(
  context: ExtensionSignedBriefingContext,
): BriefingItem | null {
  const acceptedExtension = currentSeasonAcceptedExtension(context.player, context.season);
  if (!acceptedExtension) {
    return null;
  }
  if (!isBigExtension(
    acceptedExtension.years,
    acceptedExtension.annualSalary,
    acceptedExtension.totalValue,
  )) {
    return null;
  }

  const templateContext: ExtensionTemplateContext = {
    name: playerName(context.player),
    teamName: context.teamName,
    years: acceptedExtension.years,
    annualSalary: formatMoney(acceptedExtension.annualSalary),
    totalValue: formatMoney(acceptedExtension.totalValue),
  };
  const variant = EXTENSION_SIGNED_VARIANTS[
    pickVariantIndex(
      EXTENSION_SIGNED_VARIANTS.length,
      context.rng,
      `${context.player.id}:${context.season}:${context.day}:extension_signed`,
    )
  ]!;

  return {
    id: `briefing-extension-signed-${context.player.id}-${context.season}-${context.day}`,
    priority: 2,
    category: 'extension',
    tag: 'BREAKING',
    headline: variant.headline(templateContext),
    body: variant.body(templateContext),
    relatedTeamIds: [context.player.teamId],
    relatedPlayerIds: [context.player.id],
    timestamp: `S${context.season}D${context.day}`,
    acknowledged: false,
  };
}

export function generateRebuildAnnouncementBriefing(
  context: RebuildAnnouncementBriefingContext,
): BriefingItem | null {
  const fireSaleTriggered = hasCurrentSeasonFireSale(context.teamMoments, context.season);
  const currentWinPct = winPct(context.wins, context.losses);
  if (!fireSaleTriggered && currentWinPct >= REBUILD_ANNOUNCEMENT_WIN_PCT_THRESHOLD) {
    return null;
  }

  const templateContext: RebuildTemplateContext = {
    teamName: context.teamName,
    reason: fireSaleTriggered
      ? 'A current-season fire sale already put the organization on record as sellers.'
      : 'The season record pushed the room beyond soft language and into a more honest reset.',
    gmLead: gmLead(context.gmPersonality),
    winPctLabel: currentWinPct.toFixed(3),
  };
  const variant = REBUILD_ANNOUNCEMENT_VARIANTS[
    pickVariantIndex(
      REBUILD_ANNOUNCEMENT_VARIANTS.length,
      context.rng,
      `${context.teamId}:${context.season}:${context.day}:rebuild_announcement`,
    )
  ]!;

  return {
    id: `briefing-rebuild-announcement-${context.teamId}-${context.season}-${context.day}`,
    priority: fireSaleTriggered ? 1 : 2,
    category: 'news',
    tag: fireSaleTriggered ? 'BREAKING' : 'ANALYSIS',
    headline: variant.headline(templateContext),
    body: variant.body(templateContext),
    relatedTeamIds: [context.teamId],
    relatedPlayerIds: [],
    timestamp: `S${context.season}D${context.day}`,
    acknowledged: false,
  };
}
