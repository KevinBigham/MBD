export const ASSISTANT_STORAGE_VERSION = 1;

export type AssistantMode = 'newcomer' | 'hardcore';

export interface AssistantState {
  version: typeof ASSISTANT_STORAGE_VERSION;
  mode: AssistantMode;
  dismissedRoutes: Record<string, true>;
  completedRoutes: Record<string, true>;
  seenStoryCallbacks: Record<string, true>;
}

export interface AssistantGuidanceReplaySummary {
  dismissedRoutes: number;
  completedRoutes: number;
  seenStoryCallbacks: number;
}

export type AssistantStateEvent =
  | { type: 'setMode'; mode: AssistantMode }
  | { type: 'dismissRoute'; routeKey: string }
  | { type: 'completeRoute'; routeKey: string }
  | { type: 'replayRoute'; routeKey: string }
  | { type: 'markStorySeen'; callbackId: string };

export type AssistantSaveId = string | number | null;

export function assistantStorageKey(saveId: AssistantSaveId): string {
  if (saveId == null) {
    return 'mbd:assistant:v1:global';
  }

  return `mbd:assistant:v1:${typeof saveId === 'number' ? `save-slot-${saveId}` : saveId}`;
}

export function createInitialAssistantState(): AssistantState {
  return {
    version: ASSISTANT_STORAGE_VERSION,
    mode: 'newcomer',
    dismissedRoutes: {},
    completedRoutes: {},
    seenStoryCallbacks: {},
  };
}

function sanitizeTrueRecord(value: unknown): Record<string, true> {
  const output: Record<string, true> = {};
  if (!value || typeof value !== 'object') {
    return output;
  }

  for (const [key, enabled] of Object.entries(value as Record<string, unknown>)) {
    if (typeof key === 'string' && key.length > 0 && enabled === true) {
      output[key] = true;
    }
  }

  return output;
}

export function sanitizeAssistantState(value: unknown): AssistantState {
  if (!value || typeof value !== 'object') {
    return createInitialAssistantState();
  }

  const record = value as Partial<AssistantState>;
  const mode: AssistantMode = record.mode === 'hardcore' ? 'hardcore' : 'newcomer';

  return {
    version: ASSISTANT_STORAGE_VERSION,
    mode,
    dismissedRoutes: sanitizeTrueRecord(record.dismissedRoutes),
    completedRoutes: sanitizeTrueRecord(record.completedRoutes),
    seenStoryCallbacks: sanitizeTrueRecord(record.seenStoryCallbacks),
  };
}

export function reduceAssistantState(
  state: AssistantState,
  event: AssistantStateEvent,
): AssistantState {
  if (event.type === 'setMode') {
    return {
      ...state,
      mode: event.mode,
    };
  }

  if (event.type === 'dismissRoute') {
    return {
      ...state,
      dismissedRoutes: {
        ...state.dismissedRoutes,
        [event.routeKey]: true,
      },
    };
  }

  if (event.type === 'completeRoute') {
    return {
      ...state,
      dismissedRoutes: {
        ...state.dismissedRoutes,
        [event.routeKey]: true,
      },
      completedRoutes: {
        ...state.completedRoutes,
        [event.routeKey]: true,
      },
    };
  }

  if (event.type === 'replayRoute') {
    const { [event.routeKey]: _dismissed, ...dismissedRoutes } = state.dismissedRoutes;
    const { [event.routeKey]: _completed, ...completedRoutes } = state.completedRoutes;
    return {
      ...state,
      dismissedRoutes,
      completedRoutes,
    };
  }

  return {
    ...state,
    seenStoryCallbacks: {
      ...state.seenStoryCallbacks,
      [event.callbackId]: true,
    },
  };
}

export function readAssistantState(saveId: AssistantSaveId): AssistantState {
  if (typeof window === 'undefined') {
    return createInitialAssistantState();
  }

  try {
    return sanitizeAssistantState(window.localStorage.getItem(assistantStorageKey(saveId)) != null
      ? JSON.parse(window.localStorage.getItem(assistantStorageKey(saveId)) ?? '')
      : null);
  } catch {
    return createInitialAssistantState();
  }
}

export function writeAssistantState(saveId: AssistantSaveId, state: AssistantState): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(assistantStorageKey(saveId), JSON.stringify(state));
  } catch {
    // localStorage is optional; the Assistant remains usable without persistence.
  }
}

export function resetAssistantGuidanceProgress(saveId: AssistantSaveId): AssistantGuidanceReplaySummary {
  const current = readAssistantState(saveId);
  const summary: AssistantGuidanceReplaySummary = {
    dismissedRoutes: Object.keys(current.dismissedRoutes).length,
    completedRoutes: Object.keys(current.completedRoutes).length,
    seenStoryCallbacks: Object.keys(current.seenStoryCallbacks).length,
  };

  writeAssistantState(saveId, {
    ...current,
    dismissedRoutes: {},
    completedRoutes: {},
    seenStoryCallbacks: {},
  });

  return summary;
}
