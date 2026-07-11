declare const settingsOperationOwnerBrand: unique symbol;

/** Opaque ownership token for one cross-remount Settings operation. */
export type SettingsOperationOwner = symbol & {
  readonly [settingsOperationOwnerBrand]: true;
};

let activeOwner: SettingsOperationOwner | null = null;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const listener of listeners) listener();
}

export function beginSettingsOperation(): SettingsOperationOwner | null {
  if (activeOwner) return null;
  const owner = Symbol('settings-operation') as SettingsOperationOwner;
  activeOwner = owner;
  notifyListeners();
  return owner;
}

export function finishSettingsOperation(owner: SettingsOperationOwner): boolean {
  if (activeOwner !== owner) return false;
  activeOwner = null;
  notifyListeners();
  return true;
}

export function getSettingsOperationBusySnapshot(): boolean {
  return activeOwner !== null;
}

export function subscribeToSettingsOperationBusy(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetSettingsOperationCoordinatorForTesting(): void {
  activeOwner = null;
  notifyListeners();
}
