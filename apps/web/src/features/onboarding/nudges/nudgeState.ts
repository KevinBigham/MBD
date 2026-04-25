export const GUIDED_START_NUDGE_IDS = [
  'intro_scroll',
  'first_draft_nudge',
  'first_series_pointer',
  'first_offday_autosave_prompt',
] as const;

export type GuidedStartNudgeId = typeof GUIDED_START_NUDGE_IDS[number];

export type GuidedStartNudgeSeen = Partial<Record<GuidedStartNudgeId, true>>;

export interface GuidedStartNudgeRecord {
  createdByGuidedStart: true;
  seen: GuidedStartNudgeSeen;
}

export interface GuidedStartNudgeState {
  enabled: boolean;
  seen: GuidedStartNudgeSeen;
  pending: GuidedStartNudgeSeen;
}

export type GuidedStartNudgeEvent =
  | { type: 'trigger'; id: GuidedStartNudgeId }
  | { type: 'dismiss'; id: GuidedStartNudgeId }
  | { type: 'skip'; id: GuidedStartNudgeId };

export function isGuidedStartNudgeId(value: unknown): value is GuidedStartNudgeId {
  return typeof value === 'string' && GUIDED_START_NUDGE_IDS.includes(value as GuidedStartNudgeId);
}

export function sanitizeSeenMap(value: unknown): GuidedStartNudgeSeen {
  const seen: GuidedStartNudgeSeen = {};
  if (!value || typeof value !== 'object') {
    return seen;
  }

  for (const id of GUIDED_START_NUDGE_IDS) {
    if ((value as Partial<Record<GuidedStartNudgeId, unknown>>)[id] === true) {
      seen[id] = true;
    }
  }

  return seen;
}

export function createInitialNudgeState(record: GuidedStartNudgeRecord | null): GuidedStartNudgeState {
  return {
    enabled: record?.createdByGuidedStart === true,
    seen: sanitizeSeenMap(record?.seen),
    pending: {},
  };
}

export function reduceNudgeState(
  state: GuidedStartNudgeState,
  event: GuidedStartNudgeEvent,
): GuidedStartNudgeState {
  if (!state.enabled) {
    return state;
  }

  if (event.type === 'trigger') {
    if (state.seen[event.id]) {
      return state;
    }
    return {
      ...state,
      pending: {
        ...state.pending,
        [event.id]: true,
      },
    };
  }

  const { [event.id]: _dismissed, ...pending } = state.pending;

  return {
    ...state,
    seen: {
      ...state.seen,
      [event.id]: true,
    },
    pending,
  };
}

export function selectCurrentNudgeId(state: GuidedStartNudgeState): GuidedStartNudgeId | null {
  if (!state.enabled) {
    return null;
  }

  for (const id of GUIDED_START_NUDGE_IDS) {
    if (!state.seen[id] && state.pending[id]) {
      return id;
    }
  }

  return null;
}
