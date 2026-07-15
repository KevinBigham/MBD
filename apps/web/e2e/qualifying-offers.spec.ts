import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { createOffseasonState } from '../../../packages/sim-core/src/roster/offseason';
import { TEAMS } from '../../../packages/sim-core/src/league/teams';
import {
  appMain,
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
const QO_PLAYER_ID = '12000000-0000-4000-8000-000000000001';
const QO_PLAYER_NAME = 'Quinn Qualifier';

interface DurableQOFacts {
  awardId: string | null;
  awardedToTeamId: string | null;
  completedCompensationPicks: number;
  forfeitedOriginalTeamId: string | null;
  forfeitedRound: number | null;
  nextSlotKind: string | null;
  signingTeamId: string | null;
  status: string | null;
}

async function buildQualifyingOfferImport(): Promise<Buffer> {
  const snapshot = JSON.parse(await readFile(
    new URL('../../../packages/contracts/tests/fixtures/save/v34/core.json', import.meta.url),
    'utf8',
  )) as Record<string, any>;
  const template = snapshot.players[0];
  const candidate = structuredClone(template);
  candidate.id = QO_PLAYER_ID;
  candidate.firstName = 'Quinn';
  candidate.lastName = 'Qualifier';
  candidate.teamId = 'bos';
  candidate.position = 'RF';
  candidate.rosterStatus = 'MLB';
  candidate.minorLeagueLevel = null;
  candidate.age = 29;
  candidate.overallRating = 390;
  candidate.serviceTimeDays = 6 * 172;
  candidate.hitterAttributes = {
    contact: 390,
    power: 400,
    eye: 380,
    speed: 300,
    defense: 330,
    durability: 380,
  };
  candidate.pitcherAttributes = null;
  candidate.contract = {
    ...candidate.contract,
    years: 0,
    annualSalary: 1,
    totalValue: 1,
    teamOption: false,
    playerOption: false,
    optOutYears: [],
  };

  const fillers = TEAMS.flatMap((team, teamIndex) => Array.from({ length: 25 }, (_, slotIndex) => {
    const filler = structuredClone(template);
    filler.id = `12000001-${teamIndex.toString(16).padStart(4, '0')}-4000-8000-${slotIndex.toString(16).padStart(12, '0')}`;
    filler.firstName = 'Roster';
    filler.lastName = `Filler ${teamIndex + 1}-${slotIndex + 1}`;
    filler.teamId = team.id;
    filler.rosterStatus = 'MLB';
    filler.minorLeagueLevel = null;
    filler.serviceTimeDays = 6 * 172;
    filler.contract = {
      ...filler.contract,
      years: 5,
      annualSalary: 1,
      totalValue: 5,
      teamOption: false,
      playerOption: false,
      optOutYears: [],
    };
    return filler;
  }));

  snapshot.players = [candidate, ...fillers];
  snapshot.serviceTime = snapshot.players.map((player: { id: string }) => [player.id, 6]);
  snapshot.userTeamId = 'bos';
  snapshot.phase = 'offseason';
  snapshot.day = 1;
  snapshot.rng = { seed: 1, callCount: 0 };
  snapshot.offseasonState = {
    ...createOffseasonState(snapshot.season),
    currentPhase: 'qualifying_offers',
    phaseDay: 1,
    totalDay: 18,
  };
  snapshot.freeAgencyMarket = null;
  snapshot.news = [];
  snapshot.rosterStates = [];
  snapshot.draftState = {
    ...snapshot.draftState,
    qualifyingOffers: [],
    compensatoryPicks: [],
    pickOwnership: [],
    signingDecisions: [],
  };
  snapshot.draftClass = null;

  return Buffer.from(JSON.stringify({
    kind: 'mbd-save-export',
    name: 'ECON-QUALIFYING-OFFERS-1 browser fixture',
    exportedAt: '2026-07-15T00:00:00.000Z',
    snapshot,
  }));
}

async function importAndOpenOffseason(page: Page): Promise<void> {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New Dynasty', exact: true }).click();
  await page.getByRole('button', { name: /^Challenge Scenario/ }).click();
  await page.getByRole('button', { name: /^Trade Shark\b/ }).click();
  await page.getByLabel('GM Name').fill('Qualifying Offer GM');
  await page.locator('[data-mobile-critical-control="setup-wizard-submit"]').click();
  await expect(page).toHaveURL(/\/MBD\/dashboard$/);
  await waitForAppReady(page);
  await drainDurableOverlays(page);
  await dismissGuidedStartNudges(page);
  await expectDurableSaveSummary(page);

  await mainNavigation(page).getByRole('link', { name: 'Settings', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'econ-qualifying-offers-v34.json',
    mimeType: 'application/json',
    buffer: await buildQualifyingOfferImport(),
  });
  await expect(page.getByText('Imported save into slot 2.')).toBeVisible();
  await page.getByRole('button', { name: 'Load save slot 2', exact: true }).click();
  await expect(page.getByText('Loaded slot 2.')).toBeVisible();
  await waitForAppReady(page);
  await expectDurableSaveSummary(page);
  await mainNavigation(page).getByRole('link', { name: 'Offseason', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Qualifying Offers', exact: true }).first()).toBeVisible();
}

async function readDurableQOFacts(page: Page): Promise<DurableQOFacts> {
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
      const qo = snapshot.draftState.qualifyingOffers.find(
        (entry: { playerId: string }) => entry.playerId === playerId,
      );
      const award = snapshot.draftState.compensatoryPicks.find(
        (entry: { compensationForPlayerId: string }) => entry.compensationForPlayerId === playerId,
      );
      const loss = qo?.signingTeamId
        ? snapshot.draftState.pickOwnership.find((entry: {
          currentTeamId: string;
          forfeited: boolean;
        }) => entry.currentTeamId === qo.signingTeamId && entry.forfeited)
        : null;
      const session = snapshot.draftClass;
      const nextSlot = session?.pickSlots?.[session.completedPicks?.length ?? 0] ?? null;
      return {
        awardId: award?.id ?? null,
        awardedToTeamId: award?.awardedToTeamId ?? null,
        completedCompensationPicks: award && session
          ? session.completedPicks.filter((pick: { slotId: string }) => pick.slotId === award.id).length
          : 0,
        forfeitedOriginalTeamId: loss?.originalTeamId ?? null,
        forfeitedRound: loss?.round ?? null,
        nextSlotKind: nextSlot?.kind ?? null,
        signingTeamId: qo?.signingTeamId ?? null,
        status: qo?.status ?? null,
      };
    } finally {
      database.close();
    }
  }, { saveId: ACTIVE_SAVE_ID, playerId: QO_PLAYER_ID });
}

