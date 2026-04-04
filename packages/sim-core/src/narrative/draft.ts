import { GameRNG } from '../math/prng.js';

export type DraftNarrativeTone = 'user' | 'division_rival' | 'neutral';

export interface DraftNarrativeProspect {
  readonly id: string;
  readonly name: string;
  readonly position: string;
  readonly scoutingGrade: number;
  readonly consensusGrade: number;
  readonly slotValue: number;
  readonly askBonus: number;
  readonly bigBoardRank: number | null;
  readonly age: number;
  readonly origin: string;
  readonly background: string;
}

export interface DraftNarrativePick {
  readonly round: number;
  readonly pickNumber: number;
  readonly teamId: string;
  readonly teamName: string;
  readonly teamAbbreviation: string;
  readonly playerId: string;
  readonly playerName: string;
  readonly position: string;
  readonly scoutingGrade: number;
  readonly origin: string;
  readonly tone: DraftNarrativeTone;
}

export interface DraftNarrativeCurrentPick {
  readonly round: number;
  readonly pickNumber: number;
  readonly totalPicks: number;
  readonly teamId: string;
  readonly teamName: string;
  readonly teamAbbreviation: string;
  readonly userOnClock: boolean;
}

export interface DraftCommentaryEntry {
  readonly id: string;
  readonly pickNumber: number | null;
  readonly tag: 'commissioner' | 'analyst' | 'scouting-director';
  readonly headline: string;
  readonly detail: string;
  readonly tone: DraftNarrativeTone;
  readonly playerId: string | null;
}

export interface DraftBuzzItem {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
  readonly trend: 'up' | 'steady' | 'down';
  readonly urgency: 'watch' | 'target' | 'heat';
  readonly playerId: string | null;
  readonly teamId: string | null;
}

export interface DraftPickPreview {
  readonly playerId: string;
  readonly headline: string;
  readonly summary: string;
  readonly fit: string;
  readonly risk: string;
  readonly signability: string;
  readonly recommendation: 'sprint' | 'hover' | 'pass';
}

export interface DraftTeamGrade {
  readonly teamId: string;
  readonly teamName: string;
  readonly pickCount: number;
  readonly averageScoutingGrade: number;
  readonly grade: string;
  readonly bestPickPlayerId: string;
  readonly bestPickPlayerName: string;
  readonly summary: string;
}

function pickOne<T>(rng: GameRNG, values: readonly T[]): T {
  return values[Math.floor(rng.nextFloat() * values.length)]!;
}

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function expectedGradeForPick(pickNumber: number, totalPicks: number): number {
  return 66 - (((pickNumber - 1) / Math.max(1, totalPicks - 1)) * 28);
}

function humanizeBackground(value: string): string {
  return value.replace(/_/g, ' ');
}

function describePosition(position: string): string {
  if (position === 'SP' || position === 'RP') {
    return 'arm';
  }
  if (position === 'C') {
    return 'catcher';
  }
  if (['SS', '2B', '3B', 'CF'].includes(position)) {
    return 'up-the-middle athlete';
  }
  return 'bat';
}

function valueDeltaForPick(pick: DraftNarrativePick, totalPicks: number): number {
  return pick.scoutingGrade - expectedGradeForPick(pick.pickNumber, totalPicks);
}

function valueDeltaForProspect(prospect: DraftNarrativeProspect, currentPick: DraftNarrativeCurrentPick | null): number {
  if (!currentPick) {
    return prospect.scoutingGrade - prospect.consensusGrade;
  }
  return prospect.scoutingGrade - expectedGradeForPick(currentPick.pickNumber, currentPick.totalPicks);
}

function signabilityRatio(prospect: DraftNarrativeProspect): number {
  return prospect.askBonus / Math.max(0.1, prospect.slotValue);
}

function recommendationForProspect(
  prospect: DraftNarrativeProspect,
  currentPick: DraftNarrativeCurrentPick | null,
): DraftPickPreview['recommendation'] {
  const valueDelta = valueDeltaForProspect(prospect, currentPick);
  const bonusRatio = signabilityRatio(prospect);

  if (valueDelta >= 5 && bonusRatio <= 1.08) {
    return 'sprint';
  }
  if (valueDelta >= 0 || bonusRatio <= 1.18) {
    return 'hover';
  }
  return 'pass';
}

