import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  dismissGuidedStartNudges,
  drainDurableOverlays,
  expectDurableSaveSummary,
  expectMutationSaved,
  freshRuntimeReload,
  mainNavigation,
  readIndexedDbSaveIntegrityPair,
  waitForAppReady,
} from './helpers/dynasty';

const ACTIVE_SAVE_ID = 'save-slot-2';
const PLAYER_ID = '11111111-1111-4111-8111-111111111111';
const PLAYER_NAME = 'Alex Ramirez';

async function buildArbitrationImport(): Promise<Buffer> {
  const snapshot = JSON.parse(await readFile(
    new URL('../../../packages/contracts/tests/fixtures/save/v34/core.json', import.meta.url),
    'utf8',
  )) as Record<string, any>;
  const player = snapshot.players[0];
  player.serviceTimeDays = 2 * 172;
  player.rosterStatus = 'MLB';
  player.teamId = 'nym';
  player.superTwoQualified = false;
  player.arbitrationHistory = [];
  player.holdoutState = null;
  player.contract = {
    ...player.contract,
    years: 1,
    annualSalary: 4.2,
    totalValue: 4.2,
    teamOption: false,
    playerOption: false,
    optOutYears: [],
  };
  snapshot.serviceTime = [[player.id, 99]];
  snapshot.phase = 'offseason';
  snapshot.day = 1;
  snapshot.offseasonState = null;
  snapshot.freeAgencyMarket = null;
  snapshot.news = [];
  snapshot.rosterStates = [];

  return Buffer.from(JSON.stringify({
    kind: 'mbd-save-export',
    name: 'ECON-ARBITRATION-1 browser fixture',
    exportedAt: '2026-07-14T00:00:00.000Z',
    snapshot,
  }));
}

async function importAndOpenOffseason(page: Page): Promise<void> {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New Dynasty', exact: true }).click();
  await page.getByRole('button', { name: /^Challenge Scenario/ }).click();
  await page.getByRole('button', { name: /^Trade Shark\b/ }).click();
  await page.getByLabel('GM Name').fill('Arbitration GM');
  await page.locator('[data-mobile-critical-control="setup-wizard-submit"]').click();
  await expect(page).toHaveURL(/\/MBD\/dashboard$/);
  await waitForAppReady(page);
  await drainDurableOverlays(page);
  await dismissGuidedStartNudges(page);
  await expectDurableSaveSummary(page);

  await mainNavigation(page).getByRole('link', { name: 'Settings', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'econ-arbitration-v34.json',
    mimeType: 'application/json',
    buffer: await buildArbitrationImport(),
  });
  await expect(page.getByText('Imported save into slot 2.')).toBeVisible();
  await page.getByRole('button', { name: 'Load save slot 2', exact: true }).click();
  await expect(page.getByText('Loaded slot 2.')).toBeVisible();
  await waitForAppReady(page);
  await expectDurableSaveSummary(page);

  await mainNavigation(page).getByRole('link', { name: 'Offseason', exact: true }).click();
  await expect(page).toHaveURL(/\/MBD\/offseason$/);
  await page.getByRole('button', { name: 'Skip Phase', exact: true }).click();
  await expectMutationSaved(page);
  await expect(page.getByRole('heading', { name: 'Arbitration', exact: true }).first()).toBeVisible();
}

async function advanceDays(page: Page, count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await page.getByRole('button', { name: 'Advance Day', exact: true }).click();
    await expectMutationSaved(page);
  }
}

