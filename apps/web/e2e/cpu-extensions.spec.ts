import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  createOffseasonState,
  createOwnerState,
} from '../../../packages/sim-core/src/index';
import {
  dismissGuidedStartNudges,
  drainDurableOverlays,
  expectDurableSaveSummary,
  expectFreshMutationRuntime,
  expectMutationSaved,
  freshRuntimeReload,
  mainNavigation,
  readIndexedDbSaveIntegrityPair,
  waitForAppReady,
} from './helpers/dynasty';

const ACTIVE_SAVE_ID = 'save-slot-2';
const CPU_PLAYER_ID = '13000000-0000-4000-8000-000000000001';
const CPU_PLAYER_NAME = 'Eli Anchor';

interface DurableExtensionFact {
  contract: { years: number; annualSalary: number; totalValue: number };
  history: Array<{
    season: number;
    teamId: string;
    years: number;
    annualSalary: number;
    totalValue: number;
    outcome: string;
  }>;
  results: Array<{
    playerId: string;
    teamId: string;
    status: string;
    years: number;
    annualSalary: number;
    totalValue: number;
  }>;
  extensionNewsCount: number;
}

async function buildCpuExtensionImport(): Promise<Buffer> {
  const snapshot = JSON.parse(await readFile(
    new URL('../../../packages/contracts/tests/fixtures/save/v34/core.json', import.meta.url),
    'utf8',
  )) as Record<string, any>;
  const userPlayer = structuredClone(snapshot.players[0]);
  userPlayer.teamId = 'nym';
  userPlayer.contract = {
    ...userPlayer.contract,
    years: 4,
    annualSalary: 4.2,
    totalValue: 16.8,
  };
  userPlayer.extensionHistory = [{
    season: snapshot.season,
    teamId: 'nym',
    years: 4,
    annualSalary: 4.2,
    totalValue: 16.8,
    outcome: 'accepted',
  }];

  const candidate = structuredClone(snapshot.players[0]);
  candidate.id = CPU_PLAYER_ID;
  candidate.firstName = 'Eli';
  candidate.lastName = 'Anchor';
  candidate.teamId = 'bos';
  candidate.position = 'SS';
  candidate.rosterStatus = 'MLB';
  candidate.minorLeagueLevel = null;
  candidate.age = 27;
  candidate.overallRating = 420;
  candidate.ceiling = 430;
  candidate.serviceTimeDays = 5 * 172;
  candidate.hitterAttributes = {
    contact: 420,
    power: 410,
    eye: 415,
    speed: 350,
    defense: 390,
    durability: 400,
  };
  candidate.pitcherAttributes = null;
  candidate.contract = {
    ...candidate.contract,
    years: 1,
    annualSalary: 12,
    totalValue: 12,
    noTradeClause: false,
    playerOption: false,
    teamOption: false,
    optOutYears: [],
  };
  candidate.extensionHistory = [];

  snapshot.players = [userPlayer, candidate];
  snapshot.serviceTime = snapshot.players.map((player: { id: string; serviceTimeDays: number }) => [
    player.id,
    Math.floor(player.serviceTimeDays / 172),
  ]);
  snapshot.gmPersonalities = [['bos', 'win_now'], ['nym', 'analytical']];
  snapshot.userTeamId = 'nym';
  snapshot.phase = 'offseason';
  snapshot.day = 1;
  snapshot.rng = { seed: 7_305, callCount: 0 };
  snapshot.seasonState = {
    ...snapshot.seasonState,
    currentDay: 1,
    standings: [{
      teamId: 'bos',
      wins: 96,
      losses: 48,
      runsScored: 760,
      runsAllowed: 610,
      streak: 4,
      last10: [7, 3],
      divisionWins: 38,
      divisionLosses: 20,
    }],
    playerSeasonStats: [],
  };
  snapshot.offseasonState = {
    ...createOffseasonState(snapshot.season),
    currentPhase: 'tender_nontender',
    phaseDay: 5,
    totalDay: 15,
  };
  snapshot.narrative.ownerState = [
    ['bos', createOwnerState('bos', 500)],
    ['nym', createOwnerState('nym', 250)],
  ];
  snapshot.freeAgencyMarket = null;
  snapshot.news = [];
  snapshot.rosterStates = [];

  return Buffer.from(JSON.stringify({
    kind: 'mbd-save-export',
    name: 'ECON-EXTENSION-AI-1 browser fixture',
    exportedAt: '2026-07-15T00:00:00.000Z',
    snapshot,
  }));
}

