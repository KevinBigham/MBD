import { describe, expect, it } from 'vitest';
import {
  createSaveRecoveryRequest,
  initialSaveRecoveryState,
  saveRecoveryReducer,
  type SaveRecoveryEvent,
} from '../reducer';
import type { LoadSaveSafelyResult, SaveLoadFailureReason } from '@/shared/lib/saveSystem';

function failure(reason: SaveLoadFailureReason): Extract<LoadSaveSafelyResult, { ok: false }> {
  return {
    ok: false,
    reason,
    detail: {
      slotId: 'save-slot-2',
      slotNumber: 2,
      message: `Failure: ${reason}`,
      rawJson: '{"id":"save-slot-2"}',
      schemaVersion: reason === 'version_too_new' ? 999 : 33,
      currentVersion: 33,
      minimumSupportedVersion: 2,
    },
  };
}

describe('saveRecoveryReducer', () => {
  it('drives the recovery state machine through every busy state', () => {
    const request = createSaveRecoveryRequest(failure('parse'));

    const detecting = saveRecoveryReducer(initialSaveRecoveryState, { type: 'detect' });
    expect(detecting.status).toBe('detecting');

    const showing = saveRecoveryReducer(detecting, { type: 'show_failure', request });
    expect(showing).toMatchObject({
      status: 'showing_dialog',
      request,
      detailsVisible: false,
    });

    const details = saveRecoveryReducer(showing, { type: 'toggle_details' });
    expect(details).toMatchObject({
      status: 'showing_dialog',
      detailsVisible: true,
    });

    const exporting = saveRecoveryReducer(details, { type: 'export_start' });
    expect(exporting.status).toBe('exporting');
    expect(exporting.request).toBe(request);

    const exported = saveRecoveryReducer(exporting, { type: 'export_finish' });
    expect(exported.status).toBe('showing_dialog');

    const deleting = saveRecoveryReducer(exported, { type: 'delete_start' });
    expect(deleting.status).toBe('deleting');

    expect(saveRecoveryReducer(deleting, { type: 'delete_finish' })).toEqual(initialSaveRecoveryState);

    const retrying = saveRecoveryReducer(showing, { type: 'retry_start' });
    expect(retrying.status).toBe('retrying');

    const retryFailed = saveRecoveryReducer(retrying, { type: 'retry_failure', request });
    expect(retryFailed).toMatchObject({
      status: 'showing_dialog',
      request,
    });

    expect(saveRecoveryReducer(retrying, { type: 'retry_success' })).toEqual(initialSaveRecoveryState);
  });

  it('is deterministic for the same event sequence', () => {
    const request = createSaveRecoveryRequest(failure('migration_failed'));
    const events: SaveRecoveryEvent[] = [
      { type: 'detect' },
      { type: 'show_failure', request },
      { type: 'toggle_details' },
      { type: 'export_start' },
      { type: 'export_finish' },
      { type: 'retry_start' },
      { type: 'retry_failure', request },
    ];

    const left = events.reduce(saveRecoveryReducer, initialSaveRecoveryState);
    const right = events.reduce(saveRecoveryReducer, initialSaveRecoveryState);

    expect(left).toEqual(right);
  });
});
