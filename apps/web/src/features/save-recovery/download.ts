import type { SaveRecoveryRequest } from './reducer';

export function rawRecoveryJson(request: SaveRecoveryRequest): string {
  return request.failure.detail.rawJson ?? JSON.stringify({
    reason: request.failure.reason,
    slotId: request.failure.detail.slotId,
    slotNumber: request.failure.detail.slotNumber,
    message: request.failure.detail.message,
    schemaVersion: request.failure.detail.schemaVersion ?? null,
  }, null, 2);
}

export function downloadRawRecoveryJson(request: SaveRecoveryRequest): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const blob = new Blob([rawRecoveryJson(request)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = request.exportFilename;
  link.click();
  window.URL.revokeObjectURL(url);
}
