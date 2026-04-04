import {
  deduplicateNews,
  generateDraftBuzz,
  generateDraftCommentary,
  generateDraftGrades,
  generateDraftPickPreview,
  getTeamById,
  type DraftBuzzItem,
  type DraftCommentaryEntry,
  type DraftNarrativeCurrentPick,
  type DraftNarrativePick,
  type DraftNarrativeProspect,
  type DraftPickPreview,
  type DraftTeamGrade,
} from '@mbd/sim-core';
import {
  buildDraftRoomView,
  createStableWorkerRng,
  type FullGameState,
} from './sim.worker.helpers.js';
import { rebuildBriefing } from './sim.worker.narrative.js';

export interface DraftCommentaryView {
  heartbeat: string | null;
  entries: DraftCommentaryEntry[];
  buzz: DraftBuzzItem[];
}

export interface DraftPostDraftGradesView {
  grades: DraftTeamGrade[];
  userTeamId: string;
  userTeamGrade: DraftTeamGrade | null;
}

function mapProspect(prospect: {
  id: string;
  name: string;
  position: string;
  scoutingGrade: number;
  consensusGrade: number;
  slotValue: number;
  askBonus: number;
  bigBoardRank: number | null;
  age: number;
  origin: string;
  background: string;
}): DraftNarrativeProspect {
  return {
    id: prospect.id,
    name: prospect.name,
    position: prospect.position,
    scoutingGrade: prospect.scoutingGrade,
    consensusGrade: prospect.consensusGrade,
    slotValue: prospect.slotValue,
    askBonus: prospect.askBonus,
    bigBoardRank: prospect.bigBoardRank,
    age: prospect.age,
    origin: prospect.origin,
    background: prospect.background,
  };
}

function mapPick(pick: {
  round: number;
  pickNumber: number;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  playerId: string;
  playerName: string;
  position: string;
  scoutingGrade: number;
  origin: string;
  tone: 'user' | 'division_rival' | 'neutral';
}): DraftNarrativePick {
  return {
    round: pick.round,
    pickNumber: pick.pickNumber,
    teamId: pick.teamId,
    teamName: pick.teamName,
    teamAbbreviation: pick.teamAbbreviation,
    playerId: pick.playerId,
    playerName: pick.playerName,
    position: pick.position,
    scoutingGrade: pick.scoutingGrade,
    origin: pick.origin,
    tone: pick.tone,
  };
}

function mapCurrentPick(currentPick: {
  round: number;
  pickNumber: number;
  totalPicks: number;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  userOnClock: boolean;
} | null): DraftNarrativeCurrentPick | null {
  if (!currentPick) {
    return null;
  }

  return {
    round: currentPick.round,
    pickNumber: currentPick.pickNumber,
    totalPicks: currentPick.totalPicks,
    teamId: currentPick.teamId,
    teamName: currentPick.teamName,
    teamAbbreviation: currentPick.teamAbbreviation,
    userOnClock: currentPick.userOnClock,
  };
}

