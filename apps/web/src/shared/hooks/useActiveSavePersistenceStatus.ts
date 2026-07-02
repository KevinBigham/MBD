import { useSyncExternalStore } from 'react';
import {
  getActiveSavePersistenceStatus,
  subscribeToActiveSavePersistenceStatus,
} from '@/shared/lib/activeSavePersistence';

export function useActiveSavePersistenceStatus(saveId: string | null | undefined) {
  return useSyncExternalStore(
    subscribeToActiveSavePersistenceStatus,
    () => getActiveSavePersistenceStatus(saveId),
    () => getActiveSavePersistenceStatus(saveId),
  );
}