async function importAndOpenOffseason(page: Page): Promise<void> {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New Dynasty', exact: true }).click();
  await page.getByRole('button', { name: /^Challenge Scenario/ }).click();
  await page.getByRole('button', { name: /^Trade Shark\b/ }).click();
  await page.getByLabel('GM Name').fill('Extension AI GM');
  await page.locator('[data-mobile-critical-control="setup-wizard-submit"]').click();
  await expect(page).toHaveURL(/\/MBD\/dashboard$/);
  await waitForAppReady(page);
  await drainDurableOverlays(page);
  await dismissGuidedStartNudges(page);
  await expectDurableSaveSummary(page);

  await mainNavigation(page).getByRole('link', { name: 'Settings', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'econ-extension-ai-v34.json',
    mimeType: 'application/json',
    buffer: await buildCpuExtensionImport(),
  });
  await expect(page.getByText('Imported save into slot 2.')).toBeVisible();
  await page.getByRole('button', { name: 'Load save slot 2', exact: true }).click();
  await expect(page.getByText('Loaded slot 2.')).toBeVisible();
  await waitForAppReady(page);
  await expectDurableSaveSummary(page);
  await mainNavigation(page).getByRole('link', { name: 'Offseason', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tender / Non-Tender', exact: true })).toBeVisible();
}

async function readDurableExtensionFact(page: Page): Promise<DurableExtensionFact> {
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
      const snapshot = record.snapshot;
      const player = snapshot.players.find((entry: { id: string }) => entry.id === playerId);
      return {
        contract: {
          years: player.contract.years,
          annualSalary: player.contract.annualSalary,
          totalValue: player.contract.totalValue,
        },
        history: (player.extensionHistory ?? []).filter(
          (entry: { season: number }) => entry.season === snapshot.season,
        ),
        results: (snapshot.offseasonState?.phaseResults.extensions ?? []).filter(
          (entry: { playerId: string }) => entry.playerId === playerId,
        ),
        extensionNewsCount: snapshot.news.filter(
          (entry: { category: string; relatedPlayerIds: string[] }) =>
            entry.category === 'extension' && entry.relatedPlayerIds.includes(playerId),
        ).length,
      };
    } finally {
      database.close();
    }
  }, { saveId: ACTIVE_SAVE_ID, playerId: CPU_PLAYER_ID });
}

test('ECON-EXTENSION-AI-1 persists one CPU extension through hard reload and phase retry', async ({ page }, testInfo) => {
  test.setTimeout(8 * 60_000);
  await importAndOpenOffseason(page);

  await test.step('enter extensions under exact-save authority and inspect the mobile result surface', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    const advance = page.locator('[data-mobile-critical-control="offseason-advance-day"]');
    await advance.focus();
    await expect(advance).toBeFocused();
    const bounds = await advance.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
    await expectFreshMutationRuntime(page);
    await advance.click();
    await expectMutationSaved(page);
    await expect(page.getByRole('heading', { name: 'Extensions', exact: true }).first()).toBeVisible();
    const ledgerRow = page.getByText(new RegExp(`${CPU_PLAYER_NAME} signed an extension`));
    await expect(ledgerRow).toBeVisible();
    await ledgerRow.scrollIntoViewIfNeeded();
    const ledgerBounds = await ledgerRow.boundingBox();
    expect(ledgerBounds).not.toBeNull();
    expect(ledgerBounds!.x).toBeGreaterThanOrEqual(0);
    expect(ledgerBounds!.x + ledgerBounds!.width).toBeLessThanOrEqual(375);
    await ledgerRow.screenshot({ path: testInfo.outputPath('cpu-extension-ledger-mobile.png') });
    await page.screenshot({ path: testInfo.outputPath('cpu-extension-mobile.png'), fullPage: true });
  });

  let durableFact: DurableExtensionFact | null = null;
  await test.step('bind one contract, history, phase, and news fact to the durable snapshot', async () => {
    durableFact = await readDurableExtensionFact(page);
    expect(durableFact.results).toHaveLength(1);
    const result = durableFact.results[0]!;
    expect(result.status).toBe('accepted');
    expect(durableFact.history).toHaveLength(1);
    expect(durableFact.history[0]!.outcome).toBe('accepted');
    expect(durableFact.contract).toEqual({
      years: result.years,
      annualSalary: result.annualSalary,
      totalValue: result.totalValue,
    });
    expect(durableFact.history[0]).toMatchObject({
      teamId: result.teamId,
      years: result.years,
      annualSalary: result.annualSalary,
      totalValue: result.totalValue,
      outcome: result.status,
    });
    expect(durableFact.extensionNewsCount).toBeGreaterThanOrEqual(1);
    const integrity = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
    expect(integrity.primaryChecksum).toBe(integrity.backupChecksum);
  });

  await test.step('hard reload and advance inside the phase without replaying the CPU decision', async () => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await freshRuntimeReload(page, { ready: async () => waitForAppReady(page) });
    await expect(page.getByText(new RegExp(`${CPU_PLAYER_NAME} signed an extension`))).toBeVisible();
    if (!durableFact) throw new Error('Missing durable extension fact.');
    await expect(readDurableExtensionFact(page)).resolves.toEqual(durableFact);
    await page.getByRole('button', { name: 'Advance Day', exact: true }).click();
    await expectMutationSaved(page);
    await expect(readDurableExtensionFact(page)).resolves.toEqual(durableFact);
    await page.getByText(new RegExp(`${CPU_PLAYER_NAME} signed an extension`)).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('cpu-extension-desktop.png'), fullPage: true });
  });

  await test.step('show the same factual event in the existing news surface', async () => {
    await mainNavigation(page).getByRole('link', { name: 'News', exact: true }).click();
    await expect(page.getByText(CPU_PLAYER_NAME, { exact: false }).first()).toBeVisible();
  });
});
