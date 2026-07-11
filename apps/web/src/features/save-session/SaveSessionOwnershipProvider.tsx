import type { ReactNode } from 'react';
import { enableSaveSessionOwnershipEnforcement } from '@/shared/lib/saveSessionOwnership';

/** Enables the central worker/storage assertions before any boot or route child
 * can request a dynasty mutation. Browser lock lifetime remains owned by the
 * session coordinator, not by React effect mount/cleanup cycles.
 */
export function SaveSessionOwnershipProvider({ children }: { children: ReactNode }) {
  enableSaveSessionOwnershipEnforcement();
  return <>{children}</>;
}
