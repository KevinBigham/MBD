import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { TEAMS } from '../../../packages/sim-core/src/league/teams';
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

const OPTION_PLAYER_NAME = 'Alex Option';
const EXPIRING_STAR_NAME = 'Bobby Expiring';
const EXPIRING_STAR_ID = 'ec110000-0000-4000-8000-000000000002';
const ACTIVE_SAVE_ID = 'save-slot-2';

async function buildEconClockImport(): Promise<Buffer> {
  const snapshot = JSON.parse(await readFile(
    new URL('../../../packages/contracts/tests/fixtures/save/v34/core.json', import.meta.url),
    'utf8',
  )) as Record<string, any>;
  const optionPlayer = snapshot.players[0];
  optionPlayer.id = 'ec110000-0000-4000-8000-000000000001';
  optionPlayer.firstName = 'Alex';
  optionPlayer.lastName = 'Option';
  optionPlayer.serviceTimeDays = 7 * 172;
  optionPlayer.contract = {
    ...optionPlayer.contract,
    years: 1,
    annualSalary: 0.01,
    totalValue: 0.01,
    teamOption: true,
    playerOption: false,
    optOutYears: [],
  };
  const expiringStar = structuredClone(optionPlayer);
  expiringStar.id = 'ec110000-0000-4000-8000-000000000002';
  expiringStar.firstName = 'Bobby';
  expiringStar.lastName = 'Expiring';
  expiringStar.position = 'RF';
  expiringStar.contract = {
    ...expiringStar.contract,
    years: 1,
    annualSalary: 1,
    totalValue: 1,
    teamOption: false,
  };
  expiringStar.hitterAttributes = {
    contact: 460,
    power: 440,
    eye: 420,
    speed: 280,
    defense: 330,
    durability: 360,
  };
  expiringStar.overallRating = 460;
  expiringStar.serviceTimeDays = 7 * 172;

  // Retain the measured pre-Goal-12 baseline for every CPU club. NYM alone
  // starts with 24 fillers plus the two contract-clock players: its sole
  // vacancy after Bobby expires is intentionally limited to this public
  // re-sign journey, not a claim about general roster legality.
  const fillers = TEAMS.flatMap((team, teamIndex) => Array.from({ length: team.id === 'nym' ? 24 : 26 }, (_, slotIndex) => {
    const filler = structuredClone(optionPlayer);
    filler.id = `e1000000-${teamIndex.toString(16).padStart(4, '0')}-4000-8000-${slotIndex.toString(16).padStart(12, '0')}`;
    filler.firstName = 'Roster';
    filler.lastName = `Filler ${teamIndex + 1}-${slotIndex + 1}`;
    filler.teamId = team.id;
    filler.serviceTimeDays = 7 * 172;
    filler.contract = {
      ...filler.contract,
      years: 5,
      teamOption: false,
      playerOption: false,
      optOutYears: [],
    };
    return filler;
  }));
  snapshot.players = [optionPlayer, expiringStar, ...fillers];
  snapshot.serviceTime = snapshot.players.map((player: { id: string }) => [player.id, 7]);
  snapshot.phase = 'offseason';
  snapshot.day = 1;
  snapshot.offseasonState = null;
  snapshot.freeAgencyMarket = null;
  snapshot.news = [];
  snapshot.rosterStates = [];

  return Buffer.from(JSON.stringify({
    kind: 'mbd-save-export',
    name: 'ECON-CLOCK-1 browser fixture',
    exportedAt: '2026-07-12T00:00:00.000Z',
    snapshot,
  }));
}

