import { expect, type BrowserContext, type Locator, type Page } from '@playwright/test';

const APP_BOOT_COPY = 'Reopening the front office';
const APP_UPDATED_COPY = 'App updated — refresh for the latest version.';
const MAX_OVERLAY_PASSES = 48;

interface IndexedDbSaveFaultState {
  blockedAttempts: number;
  enabled: boolean;
  totalAttempts: number;
}

export interface IndexedDbChecksumTamperResult {
  afterChecksum: string;
  beforeChecksum: string;
}

export interface IndexedDbSaveIntegrityPair {
  backupChecksum: string;
  backupUpdatedAt: string;
  primaryChecksum: string;
  primaryUpdatedAt: string;
}

export interface IndexedDbSimAdvanceSnapshotIdentity {
  checksum: string;
  updatedAt: string;
  season: number;
  day: number;
  phase: string;
  rng: { seed: number; callCount: number };
}

export interface IndexedDbSimAdvanceIntentEvidence {
  saveId: string;
  rootSaveId: string;
  token: string;
  attempt: number;
  operation: string;
  baselineChecksum: string;
  baselineSeason: number;
  baselineDay: number;
  baselinePhase: string;
}

export interface IndexedDbSimAdvanceJournalEvidence {
  primary: IndexedDbSimAdvanceSnapshotIdentity;
  shadow: IndexedDbSimAdvanceSnapshotIdentity;
  intent: IndexedDbSimAdvanceIntentEvidence | null;
}

/** Read-only raw-row evidence used to corroborate the public storage metrics. */
export interface IndexedDbStoragePressureEvidence {
  activeSnapshotJsonBytes: number;
  activeTreeJsonBytes: number;
  allMbdJsonBytes: number;
  rootSaveId: string;
}

export const appMain = (page: Page) => page.locator('main#main-content');
export const mainNavigation = (page: Page) => page.getByRole('navigation', { name: 'Main navigation' });
export const saveSummary = (page: Page) => page.getByTestId('save-persistence-summary');
export const saveStatus = (page: Page) => page.getByTestId('save-persistence-status');
export const simFooter = (page: Page) => page.locator('footer[data-tour="sim-controls"]');

export async function installIndexedDbSaveFault(page: Page | BrowserContext): Promise<void> {
  await page.addInitScript(() => {
    const state: IndexedDbSaveFaultState = {
      blockedAttempts: 0,
      enabled: false,
      totalAttempts: 0,
    };
    const target = window as typeof window & {
      __mbdIndexedDbSaveFault?: IndexedDbSaveFaultState;
    };
    target.__mbdIndexedDbSaveFault = state;
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function put(
      value: unknown,
      key?: IDBValidKey,
    ): IDBRequest<IDBValidKey> {
      const isSaveRow = this.transaction.db.name === 'mbd-saves' && this.name === 'saves';
      if (isSaveRow) {
        state.totalAttempts += 1;
        if (state.enabled) {
          state.blockedAttempts += 1;
          throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        }
      }
      return key === undefined
        ? originalPut.call(this, value)
        : originalPut.call(this, value, key);
    };
  });
}

