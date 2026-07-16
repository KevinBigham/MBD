import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import {
  disableIndexedDbSaveFault,
  dismissGuidedStartNudges,
  drainDurableOverlays,
  enableIndexedDbSaveFault,
  expectDurableSaveSummary,
  expectMutationSaved,
  freshRuntimeReload,
  handlePressConference,
  indexedDbSaveFaultState,
  installIndexedDbSaveFault,
  mainNavigation,
  navigateFromSidebar,
  readIndexedDbSaveIntegrityPair,
  saveStatus,
  waitForAppReady,
} from './helpers/dynasty';

const ACTIVE_SAVE_ID = 'save-slot-2';
const LEGAL_OFFER_ID = 'trade-retention-browser-legal';
const INVALID_OFFER_ID = 'trade-retention-browser-over-cap';
const DESKTOP_EVIDENCE_PATH = fileURLToPath(new URL(
  '../../../docs/codex/runs/ECON-TRADE-RETENTION-1/evidence/trade-retention-desktop.png',
  import.meta.url,
));
const MOBILE_EVIDENCE_PATH = fileURLToPath(new URL(
  '../../../docs/codex/runs/ECON-TRADE-RETENTION-1/evidence/trade-retention-mobile-375x667.png',
  import.meta.url,
));

interface BrowserFixtureFacts {
  invalidPlayerId: string;
  legalPlayerId: string;
  legalPlayerName: string;
  legalPayerTeamId: string;
  outgoingPlayerId: string;
  season: number;
  userTeamId: string;
}

interface DurableTradeFacts {
  historyCount: number;
  pendingLegalCount: number;
  legalControllerTeamId: string | null;
  outgoingControllerTeamId: string | null;
  retainedAnnualAmount: number | null;
  cashAmount: number | null;
  contractAnnualSalary: number | null;
  tradeNewsBodies: string[];
}

type SnapshotPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  teamId: string | null;
  rosterStatus: string;
  contract: {
    annualSalary: number;
    years: number;
    totalValue: number;
    playerOption: boolean;
    teamOption: boolean;
  };
};

