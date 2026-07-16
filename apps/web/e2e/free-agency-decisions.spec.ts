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

const USER_TARGET_ID = 'fa160000-0000-4000-8000-000000000001';
const USER_TARGET_NAME = 'Rafael Choice';
const CPU_TARGET_ID = 'fa160000-0000-4000-8000-000000000002';
const CPU_TARGET_NAME = 'Marcus Market';
const ACTIVE_SAVE_ID = 'save-slot-2';
const MOBILE_SCREENSHOT = new URL(
  '../../../docs/codex/runs/ECON-FA-DECISIONS-1/evidence/free-agency-decision-mobile.png',
  import.meta.url,
).pathname;
const MOBILE_PREVIEW_SCREENSHOT = new URL(
  '../../../docs/codex/runs/ECON-FA-DECISIONS-1/evidence/free-agency-decision-mobile-preview.png',
  import.meta.url,
).pathname;
const DESKTOP_SCREENSHOT = new URL(
  '../../../docs/codex/runs/ECON-FA-DECISIONS-1/evidence/free-agency-decision-press-room.png',
  import.meta.url,
).pathname;

function makeStandingsRecord(teamId: string, wins: number) {
  return {
    teamId,
    wins,
    losses: 162 - wins,
    runsScored: 700 + wins,
    runsAllowed: 862 - wins,
    streak: 0,
    last10: [5, 5],
    divisionWins: 40,
    divisionLosses: 36,
  };
}

async function buildDecisionImport(): Promise<Buffer> {
  const snapshot = JSON.parse(await readFile(
    new URL('../../../packages/contracts/tests/fixtures/save/v34/core.json', import.meta.url),
    'utf8',
  )) as Record<string, any>;
  const template = snapshot.players[0];

  const userTarget = structuredClone(template);
  userTarget.id = USER_TARGET_ID;
  userTarget.firstName = 'Rafael';
  userTarget.lastName = 'Choice';
  userTarget.teamId = 'nym';
  userTarget.position = 'RF';
  userTarget.age = 27;
  userTarget.rosterStatus = 'MLB';
  userTarget.minorLeagueLevel = null;
  userTarget.serviceTimeDays = 7 * 172;
  userTarget.overallRating = 275;
  userTarget.hitterAttributes = {
    contact: 275,
    power: 260,
    eye: 250,
    speed: 245,
    defense: 265,
    durability: 300,
  };
  userTarget.contract = {
    ...userTarget.contract,
    years: 1,
    annualSalary: 8,
    totalValue: 8,
    teamOption: false,
    playerOption: false,
    optOutYears: [],
  };
  userTarget.teamTenures = [{ teamId: 'nym', startSeason: 1, endSeason: null }];

  const cpuTarget = structuredClone(template);
  cpuTarget.id = CPU_TARGET_ID;
  cpuTarget.firstName = 'Marcus';
  cpuTarget.lastName = 'Market';
  cpuTarget.teamId = 'nym';
  cpuTarget.position = 'SP';
  cpuTarget.age = 33;
  cpuTarget.rosterStatus = 'MLB';
  cpuTarget.minorLeagueLevel = null;
  cpuTarget.serviceTimeDays = 8 * 172;
  cpuTarget.overallRating = 440;
  cpuTarget.hitterAttributes = {
    contact: 120,
    power: 100,
    eye: 115,
    speed: 100,
    defense: 130,
    durability: 350,
  };
  cpuTarget.pitcherAttributes = {
    stuff: 440,
    control: 420,
    movement: 430,
    stamina: 410,
    velocity: 420,
    durability: 400,
  };
  cpuTarget.contract = {
    ...cpuTarget.contract,
    years: 1,
    annualSalary: 18,
    totalValue: 18,
    teamOption: false,
    playerOption: false,
    optOutYears: [],
  };
  cpuTarget.teamTenures = [{ teamId: 'nym', startSeason: 1, endSeason: null }];

  const fillers = TEAMS.flatMap((team, teamIndex) => Array.from({
    length: team.id === 'nym' ? 24 : team.id === 'bos' ? 25 : 26,
  }, (_, slotIndex) => {
    const filler = structuredClone(template);
    filler.id = `fa16${teamIndex.toString(16).padStart(4, '0')}-${slotIndex.toString(16).padStart(4, '0')}-4000-8000-${slotIndex.toString(16).padStart(12, '0')}`;
    filler.firstName = 'Roster';
    filler.lastName = `Filler ${teamIndex + 1}-${slotIndex + 1}`;
    filler.teamId = team.id;
    filler.position = 'SS';
    filler.rosterStatus = 'MLB';
    filler.minorLeagueLevel = null;
    filler.contract = {
      ...filler.contract,
      years: 5,
      teamOption: false,
      playerOption: false,
      optOutYears: [],
    };
    filler.teamTenures = [{ teamId: team.id, startSeason: 1, endSeason: null }];
    return filler;
  }));

  snapshot.players = [userTarget, cpuTarget, ...fillers];
  snapshot.userTeamId = 'nym';
  snapshot.serviceTime = snapshot.players.map((player: { id: string; serviceTimeDays?: number }) => [
    player.id,
    Math.floor((player.serviceTimeDays ?? 0) / 172),
  ]);
  snapshot.phase = 'offseason';
  snapshot.day = 1;
  snapshot.offseasonState = null;
  snapshot.freeAgencyMarket = null;
  snapshot.news = [];
  snapshot.narrative.briefingQueue = [];
  snapshot.rosterStates = [];
  snapshot.playoffBracket = null;
  snapshot.seasonState = {
    ...snapshot.seasonState,
    currentDay: 162,
    completed: true,
    standings: TEAMS.map((team, index) => makeStandingsRecord(
      team.id,
      team.id === 'nym' ? 100 : team.id === 'bos' ? 95 : 81 - (index % 3),
    )),
    playerSeasonStats: [],
    gameLog: [],
  };

  return Buffer.from(JSON.stringify({
    kind: 'mbd-save-export',
    name: 'ECON-FA-DECISIONS-1 browser fixture',
    exportedAt: '2026-07-15T00:00:00.000Z',
    snapshot,
  }));
}