/** Read-only exact primary/shadow/journal evidence for the WAL browser proof. */
export async function readIndexedDbSimAdvanceJournalEvidence(
  page: Page,
  saveId: string,
): Promise<IndexedDbSimAdvanceJournalEvidence> {
  return page.evaluate(async (exactSaveId) => {
    type Snapshot = {
      season?: unknown;
      day?: unknown;
      phase?: unknown;
      rng?: { seed?: unknown; callCount?: unknown };
    };
    type Record = {
      integrity?: { checksum?: unknown };
      updatedAt?: unknown;
      snapshot?: Snapshot;
    };
    type Intent = {
      saveId?: unknown; rootSaveId?: unknown; token?: unknown; attempt?: unknown;
      operation?: unknown; baselineChecksum?: unknown; baselineSeason?: unknown;
      baselineDay?: unknown; baselinePhase?: unknown;
    };
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('mbd-saves');
      request.onerror = () => reject(new Error(`Unable to open MBD IndexedDB: ${request.error?.message ?? 'unknown error'}`));
      request.onsuccess = () => resolve(request.result);
    });
    const stores = ['saves', 'saveIntegrityBackups', 'simAdvanceIntents'];
    if (stores.some((store) => !database.objectStoreNames.contains(store))) {
      database.close();
      throw new Error('MBD IndexedDB is missing sim-advance evidence stores.');
    }
    return new Promise<IndexedDbSimAdvanceJournalEvidence>((resolve, reject) => {
      const transaction = database.transaction(stores, 'readonly');
      const primaryRequest = transaction.objectStore('saves').get(exactSaveId);
      const shadowRequest = transaction.objectStore('saveIntegrityBackups').get(exactSaveId);
      const intentRequest = transaction.objectStore('simAdvanceIntents').get(exactSaveId);
      let settled = false;
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        database.close();
        reject(new Error(message));
      };
      transaction.onerror = () => fail(`Sim-advance evidence transaction failed: ${transaction.error?.message ?? 'unknown error'}`);
      transaction.onabort = () => fail(`Sim-advance evidence transaction aborted: ${transaction.error?.message ?? 'unknown error'}`);
      const identity = (record: Record | undefined, label: string): IndexedDbSimAdvanceSnapshotIdentity => {
        const snapshot = record?.snapshot;
        const checksum = record?.integrity?.checksum;
        const updatedAt = record?.updatedAt;
        if (!snapshot || typeof checksum !== 'string' || typeof updatedAt !== 'string'
          || typeof snapshot.season !== 'number' || typeof snapshot.day !== 'number'
          || typeof snapshot.phase !== 'string' || typeof snapshot.rng?.seed !== 'number'
          || typeof snapshot.rng.callCount !== 'number') {
          throw new Error(`Exact ${label} save evidence is malformed.`);
        }
        return {
          checksum, updatedAt, season: snapshot.season, day: snapshot.day,
          phase: snapshot.phase, rng: { seed: snapshot.rng.seed, callCount: snapshot.rng.callCount },
        };
      };
      transaction.oncomplete = () => {
        try {
          const rawIntent = intentRequest.result as Intent | undefined;
          let intent: IndexedDbSimAdvanceIntentEvidence | null = null;
          if (rawIntent) {
            if (typeof rawIntent.saveId !== 'string' || typeof rawIntent.rootSaveId !== 'string'
              || typeof rawIntent.token !== 'string' || typeof rawIntent.attempt !== 'number'
              || typeof rawIntent.operation !== 'string' || typeof rawIntent.baselineChecksum !== 'string'
              || typeof rawIntent.baselineSeason !== 'number' || typeof rawIntent.baselineDay !== 'number'
              || typeof rawIntent.baselinePhase !== 'string') {
              throw new Error('Exact sim-advance journal evidence is malformed.');
            }
            intent = {
              saveId: rawIntent.saveId, rootSaveId: rawIntent.rootSaveId, token: rawIntent.token,
              attempt: rawIntent.attempt, operation: rawIntent.operation,
              baselineChecksum: rawIntent.baselineChecksum, baselineSeason: rawIntent.baselineSeason,
              baselineDay: rawIntent.baselineDay, baselinePhase: rawIntent.baselinePhase,
            };
          }
          settled = true;
          database.close();
          resolve({
            primary: identity(primaryRequest.result as Record | undefined, 'primary'),
            shadow: identity(shadowRequest.result as Record | undefined, 'shadow'),
            intent,
          });
        } catch (error) {
          fail(error instanceof Error ? error.message : String(error));
        }
      };
    });
  }, saveId);
}

export async function enableIndexedDbSaveFault(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = (window as typeof window & {
      __mbdIndexedDbSaveFault?: IndexedDbSaveFaultState;
    }).__mbdIndexedDbSaveFault;
    if (!state) throw new Error('IndexedDB save fault shim was not installed.');
    state.blockedAttempts = 0;
    state.totalAttempts = 0;
    state.enabled = true;
  });
}

export async function disableIndexedDbSaveFault(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = (window as typeof window & {
      __mbdIndexedDbSaveFault?: IndexedDbSaveFaultState;
    }).__mbdIndexedDbSaveFault;
    if (!state) throw new Error('IndexedDB save fault shim was not installed.');
    state.enabled = false;
  });
}