async function readDurableDraftScoutingLooks(page: Page, playerId: string): Promise<number> {
  return page.evaluate(async ({ saveId, targetPlayerId }) => {
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
      const reports = record.snapshot.draftState.scoutingReports
        .find(([teamId]: [string]) => teamId === record.snapshot.userTeamId)?.[1] ?? [];
      return reports.find((report: { playerId: string }) => report.playerId === targetPlayerId)?.looks ?? 0;
    } finally {
      database.close();
    }
  }, { saveId: ACTIVE_SAVE_ID, targetPlayerId: playerId });
}

async function makeCurrentDraftPick(page: Page): Promise<{ id: string; name: string }> {
  const row = appMain(page).getByTestId('draft-prospect-row').first();
  await expect(row).toBeVisible();
  const id = await row.getAttribute('data-prospect-id') ?? '';
  const name = (await row.locator('td').nth(1).innerText()).trim();
  expect(id).not.toBe('');
  expect(name).not.toBe('');
  await row.click();
  const submit = appMain(page).locator('[data-mobile-critical-control="draft-pick-submit"]');
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(
    appMain(page)
      .getByRole('region', { name: 'Draft Ticker' })
      .locator(`[data-testid="draft-ticker-pick"][data-player-id="${id}"]`),
  ).toBeVisible({ timeout: 60_000 });
  await expectMutationSaved(page);
  return { id, name };
}

