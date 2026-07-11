import { describe, expect, it } from 'vitest';
import {
  createSaveRecoveryRequest,
  initialSaveRecoveryState,
  saveRecoveryReducer,
  type SaveRecoveryEvent,
} from '../reducer';
import type { LoadSaveSafelyResult, SaveLoadFailureReason } from '@/shared/lib/saveSystem';

function failure(
  reason: SaveLoadFailureReason,
  repairAvailable = false,
): Extract<LoadSaveSafelyResult, { ok: false }> {
  return {
    ok: false,
    reason,
    detail: {
      slotId: 'save-slot-2',
      slotNumber: 2,
      message: `Failure: ${reason}`,
      rawJson: '{"id":"save-slot-2"}',
      schemaVersion: reason === 'version_too_new' ? 999 : 34,
      currentVersion: 33,
      minimumSupportedVersion: 2,
      repairAvailable,
      repairUpdatedAt: '2026-07-11T14:30:00.000Z',
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

  it('marks only integrity failures with a verified copy as repairable', () => {
    const repairable = createSaveRecoveryRequest(failure('integrity_failed', true));
    expect(repairable.canRepair).toBe(true);
    expect(repairable.title).toBe('This local save changed after MBD sealed it.');
    expect(repairable.body).toContain('accidental local corruption');
    expect(repairable.body).toContain('same save generation');
    expect(repairable.body).toContain(new Date('2026-07-11T14:30:00.000Z').toLocaleString());
    expect(repairable.body).toContain('not a security guarantee or an older-save rollback');

    expect(createSaveRecoveryRequest(failure('integrity_failed')).canRepair).toBe(false);
    expect(createSaveRecoveryRequest(failure('integrity_failed')).body).toContain(
      'No verified same-generation copy is currently available.',
    );
    expect(createSaveRecoveryRequest(failure('parse', true)).canRepair).toBe(false);

    const unavailableFailure = failure('integrity_failed');
    unavailableFailure.detail.integrityFailureKind = 'unavailable';
    const unavailable = createSaveRecoveryRequest(unavailableFailure);
    expect(unavailable.title).toBe('MBD could not verify this local save in this browser.');
    expect(unavailable.body).toContain('does not mean the save data changed');
    expect(unavailable.body).not.toContain('accidental local corruption');

    const unsupportedFailure = failure('integrity_failed', true);
    unsupportedFailure.detail.integrityFailureKind = 'unsupported';
    const unsupported = createSaveRecoveryRequest(unsupportedFailure);
    expect(unsupported.title).toContain('cannot verify');
    expect(unsupported.body).toContain('does not prove that the save data changed');
    expect(unsupported.body).toContain('verified copy of the same save generation');
  });

  it('keeps restore and restored-reload failures distinct and accessible to the dialog', () => {
    const request = createSaveRecoveryRequest(failure('integrity_failed', true));
    const showing = saveRecoveryReducer(initialSaveRecoveryState, {
      type: 'show_failure',
      request,
    });
    const repairing = saveRecoveryReducer(showing, { type: 'repair_start' });

    expect(repairing).toMatchObject({
      status: 'repairing',
      request,
      actionError: null,
    });

    const restoreFailed = saveRecoveryReducer(repairing, {
      type: 'repair_failure',
      message: 'Nothing was replaced.',
    });
    expect(restoreFailed).toMatchObject({
      status: 'showing_dialog',
      actionError: 'Nothing was replaced.',
    });
    expect(restoreFailed.request?.canRepair).toBe(false);
    expect(restoreFailed.request?.body).toContain('No repair source is currently being offered');

    const retrying = saveRecoveryReducer(repairing, { type: 'retry_start' });
    const reloadFailed = saveRecoveryReducer(retrying, {
      type: 'repair_reload_failure',
      message: 'The verified copy was restored, but it could not be loaded.',
    });
    expect(reloadFailed).toMatchObject({
      status: 'showing_dialog',
      actionError: 'The verified copy was restored, but it could not be loaded.',
    });
    expect(reloadFailed.request?.canRepair).toBe(false);
    expect(reloadFailed.request?.body).toContain('ordinary load still failed');
    expect(reloadFailed.request?.body).not.toContain('available to restore');
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
      { type: 'repair_start' },
      { type: 'repair_failure', message: 'Nothing was replaced.' },
    ];

    const left = events.reduce(saveRecoveryReducer, initialSaveRecoveryState);
    const right = events.reduce(saveRecoveryReducer, initialSaveRecoveryState);

    expect(left).toEqual(right);
  });
});