async function createAndExportLeague(page: Page): Promise<Record<string, any>> {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New Dynasty', exact: true }).click();
  await page.getByRole('button', { name: /^Challenge Scenario/ }).click();
  await page.getByRole('button', { name: /^Trade Shark\b/ }).click();
  await page.getByLabel('GM Name').fill('Retention Browser GM');
  await page.locator('[data-mobile-critical-control="setup-wizard-submit"]').click();
  await expect(page).toHaveURL(/\/MBD\/dashboard$/);
  await waitForAppReady(page);
  await drainDurableOverlays(page);
  await dismissGuidedStartNudges(page);
  await expectDurableSaveSummary(page);

  await mainNavigation(page).getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL(/\/MBD\/settings$/);
  await waitForAppReady(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {
    name: 'Export the current dynasty as a JSON save file',
    exact: true,
  }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error('The production save export did not produce a readable download.');
  return JSON.parse(await readFile(downloadPath, 'utf8')) as Record<string, any>;
}

function synthesizeIncomingOffers(payload: Record<string, any>): BrowserFixtureFacts {
  const snapshot = payload.snapshot as Record<string, any>;
  const players = snapshot.players as SnapshotPlayer[];
  const season = snapshot.season as number;
  const userTeamId = snapshot.userTeamId as string;
  const userPlayer = players.find((player) => player.teamId === userTeamId && player.rosterStatus === 'MLB');
  const cpuPlayers = players.filter((player) => player.teamId
    && player.teamId !== userTeamId
    && player.rosterStatus === 'MLB');
  const legalPlayer = cpuPlayers[0];
  const invalidPlayer = cpuPlayers.find((player) => player.teamId !== legalPlayer?.teamId);
  if (!userPlayer || !legalPlayer || !invalidPlayer || !legalPlayer.teamId || !invalidPlayer.teamId) {
    throw new Error('The generated browser league did not expose three usable trade clubs.');
  }

  legalPlayer.contract = {
    ...legalPlayer.contract,
    annualSalary: 20,
    years: 3,
    totalValue: 60,
    playerOption: false,
    teamOption: false,
  };
  invalidPlayer.contract = {
    ...invalidPlayer.contract,
    annualSalary: 18,
    years: 3,
    totalValue: 54,
    playerOption: false,
    teamOption: false,
  };
  snapshot.phase = 'regular';
  snapshot.day = 60;
  snapshot.seasonState.currentDay = 60;
  snapshot.seasonState.completed = false;
  snapshot.tradeState.pendingOffers = [
    {
      id: INVALID_OFFER_ID,
      fromTeamId: invalidPlayer.teamId,
      toTeamId: userTeamId,
      offeringAssets: [{
        type: 'player',
        playerId: invalidPlayer.id,
        contractReference: {
          annualSalary: 18,
          contractEndSeasonExclusive: season + 3,
        },
        retainedSalary: {
          annualAmount: 9.01,
          startSeason: season,
          endSeasonExclusive: season + 3,
        },
      }],
      requestingAssets: [{ type: 'player', playerId: userPlayer.id }],
      fairnessScore: 0,
      message: 'This deliberately invalid offer exceeds the retention cap.',
      createdAt: `S${season}D60`,
    },
    {
      id: LEGAL_OFFER_ID,
      fromTeamId: legalPlayer.teamId,
      toTeamId: userTeamId,
      offeringAssets: [{
        type: 'player',
        playerId: legalPlayer.id,
        contractReference: {
          annualSalary: 20,
          contractEndSeasonExclusive: season + 3,
        },
        retainedSalary: {
          annualAmount: 5,
          startSeason: season,
          endSeasonExclusive: season + 3,
        },
        cashConsideration: { amount: 2, season },
      }],
      requestingAssets: [{ type: 'player', playerId: userPlayer.id }],
      fairnessScore: 0,
      message: 'This exact offer carries legal player-linked salary support.',
      createdAt: `S${season}D60`,
    },
  ];
  snapshot.tradeState.tradeHistory = [];
  snapshot.tradeState.negotiations = [];
  snapshot.tradeState.multiTeamPendingTrades = [];
  payload.name = 'ECON-TRADE-RETENTION-1 browser fixture';
  payload.exportedAt = '2026-07-16T00:00:00.000Z';

  return {
    invalidPlayerId: invalidPlayer.id,
    legalPlayerId: legalPlayer.id,
    legalPlayerName: `${legalPlayer.firstName} ${legalPlayer.lastName}`,
    legalPayerTeamId: legalPlayer.teamId,
    outgoingPlayerId: userPlayer.id,
    season,
    userTeamId,
  };
}

async function importAndLoadFixture(page: Page): Promise<BrowserFixtureFacts> {
  const payload = await createAndExportLeague(page);
  const facts = synthesizeIncomingOffers(payload);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'trade-retention-v35.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await expect(page.getByText('Imported save into slot 2.')).toBeVisible();
  await page.getByRole('button', { name: 'Load save slot 2', exact: true }).click();
  await expect(page.getByText('Loaded slot 2.')).toBeVisible();
  await waitForAppReady(page);
  await expectDurableSaveSummary(page);
  await handlePressConference(page, 'skip');
  return facts;
}

function offerForPlayer(page: Page, playerId: string) {
  return page.getByTestId('trade-offer-card').filter({
    has: page.locator(`[data-player-id="${playerId}"]`),
  });
}

async function readDurableTradeFacts(
  page: Page,
  fixture: BrowserFixtureFacts,
): Promise<DurableTradeFacts> {
  return page.evaluate(async ({ saveId, fixtureFacts, legalOfferId }) => {
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
      const entries = snapshot.tradeState.tradeHistory.filter(
        (entry: { id: string }) => entry.id === legalOfferId,
      );
      const asset = entries[0]?.offeringAssets.find(
        (entry: { type: string; playerId?: string }) => (
          entry.type === 'player' && entry.playerId === fixtureFacts.legalPlayerId
        ),
      );
      return {
        historyCount: entries.length,
        pendingLegalCount: snapshot.tradeState.pendingOffers.filter(
          (entry: { id: string }) => entry.id === legalOfferId,
        ).length,
        legalControllerTeamId: snapshot.players.find(
          (player: { id: string }) => player.id === fixtureFacts.legalPlayerId,
        )?.teamId ?? null,
        outgoingControllerTeamId: snapshot.players.find(
          (player: { id: string }) => player.id === fixtureFacts.outgoingPlayerId,
        )?.teamId ?? null,
        retainedAnnualAmount: asset?.retainedSalary?.annualAmount ?? null,
        cashAmount: asset?.cashConsideration?.amount ?? null,
        contractAnnualSalary: asset?.contractReference?.annualSalary ?? null,
        tradeNewsBodies: snapshot.news.map((item: { body: string }) => item.body),
      };
    } finally {
      database.close();
    }
  }, { saveId: ACTIVE_SAVE_ID, fixtureFacts: fixture, legalOfferId: LEGAL_OFFER_ID });
}