function fitLine(position: string, teamName: string): string {
  switch (position) {
    case 'SP':
      return `${teamName} would be buying innings volume and starter backbone here.`;
    case 'RP':
      return `${teamName} would be betting on pure stuff and a quicker bullpen path.`;
    case 'C':
      return `${teamName} would be adding a scarce defensive spine piece with lineup value.`;
    case 'SS':
    case '2B':
    case '3B':
      return `${teamName} would be targeting an infielder who can stay in the middle of the diamond.`;
    case 'CF':
      return `${teamName} would be adding range, speed, and center-field insurance.`;
    default:
      return `${teamName} would be prioritizing impact bat speed over a low-variance floor.`;
  }
}

function riskLine(prospect: DraftNarrativeProspect, recommendation: DraftPickPreview['recommendation']): string {
  if (prospect.age <= 18 || prospect.background.includes('high school')) {
    return `The risk lives in the runway: ${humanizeBackground(prospect.background)} profile, more development turns, more variance.`;
  }
  if (recommendation === 'pass') {
    return 'The bat-to-slot fit is light, so the downside is paying full freight for a thinner margin.';
  }
  return 'The risk is manageable: the profile is advanced enough that the board can absorb the swing.';
}

function signabilityLine(prospect: DraftNarrativeProspect): string {
  const ratio = signabilityRatio(prospect);
  if (ratio >= 1.18) {
    return `The bonus ask is aggressive at $${prospect.askBonus.toFixed(2)}M, well north of the $${prospect.slotValue.toFixed(2)}M slot.`;
  }
  if (ratio <= 0.98) {
    return `The signability should play cleanly: $${prospect.askBonus.toFixed(2)}M sits at or below the $${prospect.slotValue.toFixed(2)}M slot.`;
  }
  return `The bonus ask is workable at $${prospect.askBonus.toFixed(2)}M against a $${prospect.slotValue.toFixed(2)}M slot.`;
}

function commentaryHeadline(rng: GameRNG, pick: DraftNarrativePick, totalPicks: number): string {
  const delta = valueDeltaForPick(pick, totalPicks);

  if (pick.tone === 'user') {
    return pickOne(rng, [
      `${pick.teamAbbreviation} turn in ${pick.playerName} at ${ordinal(pick.pickNumber)} overall`,
      `${pick.playerName} is headed to ${pick.teamName}`,
      `${pick.teamAbbreviation} call their shot with ${pick.playerName}`,
    ]);
  }

  if (delta >= 4) {
    return pickOne(rng, [
      `${pick.teamAbbreviation} may have found value with ${pick.playerName}`,
      `${pick.playerName} lasts longer than expected before ${pick.teamAbbreviation} pounce`,
      `${pick.teamAbbreviation} capitalize on the slide with ${pick.playerName}`,
    ]);
  }

  if (delta <= -4) {
    return pickOne(rng, [
      `${pick.teamAbbreviation} push the board with ${pick.playerName}`,
      `${pick.playerName} comes off a touch early to ${pick.teamAbbreviation}`,
      `${pick.teamAbbreviation} trust their room on ${pick.playerName}`,
    ]);
  }

  return pickOne(rng, [
    `${pick.teamAbbreviation} stay on slot with ${pick.playerName}`,
    `${pick.playerName} comes off the board right on schedule`,
    `${pick.teamAbbreviation} make the expected call on ${pick.playerName}`,
  ]);
}