test('ECON-QUALIFYING-OFFERS-1 survives issue, resolution, outside signing, compensation, draft, and reload', async ({ page }, testInfo) => {
  test.setTimeout(10 * 60_000);
  await importAndOpenOffseason(page);

  await test.step('issue at the fixed salary and retain the pending record through reload', async () => {
    await expect(page.getByText(QO_PLAYER_NAME, { exact: true })).toBeVisible();
    await expect(page.getByText(/^Salary line \$/)).toBeVisible();
    await page.setViewportSize({ width: 375, height: 667 });
    const issue = page.getByRole('button', { name: 'Issue QO', exact: true });
    await issue.focus();
    await expect(issue).toBeFocused();
    const bounds = await issue.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
    await page.screenshot({ path: testInfo.outputPath('qo-pending-mobile.png'), fullPage: true });
    await expectFreshMutationRuntime(page);
    await issue.click();
    await expectMutationSaved(page);
    await expect(page.getByText('offered', { exact: true })).toBeVisible();
    const pendingIntegrity = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
    await page.setViewportSize({ width: 1280, height: 720 });
    await freshRuntimeReload(page, { ready: async () => waitForAppReady(page) });
    await expect(page.getByText('offered', { exact: true })).toBeVisible();
    await expect(readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)).resolves.toEqual(pendingIntegrity);
  });

  await test.step('resolve once, reload, and finalize one outside signing with one award and one loss', async () => {
    await expectFreshMutationRuntime(page);
    await page.getByRole('button', { name: 'Resolve Offers', exact: true }).click();
    await expectMutationSaved(page);
    await expect(page.getByText('rejected', { exact: true })).toBeVisible();
    const rejectedIntegrity = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
    await freshRuntimeReload(page, { ready: async () => waitForAppReady(page) });
    await expect(page.getByText('rejected', { exact: true })).toBeVisible();
    await expect(readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)).resolves.toEqual(rejectedIntegrity);

    await page.getByRole('button', { name: 'Skip Phase', exact: true }).click();
    await expectMutationSaved(page);
    await expect(page.getByRole('heading', { name: 'Free Agency', exact: true }).first()).toBeVisible();

    await mainNavigation(page).getByRole('link', { name: 'Free Agency', exact: true }).click();
    const selectQualifier = page.getByRole('button', { name: `Select ${QO_PLAYER_NAME} for a contract offer` });
    await selectQualifier.focus();
    await expect(selectQualifier).toBeFocused();
    await selectQualifier.press('Enter');
    await expect(page.getByText(/Qualifying offer attached by/)).toBeVisible();
    await expect(page.getByLabel(/^Years:/)).toBeVisible();
    await expect(page.getByLabel(/^Annual Salary:/)).toBeVisible();
    await mainNavigation(page).getByRole('link', { name: 'Offseason', exact: true }).click();
    await page.getByRole('button', { name: 'Skip Phase', exact: true }).click();
    await expectMutationSaved(page);
    await expect(page.getByRole('heading', { name: 'Amateur Draft', exact: true }).first()).toBeVisible();

    const compensated = await readDurableQOFacts(page);
    expect(compensated.status).toBe('compensated');
    expect(compensated.signingTeamId).not.toBeNull();
    expect(compensated.signingTeamId).not.toBe('bos');
    expect(compensated.awardedToTeamId).toBe('bos');
    expect(compensated.awardId).not.toBeNull();
    expect(compensated.forfeitedRound).toBeGreaterThanOrEqual(1);
    expect(compensated.forfeitedOriginalTeamId).toBe(compensated.signingTeamId);
    const compensatedIntegrity = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
    await freshRuntimeReload(page, { ready: async () => waitForAppReady(page) });
    await expect(readDurableQOFacts(page)).resolves.toEqual(compensated);
    await expect(readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)).resolves.toEqual(compensatedIntegrity);
  });

  await test.step('consume the supplemental slot exactly once and retain it through hard reload', async () => {
    await mainNavigation(page).getByRole('link', { name: 'Draft', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Start Draft', exact: true })).toBeVisible();
    await expectFreshMutationRuntime(page);
    await page.getByRole('button', { name: 'Start Draft', exact: true }).click();
    await expect(appMain(page).getByText('User Pick', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expectMutationSaved(page);
    const scoutedRow = appMain(page).getByTestId('draft-prospect-row').first();
    const scoutedPlayerId = await scoutedRow.getAttribute('data-prospect-id') ?? '';
    expect(scoutedPlayerId).not.toBe('');
    await scoutedRow.click();
    const scoutingLooksBefore = await readDurableDraftScoutingLooks(page, scoutedPlayerId);
    const scoutLook = appMain(page).getByRole('button', { name: 'Scout Look', exact: true });
    await scoutLook.click();
    await expect(appMain(page).getByRole('button', { name: 'Scouting...', exact: true })).toBeVisible();
    await expect(scoutLook).toBeEnabled();
    await expectMutationSaved(page);
    expect(await readDurableDraftScoutingLooks(page, scoutedPlayerId)).toBe(scoutingLooksBefore + 1);
    await freshRuntimeReload(page, {
      ready: async () => {
        await expect(appMain(page).getByText('User Pick', { exact: true })).toBeVisible();
      },
    });
    expect(await readDurableDraftScoutingLooks(page, scoutedPlayerId)).toBe(scoutingLooksBefore + 1);
    await makeCurrentDraftPick(page);
    expect((await readDurableQOFacts(page)).nextSlotKind).toBe('compensatory');

    const compensationPick = await makeCurrentDraftPick(page);
    const tickerPick = appMain(page)
      .getByRole('region', { name: 'Draft Ticker' })
      .locator(`[data-testid="draft-ticker-pick"][data-player-id="${compensationPick.id}"]`);
    await expect(tickerPick.getByText(/^QO for Quinn Qualifier from /)).toBeVisible();
    const completed = await readDurableQOFacts(page);
    expect(completed.completedCompensationPicks).toBe(1);

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(tickerPick).toBeVisible();
    const tickerBounds = await tickerPick.boundingBox();
    expect(tickerBounds).not.toBeNull();
    expect(tickerBounds!.x).toBeGreaterThanOrEqual(0);
    expect(tickerBounds!.x + tickerBounds!.width).toBeLessThanOrEqual(375);
    await page.screenshot({ path: testInfo.outputPath('qo-compensation-draft-mobile.png'), fullPage: true });

    await page.setViewportSize({ width: 1280, height: 720 });
    const completedIntegrity = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
    await freshRuntimeReload(page, {
      ready: async () => {
        await expect(
          appMain(page)
            .getByRole('region', { name: 'Draft Ticker' })
            .locator(`[data-testid="draft-ticker-pick"][data-player-id="${compensationPick.id}"]`)
            .getByText(/^QO for Quinn Qualifier from /),
        ).toBeVisible();
      },
    });
    await expect(readDurableQOFacts(page)).resolves.toEqual(completed);
    await expect(readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)).resolves.toEqual(completedIntegrity);
  });

  await drainDurableOverlays(page);
  await dismissGuidedStartNudges(page);
});
