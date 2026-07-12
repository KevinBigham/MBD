/**
 * Page-local admission fence for boot journal recovery. It deliberately owns
 * no save truth: it only prevents stale ordinary lanes from observing or
 * mutating a worker while AppBoot holds an exact candidate transition.
 */
export type BootRecoveryAdmissionStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'recovering'; readonly saveId: string; readonly rootSaveId: string }
  | { readonly kind: 'fail_closed'; readonly saveId: string; readonly rootSaveId: string; readonly error: unknown };

export interface BootRecoveryPermit {
  readonly permitId: symbol;
  readonly saveId: string;
  readonly rootSaveId: string;
}

export interface BootRecoverySuccessReservation {
  readonly reservationId: symbol;
}

/** Captured by ordinary lanes before an await and revalidated afterwards. */
export interface BootRecoveryOrdinaryAdmission {
  readonly epoch: number;
}

interface InternalPermit {
  readonly permit: BootRecoveryPermit;
  active: boolean;
  candidateReferences: number;
  candidateCallsAvailable: number;
}
interface InternalReservation { readonly reservation: BootRecoverySuccessReservation; readonly permit: InternalPermit; active: boolean; }

let status: BootRecoveryAdmissionStatus = Object.freeze({ kind: 'idle' });
let ordinaryAdmissionEpoch = 0;
let permit: InternalPermit | null = null;
let reservation: InternalReservation | null = null;
const listeners = new Set<() => void>();

function publish(next: BootRecoveryAdmissionStatus): void {
  ordinaryAdmissionEpoch += 1;
  status = Object.freeze(next);
  for (const listener of listeners) {
    try { listener(); } catch (error) { console.error('Boot recovery admission observer failed:', error); }
  }
}

function requirePermit(value: BootRecoveryPermit): InternalPermit {
  if (!permit || !permit.active || permit.permit !== value) throw new Error('This boot recovery permit is no longer current.');
  return permit;
}

export function beginBootRecoveryAdmission(saveId: string, rootSaveId: string): BootRecoveryPermit {
  if (status.kind !== 'idle' || permit) throw new Error('A boot recovery admission is already active.');
  const exact = Object.freeze({ permitId: Symbol(`boot-recovery:${saveId}`), saveId, rootSaveId });
  permit = { permit: exact, active: true, candidateReferences: 0, candidateCallsAvailable: 0 };
  publish({ kind: 'recovering', saveId, rootSaveId });
  return exact;
}

export function reserveBootRecoverySuccess(value: BootRecoveryPermit): BootRecoverySuccessReservation {
  const current = requirePermit(value);
  if (reservation) throw new Error('Boot recovery success is already reserved.');
  const exact = Object.freeze({ reservationId: Symbol('boot-recovery-success') });
  reservation = { reservation: exact, permit: current, active: true };
  return exact;
}

export function commitBootRecoverySuccess(value: BootRecoverySuccessReservation): void {
  // Reservation validates identity/currentness before the journal's sole
  // fallible delete. Its post-delete commit is intentionally total: stale or
  // double callbacks cannot create a new failure branch after consumption.
  if (!reservation || !reservation.active || reservation.reservation !== value || reservation.permit !== permit) {
    return;
  }
  reservation.active = false;
  reservation = null;
  permit!.active = false;
  permit = null;
  publish({ kind: 'idle' });
}

/** Leaves a verified ordinary boot untouched after inspection found no row. */
export function cancelBootRecoveryAdmission(value: BootRecoveryPermit): void {
  const current = requirePermit(value);
  if (reservation || current.candidateReferences > 0) {
    throw new Error('Boot recovery admission cannot be cancelled while candidate work is active.');
  }
  current.active = false;
  permit = null;
  publish({ kind: 'idle' });
}

export function failBootRecoveryAdmission(value: BootRecoveryPermit, error: unknown): void {
  const current = requirePermit(value);
  current.active = false;
  if (reservation?.permit === current) reservation.active = false;
  reservation = null;
  permit = null;
  publish({ kind: 'fail_closed', saveId: value.saveId, rootSaveId: value.rootSaveId, error });
}

export function withBootRecoveryCandidateAuthorization<T>(
  value: BootRecoveryPermit,
  operation: () => T,
): T {
  const current = requirePermit(value);
  if (current.candidateReferences > 0) {
    throw new Error('Boot recovery candidate authorization is already active.');
  }
  current.candidateReferences += 1;
  current.candidateCallsAvailable = 1;
  try { return operation(); }
  finally {
    current.candidateCallsAvailable = 0;
    current.candidateReferences -= 1;
  }
}

export function consumeBootRecoveryCandidateOperationAuthorization(saveId: string | null): boolean {
  if (!permit || !permit.active || permit.candidateReferences <= 0
    || permit.candidateCallsAvailable <= 0 || permit.permit.saveId !== saveId) {
    return false;
  }
  permit.candidateCallsAvailable = 0;
  return true;
}

export function assertBootRecoveryOrdinaryAdmission(): void {
  if (status.kind !== 'idle') throw new Error('Boot recovery is active; ordinary dynasty work is blocked.');
}

export function captureBootRecoveryOrdinaryAdmission(): BootRecoveryOrdinaryAdmission {
  assertBootRecoveryOrdinaryAdmission();
  return Object.freeze({ epoch: ordinaryAdmissionEpoch });
}

export function assertCapturedBootRecoveryOrdinaryAdmission(
  admission: BootRecoveryOrdinaryAdmission,
): void {
  if (status.kind !== 'idle' || admission.epoch !== ordinaryAdmissionEpoch) {
    throw new Error('Boot recovery began while ordinary dynasty work was awaiting completion.');
  }
}

export function getBootRecoveryAdmissionStatus(): BootRecoveryAdmissionStatus { return status; }
export function isBootRecoveryAdmissionBlocked(): boolean { return status.kind !== 'idle'; }
export function subscribeToBootRecoveryAdmission(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }

export function resetBootRecoveryAdmissionForTesting(): void {
  if (permit?.candidateReferences) throw new Error('Cannot reset boot recovery while candidate work is active.');
  permit = null;
  reservation = null;
  publish({ kind: 'idle' });
}
