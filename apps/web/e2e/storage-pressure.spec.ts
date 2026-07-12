import { readFile } from 'node:fs/promises';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  disableIndexedDbSaveFault,
  dismissGuidedStartNudges,
  drainDurableOverlays,
  enableIndexedDbSaveFault,
  expectDurableSaveSummary,
  expectMutationSaved,
  freshRuntimeReload,
  indexedDbSaveFaultState,
  installIndexedDbSaveFault,
  installTutorialDismissal,
  readIndexedDbSaveIntegrityPair,
  readIndexedDbStoragePressureEvidence,
  runGlobalSimulation,
  saveStatus,
  waitForAppReady,
} from './helpers/dynasty';

async function installOriginEstimate(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { estimate: async () => ({ usage: 85, quota: 100 }) },
    });
  });
}

async function createPublicDynasty(page: Page): Promise<void> {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New Dynasty', exact: true }).click();
  await page.getByRole('button', { name: /^Challenge Scenario/ }).click();
  await page.getByRole('button', { name: /^Trade Shark\b/ }).click();
  await page.getByLabel('GM Name').fill('Storage Pressure GM');
  await page.locator('[data-mobile-critical-control="setup-wizard-submit"]').click();
  await expect(page).toHaveURL(/\/MBD\/dashboard$/);
  await waitForAppReady(page);
  await drainDurableOverlays(page);
  await dismissGuidedStartNudges(page);
  await expectDurableSaveSummary(page);
}

async function staleV34ImportPayload(): Promise<Buffer> {
  const snapshot = JSON.parse(await readFile(new URL('../../../packages/contracts/tests/fixtures/save/v34/core.json', import.meta.url), 'utf8')) as {
    narrative: Record<string, unknown>; day: number; season: number;
  };
  snapshot.narrative.tickerFeed = [{
    id: 'storage-pressure-expired-ticker', timestamp: 'S3D1', category: 'rumor',
    text: 'Expired fixture ticker', priority: 1, relatedTeamIds: ['nym'], relatedPlayerIds: [], expiresDay: 1,
  }];
  snapshot.narrative.consequenceWatchers = [{
    id: 'storage-pressure-expired-watcher', type: 'fan_reaction', createdSeason: 3, createdDay: 1,
    expiresSeason: 3, expiresDay: 1, context: {}, resolved: false,
  }];
  return Buffer.from(JSON.stringify({ kind: 'mbd-save-export', name: 'Storage Pressure v34 Fixture', exportedAt: '2026-07-11T00:00:00.000Z', snapshot }));
}

