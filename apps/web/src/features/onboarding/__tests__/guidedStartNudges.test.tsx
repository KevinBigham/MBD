import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  createInitialNudgeState,
  reduceNudgeState,
  selectCurrentNudgeId,
  type GuidedStartNudgeId,
} from '../nudges/nudgeState';
import {
  readGuidedStartNudgeRecord,
  registerGuidedStartSave,
  seenRecordFor,
  guidedStartNudgeStorageKey,
  markGuidedStartNudgeSeen,
} from '../nudges/guidedStartNudgeStore';
import { GuidedStartNudgeCard } from '../nudges/GuidedStartNudgeCard';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createStorageMock(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => [...values.keys()][index] ?? null),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

describe('guided start nudge state machine', () => {
  it('returns the same sequence for the same deterministic event stream', () => {
    const events = [
      { type: 'trigger', id: 'intro_scroll' },
      { type: 'trigger', id: 'first_draft_nudge' },
      { type: 'dismiss', id: 'intro_scroll' },
      { type: 'trigger', id: 'first_series_pointer' },
      { type: 'dismiss', id: 'first_draft_nudge' },
      { type: 'dismiss', id: 'first_series_pointer' },
      { type: 'trigger', id: 'first_offday_autosave_prompt' },
    ] as const;

    const run = () => {
      let state = createInitialNudgeState(seenRecordFor([]));
      const current: Array<GuidedStartNudgeId | null> = [];
      for (const event of events) {
        state = reduceNudgeState(state, event);
        current.push(selectCurrentNudgeId(state));
      }
      return current;
    };

    expect(run()).toEqual(run());
    expect(run()).toEqual([
      'intro_scroll',
      'intro_scroll',
      'first_draft_nudge',
      'first_draft_nudge',
      'first_series_pointer',
      null,
      'first_offday_autosave_prompt',
    ]);
  });

  it('treats dismiss as idempotent and never re-fires a seen nudge', () => {
    let state = createInitialNudgeState(seenRecordFor([]));
    state = reduceNudgeState(state, { type: 'trigger', id: 'intro_scroll' });
    state = reduceNudgeState(state, { type: 'dismiss', id: 'intro_scroll' });
    state = reduceNudgeState(state, { type: 'dismiss', id: 'intro_scroll' });
    state = reduceNudgeState(state, { type: 'trigger', id: 'intro_scroll' });

    expect(selectCurrentNudgeId(state)).toBeNull();
    expect(state.seen.intro_scroll).toBe(true);
  });

  it('suppresses every nudge when no guided-start record exists for the save', () => {
    let state = createInitialNudgeState(null);
    state = reduceNudgeState(state, { type: 'trigger', id: 'intro_scroll' });
    state = reduceNudgeState(state, { type: 'trigger', id: 'first_draft_nudge' });
    state = reduceNudgeState(state, { type: 'trigger', id: 'first_series_pointer' });
    state = reduceNudgeState(state, { type: 'trigger', id: 'first_offday_autosave_prompt' });

    expect(selectCurrentNudgeId(state)).toBeNull();
    expect(state.enabled).toBe(false);
  });
});

describe('guided start nudge localStorage persistence', () => {
  beforeEach(() => {
    const storage = createStorageMock();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
  });

  it('uses the save-slot-scoped storage key and registers new saves as eligible', () => {
    registerGuidedStartSave('save-slot-2');

    expect(guidedStartNudgeStorageKey('save-slot-2')).toBe('mbd:nudges:save-slot-2');
    expect(readGuidedStartNudgeRecord('save-slot-2')).toEqual(seenRecordFor([]));
  });

  it('persists seen nudges without changing the GameSnapshot shape', () => {
    registerGuidedStartSave('save-slot-2');
    markGuidedStartNudgeSeen('save-slot-2', 'intro_scroll');
    markGuidedStartNudgeSeen('save-slot-2', 'first_draft_nudge');

    expect(readGuidedStartNudgeRecord('save-slot-2')?.seen).toEqual({
      intro_scroll: true,
      first_draft_nudge: true,
    });
  });

  it('returns null for missing keys so pre-LC2 existing saves do not replay nudges', () => {
    expect(readGuidedStartNudgeRecord('save-slot-4')).toBeNull();
  });
});

describe('GuidedStartNudgeCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders intro scroll copy and dismisses with the expected CTA', async () => {
    const onDismiss = vi.fn();

    await act(async () => {
      root.render(
        <GuidedStartNudgeCard
          current="intro_scroll"
          onDismiss={onDismiss}
        />,
      );
    });

    expect(container.textContent).toContain('The owner handed you the keys');
    const button = [...container.querySelectorAll('button')]
      .find((candidate) => candidate.textContent === "Let's go.") as HTMLButtonElement | undefined;
    expect(button).toBeDefined();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onDismiss).toHaveBeenCalledWith('intro_scroll');
  });

  it('offers an export action for the first off-day autosave prompt', async () => {
    const onDismiss = vi.fn();
    const onExportBackup = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      root.render(
        <GuidedStartNudgeCard
          current="first_offday_autosave_prompt"
          onDismiss={onDismiss}
          onExportBackup={onExportBackup}
        />,
      );
    });

    expect(container.textContent).toContain('Grab a backup');
    const exportButton = [...container.querySelectorAll('button')]
      .find((candidate) => candidate.textContent === 'Export backup') as HTMLButtonElement | undefined;
    const notNowButton = [...container.querySelectorAll('button')]
      .find((candidate) => candidate.textContent === 'Not now') as HTMLButtonElement | undefined;

    await act(async () => {
      exportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onExportBackup).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith('first_offday_autosave_prompt');

    await act(async () => {
      notNowButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onDismiss).toHaveBeenCalledWith('first_offday_autosave_prompt');
  });
});
