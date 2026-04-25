import {
  isGuidedStartNudgeId,
  sanitizeSeenMap,
  type GuidedStartNudgeId,
  type GuidedStartNudgeRecord,
} from './nudgeState';

const GUIDED_START_NUDGE_STORAGE_PREFIX = 'mbd:nudges:';

export type GuidedStartSaveSlotId = string | number;

function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function normalizeGuidedStartSaveSlotId(saveSlotId: GuidedStartSaveSlotId): string {
  return typeof saveSlotId === 'number' ? `save-slot-${saveSlotId}` : saveSlotId;
}

export function guidedStartNudgeStorageKey(saveSlotId: GuidedStartSaveSlotId): string {
  return `${GUIDED_START_NUDGE_STORAGE_PREFIX}${normalizeGuidedStartSaveSlotId(saveSlotId)}`;
}

export function seenRecordFor(ids: readonly GuidedStartNudgeId[]): GuidedStartNudgeRecord {
  const seen: GuidedStartNudgeRecord['seen'] = {};
  for (const id of ids) {
    seen[id] = true;
  }
  return {
    createdByGuidedStart: true,
    seen,
  };
}

function parseRecord(raw: string | null): GuidedStartNudgeRecord | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if ((parsed as { createdByGuidedStart?: unknown }).createdByGuidedStart !== true) {
      return null;
    }
    return {
      createdByGuidedStart: true,
      seen: sanitizeSeenMap((parsed as { seen?: unknown }).seen),
    };
  } catch {
    return null;
  }
}

export function readGuidedStartNudgeRecord(saveSlotId: GuidedStartSaveSlotId | null): GuidedStartNudgeRecord | null {
  if (saveSlotId == null) {
    return null;
  }
  return parseRecord(storage()?.getItem(guidedStartNudgeStorageKey(saveSlotId)) ?? null);
}

function writeGuidedStartNudgeRecord(
  saveSlotId: GuidedStartSaveSlotId,
  record: GuidedStartNudgeRecord,
): void {
  storage()?.setItem(guidedStartNudgeStorageKey(saveSlotId), JSON.stringify(record));
}

export function registerGuidedStartSave(saveSlotId: GuidedStartSaveSlotId): void {
  writeGuidedStartNudgeRecord(saveSlotId, seenRecordFor([]));
}

export function markGuidedStartNudgeSeen(
  saveSlotId: GuidedStartSaveSlotId | null,
  id: GuidedStartNudgeId,
): void {
  if (saveSlotId == null || !isGuidedStartNudgeId(id)) {
    return;
  }

  const current = readGuidedStartNudgeRecord(saveSlotId);
  if (!current) {
    return;
  }

  writeGuidedStartNudgeRecord(saveSlotId, {
    createdByGuidedStart: true,
    seen: {
      ...current.seen,
      [id]: true,
    },
  });
}
