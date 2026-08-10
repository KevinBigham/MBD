import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import type { DraftProspect } from './draftPool.js';
import { selectDraftProspect } from './draftAI.js';
import type { DraftCandidateScoreBreakdown, OrganizationDraftProfileV1 } from './draftAI.js';

export interface AIDraftSelectionResult {
  readonly prospect: DraftProspect;
  readonly profile: Readonly<OrganizationDraftProfileV1>;
  readonly breakdown: DraftCandidateScoreBreakdown;
  readonly explanation: string;
}

function explainSelection(breakdown: DraftCandidateScoreBreakdown): string {
  const entries: Array<readonly [string, number]> = [
    ['visible board grade', breakdown.bpa], ['team need', breakdown.need], ['signability', breakdown.signability],
    ['risk/upside proxy', breakdown.riskOrUpside], ['background/age', breakdown.backgroundOrAge], ['position preference', breakdown.positionBias],
  ];
  entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const [first, second] = entries;
  return first && second && Math.abs(second[1]) > 0
    ? `Selected for ${first[0]}, with ${second[0]} also shaping the close call.`
    : `Selected for ${first?.[0] ?? 'the visible draft board'}.`;
}

export function aiSelectPickDetailed(
  rng: GameRNG,
  teamId: string,
  availableProspects: DraftProspect[],
  teamRoster: GeneratedPlayer[],
): AIDraftSelectionResult {
  const selection = selectDraftProspect(rng, teamId, availableProspects, teamRoster);
  return { ...selection, explanation: explainSelection(selection.breakdown) };
}
