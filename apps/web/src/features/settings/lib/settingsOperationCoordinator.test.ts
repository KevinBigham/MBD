import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  beginSettingsOperation,
  finishSettingsOperation,
  getSettingsOperationBusySnapshot,
  resetSettingsOperationCoordinatorForTesting,
  subscribeToSettingsOperationBusy,
  type SettingsOperationOwner,
} from './settingsOperationCoordinator';

describe('settingsOperationCoordinator', () => {
  afterEach(() => resetSettingsOperationCoordinatorForTesting());

  it('retains one exact owner across rejection, stale release, and a later owner', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSettingsOperationBusy(listener);
    const ownerA = beginSettingsOperation();
    expect(ownerA).not.toBeNull();
    expect(getSettingsOperationBusySnapshot()).toBe(true);
    expect(beginSettingsOperation()).toBeNull();
    expect(finishSettingsOperation(Symbol('forged') as SettingsOperationOwner)).toBe(false);
    expect(getSettingsOperationBusySnapshot()).toBe(true);
    expect(finishSettingsOperation(ownerA!)).toBe(true);
    expect(getSettingsOperationBusySnapshot()).toBe(false);

    const ownerB = beginSettingsOperation();
    expect(ownerB).not.toBeNull();
    expect(finishSettingsOperation(ownerA!)).toBe(false);
    expect(getSettingsOperationBusySnapshot()).toBe(true);
    expect(finishSettingsOperation(ownerB!)).toBe(true);
    expect(getSettingsOperationBusySnapshot()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
  });
});