test('storage pressure remains truthful through ownership, cancel, reload, and mobile dialog interaction', async ({ context, page: owner }) => {
  test.setTimeout(8 * 60_000);
  await installOriginEstimate(context);
  await installTutorialDismissal(owner);
  await installIndexedDbSaveFault(owner);
  await createPublicDynasty(owner);
  await owner.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(owner).toHaveURL(/\/MBD\/settings$/);
  await expect(owner.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await owner.locator('input[type="file"]').setInputFiles({ name: 'storage-pressure-v34.json', mimeType: 'application/json', buffer: await staleV34ImportPayload() });
  await expect(owner.getByText('Imported save into slot 2.')).toBeVisible();
  await owner.getByRole('button', { name: 'Load save slot 2', exact: true }).click();
  await expect(owner.getByText('Loaded slot 2.')).toBeVisible();
  const activeSaveId = 'save-slot-2';
  const before = await readIndexedDbSaveIntegrityPair(owner, activeSaveId);

  const duplicatePromise = context.waitForEvent('page');
  await owner.evaluate(() => window.open(window.location.href, '_blank'));
  const duplicate = await duplicatePromise;
  const conflict = duplicate.getByRole('alertdialog', { name: 'Dynasty already open' });
  await expect(conflict).toBeVisible({ timeout: 60_000 });
  await expect(duplicate.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
  await duplicate.getByRole('button', { name: 'Check again', exact: true }).click();
  await expect(conflict).toBeVisible();
  await expect(owner.getByText('Current Snapshot', { exact: true })).toBeVisible();
  await expect(owner.getByText('Local MBD Records', { exact: true })).toBeVisible();
  await expect(owner.getByText('Origin Storage', { exact: true })).toBeVisible();
  await expect(owner.getByText('85.00% approximate origin usage')).toBeVisible();
  await expect(owner.getByText('Archive Older Seasons', { exact: true })).toHaveCount(0);
  const rawBeforePrune = await readIndexedDbStoragePressureEvidence(owner, activeSaveId);
  const snapshotMetric = owner.getByTestId('storage-current-snapshot');
  const localMetric = owner.getByTestId('storage-local-mbd');
  const originMetric = owner.getByTestId('storage-origin');
  const snapshotBytes = Number(await snapshotMetric.getAttribute('data-storage-bytes'));
  expect(snapshotBytes).toBeGreaterThan(0);
  await expect(localMetric).toHaveAttribute('data-storage-bytes', String(rawBeforePrune.allMbdJsonBytes));
  await expect(localMetric).toHaveAttribute('data-active-tree-bytes', String(rawBeforePrune.activeTreeJsonBytes));
  await expect(originMetric).toHaveAttribute('data-origin-percentage', '85');
  expect(new Set([snapshotBytes, rawBeforePrune.activeTreeJsonBytes, rawBeforePrune.allMbdJsonBytes, 85]).size).toBe(4);
  await expect(snapshotMetric).toContainText('in-memory JSON estimate');
  await expect(localMetric).toContainText('Estimated serialized save, shadow, leaderboard, and small operational simulation-journal records; browser overhead is not measured.');
  await expect(originMetric).toContainText('Warning: origin storage is 80% to under 90%');

  const opener = owner.getByRole('button', { name: 'Prune Stale Data', exact: true });
  await opener.click();
  const dialog = owner.getByRole('alertdialog', { name: 'Prune only stale presentation data?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await owner.keyboard.press('Shift+Space');
  await expect(dialog).toBeVisible();
  await owner.keyboard.press('Meta+k');
  await expect(owner.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await owner.getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Front Office', exact: true })
    .dispatchEvent('click');
  await expect(owner).toHaveURL(/\/MBD\/settings$/);
  await expect(dialog).toBeVisible();
  await expect(readIndexedDbSaveIntegrityPair(owner, activeSaveId)).resolves.toEqual(before);
  await owner.keyboard.press('Space');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await expect(readIndexedDbSaveIntegrityPair(owner, activeSaveId)).resolves.toEqual(before);
  await freshRuntimeReload(owner, { ready: async () => waitForAppReady(owner) });
  await expect(owner).toHaveURL(/\/MBD\/settings$/);
  await opener.click();
  await expect(dialog).toContainText('1 expired ticker entries and 1 resolved or expired consequence watchers');
  await owner.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await expect(readIndexedDbSaveIntegrityPair(owner, activeSaveId)).resolves.toEqual(before);

  await owner.setViewportSize({ width: 375, height: 667 });
  await opener.click();
  await expect(dialog).toBeVisible();
  await owner.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Prune stale data', exact: true })).toBeFocused();
  await owner.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(375);
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(667);
  for (const button of await dialog.getByRole('button').all()) {
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();

  await owner.setViewportSize({ width: 1280, height: 720 });
  await opener.click();
  await expect(dialog).toContainText('1 expired ticker entries and 1 resolved or expired consequence watchers');
  await enableIndexedDbSaveFault(owner);
  await owner.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Prune stale data', exact: true })).toBeFocused();
  await owner.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  const retry = saveStatus(owner).getByRole('button', { name: 'Retry failed save' });
  await expect(saveStatus(owner)).toContainText('Save failed — storage full');
  await expect(owner.getByText('Critical: a future save may fail.')).toBeVisible();
  const failedMaintenanceCopy = owner.getByText(
    'Pruned 2 stale entries in memory, but the change is not durable. Reload restores the prior durable save; Use the persistence-only Retry in save status.',
    { exact: true },
  );
  await expect(failedMaintenanceCopy).toBeVisible();
  await expect(retry).toBeVisible();
  await expect(readIndexedDbSaveIntegrityPair(owner, activeSaveId)).resolves.toEqual(before);
  await expect.poll(async () => (await indexedDbSaveFaultState(owner)).blockedAttempts).toBe(3);
  const failures = await indexedDbSaveFaultState(owner);
  await disableIndexedDbSaveFault(owner);
  await retry.click();
  await expectMutationSaved(owner);
  await expect(owner.getByText(
    'Pruned 2 stale entries and saved them durably through persistence-only Retry.',
    { exact: true },
  )).toBeVisible();
  await expect(failedMaintenanceCopy).toHaveCount(0);
  await expect(owner.getByText('Critical: a future save may fail.')).toHaveCount(0);
  await expect(owner.getByText('Warning: origin storage is 80% to under 90%')).toBeVisible();
  await expect.poll(async () => (await indexedDbSaveFaultState(owner)).totalAttempts).toBe(failures.totalAttempts + 1);
  const afterPrune = await readIndexedDbSaveIntegrityPair(owner, activeSaveId);
  expect(afterPrune.primaryChecksum).toBe(afterPrune.backupChecksum);
  expect(afterPrune.primaryChecksum).not.toBe(before.primaryChecksum);
  expect(afterPrune.primaryUpdatedAt).toBe(afterPrune.backupUpdatedAt);
  expect(afterPrune.primaryUpdatedAt).not.toBe(before.primaryUpdatedAt);
  await opener.click();
  await expect(dialog).toContainText('0 expired ticker entries and 0 resolved or expired consequence watchers');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await freshRuntimeReload(owner, { ready: async () => waitForAppReady(owner) });
  await owner.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Settings', exact: true }).click();
  await opener.click();
  await expect(dialog).toContainText('0 expired ticker entries and 0 resolved or expired consequence watchers');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();

  // A public mutation establishes that the owner remains authoritative and its
  // exact primary/shadow pair survives a hard reload while the contender stays blocked.
  await runGlobalSimulation(owner, 'Sim Day (Space)');
  await drainDurableOverlays(owner);
  const after = await readIndexedDbSaveIntegrityPair(owner, activeSaveId);
  expect(after.primaryChecksum).toBe(after.backupChecksum);
  expect(after.primaryChecksum).not.toBe(afterPrune.primaryChecksum);
  await freshRuntimeReload(owner, { ready: async () => waitForAppReady(owner) });
  await expect(readIndexedDbSaveIntegrityPair(owner, activeSaveId)).resolves.toEqual(after);
  await owner.close();
  await duplicate.getByRole('button', { name: 'Check again', exact: true }).click();
  await waitForAppReady(duplicate);
  await expect(readIndexedDbSaveIntegrityPair(duplicate, activeSaveId)).resolves.toEqual(after);
  await runGlobalSimulation(duplicate, 'Sim Day (Space)');
  await drainDurableOverlays(duplicate);
  await expectMutationSaved(duplicate);
  const successor = await readIndexedDbSaveIntegrityPair(duplicate, activeSaveId);
  expect(successor.primaryChecksum).toBe(successor.backupChecksum);
  expect(successor.primaryChecksum).not.toBe(after.primaryChecksum);
  await freshRuntimeReload(duplicate, { ready: async () => waitForAppReady(duplicate) });
  await expect(readIndexedDbSaveIntegrityPair(duplicate, activeSaveId)).resolves.toEqual(successor);
});