export async function indexedDbSaveFaultState(page: Page): Promise<IndexedDbSaveFaultState> {
  return page.evaluate(() => {
    const state = (window as typeof window & {
      __mbdIndexedDbSaveFault?: IndexedDbSaveFaultState;
    }).__mbdIndexedDbSaveFault;
    if (!state) throw new Error('IndexedDB save fault shim was not installed.');
    return { ...state };
  });
}

export async function tamperIndexedDbSaveChecksum(
  page: Page,
  saveId: string,
): Promise<IndexedDbChecksumTamperResult> {
  return page.evaluate(async (exactSaveId) => {
    type StoredSaveRecord = {
      integrity?: {
        checksum?: unknown;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };

    const databaseName = 'mbd-saves';
    const storeName = 'saves';
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      let databaseWasMissing = false;
      let openSettled = false;
      const rejectOpen = (message: string) => {
        if (openSettled) return;
        openSettled = true;
        reject(new Error(message));
      };

      request.onupgradeneeded = () => {
        databaseWasMissing = true;
        request.transaction?.abort();
      };
      request.onerror = () => {
        rejectOpen(databaseWasMissing
          ? `IndexedDB database "${databaseName}" does not exist.`
          : `Failed to open IndexedDB database "${databaseName}": ${request.error?.message ?? 'unknown error'}`);
      };
      request.onblocked = () => {
        rejectOpen(`Opening IndexedDB database "${databaseName}" was blocked.`);
      };
      request.onsuccess = () => {
        if (databaseWasMissing || openSettled) {
          request.result.close();
          rejectOpen(`IndexedDB database "${databaseName}" does not exist.`);
          return;
        }
        openSettled = true;
        resolve(request.result);
      };
    });

    if (!database.objectStoreNames.contains(storeName)) {
      database.close();
      throw new Error(
        `IndexedDB database "${databaseName}" is missing object store "${storeName}".`,
      );
    }

    return new Promise<IndexedDbChecksumTamperResult>((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction = database.transaction(storeName, 'readwrite');
      } catch (error) {
        database.close();
        reject(
          new Error(
            `Failed to start IndexedDB checksum-tamper transaction for save "${exactSaveId}": ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
        return;
      }

      let failureMessage: string | null = null;
      let result: IndexedDbChecksumTamperResult | null = null;
      let settled = false;
      const rejectOnce = (message: string) => {
        if (settled) return;
        settled = true;
        database.close();
        reject(new Error(message));
      };

      // Register completion, failure, and abort handlers before issuing the put.
      transaction.oncomplete = () => {
        if (settled) return;
        if (!result) {
          rejectOnce(
            `IndexedDB checksum-tamper transaction completed without updating save "${exactSaveId}".`,
          );
          return;
        }
        settled = true;
        database.close();
        resolve(result);
      };
      transaction.onerror = () => {
        rejectOnce(
          failureMessage
            ?? `IndexedDB checksum-tamper transaction failed for save "${exactSaveId}": ${transaction.error?.message ?? 'unknown error'}`,
        );
      };
      transaction.onabort = () => {
        rejectOnce(
          failureMessage
            ?? `IndexedDB checksum-tamper transaction aborted for save "${exactSaveId}": ${transaction.error?.message ?? 'unknown error'}`,
        );
      };

      const store = transaction.objectStore(storeName);
      const getRequest = store.get(exactSaveId);
      getRequest.onerror = () => {
        failureMessage = `Failed to read exact save "${exactSaveId}" from IndexedDB: ${getRequest.error?.message ?? 'unknown error'}`;
      };
      getRequest.onsuccess = () => {
        const record = getRequest.result as StoredSaveRecord | undefined;
        if (!record) {
          failureMessage = `Cannot tamper IndexedDB checksum: exact save "${exactSaveId}" was not found.`;
          transaction.abort();
          return;
        }

        const integrity = record.integrity;
        const beforeChecksum = integrity?.checksum;
        if (
          !integrity
          || typeof beforeChecksum !== 'string'
          || !/^[0-9a-f]{64}$/.test(beforeChecksum)
        ) {
          failureMessage = `Cannot tamper IndexedDB checksum for save "${exactSaveId}": integrity seal is missing or malformed.`;
          transaction.abort();
          return;
        }

        const afterChecksum = `${beforeChecksum[0] === '0' ? '1' : '0'}${beforeChecksum.slice(1)}`;
        integrity.checksum = afterChecksum;
        result = { beforeChecksum, afterChecksum };

        const putRequest = store.put(record);
        putRequest.onerror = () => {
          failureMessage = `Failed to write tampered checksum for save "${exactSaveId}" to IndexedDB: ${putRequest.error?.message ?? 'unknown error'}`;
        };
      };
    });
  }, saveId);
}

export async function readIndexedDbSaveIntegrityPair(
  page: Page,
  saveId: string,
): Promise<IndexedDbSaveIntegrityPair> {
  return page.evaluate(async (exactSaveId) => {
    type StoredIntegrityRecord = {
      integrity?: {
        checksum?: unknown;
      };
      updatedAt?: unknown;
    };

    const databaseName = 'mbd-saves';
    const primaryStoreName = 'saves';
    const backupStoreName = 'saveIntegrityBackups';
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      let databaseWasMissing = false;
      let openSettled = false;
      const rejectOpen = (message: string) => {
        if (openSettled) return;
        openSettled = true;
        reject(new Error(message));
      };

      request.onupgradeneeded = () => {
        databaseWasMissing = true;
        request.transaction?.abort();
      };
      request.onerror = () => {
        rejectOpen(databaseWasMissing
          ? `IndexedDB database "${databaseName}" does not exist.`
          : `Failed to open IndexedDB database "${databaseName}": ${request.error?.message ?? 'unknown error'}`);
      };
      request.onblocked = () => {
        rejectOpen(`Opening IndexedDB database "${databaseName}" was blocked.`);
      };
      request.onsuccess = () => {
        if (databaseWasMissing || openSettled) {
          request.result.close();
          rejectOpen(`IndexedDB database "${databaseName}" does not exist.`);
          return;
        }
        openSettled = true;
        resolve(request.result);
      };
    });

    const missingStores = [primaryStoreName, backupStoreName]
      .filter((storeName) => !database.objectStoreNames.contains(storeName));
    if (missingStores.length > 0) {
      database.close();
      throw new Error(
        `IndexedDB database "${databaseName}" is missing required object store${missingStores.length === 1 ? '' : 's'}: ${missingStores.join(', ')}.`,
      );
    }

    return new Promise<IndexedDbSaveIntegrityPair>((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction = database.transaction(
          [primaryStoreName, backupStoreName],
          'readonly',
        );
      } catch (error) {
        database.close();
        reject(
          new Error(
            `Failed to start IndexedDB integrity-read transaction for save "${exactSaveId}": ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
        return;
      }

      let failureMessage: string | null = null;
      let primaryRecord: StoredIntegrityRecord | undefined;
      let backupRecord: StoredIntegrityRecord | undefined;
      let settled = false;
      const rejectOnce = (message: string) => {
        if (settled) return;
        settled = true;
        database.close();
        reject(new Error(message));
      };

      transaction.oncomplete = () => {
        if (settled) return;
        if (!primaryRecord) {
          rejectOnce(
            `Cannot read IndexedDB integrity pair: exact primary save "${exactSaveId}" was not found.`,
          );
          return;
        }
        if (!backupRecord) {
          rejectOnce(
            `Cannot read IndexedDB integrity pair: exact backup save "${exactSaveId}" was not found.`,
          );
          return;
        }

        const primaryChecksum = primaryRecord.integrity?.checksum;
        const backupChecksum = backupRecord.integrity?.checksum;
        if (typeof primaryChecksum !== 'string' || !/^[0-9a-f]{64}$/.test(primaryChecksum)) {
          rejectOnce(
            `Cannot read IndexedDB integrity pair for save "${exactSaveId}": primary integrity seal is missing or malformed.`,
          );
          return;
        }
        if (typeof backupChecksum !== 'string' || !/^[0-9a-f]{64}$/.test(backupChecksum)) {
          rejectOnce(
            `Cannot read IndexedDB integrity pair for save "${exactSaveId}": backup integrity seal is missing or malformed.`,
          );
          return;
        }
        if (typeof primaryRecord.updatedAt !== 'string' || typeof backupRecord.updatedAt !== 'string') {
          rejectOnce(
            `Cannot read IndexedDB integrity pair for save "${exactSaveId}": primary or backup updatedAt metadata is missing or malformed.`,
          );
          return;
        }

        settled = true;
        database.close();
        resolve({
          backupChecksum,
          backupUpdatedAt: backupRecord.updatedAt,
          primaryChecksum,
          primaryUpdatedAt: primaryRecord.updatedAt,
        });
      };
      transaction.onerror = () => {
        rejectOnce(
          failureMessage
            ?? `IndexedDB integrity-read transaction failed for save "${exactSaveId}": ${transaction.error?.message ?? 'unknown error'}`,
        );
      };
      transaction.onabort = () => {
        rejectOnce(
          failureMessage
            ?? `IndexedDB integrity-read transaction aborted for save "${exactSaveId}": ${transaction.error?.message ?? 'unknown error'}`,
        );
      };

      const primaryRequest = transaction.objectStore(primaryStoreName).get(exactSaveId);
      primaryRequest.onerror = () => {
        failureMessage = `Failed to read exact primary save "${exactSaveId}" from IndexedDB: ${primaryRequest.error?.message ?? 'unknown error'}`;
      };
      primaryRequest.onsuccess = () => {
        primaryRecord = primaryRequest.result as StoredIntegrityRecord | undefined;
      };

      const backupRequest = transaction.objectStore(backupStoreName).get(exactSaveId);
      backupRequest.onerror = () => {
        failureMessage = `Failed to read exact backup save "${exactSaveId}" from IndexedDB: ${backupRequest.error?.message ?? 'unknown error'}`;
      };
      backupRequest.onsuccess = () => {
        backupRecord = backupRequest.result as StoredIntegrityRecord | undefined;
      };
    });
  }, saveId);
}