test('ECON-TRADE-RETENTION-1 rejects invalid terms and durably retries one exact financial trade', async ({
  context,
  page,
}) => {
  test.setTimeout(8 * 60_000);
  expect(test.info().retry).toBe(0);
  await installIndexedDbSaveFault(context);
  await mkdir(dirname(DESKTOP_EVIDENCE_PATH), { recursive: true });
  const fixture = await importAndLoadFixture(page);

  await navigateFromSidebar(page, '/trade', 'Trade Center');
  const invalidCard = offerForPlayer(page, fixture.invalidPlayerId);
  const legalCard = offerForPlayer(page, fixture.legalPlayerId);
  await expect(invalidCard).toHaveCount(1);
  await expect(legalCard).toHaveCount(1);
  await expect(legalCard).toContainText('$20.00M gross');
  await expect(legalCard).toContainText('$5.00M/yr retained');
  await expect(legalCard).toContainText('$2.00M cash');

  const beforeInvalid = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
  await invalidCard.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(page.getByText(
    'Cumulative retained salary cannot exceed 50% of the gross annual salary.',
    { exact: true },
  )).toBeVisible();
  await expect(readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)).resolves.toEqual(beforeInvalid);
  await expect(invalidCard).toHaveCount(1);

  await enableIndexedDbSaveFault(page);
  const acceptLegal = legalCard.getByRole('button', { name: 'Accept', exact: true });
  await acceptLegal.focus();
  await expect(acceptLegal).toBeFocused();
  await acceptLegal.click();
  const retry = saveStatus(page).getByRole('button', { name: 'Retry failed save' });
  await expect(retry).toBeVisible({ timeout: 90_000 });
  await expect(saveStatus(page)).toContainText('Retry');
  await expect(readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)).resolves.toEqual(beforeInvalid);
  expect((await indexedDbSaveFaultState(page)).blockedAttempts).toBe(1);

  await disableIndexedDbSaveFault(page);
  await retry.click();
  await expectMutationSaved(page);
  await expect(page.getByRole('heading', { name: 'Deal Completed', exact: true })).toBeVisible();
  await expect(page.getByText('Trade accepted.', { exact: true })).toBeVisible();
  await expect(legalCard).toHaveCount(0);

  const durableIntegrity = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
  expect(durableIntegrity.primaryChecksum).toBe(durableIntegrity.backupChecksum);
  expect(durableIntegrity.primaryChecksum).not.toBe(beforeInvalid.primaryChecksum);
  const durableFacts = await readDurableTradeFacts(page, fixture);
  await test.info().attach('trade-retention-durable-facts.json', {
    body: JSON.stringify({ fixture, durableIntegrity, durableFacts }, null, 2),
    contentType: 'application/json',
  });
  expect(durableFacts).toMatchObject({
    historyCount: 1,
    pendingLegalCount: 0,
    legalControllerTeamId: fixture.userTeamId,
    outgoingControllerTeamId: fixture.legalPayerTeamId,
    retainedAnnualAmount: 5,
    cashAmount: 2,
    contractAnnualSalary: 20,
  });
  expect(durableFacts.tradeNewsBodies).toEqual(expect.arrayContaining([
    expect.stringContaining('$5.00M per year'),
    expect.stringContaining('$2.00M of current-season payroll reimbursement'),
  ]));
  await expect(page.getByText('Local save recovered.', { exact: true })).toBeHidden({ timeout: 30_000 });

  await navigateFromSidebar(page, '/finance', 'Finance');
  await expect(page.getByText('$7.00M received', { exact: true })).toBeVisible();
  const playerRow = page.getByTestId('contract-table').getByRole('row').filter({
    hasText: fixture.legalPlayerName,
  });
  await expect(playerRow).toContainText('$20.0M gross');
  await expect(playerRow).toContainText('$13.0M net · $7.0M credit');
  await playerRow.scrollIntoViewIfNeeded();
  await page.screenshot({ path: DESKTOP_EVIDENCE_PATH, fullPage: false });

  await navigateFromSidebar(page, '/press-room', 'Press Room');
  const transactionLog = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Transaction Log', exact: true }),
  });
  const financialPressEntry = transactionLog.filter({
    hasText: '$5.00M per year',
  }).filter({
    hasText: '$2.00M of current-season payroll reimbursement',
  });
  await expect(financialPressEntry).toHaveCount(1);

  await page.setViewportSize({ width: 375, height: 667 });
  const mobilePressFilter = page.getByRole('combobox').first();
  await mobilePressFilter.focus();
  await expect(mobilePressFilter).toBeFocused();
  const financialPressBody = transactionLog.getByText(
    /\$5\.00M per year.*\$2\.00M of current-season payroll reimbursement/,
  );
  await financialPressBody.scrollIntoViewIfNeeded();
  const mobileBox = await financialPressBody.boundingBox();
  expect(mobileBox).not.toBeNull();
  expect(mobileBox!.x).toBeGreaterThanOrEqual(0);
  expect(mobileBox!.x + mobileBox!.width).toBeLessThanOrEqual(375);
  await page.screenshot({ path: MOBILE_EVIDENCE_PATH, fullPage: false });
  await page.setViewportSize({ width: 1280, height: 720 });

  await freshRuntimeReload(page, {
    ready: async () => {
      await expect(page.getByRole('heading', { name: 'Press Room', exact: true })).toBeVisible();
    },
  });
  await expect(readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)).resolves.toEqual(durableIntegrity);
  await expect(readDurableTradeFacts(page, fixture)).resolves.toEqual(durableFacts);
  await expect(page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Transaction Log', exact: true }),
  })).toContainText('$5.00M per year');
});