async function importAndLoadFixture(page: Page): Promise<void> {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New Dynasty', exact: true }).click();
  await page.getByRole('button', { name: /^Challenge Scenario/ }).click();
  await page.getByRole('button', { name: /^Trade Shark\b/ }).click();
  await page.getByLabel('GM Name').fill('Economy Clock GM');
  await page.locator('[data-mobile-critical-control="setup-wizard-submit"]').click();
  await expect(page).toHaveURL(/\/MBD\/dashboard$/);
  await waitForAppReady(page);
  await drainDurableOverlays(page);
  await dismissGuidedStartNudges(page);
  await expectDurableSaveSummary(page);
  await mainNavigation(page).getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL(/\/MBD\/settings$/);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'econ-clock-v34.json',
    mimeType: 'application/json',
    buffer: await buildEconClockImport(),
  });
  await expect(page.getByText('Imported save into slot 2.')).toBeVisible();
  await page.getByRole('button', { name: 'Load save slot 2', exact: true }).click();
  await expect(page.getByText('Loaded slot 2.')).toBeVisible();
  await waitForAppReady(page);
  await expectDurableSaveSummary(page);
}

async function openOffseason(page: Page): Promise<void> {
  await mainNavigation(page).getByRole('link', { name: 'Offseason', exact: true }).click();
  await expect(page).toHaveURL(/\/MBD\/offseason$/);
  await expect(page.getByRole('button', { name: 'Advance Day', exact: true })).toBeVisible();
}