async function readDurableArbitrationFact(page: Page): Promise<{
  annualSalary: number;
  history: Array<{ awardedSalary: number; season: number; teamWon: boolean }>;
}> {
  return page.evaluate(async ({ saveId, playerId }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('mbd-saves');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const record = await new Promise<any>((resolve, reject) => {
        const transaction = database.transaction('saves', 'readonly');
        const request = transaction.objectStore('saves').get(saveId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const player = record.snapshot.players.find((candidate: { id: string }) => candidate.id === playerId);
      return {
        annualSalary: player.contract.annualSalary,
        history: player.arbitrationHistory,
      };
    } finally {
      database.close();
    }
  }, { saveId: ACTIVE_SAVE_ID, playerId: PLAYER_ID });
}

test('ECON-ARBITRATION-1 filing, exchange, hearing, and award survive production reloads', async ({ page }, testInfo) => {
  test.setTimeout(8 * 60_000);
  page.on('console', (message) => {
    if (message.type() === 'error') console.log(`[browser error] ${message.text()}`);
  });
  page.on('pageerror', (error) => console.log(`[browser pageerror] ${error.message}`));
  await importAndOpenOffseason(page);

  await test.step('persist a filing without leaking exchanged figures', async () => {
    const filedCase = page.getByRole('article', { name: `${PLAYER_NAME} arbitration case: Filed` });
    await expect(filedCase).toBeVisible();
    await expect(filedCase.getByText('Club filing', { exact: true })).toHaveCount(0);
    const filedIntegrity = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
    expect(filedIntegrity.primaryChecksum).toBe(filedIntegrity.backupChecksum);

    await freshRuntimeReload(page, { ready: async () => waitForAppReady(page) });
    await expect(page.getByRole('article', { name: `${PLAYER_NAME} arbitration case: Filed` })).toBeVisible();
    await expect(readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)).resolves.toEqual(filedIntegrity);
  });

  let exchangeFigures: string[] = [];
  await test.step('persist exchanged figures and inspect the mobile control surface', async () => {
    await advanceDays(page, 2);
    const exchanged = page.getByRole('article', { name: `${PLAYER_NAME} arbitration case: Figures exchanged` });
    await expect(exchanged).toBeVisible();
    await expect(exchanged.getByText('Club filing', { exact: true })).toBeVisible();
    await expect(exchanged.getByText('Player filing', { exact: true })).toBeVisible();
    exchangeFigures = await exchanged.locator('dd').allTextContents();

    await page.setViewportSize({ width: 375, height: 667 });
    const advance = page.getByRole('button', { name: 'Advance Day', exact: true });
    await advance.focus();
    await expect(advance).toBeFocused();
    const bounds = await exchanged.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
    await page.screenshot({ path: testInfo.outputPath('arbitration-exchange-mobile.png'), fullPage: true });

    await page.setViewportSize({ width: 1280, height: 720 });
    await freshRuntimeReload(page, { ready: async () => waitForAppReady(page) });
    await expect(
      page.getByRole('article', { name: `${PLAYER_NAME} arbitration case: Figures exchanged` }).locator('dd'),
    ).toHaveText(exchangeFigures);
  });

  await test.step('persist a distinct hearing checkpoint before the award', async () => {
    await advanceDays(page, 3);
    const hearing = page.getByRole('article', { name: `${PLAYER_NAME} arbitration case: Hearing` });
    await expect(hearing).toBeVisible();
    await expect(hearing.getByText('Award', { exact: true }).locator('xpath=following-sibling::dd[1]'))
      .toHaveText('Pending');
    const hearingIntegrity = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
    expect(hearingIntegrity.primaryChecksum).toBe(hearingIntegrity.backupChecksum);

    await freshRuntimeReload(page, { ready: async () => waitForAppReady(page) });
    await expect(page.getByRole('article', { name: `${PLAYER_NAME} arbitration case: Hearing` })).toBeVisible();
    await expect(readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)).resolves.toEqual(hearingIntegrity);
  });

  await test.step('persist exactly one award and retain it across hard reload', async () => {
    await advanceDays(page, 1);
    const resolved = page.getByRole('article', { name: `${PLAYER_NAME} arbitration case: Award issued` });
    await expect(resolved).toBeVisible();
    await expect(resolved.getByText(/^Hearing result: (club|player) filing selected\.$/)).toBeVisible();
    const durableFact = await readDurableArbitrationFact(page);
    expect(durableFact.history).toHaveLength(1);
    expect(durableFact.history[0]!.awardedSalary).toBe(durableFact.annualSalary);
    expect(durableFact.annualSalary).toBeGreaterThanOrEqual(4.2);
    const awardIntegrity = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
    expect(awardIntegrity.primaryChecksum).toBe(awardIntegrity.backupChecksum);
    await page.screenshot({ path: testInfo.outputPath('arbitration-award-desktop.png'), fullPage: true });

    await freshRuntimeReload(page, { ready: async () => waitForAppReady(page) });
    await expect(page.getByRole('article', { name: `${PLAYER_NAME} arbitration case: Award issued` })).toBeVisible();
    await expect(readDurableArbitrationFact(page)).resolves.toEqual(durableFact);
    await expect(readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)).resolves.toEqual(awardIntegrity);
  });
});