function clampVisiblePickCount(total: number, requested?: number): number {
  if (requested == null) {
    return total;
  }
  return Math.max(0, Math.min(total, requested));
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function buildHeartbeat(
  visiblePickCount: number,
  availableProspectsCount: number,
  currentPick: DraftNarrativeCurrentPick | null,
): string | null {
  if (!currentPick) {
    return visiblePickCount > 0 ? `Board locked after ${visiblePickCount} announced picks.` : null;
  }

  if (currentPick.userOnClock) {
    return `${currentPick.teamAbbreviation} are live at pick ${currentPick.pickNumber} with ${availableProspectsCount} prospects still on the board.`;
  }

  return `${currentPick.teamAbbreviation} hold the next card at pick ${currentPick.pickNumber}.`;
}

export function buildDraftCommentaryView(
  s: FullGameState,
  visiblePickCount?: number,
): DraftCommentaryView | null {
  const draft = buildDraftRoomView(s);
  if (!draft) {
    return null;
  }

  const resolvedVisiblePickCount = clampVisiblePickCount(draft.completedPicks.length, visiblePickCount);
  const visiblePicks = draft.completedPicks
    .slice(0, resolvedVisiblePickCount)
    .map(mapPick);
  const availableProspects = draft.availableProspects.map(mapProspect);
  const currentPick = mapCurrentPick(draft.currentPick);

  return {
    heartbeat: buildHeartbeat(resolvedVisiblePickCount, availableProspects.length, currentPick),
    entries: generateDraftCommentary(
      createStableWorkerRng(s, `draft-commentary:${resolvedVisiblePickCount}:${availableProspects.length}`),
      {
        totalPicks: draft.counts.totalPicks || 1,
        visiblePicks,
        currentPick,
        availableProspects,
      },
    ),
    buzz: generateDraftBuzz(
      createStableWorkerRng(s, `draft-buzz:${resolvedVisiblePickCount}:${draft.status}`),
      {
        visiblePicks,
        currentPick,
        availableProspects,
      },
    ),
  };
}

export function buildDraftProspectReactionView(
  s: FullGameState,
  prospectId: string,
): DraftPickPreview | null {
  const draft = buildDraftRoomView(s);
  const prospect = draft?.availableProspects.find((entry) => entry.id === prospectId);
  if (!draft || !prospect) {
    return null;
  }

  const userTeam = getTeamById(s.userTeamId);
  return generateDraftPickPreview(
    createStableWorkerRng(s, `draft-preview:${prospectId}:${draft.currentPick?.pickNumber ?? 'complete'}`),
    {
      prospect: mapProspect(prospect),
      currentPick: mapCurrentPick(draft.currentPick),
      teamName: draft.currentPick?.teamName ?? (userTeam ? `${userTeam.city} ${userTeam.name}` : s.userTeamId.toUpperCase()),
    },
  );
}

export function buildDraftPostDraftGradesView(
  s: FullGameState,
): DraftPostDraftGradesView | null {
  const draft = buildDraftRoomView(s);
  if (!draft || draft.status !== 'complete' || draft.completedPicks.length === 0) {
    return null;
  }

  const grades = generateDraftGrades(
    createStableWorkerRng(s, `draft-grades:${draft.completedPicks.length}`),
    {
      completedPicks: draft.completedPicks.map(mapPick),
      totalPicks: draft.counts.totalPicks || draft.completedPicks.length,
    },
  );

  return {
    grades,
    userTeamId: s.userTeamId,
    userTeamGrade: grades.find((entry) => entry.teamId === s.userTeamId) ?? null,
  };
}

export function publishDraftGradesNarrative(s: FullGameState) {
  const gradesView = buildDraftPostDraftGradesView(s);
  const draft = buildDraftRoomView(s);
  if (!gradesView || !draft) {
    return;
  }

  const storyId = `draft-grades-${s.season}`;
  if (s.news.some((item) => item.id === storyId)) {
    return;
  }

  const userGrade = gradesView.userTeamGrade ?? gradesView.grades.find((entry) => entry.teamId === s.userTeamId) ?? null;
  const topGrade = gradesView.grades[0] ?? userGrade;
  if (!userGrade || !topGrade) {
    return;
  }

  const userPicks = draft.completedPicks.filter((pick) => pick.teamId === s.userTeamId).slice(0, 3);
  const pickHeadline = userPicks.slice(0, 2).map((pick) => pick.playerName).join(', ');
  const relatedTeamIds = Array.from(new Set([s.userTeamId, topGrade.teamId]));
  const relatedPlayerIds = userPicks.map((pick) => pick.playerId);
  const headline = `${teamLabel(s.userTeamId)} draft grades: ${userGrade.grade}`;
  const body = [
    `${teamLabel(s.userTeamId)} exit the draft with a ${userGrade.grade} grade.`,
    pickHeadline ? `The class is headlined by ${pickHeadline}.` : null,
    topGrade.teamId === s.userTeamId
      ? 'The war room stacked up with the best haul on the board.'
      : `League pace-setter: ${teamLabel(topGrade.teamId)} drew the top report card at ${topGrade.grade}.`,
  ]
    .filter((part): part is string => part != null)
    .join(' ');
  const timestamp = `S${s.season}D${s.day}`;
  const newsItem = {
    id: storyId,
    headline,
    body,
    priority: 2 as const,
    category: 'draft' as const,
    tag: 'ANALYSIS' as const,
    timestamp,
    relatedPlayerIds,
    relatedTeamIds,
    read: false,
  };

  s.news = deduplicateNews([newsItem, ...s.news]);
  s.briefingQueue = [{
    id: `brief-${storyId}`,
    priority: 2 as const,
    category: 'news' as const,
    tag: 'ANALYSIS' as const,
    headline,
    body,
    relatedTeamIds,
    relatedPlayerIds,
    timestamp,
    acknowledged: false,
  }, ...s.briefingQueue];
  rebuildBriefing(s);
}
