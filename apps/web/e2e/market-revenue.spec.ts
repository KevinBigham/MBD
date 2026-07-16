import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  REGULAR_SEASON_DAYS,
  TEAMS,
  createOwnerState,
  deriveMarketRevenueStatement,
  getTeamBudget,
} from '../../../packages/sim-core/src/index';
import {
  appMain,
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
const RECEIPT = 'market_revenue_budget_reconciled_s3';
const DESKTOP_EVIDENCE_PATH = fileURLToPath(new URL(
  '../../../docs/codex/runs/ECON-MARKET-REVENUE-1/evidence/market-revenue-desktop.png',
  import.meta.url,
));
const MOBILE_EVIDENCE_PATH = fileURLToPath(new URL(
  '../../../docs/codex/runs/ECON-MARKET-REVENUE-1/evidence/market-revenue-mobile.png',
  import.meta.url,
));

interface DurableMarketRevenueFacts {
  userRecord: { wins: number; losses: number } | null;
  playoffSeedCount: number;
  playoffCompletedRoundCount: number;
  playoffSeriesCount: number;
  completedWorldSeriesCount: number;
  champion: string | null;
  annualBudget: number | null;
  payrollCap: number | null;
  payrollTarget: number | null;
  draftBonusPool: number | null;
  ifaBonusPool: number | null;
  staffBudget: number | null;
  userReceiptCount: number;
  leagueReceiptCount: number;
  newsCount: number;
  briefingCount: number;
}

function completedStandings() {
  return TEAMS.map((team, index) => {
    const wins = team.id === 'nym'
      ? 100
      : team.id === 'phi'
        ? 62
        : index % 2 === 0
          ? 82
          : 80;
    return {
      teamId: team.id,
      wins,
      losses: 162 - wins,
      runsScored: wins * 5,
      runsAllowed: (162 - wins) * 5,
      streak: 0,
      last10: [5, 5] as [number, number],
      divisionWins: 20,
      divisionLosses: 20,
    };
  });
}

async function buildMarketRevenueImport(): Promise<Buffer> {
  const snapshot = JSON.parse(await readFile(
    new URL('../../../packages/contracts/tests/fixtures/save/v34/core.json', import.meta.url),
    'utf8',
  )) as Record<string, any>;

  snapshot.userTeamId = 'nym';
  snapshot.phase = 'regular';
  snapshot.day = REGULAR_SEASON_DAYS;
  const standings = completedStandings();
  snapshot.seasonState = {
    ...snapshot.seasonState,
    currentDay: REGULAR_SEASON_DAYS,
    completed: false,
    standings,
    playerSeasonStats: [],
  };
  snapshot.playoffBracket = null;
  snapshot.offseasonState = null;
  snapshot.freeAgencyMarket = null;
  snapshot.news = [];
  snapshot.narrative.ownerState = TEAMS.map((team) => [
    team.id,
    createOwnerState(team.id, getTeamBudget(team.id)),
  ]);
  snapshot.narrative.storyFlags = [];
  snapshot.narrative.briefingQueue = [];

  return Buffer.from(JSON.stringify({
    kind: 'mbd-save-export',
    name: 'ECON-MARKET-REVENUE-1 browser fixture',
    exportedAt: '2026-07-15T00:00:00.000Z',
    snapshot,
  }));
}

async function importAndLoadFixture(page: Page): Promise<void> {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New Dynasty', exact: true }).click();
  await page.getByRole('button', { name: /^Challenge Scenario/ }).click();
  await page.getByRole('button', { name: /^Trade Shark\b/ }).click();
  await page.getByLabel('GM Name').fill('Market Revenue GM');
  await page.locator('[data-mobile-critical-control="setup-wizard-submit"]').click();
  await expect(page).toHaveURL(/\/MBD\/dashboard$/);
  await waitForAppReady(page);
  await drainDurableOverlays(page);
  await dismissGuidedStartNudges(page);
  await expectDurableSaveSummary(page);

  await mainNavigation(page).getByRole('link', { name: 'Settings', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'market-revenue-v34.json',
    mimeType: 'application/json',
    buffer: await buildMarketRevenueImport(),
  });
  await expect(page.getByText('Imported save into slot 2.')).toBeVisible();
  await page.getByRole('button', { name: 'Load save slot 2', exact: true }).click();
  await expect(page.getByText('Loaded slot 2.')).toBeVisible();
  await waitForAppReady(page);
  await expectDurableSaveSummary(page);
  await skipPressConferenceIfPresent(page);
}

async function skipPressConferenceIfPresent(page: Page): Promise<void> {
  const dialog = page.locator('[role="dialog"][aria-labelledby="press-conference-modal-title"]');
  if (!await dialog.isVisible().catch(() => false)) return;
  await dialog.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function clickAndWaitForDurableSave(
  page: Page,
  control: Locator,
  timeout = 180_000,
): Promise<void> {
  const before = await expectDurableSaveSummary(page);
  await control.click();
  await expect(page.locator('[data-last-saved-at]').first()).not.toHaveAttribute(
    'data-last-saved-at',
    before.lastSavedAt,
    { timeout },
  );
  await expectMutationSaved(page);
}

async function readDurableMarketRevenueFacts(page: Page): Promise<DurableMarketRevenueFacts> {
  return page.evaluate(async ({ saveId, receipt }) => {
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
      const userRecord = snapshot.seasonState.standings.find(
        (standing: { teamId: string }) => standing.teamId === snapshot.userTeamId,
      );
      const userOwner = snapshot.narrative.ownerState.find(
        ([teamId]: [string]) => teamId === snapshot.userTeamId,
      )?.[1];
      const userFlags = snapshot.narrative.storyFlags.find(
        ([teamId]: [string]) => teamId === snapshot.userTeamId,
      )?.[1] ?? [];
      const leagueReceiptCount = snapshot.narrative.storyFlags.reduce(
        (count: number, [, flags]: [string, string[]]) => (
          count + flags.filter((flag) => flag === receipt).length
        ),
        0,
      );
      const newsId = `market-revenue-${snapshot.season}-${snapshot.userTeamId}`;
      return {
        userRecord: userRecord ? { wins: userRecord.wins, losses: userRecord.losses } : null,
        playoffSeedCount: snapshot.playoffBracket?.seeds.length ?? 0,
        playoffCompletedRoundCount: snapshot.playoffBracket?.completedRounds.length ?? 0,
        playoffSeriesCount: snapshot.playoffBracket?.series.length ?? 0,
        completedWorldSeriesCount: snapshot.playoffBracket?.currentRoundSeries.filter(
          (series: { round: string; status: string }) => (
            series.round === 'WORLD_SERIES' && series.status === 'complete'
          ),
        ).length ?? 0,
        champion: snapshot.playoffBracket?.champion ?? null,
        annualBudget: userOwner?.annualBudget ?? null,
        payrollCap: userOwner?.payrollCap ?? null,
        payrollTarget: userOwner?.expectations?.payrollTarget ?? null,
        draftBonusPool: userOwner?.draftBonusPool ?? null,
        ifaBonusPool: userOwner?.ifaBonusPool ?? null,
        staffBudget: userOwner?.staffBudget ?? null,
        userReceiptCount: userFlags.filter((flag: string) => flag === receipt).length,
        leagueReceiptCount,
        newsCount: snapshot.news.filter((item: { id: string }) => item.id === newsId).length,
        briefingCount: snapshot.narrative.briefingQueue.filter(
          (item: { id: string }) => item.id === `brief-${newsId}`,
        ).length,
      };
    } finally {
      database.close();
    }
  }, { saveId: ACTIVE_SAVE_ID, receipt: RECEIPT });
}

test('ECON-MARKET-REVENUE-1 settles all 32 budgets exactly once and survives hard reload', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  await importAndLoadFixture(page);
  const imported = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
  expect(imported.primaryChecksum).toBe(imported.backupChecksum);
  await expect(readDurableMarketRevenueFacts(page)).resolves.toMatchObject({
    userRecord: { wins: 100, losses: 62 },
    playoffSeedCount: 0,
    playoffCompletedRoundCount: 0,
    playoffSeriesCount: 0,
    completedWorldSeriesCount: 0,
    champion: null,
    userReceiptCount: 0,
    leagueReceiptCount: 0,
  });

  const expectedStatement = deriveMarketRevenueStatement({
    teamId: 'nym',
    wins: 100,
    losses: 62,
    madePlayoffs: true,
    ownerArchetype: 'win_now',
  });

  let settledFacts: DurableMarketRevenueFacts | null = null;
  await test.step('complete the season and postseason through the production controls', async () => {
    await mainNavigation(page).getByRole('link', { name: 'Front Office', exact: true }).click();
    await waitForAppReady(page);
    const simToPlayoffs = page.getByRole('button', {
      name: 'Fast-forward to the playoff cutoff',
      exact: true,
    });
    await expect(simToPlayoffs).toBeEnabled();
    await clickAndWaitForDurableSave(page, simToPlayoffs);
    await drainDurableOverlays(page);
    await skipPressConferenceIfPresent(page);

    const watchPlayoffs = appMain(page).getByRole('button', {
      name: /^(Go to Playoffs|Watch Playoffs)$/,
    });
    await expect(watchPlayoffs).toBeVisible({ timeout: 60_000 });
    await watchPlayoffs.click();
    await expect(page).toHaveURL(/\/MBD\/playoffs$/);
    await expect(appMain(page).getByRole('heading', { name: 'Playoffs', exact: true }))
      .toBeVisible();
    await waitForAppReady(page);
    await drainDurableOverlays(page);

    const startBracket = appMain(page).locator(
      '[data-mobile-critical-control="playoffs-start-bracket"]',
    );
    const simAll = appMain(page).locator('[data-mobile-critical-control="playoffs-sim-all"]');
    if (await startBracket.isVisible().catch(() => false)) {
      await clickAndWaitForDurableSave(page, startBracket);
      await expect(simAll).toBeVisible({ timeout: 60_000 });
    }
    await expect(simAll).toBeVisible({ timeout: 60_000 });
    await clickAndWaitForDurableSave(page, simAll);
    const proceed = appMain(page).getByRole('button', {
      name: 'Proceed to Offseason',
      exact: true,
    });
    await expect(proceed).toBeVisible({ timeout: 180_000 });
    await drainDurableOverlays(page);

    await expect(readDurableMarketRevenueFacts(page)).resolves.toMatchObject({
      userRecord: { wins: 100, losses: 62 },
      playoffSeedCount: 12,
      playoffCompletedRoundCount: 4,
      playoffSeriesCount: 11,
      completedWorldSeriesCount: 1,
      champion: 'nym',
      userReceiptCount: 0,
      leagueReceiptCount: 0,
    });

    await clickAndWaitForDurableSave(page, proceed);
    await expect(page.locator('header').getByText(/^Season 3 — Offseason:/))
      .toBeVisible({ timeout: 60_000 });
    await drainDurableOverlays(page);
  });

  await test.step('cross the exact Season Review boundary and durably settle every organization', async () => {
    await mainNavigation(page).getByRole('link', { name: 'Offseason', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Season Review', exact: true }).first()).toBeVisible();
    await clickAndWaitForDurableSave(
      page,
      page.getByRole('button', { name: 'Advance Day', exact: true }),
    );

    settledFacts = await readDurableMarketRevenueFacts(page);
    expect(settledFacts).toEqual({
      userRecord: { wins: 100, losses: 62 },
      playoffSeedCount: 12,
      playoffCompletedRoundCount: 4,
      playoffSeriesCount: 11,
      completedWorldSeriesCount: 1,
      champion: 'nym',
      annualBudget: expectedStatement.annualBudget,
      payrollCap: expectedStatement.payrollCap,
      payrollTarget: expectedStatement.expectationsPayrollTarget,
      draftBonusPool: expectedStatement.draftBonusPool,
      ifaBonusPool: expectedStatement.ifaBonusPool,
      staffBudget: expectedStatement.staffBudget,
      userReceiptCount: 1,
      leagueReceiptCount: 32,
      newsCount: 1,
      briefingCount: 1,
    });
    const settled = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
    expect(settled.primaryChecksum).toBe(settled.backupChecksum);
    expect(settled.primaryChecksum).not.toBe(imported.primaryChecksum);
  });

  await test.step('show the factual statement on desktop and mobile without overflow', async () => {
    await mainNavigation(page).getByRole('link', { name: 'Finance', exact: true }).click();
    const panel = appMain(page).getByRole('region', { name: 'Market Revenue', exact: true });
    await expect(panel).toContainText('Settled');
    await expect(panel).toContainText('large market baseline');
    await expect(panel).toContainText('$315.00M');
    await expect(panel).toContainText('Modeled attendance');
    await expect(panel).toContainText('Playoff bump · 3.5%');
    await expect(panel).toContainText('Modeled gross revenue');
    await expect(panel).toContainText('Owner allocation');
    await expect(panel).toContainText('1.12x');
    await expect(panel).toContainText('Raw next-season budget');
    await expect(panel).toContainText(`$${expectedStatement.annualBudget.toFixed(2)}M`);
    await expect(panel).toContainText('not a turnstile count or ticket ledger');
    await page.screenshot({ path: DESKTOP_EVIDENCE_PATH, fullPage: true });

    await page.setViewportSize({ width: 375, height: 667 });
    await panel.scrollIntoViewIfNeeded();
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.x).toBeGreaterThanOrEqual(0);
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(375);
    const criticalCards = [
      panel.getByText('Raw next-season budget', { exact: true }).locator('..'),
      panel.getByText('Payroll plan', { exact: true }).locator('..'),
    ];
    for (const card of criticalCards) {
      await card.evaluate((element) => element.scrollIntoView({ block: 'center' }));
      const [cardBox, assistantBox, mobileNavBox] = await Promise.all([
        card.boundingBox(),
        page.getByRole('button', { name: 'Open Assistant' }).boundingBox(),
        page.getByRole('navigation', { name: 'Mobile navigation' }).boundingBox(),
      ]);
      expect(cardBox).not.toBeNull();
      expect(cardBox!.x).toBeGreaterThanOrEqual(0);
      expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(375);
      expect(cardBox!.y + cardBox!.height).toBeLessThanOrEqual(Math.min(
        assistantBox?.y ?? 667,
        mobileNavBox?.y ?? 667,
      ));
    }
    await page.screenshot({ path: MOBILE_EVIDENCE_PATH });
  });

  await test.step('hard reload preserves exact inputs, allocations, receipts, and story', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await freshRuntimeReload(page, { ready: async () => waitForAppReady(page) });
    if (!settledFacts) throw new Error('Missing settled market-revenue facts.');
    await expect(readDurableMarketRevenueFacts(page)).resolves.toEqual(settledFacts);
    await mainNavigation(page).getByRole('link', { name: 'Finance', exact: true }).click();
    await expect(appMain(page).getByRole('region', { name: 'Market Revenue', exact: true }))
      .toContainText(`$${expectedStatement.annualBudget.toFixed(2)}M`);
    await mainNavigation(page).getByRole('link', { name: 'News', exact: true }).click();
    await expect(page.getByText('Market revenue sets the next-season budget', { exact: true })).toBeVisible();
    await page.getByRole('article')
      .filter({ hasText: 'Market revenue sets the next-season budget' })
      .getByRole('button')
      .click();
    await expect(page.getByText(/Projected tax remains separate/)).toBeVisible();
  });
});