function commentaryDetail(rng: GameRNG, pick: DraftNarrativePick, totalPicks: number): string {
  const delta = valueDeltaForPick(pick, totalPicks);
  const role = describePosition(pick.position);

  if (delta >= 4) {
    return pickOne(rng, [
      `${pick.teamName} waited out the room and still landed a ${role} carrying a ${pick.scoutingGrade} grade.`,
      `That is a clean value shot for ${pick.teamName}: ${pick.playerName} still on the board with real ${role} upside.`,
      `${pick.teamName} buy the slide and walk away with a ${role} who outperforms the slot on paper.`,
    ]);
  }

  if (delta <= -4) {
    return pickOne(rng, [
      `${pick.teamName} are betting on their own board here, because the public model had ${pick.playerName} a little later.`,
      `${pick.teamName} jump the market for this ${role}; the conviction is obvious even if the slot is rich.`,
      `This is a trust-your-scouts selection from ${pick.teamName}, taking the ${role} before the consensus expected.`,
    ]);
  }

  return pickOne(rng, [
    `${pick.teamName} keep the room moving with a balanced ${role} profile that matches the slot.`,
    `${pick.playerName} fits the ${ordinal(pick.pickNumber)} spot: solid board value, clean positional logic, no panic.`,
    `${pick.teamName} stay disciplined and take a ${role} who belongs in this part of the draft.`,
  ]);
}

export function generateDraftCommentary(
  rng: GameRNG,
  context: {
    readonly totalPicks: number;
    readonly visiblePicks: readonly DraftNarrativePick[];
    readonly currentPick: DraftNarrativeCurrentPick | null;
    readonly availableProspects: readonly DraftNarrativeProspect[];
  },
): DraftCommentaryEntry[] {
  const entries: DraftCommentaryEntry[] = context.visiblePicks.slice(-4).map((pick) => ({
    id: `pick-${pick.pickNumber}`,
    pickNumber: pick.pickNumber,
    tag: pick.tone === 'user' ? 'scouting-director' : 'analyst',
    headline: commentaryHeadline(rng, pick, context.totalPicks),
    detail: commentaryDetail(rng, pick, context.totalPicks),
    tone: pick.tone,
    playerId: pick.playerId,
  }));

  if (context.currentPick) {
    const nextNames = context.availableProspects
      .slice()
      .sort((left, right) => {
        const leftBoard = left.bigBoardRank ?? Number.MAX_SAFE_INTEGER;
        const rightBoard = right.bigBoardRank ?? Number.MAX_SAFE_INTEGER;
        return leftBoard - rightBoard || right.scoutingGrade - left.scoutingGrade || left.name.localeCompare(right.name);
      })
      .slice(0, 3)
      .map((prospect) => prospect.name);

    const nextDetail = context.currentPick.userOnClock
      ? `Best names left for ${context.currentPick.teamName}: ${nextNames.join(', ')}.`
      : `${context.currentPick.teamName} are on deck with ${nextNames.join(', ')} still alive on the board.`;

    entries.push({
      id: `clock-${context.currentPick.pickNumber}`,
      pickNumber: null,
      tag: context.currentPick.userOnClock ? 'scouting-director' : 'commissioner',
      headline: context.currentPick.userOnClock
        ? `${context.currentPick.teamAbbreviation} are on the clock at ${ordinal(context.currentPick.pickNumber)}`
        : `${context.currentPick.teamAbbreviation} sit on the clock at ${ordinal(context.currentPick.pickNumber)}`,
      detail: nextDetail,
      tone: context.currentPick.userOnClock ? 'user' : 'neutral',
      playerId: null,
    });
  }

  return entries;
}