async function skipToFreeAgency(page: Page): Promise<void> {
  for (const phase of ['Season Review', 'Arbitration', 'Tender / Non-Tender', 'Extensions', 'Qualifying Offers']) {
    await expect(page.getByRole('heading', { name: phase, exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Skip Phase', exact: true }).click();
    await expectMutationSaved(page);
  }
  await expect(page.getByRole('heading', { name: 'Free Agency', exact: true })).toBeVisible();
}

test('ECON-CLOCK-1 option and expiry outcomes survive public save and hard reload', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  await importAndLoadFixture(page);
  const imported = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
  expect(imported.primaryChecksum).toBe(imported.backupChecksum);

  await test.step('advance the public offseason clock and show the automated team-option outcome', async () => {
    await openOffseason(page);
    await page.getByRole('button', { name: 'Advance Day', exact: true }).click();
    await expectMutationSaved(page);
    const clocked = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
    expect(clocked.primaryChecksum).toBe(clocked.backupChecksum);
    expect(clocked.primaryChecksum).not.toBe(imported.primaryChecksum);

    await mainNavigation(page).getByRole('link', { name: 'News', exact: true }).click();
    await expect(page.getByText(`${OPTION_PLAYER_NAME}'s team option exercised`, { exact: true })).toBeVisible();
    await freshRuntimeReload(page, { ready: async () => waitForAppReady(page) });
    await expect(page.getByText(`${OPTION_PLAYER_NAME}'s team option exercised`, { exact: true })).toBeVisible();
    await expect(readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)).resolves.toEqual(clocked);
  });

  await test.step('reach free agency publicly, retain the departure beat, and re-sign through the real offer lane', async () => {
    await openOffseason(page);
    await skipToFreeAgency(page);
    const enteredMarket = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
    expect(enteredMarket.primaryChecksum).toBe(enteredMarket.backupChecksum);
    expect(enteredMarket.primaryChecksum).not.toBe(imported.primaryChecksum);

    await mainNavigation(page).getByRole('link', { name: 'News', exact: true }).click();
    await expect(page.getByText(`${EXPIRING_STAR_NAME} enters free agency`, { exact: true })).toBeVisible();
    await freshRuntimeReload(page, { ready: async () => waitForAppReady(page) });
    await expect(page.getByText(`${EXPIRING_STAR_NAME} enters free agency`, { exact: true })).toBeVisible();

    await mainNavigation(page).getByRole('link', { name: 'Free Agency', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Free Agency', exact: true })).toBeVisible();
    await page.getByPlaceholder('Search name or position...').fill(EXPIRING_STAR_NAME);
    await expect(page.getByRole('heading', { name: 'Available Free Agents (1)', exact: true })).toBeVisible();
    let availableRegion = page.getByRole('region', { name: 'Available Free Agents (1)', exact: true });
    let starLink = availableRegion.locator('a:visible').filter({ hasText: new RegExp(`^${EXPIRING_STAR_NAME}$`) });
    await expect(starLink).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    const search = page.getByPlaceholder('Search name or position...');
    const filter = page.locator('[data-mobile-critical-control="free-agency-position-filter"]').first();
    await expect(search).toBeVisible();
    await filter.focus();
    await expect(filter).toBeFocused();
    const searchBox = await search.boundingBox();
    const filterBox = await filter.boundingBox();
    expect(searchBox).not.toBeNull();
    expect(filterBox).not.toBeNull();
    expect(searchBox!.x + searchBox!.width).toBeLessThanOrEqual(375);
    expect(filterBox!.x + filterBox!.width).toBeLessThanOrEqual(375);
    starLink = availableRegion.locator('a:visible').filter({ hasText: new RegExp(`^${EXPIRING_STAR_NAME}$`) });
    await expect(starLink).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 720 });
    await freshRuntimeReload(page, { ready: async () => waitForAppReady(page) });
    await expect(page.getByRole('heading', { name: 'Free Agency', exact: true })).toBeVisible();
    await page.getByPlaceholder('Search name or position...').fill(EXPIRING_STAR_NAME);
    await expect(page.getByRole('heading', { name: 'Available Free Agents (1)', exact: true })).toBeVisible();
    availableRegion = page.getByRole('region', { name: 'Available Free Agents (1)', exact: true });
    const availableStar = availableRegion.locator('a:visible').filter({ hasText: new RegExp(`^${EXPIRING_STAR_NAME}$`) });
    await expect(availableStar).toBeVisible();
    await expect(readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)).resolves.toEqual(enteredMarket);

    await availableRegion.locator('tbody tr').filter({ hasText: EXPIRING_STAR_NAME }).click();
    await expect(page.getByText(EXPIRING_STAR_NAME, { exact: true }).last()).toBeVisible();
    const salarySlider = page.locator('input[type="range"]').nth(1);
    await salarySlider.focus();
    await salarySlider.press('End');
    await page.getByRole('button', { name: 'Offer Contract', exact: true }).click();
    await expect(page.getByText(`Signed! ${EXPIRING_STAR_NAME} joins your team.`, { exact: true })).toBeVisible();
    await expectMutationSaved(page);
    await expect(page.getByRole('heading', { name: 'Available Free Agents (0)', exact: true })).toBeVisible();
    // The first signing unlocks a persisted achievement ceremony. Dismiss it
    // through the public shell before taking the reload checkpoint: that
    // dismissal is its own legitimate durable mutation.
    expect(await drainDurableOverlays(page)).toBe(true);
    await expectMutationSaved(page);
    const settledSigned = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
    expect(settledSigned.primaryChecksum).toBe(settledSigned.backupChecksum);
    expect(settledSigned.primaryChecksum).not.toBe(enteredMarket.primaryChecksum);

    await freshRuntimeReload(page, { ready: async () => waitForAppReady(page) });
    await expect(page.getByRole('heading', { name: 'Free Agency', exact: true })).toBeVisible();
    await page.getByPlaceholder('Search name or position...').fill(EXPIRING_STAR_NAME);
    await expect(page.getByRole('heading', { name: 'Available Free Agents (0)', exact: true })).toBeVisible();
    await expect(readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)).resolves.toEqual(settledSigned);

    await page.goto(`/MBD/players/${EXPIRING_STAR_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: EXPIRING_STAR_NAME, exact: true })).toBeVisible();
    await expect(page.getByText('NYM · MLB', { exact: true })).toBeVisible();
    await expect(page.getByText('Contract Snapshot', { exact: true })).toBeVisible();
    await expect(page.getByText('$45.0M', { exact: true })).toBeVisible();
  });

  await drainDurableOverlays(page);
  await dismissGuidedStartNudges(page);
});