async function importAndLoadFixture(page: Page): Promise<void> {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New Dynasty', exact: true }).click();
  await page.getByRole('button', { name: /^Challenge Scenario/ }).click();
  await page.getByRole('button', { name: /^Trade Shark\b/ }).click();
  await page.getByLabel('GM Name').fill('Free Agency Decision GM');
  await page.locator('[data-mobile-critical-control="setup-wizard-submit"]').click();
  await expect(page).toHaveURL(/\/MBD\/dashboard$/);
  await waitForAppReady(page);
  await drainDurableOverlays(page);
  await dismissGuidedStartNudges(page);
  await expectDurableSaveSummary(page);

  await mainNavigation(page).getByRole('link', { name: 'Settings', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'free-agency-decisions-v34.json',
    mimeType: 'application/json',
    buffer: await buildDecisionImport(),
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
}

async function skipToFreeAgency(page: Page): Promise<void> {
  await openOffseason(page);
  for (const phase of ['Season Review', 'Arbitration', 'Tender / Non-Tender', 'Extensions', 'Qualifying Offers']) {
    await expect(page.getByRole('heading', { name: phase, exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Skip Phase', exact: true }).click();
    await expectMutationSaved(page);
  }
  await expect(page.getByRole('heading', { name: 'Free Agency', exact: true })).toBeVisible();
}

async function openTargetOffer(page: Page): Promise<void> {
  await mainNavigation(page).getByRole('link', { name: 'Free Agency', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Free Agency', exact: true })).toBeVisible();
  await page.getByPlaceholder('Search name or position...').fill(USER_TARGET_NAME);
  const available = page.getByRole('region', { name: 'Available Free Agents (1)', exact: true });
  await expect(available).toBeVisible();
  const selectTarget = available.getByRole('button', {
    name: `Select ${USER_TARGET_NAME} for a contract offer`,
    exact: true,
  });
  await selectTarget.focus();
  await expect(selectTarget).toBeFocused();
  await selectTarget.press('Enter');
  await expect(page.getByTestId('free-agency-decision-preview')).toBeVisible();
}

test('ECON-FA-DECISIONS-1 explains user and CPU choices and preserves the exact reason through hard reload', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  await importAndLoadFixture(page);
  await skipToFreeAgency(page);
  await openTargetOffer(page);

  const enteredMarket = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
  expect(enteredMarket.primaryChecksum).toBe(enteredMarket.backupChecksum);

  await test.step('inspect the factual preview on mobile and reject an under-floor offer without durable mutation', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    const preview = page.getByTestId('free-agency-decision-preview');
    await expect(preview).toContainText('Age curve: rising');
    await expect(preview).toContainText('Your projected opportunity: featured MLB');
    await expect(preview).toContainText('Your contender status: 90-win contender');
    await expect(preview).toContainText('Loyalty:');
    await expect(preview).toContainText('future playing time is not guaranteed');
    await preview.scrollIntoViewIfNeeded();
    const previewBox = await preview.boundingBox();
    expect(previewBox).not.toBeNull();
    expect(previewBox!.x).toBeGreaterThanOrEqual(0);
    expect(previewBox!.x + previewBox!.width).toBeLessThanOrEqual(375);
    await page.screenshot({ path: MOBILE_PREVIEW_SCREENSHOT });

    const years = page.getByLabel(/^Years:/);
    const salary = page.getByLabel(/^Annual Salary:/);
    await years.focus();
    await years.press('Home');
    await salary.focus();
    await salary.press('Home');
    await expect(salary).toBeFocused();
    const offerButton = page.getByRole('button', { name: 'Offer Contract', exact: true });
    await offerButton.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    await expect(offerButton).toBeVisible();
    await offerButton.focus();
    await expect(offerButton).toBeFocused();
    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
    const assistant = page.getByRole('button', { name: 'Open Assistant', exact: true });
    await expect(mobileNav).toBeVisible();
    await expect(assistant).toBeVisible();
    const offerBox = await offerButton.boundingBox();
    const navigationBox = await mobileNav.boundingBox();
    const assistantBox = await assistant.boundingBox();
    expect(offerBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    expect(assistantBox).not.toBeNull();
    expect(offerBox!.y + offerBox!.height).toBeLessThanOrEqual(assistantBox!.y);
    expect(offerBox!.y + offerBox!.height).toBeLessThanOrEqual(navigationBox!.y);
    await page.screenshot({ path: MOBILE_SCREENSHOT, fullPage: true });
    await offerButton.press('Enter');
    const rejection = page.getByTestId('free-agency-offer-result');
    await expect(rejection).toContainText('Rejected:');
    await expect(rejection).toContainText('below the');
    await expect(readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)).resolves.toEqual(enteredMarket);
  });

  let acceptedReason = '';
  await test.step('accept the literal offer only after exact durable save', async () => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const years = page.getByLabel(/^Years:/);
    const salary = page.getByLabel(/^Annual Salary:/);
    await years.focus();
    await years.press('End');
    await salary.focus();
    await salary.press('End');
    await page.getByRole('button', { name: 'Offer Contract', exact: true }).click();
    const result = page.getByTestId('free-agency-offer-result');
    await expect(result).toContainText(`Signed! ${USER_TARGET_NAME} joins your team.`);
    await expect(result).toContainText('Decision:');
    await expectMutationSaved(page);
    const resultText = await result.innerText();
    acceptedReason = resultText.split('Decision: ')[1]?.trim() ?? '';
    expect(acceptedReason.length).toBeGreaterThan(20);
    expect(await drainDurableOverlays(page)).toBe(true);
    await expectMutationSaved(page);
  });

  let cpuArticleBody = '';
  await test.step('finish the CPU market and prove both factual reasons in Press Room', async () => {
    await openOffseason(page);
    await expect(page.getByRole('heading', { name: 'Free Agency', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Skip Phase', exact: true }).click();
    await expectMutationSaved(page);
    await expect(page.getByRole('heading', { name: 'Amateur Draft', exact: true })).toBeVisible();

    await mainNavigation(page).getByRole('link', { name: 'Press Room', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Press Room', exact: true })).toBeVisible();
    const userArticle = page.locator('article')
      .filter({ hasText: USER_TARGET_NAME })
      .filter({ hasText: `Decision: ${acceptedReason}` });
    const cpuArticle = page.locator('article')
      .filter({ hasText: CPU_TARGET_NAME })
      .filter({ hasText: 'Decision:' });
    await expect(userArticle).toHaveCount(1);
    await expect(userArticle).toContainText(`Decision: ${acceptedReason}`);
    await expect(cpuArticle).toHaveCount(1);
    await expect(cpuArticle).toContainText('Decision:');
    await expect(cpuArticle).not.toContainText(/clubhouse fit feels right|prove their worth|clear role/i);
    cpuArticleBody = await cpuArticle.locator('p').filter({ hasText: 'Decision:' }).innerText();
    expect(cpuArticleBody.match(/Decision: /g)).toHaveLength(1);
    await cpuArticle.scrollIntoViewIfNeeded();
    await page.screenshot({ path: DESKTOP_SCREENSHOT });
  });

  await test.step('hard reload retains one exact user reason and one CPU reason', async () => {
    const durable = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
    expect(durable.primaryChecksum).toBe(durable.backupChecksum);
    await freshRuntimeReload(page, { ready: async () => waitForAppReady(page) });
    await expect(page.getByRole('heading', { name: 'Press Room', exact: true })).toBeVisible();
    const userArticle = page.locator('article')
      .filter({ hasText: USER_TARGET_NAME })
      .filter({ hasText: `Decision: ${acceptedReason}` });
    const cpuArticle = page.locator('article')
      .filter({ hasText: CPU_TARGET_NAME })
      .filter({ hasText: 'Decision:' });
    await expect(userArticle).toHaveCount(1);
    await expect(userArticle).toContainText(`Decision: ${acceptedReason}`);
    await expect(cpuArticle).toHaveCount(1);
    await expect(cpuArticle.locator('p').filter({ hasText: 'Decision:' })).toHaveText(cpuArticleBody);
    await expect(readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)).resolves.toEqual(durable);

    await page.goto(`/MBD/players/${USER_TARGET_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: USER_TARGET_NAME, exact: true })).toBeVisible();
    await expect(page.getByText('NYM · MLB', { exact: true })).toBeVisible();
    await expect(page.getByText('$45.0M', { exact: true })).toBeVisible();
    await page.goto(`/MBD/players/${CPU_TARGET_ID}`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: CPU_TARGET_NAME, exact: true })).toBeVisible();
    await expect(page.getByText('BOS · MLB', { exact: true })).toBeVisible();
  });

  await drainDurableOverlays(page);
  await dismissGuidedStartNudges(page);
});