export async function readIndexedDbStoragePressureEvidence(
  page: Page,
  saveId: string,
): Promise<IndexedDbStoragePressureEvidence> {
  return page.evaluate(async (exactSaveId) => {
    type StoredRow = {
      id?: unknown;
      slotNumber?: unknown;
      parentSaveId?: unknown;
      isRootSave?: unknown;
      snapshot?: unknown;
      [key: string]: unknown;
    };
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('mbd-saves');
      request.onerror = () => reject(new Error(`Unable to open MBD IndexedDB: ${request.error?.message ?? 'unknown error'}`));
      request.onblocked = () => reject(new Error('Opening MBD IndexedDB was blocked.'));
      request.onsuccess = () => resolve(request.result);
    });
    const stores = ['saves', 'saveIntegrityBackups', 'leaderboard'];
    if (stores.some((store) => !database.objectStoreNames.contains(store))) {
      database.close();
      throw new Error('MBD IndexedDB is missing a storage-pressure evidence table.');
    }
    return new Promise<IndexedDbStoragePressureEvidence>((resolve, reject) => {
      const transaction = database.transaction(stores, 'readonly');
      const requests = stores.map((store) => transaction.objectStore(store).getAll());
      let settled = false;
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        database.close();
        reject(new Error(message));
      };
      transaction.onerror = () => fail(`MBD storage evidence transaction failed: ${transaction.error?.message ?? 'unknown error'}`);
      transaction.onabort = () => fail(`MBD storage evidence transaction aborted: ${transaction.error?.message ?? 'unknown error'}`);
      transaction.oncomplete = () => {
        try {
          const rows = requests.map((request) => request.result as StoredRow[]);
          const saves = rows[0] ?? [];
          const shadows = rows[1] ?? [];
          const leaderboard = rows[2] ?? [];
          const active = saves.find((row) => row.id === exactSaveId);
          if (!active) throw new Error(`Exact active save "${exactSaveId}" is missing.`);
          const rootSaveId = typeof active.parentSaveId === 'string' ? active.parentSaveId : exactSaveId;
          const root = saves.find((row) => row.id === rootSaveId);
          if (!root || typeof root.slotNumber !== 'number') throw new Error(`Root save "${rootSaveId}" is missing a valid slot.`);
          const saveIds = new Set(saves
            .filter((row) => row.id === rootSaveId || (row.isRootSave === false && row.parentSaveId === rootSaveId))
            .map((row) => String(row.id)));
          const bytes = (row: unknown) => new TextEncoder().encode(JSON.stringify(row)).byteLength;
          const allRows = [...saves, ...shadows, ...leaderboard];
          const treeRows = [
            ...saves.filter((row) => saveIds.has(String(row.id))),
            ...shadows.filter((row) => saveIds.has(String(row.id))),
            ...leaderboard.filter((row) => row.slotNumber === root.slotNumber),
          ];
          const snapshot = active.snapshot;
          if (snapshot == null) throw new Error(`Exact active save "${exactSaveId}" has no snapshot.`);
          settled = true;
          database.close();
          resolve({
            activeSnapshotJsonBytes: bytes(snapshot),
            activeTreeJsonBytes: treeRows.reduce((total, row) => total + bytes(row), 0),
            allMbdJsonBytes: allRows.reduce((total, row) => total + bytes(row), 0),
            rootSaveId,
          });
        } catch (error) {
          fail(error instanceof Error ? error.message : String(error));
        }
      };
    });
  }, saveId);
}