export function generateDraftBuzz(
  rng: GameRNG,
  context: {
    readonly visiblePicks: readonly DraftNarrativePick[];
    readonly currentPick: DraftNarrativeCurrentPick | null;
    readonly availableProspects: readonly DraftNarrativeProspect[];
  },
): DraftBuzzItem[] {
  const items: DraftBuzzItem[] = [];
  const recentPicks = context.visiblePicks.slice(-6);

  const slideCandidate = context.availableProspects
    .slice()
    .sort((left, right) => {
      const leftBoard = left.bigBoardRank ?? Number.MAX_SAFE_INTEGER;
      const rightBoard = right.bigBoardRank ?? Number.MAX_SAFE_INTEGER;
      return leftBoard - rightBoard || right.scoutingGrade - left.scoutingGrade || left.name.localeCompare(right.name);
    })[0] ?? null;

  if (slideCandidate) {
    items.push({
      id: `slide-${slideCandidate.id}`,
      label: 'Value Slide',
      summary: `${slideCandidate.name} is still live with a ${slideCandidate.scoutingGrade} grade and ${slideCandidate.bigBoardRank ? `big-board rank #${slideCandidate.bigBoardRank}` : 'first-round heat'}.`,
      trend: 'up',
      urgency: 'target',
      playerId: slideCandidate.id,
      teamId: null,
    });
  }

  const hotBonusCandidate = context.availableProspects
    .slice()
    .sort((left, right) =>
      signabilityRatio(right) - signabilityRatio(left)
      || right.askBonus - left.askBonus
      || left.name.localeCompare(right.name))[0] ?? null;
  if (hotBonusCandidate) {
    const ratio = signabilityRatio(hotBonusCandidate);
    items.push({
      id: `bonus-${hotBonusCandidate.id}`,
      label: 'Bonus Heat',
      summary: ratio >= 1.18
        ? `${hotBonusCandidate.name} is asking well over slot, so the price tag is driving the room.`
        : `${hotBonusCandidate.name} has enough bonus tension to keep a few clubs guessing.`,
      trend: ratio >= 1.18 ? 'up' : 'steady',
      urgency: 'watch',
      playerId: hotBonusCandidate.id,
      teamId: null,
    });
  }

  const positionCounts = new Map<string, number>();
  for (const pick of recentPicks) {
    const bucket = pick.position === 'SP' || pick.position === 'RP' ? 'pitching' : 'bats';
    positionCounts.set(bucket, (positionCounts.get(bucket) ?? 0) + 1);
  }
  const recentRun = [...positionCounts.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;
  if (recentRun) {
    items.push({
      id: `run-${recentRun[0]}`,
      label: recentRun[0] === 'pitching' ? 'Arm Run' : 'Bat Run',
      summary: pickOne(rng, [
        `${recentRun[1]} of the last ${recentPicks.length} cards have leaned ${recentRun[0]}, so the market is tilting.`,
        `The room is pushing ${recentRun[0]} right now with ${recentRun[1]} recent hits in that lane.`,
      ]),
      trend: 'up',
      urgency: 'heat',
      playerId: null,
      teamId: null,
    });
  }

  if (context.currentPick) {
    items.push({
      id: `clock-${context.currentPick.teamId}-${context.currentPick.pickNumber}`,
      label: context.currentPick.userOnClock ? 'Room Pressure' : 'Next Card',
      summary: context.currentPick.userOnClock
        ? `${context.currentPick.teamName} can set the next turn of the board right now.`
        : `${context.currentPick.teamName} are next, so the board can turn quickly here.`,
      trend: context.currentPick.userOnClock ? 'up' : 'steady',
      urgency: context.currentPick.userOnClock ? 'target' : 'watch',
      playerId: null,
      teamId: context.currentPick.teamId,
    });
  }

  return items.slice(0, 4);
}

export function generateDraftPickPreview(
  rng: GameRNG,
  context: {
    readonly prospect: DraftNarrativeProspect;
    readonly currentPick: DraftNarrativeCurrentPick | null;
    readonly teamName: string;
  },
): DraftPickPreview {
  const { prospect, currentPick, teamName } = context;
  const recommendation = recommendationForProspect(prospect, currentPick);
  const valueDelta = valueDeltaForProspect(prospect, currentPick);
  const summaryTemplate = recommendation === 'sprint'
    ? [
        `${prospect.name} is tracking as a clear value if this board stays open.`,
        `${prospect.name} has real chance to beat the slot and justify a fast card.`,
      ]
    : recommendation === 'hover'
      ? [
          `${prospect.name} sits in the workable middle ground: not a steal, not a reach, just a live option.`,
          `${prospect.name} fits the zone where talent and cost can still balance out.`,
        ]
      : [
          `${prospect.name} is more of a board-management play than a clean value swing.`,
          `${prospect.name} carries enough price or profile risk that the room should hesitate.`,
        ];

  const headline = recommendation === 'sprint'
    ? pickOne(rng, [
        `${prospect.name} is the run-to-the-podium option`,
        `${prospect.name} looks like a board win if the card is ready`,
      ])
    : recommendation === 'hover'
      ? pickOne(rng, [
          `${prospect.name} keeps the room honest`,
          `${prospect.name} is still a sensible card in this lane`,
        ])
      : pickOne(rng, [
          `${prospect.name} is the tougher sell`,
          `${prospect.name} needs the room to love the projection`,
        ]);

  const boardContext = prospect.bigBoardRank
    ? `Board rank #${prospect.bigBoardRank}`
    : 'Consensus board still settling';
  const deltaLabel = valueDelta >= 4
    ? 'The talent is beating the slot.'
    : valueDelta <= -4
      ? 'The slot would be doing the heavy lifting.'
      : 'The board and the slot are roughly aligned.';

  return {
    playerId: prospect.id,
    headline,
    summary: `${pickOne(rng, summaryTemplate)} ${boardContext}. ${deltaLabel}`,
    fit: fitLine(prospect.position, teamName),
    risk: riskLine(prospect, recommendation),
    signability: signabilityLine(prospect),
    recommendation,
  };
}

function gradeFromAverageDelta(averageDelta: number): string {
  if (averageDelta >= 8) return 'A';
  if (averageDelta >= 4) return 'B';
  if (averageDelta >= 0) return 'C';
  if (averageDelta >= -4) return 'D';
  return 'F';
}

function gradeRank(grade: string): number {
  switch (grade) {
    case 'A':
      return 5;
    case 'B':
      return 4;
    case 'C':
      return 3;
    case 'D':
      return 2;
    default:
      return 1;
  }
}

export function generateDraftGrades(
  rng: GameRNG,
  context: {
    readonly completedPicks: readonly DraftNarrativePick[];
    readonly totalPicks: number;
  },
): DraftTeamGrade[] {
  const grouped = new Map<string, { teamName: string; picks: DraftNarrativePick[] }>();

  for (const pick of context.completedPicks) {
    const existing = grouped.get(pick.teamId) ?? {
      teamName: pick.teamName,
      picks: [],
    };
    existing.picks.push(pick);
    grouped.set(pick.teamId, existing);
  }

  return [...grouped.entries()]
    .map(([teamId, entry]) => {
      const deltas = entry.picks.map((pick) => valueDeltaForPick(pick, context.totalPicks));
      const averageDelta = deltas.reduce((sum, value) => sum + value, 0) / entry.picks.length;
      const averageScoutingGrade = Number(
        (entry.picks.reduce((sum, pick) => sum + pick.scoutingGrade, 0) / entry.picks.length).toFixed(1),
      );
      const rankedPicks = entry.picks
        .slice()
        .sort((left, right) =>
          valueDeltaForPick(right, context.totalPicks) - valueDeltaForPick(left, context.totalPicks)
          || right.scoutingGrade - left.scoutingGrade
          || left.pickNumber - right.pickNumber);
      const bestPick = rankedPicks[0]!;
      const summaryLead = gradeFromAverageDelta(averageDelta) === 'A'
        ? pickOne(rng, [
            `${entry.teamName} won the room with volume and quality.`,
            `${entry.teamName} stacked value without drifting from the board.`,
          ])
        : gradeFromAverageDelta(averageDelta) === 'F'
          ? pickOne(rng, [
              `${entry.teamName} chased too many projections for this to land well.`,
              `${entry.teamName} paid a premium for upside and the board noticed.`,
            ])
          : pickOne(rng, [
              `${entry.teamName} put together a workable class with some real points of strength.`,
              `${entry.teamName} stayed functional through the board and still found a few wins.`,
            ]);

      return {
        teamId,
        teamName: entry.teamName,
        pickCount: entry.picks.length,
        averageScoutingGrade,
        grade: gradeFromAverageDelta(averageDelta),
        bestPickPlayerId: bestPick.playerId,
        bestPickPlayerName: bestPick.playerName,
        summary: `${summaryLead} ${bestPick.playerName} was the tone-setter, and the class averaged ${averageScoutingGrade.toFixed(1)}.`,
      };
    })
    .sort((left, right) =>
      gradeRank(right.grade) - gradeRank(left.grade)
      || right.averageScoutingGrade - left.averageScoutingGrade
      || left.teamName.localeCompare(right.teamName));
}