export interface DurableSaveSummarySnapshot {
  lastSavedAt: string;
  text: string;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeVisibleLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export async function waitForAppReady(page: Page): Promise<void> {
  await expect(page.getByText(APP_BOOT_COPY, { exact: true })).toBeHidden({ timeout: 60_000 });
  await expect(mainNavigation(page)).toBeVisible({ timeout: 60_000 });
  await expect(appMain(page)).toBeVisible();
  await expect(simFooter(page)).toHaveAttribute('aria-busy', 'false');
}

export async function navigateFromSidebar(
  page: Page,
  route: string,
  heading: string,
): Promise<void> {
  const href = `/MBD${route}`;
  await mainNavigation(page).locator(`a[href="${href}"]`).click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(href)}$`));
  await expect(
    appMain(page).getByRole('heading', { name: heading, exact: true }).first(),
  ).toBeVisible();
  await waitForAppReady(page);
}

async function waitForOverlayAdvance(overlay: Locator, previousText: string): Promise<void> {
  await expect.poll(async () => {
    if (!(await overlay.isVisible().catch(() => false))) return 'gone';
    const nextText = await overlay.innerText({ timeout: 1_000 }).catch(() => null);
    if (nextText == null) return 'gone';
    return nextText === previousText ? 'same' : 'changed';
  }, {
    message: 'blocking overlay should disappear or advance after its public dismissal action',
    timeout: 60_000,
  }).not.toBe('same');
}

export interface OverlayActionCandidate<Name extends string = string> {
  readonly name: Name;
  readonly visible: boolean;
  readonly enabled: boolean;
}

export type OverlayActionSelection<Name extends string = string> =
  | { readonly kind: 'waiting' }
  | { readonly kind: 'ready'; readonly name: Name };

/** Pure oracle for the hostile helper test and fresh-DOM overlay adapter. */
export function selectExactlyOneVisibleOverlayAction<Name extends string>(
  candidates: readonly OverlayActionCandidate<Name>[],
): OverlayActionSelection<Name> {
  const visible = candidates.filter((candidate) => candidate.visible);
  if (visible.length > 1) {
    throw new Error(`Overlay exposes multiple visible actions: ${visible.map((candidate) => candidate.name).join(', ')}.`);
  }
  if (visible.length === 0 || !visible[0]!.enabled) return { kind: 'waiting' };
  return { kind: 'ready', name: visible[0]!.name };
}

/** A direct locator click deliberately propagates detached/action failures. */
export async function clickFreshOverlayAction(
  action: Pick<Locator, 'click'>,
): Promise<void> {
  await action.click({ timeout: 5_000 });
}

interface FreshOverlayResolution {
  readonly text: string | null;
  readonly selection: OverlayActionSelection;
  readonly action: Locator | null;
}

async function resolveFreshOverlayAction(
  overlay: Locator,
  actionNames: readonly string[],
): Promise<FreshOverlayResolution> {
  if (!(await overlay.isVisible().catch(() => false))) {
    return { text: null, selection: { kind: 'waiting' }, action: null };
  }
  const text = await overlay.innerText({ timeout: 1_000 }).catch(() => null);
  if (text == null) return { text: null, selection: { kind: 'waiting' }, action: null };

  const fresh = await Promise.all(actionNames.map(async (name) => {
    // Construct a new overlay-scoped locator for this exact DOM pass. A
    // previous report/decision action may have detached since the last poll.
    const action = overlay.getByRole('button', { name, exact: true });
    const count = await action.count();
    if (count > 1) {
      throw new Error(`Overlay exposes ${count} exact "${name}" controls; one is required.`);
    }
    return {
      name,
      visible: count === 1 && await action.isVisible().catch(() => false),
      enabled: count === 1 && await action.isEnabled().catch(() => false),
      action,
    };
  }));
  const selection = selectExactlyOneVisibleOverlayAction(fresh);
  const selected = selection.kind === 'ready'
    ? fresh.find((candidate) => candidate.name === selection.name)!
    : null;
  return { text, selection, action: selected?.action ?? null };
}

async function dismissTransientOverlay(
  overlay: Locator,
  actionNames: readonly string[],
): Promise<boolean> {
  const initial = await resolveFreshOverlayAction(overlay, actionNames);
  if (initial.text == null) return false;
  const previousText = initial.text;

  for (;;) {
    let ready: FreshOverlayResolution | null = null;
    await expect.poll(async () => {
      const current = await resolveFreshOverlayAction(overlay, actionNames);
      if (current.text == null || current.text !== previousText) return 'advanced';
      if (current.selection.kind !== 'ready' || !current.action) return 'waiting';
      ready = current;
      return 'ready';
    }, {
      message: 'blocking overlay should expose exactly one enabled current action or advance',
      timeout: 60_000,
    }).not.toBe('waiting');

    if (!ready) return true;
    // Repeat the whole DOM read immediately before clicking. Do not click a
    // locator retained from the poll if a report became a decision meanwhile.
    const confirmed = await resolveFreshOverlayAction(overlay, actionNames);
    if (confirmed.text == null || confirmed.text !== previousText) return true;
    if (confirmed.selection.kind !== 'ready' || !confirmed.action) continue;
    await clickFreshOverlayAction(confirmed.action);
    await waitForOverlayAdvance(overlay, previousText);
    return true;
  }
}

async function acceptServiceWorkerRefresh(page: Page): Promise<boolean> {
  const updateToast = page.getByText(APP_UPDATED_COPY, { exact: true });
  if (!(await updateToast.isVisible().catch(() => false))) return false;
  const durableSummaryBeforeRefresh = await expectDurableSaveSummary(page);

  const navigation = page.waitForEvent('framenavigated', {
    predicate: (frame) => frame === page.mainFrame(),
    timeout: 60_000,
  });
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await navigation;
  await page.waitForLoadState('domcontentloaded');
  await waitForAppReady(page);
  await expectDurableSaveSummary(page, durableSummaryBeforeRefresh);
  return true;
}

export async function drainDurableOverlays(page: Page): Promise<boolean> {
  let persistedMutation = false;

  for (let pass = 0; pass < MAX_OVERLAY_PASSES; pass += 1) {
    if (await acceptServiceWorkerRefresh(page)) {
      continue;
    }

    const moment = page.locator('[data-overlay="moment-card"]');
    if (await moment.isVisible().catch(() => false)) {
      persistedMutation = await dismissTransientOverlay(moment, ['Keep Going']) || persistedMutation;
      continue;
    }

    const monthly = page.locator('[data-overlay="monthly-pulse"]');
    if (await monthly.isVisible().catch(() => false)) {
      persistedMutation = await dismissTransientOverlay(monthly, ['Continue', 'Dismiss']) || persistedMutation;
      continue;
    }

    return persistedMutation;
  }

  throw new Error(`Blocking overlays did not settle after ${MAX_OVERLAY_PASSES} public dismissals.`);
}

export async function dismissGuidedStartNudges(page: Page): Promise<void> {
  for (let pass = 0; pass < 8; pass += 1) {
    const dismiss = page.getByRole('button', { name: 'Dismiss guided start nudge' });
    if (!(await dismiss.isVisible().catch(() => false))) return;
    await dismiss.click();
    await expect(dismiss).toBeHidden();
  }

  throw new Error('Guided-start nudges did not settle after eight public dismissals.');
}

export async function handlePressConference(
  page: Page,
  policy: 'skip' | 'preserve',
): Promise<void> {
  if (policy === 'preserve') return;

  const dialog = page.getByRole('dialog', { name: 'Press Conference' });
  const inRegularSeason = /Season\s+\d+\s+—\s+Day\s+\d+\/162/.test(
    await page.locator('header').innerText(),
  );
  if (inRegularSeason) {
    await dialog.waitFor({ state: 'visible', timeout: 3_000 }).catch(() => undefined);
  }
  if (!(await dialog.isVisible().catch(() => false))) return;

  await dialog.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(dialog).toBeHidden();
}

export async function freshRuntimeReload(
  page: Page,
  options: {
    press?: 'skip' | 'preserve';
    ready?: () => Promise<void>;
  } = {},
): Promise<void> {
  const durableOverlayChanged = await drainDurableOverlays(page);
  await dismissGuidedStartNudges(page);
  await handlePressConference(page, 'skip');
  if (durableOverlayChanged || await saveStatus(page).count() > 0) {
    await expect(saveStatus(page)).toHaveText('Saved', { timeout: 60_000 });
  }
  const durableSummaryBeforeReload = await expectDurableSaveSummary(page);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
  await expect(
    page.locator('[data-overlay="moment-card"], [data-overlay="monthly-pulse"]'),
  ).toHaveCount(0);
  await dismissGuidedStartNudges(page);
  await options.ready?.();
  await handlePressConference(page, options.press ?? 'skip');
  await expect(saveStatus(page)).toHaveCount(0);
  await expectDurableSaveSummary(page, durableSummaryBeforeReload);
}

export async function expectFreshMutationRuntime(page: Page): Promise<void> {
  await expect(saveStatus(page)).toHaveCount(0);
  await expectDurableSaveSummary(page);
  await expect(
    page.locator('[data-overlay="moment-card"], [data-overlay="monthly-pulse"]'),
  ).toHaveCount(0);
}

export async function expectDurableSaveSummary(
  page: Page,
  expected?: DurableSaveSummarySnapshot,
): Promise<DurableSaveSummarySnapshot> {
  const summary = saveSummary(page);
  await expect(summary).toBeVisible();
  await expect(summary).toHaveAttribute('data-pending-writes', '0');
  await expect(summary).toHaveAttribute(
    'data-last-saved-at',
    expected?.lastSavedAt ?? /.+/,
  );
  await expect(summary).toHaveText(
    expected?.text ?? /^Last saved .+ · 0 pending writes$/,
  );

  const lastSavedAt = await summary.getAttribute('data-last-saved-at');
  if (!lastSavedAt) {
    throw new Error('Durable save summary did not expose a non-empty data-last-saved-at value.');
  }

  return {
    lastSavedAt,
    text: (await summary.innerText()).trim(),
  };
}

export async function expectMutationSaved(page: Page): Promise<void> {
  await expect(saveStatus(page)).toHaveText('Saved', { timeout: 60_000 });
  await expectDurableSaveSummary(page);
}

export async function runGlobalSimulation(
  page: Page,
  accessibleName: string,
  timeout = 180_000,
): Promise<void> {
  const button = page.getByRole('button', { name: accessibleName, exact: true });
  const footer = simFooter(page);
  await expect(button).toBeEnabled();
  await button.click();
  await expect(footer).toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
  await expect(footer).toHaveAttribute('aria-busy', 'false', { timeout });
  await expectMutationSaved(page);
}

export async function installTutorialDismissal(page: Page): Promise<void> {
  const skipTutorial = page.getByRole('button', { name: 'Skip tutorial' });
  await page.addLocatorHandler(skipTutorial, async () => {
    await skipTutorial.click();
  });
}
