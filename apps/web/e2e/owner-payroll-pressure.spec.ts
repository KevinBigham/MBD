import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  TEAMS,
  createOffseasonState,
  createOwnerState,
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
const OWNER_PLAYER_ID = '14000000-0000-4000-8000-000000000001';
const OWNER_PLAYER_NAME = 'Parker Pressure';
const OWNER_SOFT_CEILING = 230;
const FILLER_SALARY = 8.8;
const SIGNING_SALARY = 45;
const OWNER_RECEIPT = 'owner_payroll_pressure_reconciled_s3';
const MOBILE_EVIDENCE_PATH = fileURLToPath(new URL(
  '../../../docs/codex/runs/ECON-OWNER-PAYROLL-PRESSURE-1/evidence/owner-payroll-offer-mobile.png',
  import.meta.url,
));
const DESKTOP_EVIDENCE_PATH = fileURLToPath(new URL(
  '../../../docs/codex/runs/ECON-OWNER-PAYROLL-PRESSURE-1/evidence/owner-payroll-finish-desktop.png',
  import.meta.url,
));

interface DurableOwnerPayrollFacts {
  signedAnnualSalary: number | null;
  signedTeamId: string | null;
  totalPayroll: number;
  taxPayroll: number;
  userReceiptCount: number;
  leagueReceiptCount: number;
  newsCount: number;
  briefingCount: number;
}

async function buildOwnerPayrollImport(): Promise<Buffer> {
  const snapshot = JSON.parse(await readFile(
    new URL('../../../packages/contracts/tests/fixtures/save/v34/core.json', import.meta.url),
    'utf8',
  )) as Record<string, any>;
  const template = snapshot.players[0];
  const candidate = structuredClone(template);
  candidate.id = OWNER_PLAYER_ID;
  candidate.firstName = 'Parker';
  candidate.lastName = 'Pressure';
  candidate.teamId = '';
  candidate.position = 'RF';
  candidate.rosterStatus = 'MLB';
  candidate.minorLeagueLevel = null;
  candidate.age = 27;
  candidate.overallRating = 470;
  candidate.serviceTimeDays = 6 * 172;
  candidate.hitterAttributes = {
    contact: 470,
    power: 455,
    eye: 445,
    speed: 320,
    defense: 350,
    durability: 420,
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
    filler.id = `14000001-${teamIndex.toString(16).padStart(4, '0')}-4000-8000-${slotIndex.toString(16).padStart(12, '0')}`;
    filler.firstName = 'Payroll';
    filler.lastName = `Filler ${teamIndex + 1}-${slotIndex + 1}`;
    filler.teamId = team.id;
    filler.rosterStatus = 'MLB';
    filler.minorLeagueLevel = null;
    filler.serviceTimeDays = 6 * 172;
    filler.contract = {
      ...filler.contract,
      years: 5,
      annualSalary: FILLER_SALARY,
      totalValue: FILLER_SALARY * 5,
      teamOption: false,
      playerOption: false,
      optOutYears: [],
    };
    return filler;
  }));

  snapshot.players = [candidate, ...fillers];
  snapshot.serviceTime = snapshot.players.map((player: { id: string }) => [player.id, 6]);
  snapshot.userTeamId = 'nym';
  snapshot.phase = 'offseason';
  snapshot.day = 1;
  snapshot.rng = { seed: 7_414, callCount: 0 };
  snapshot.offseasonState = {
    ...createOffseasonState(snapshot.season),
    currentPhase: 'qualifying_offers',
    phaseDay: 4,
    totalDay: 24,
  };
  // Let the canonical worker create the market after migration/normalization
  // when the public exact transition enters free agency.
  snapshot.freeAgencyMarket = null;
  snapshot.news = [];
  snapshot.rosterStates = [];
  snapshot.draftClass = null;
  snapshot.draftState = {
    ...snapshot.draftState,
    qualifyingOffers: [],
    compensatoryPicks: [],
    pickOwnership: [],
    signingDecisions: [],
  };
  const userOwner = createOwnerState('nym', 250);
  snapshot.narrative.ownerState = [[
    'nym',
    {
      ...userOwner,
      archetype: 'win_now',
      payrollCap: OWNER_SOFT_CEILING,
      expectations: {
        ...userOwner.expectations,
        payrollTarget: OWNER_SOFT_CEILING,
      },
    },
  ]];
  snapshot.narrative.storyFlags = [];
  snapshot.narrative.briefingQueue = [];

  return Buffer.from(JSON.stringify({
    kind: 'mbd-save-export',
    name: 'ECON-OWNER-PAYROLL-PRESSURE-1 browser fixture',
    exportedAt: '2026-07-15T00:00:00.000Z',
    snapshot,
  }));
}

async function importAndLoadFixture(page: Page): Promise<void> {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New Dynasty', exact: true }).click();
  await page.getByRole('button', { name: /^Challenge Scenario/ }).click();
  await page.getByRole('button', { name: /^Trade Shark\b/ }).click();
  await page.getByLabel('GM Name').fill('Owner Payroll GM');
  await page.locator('[data-mobile-critical-control="setup-wizard-submit"]').click();
  await expect(page).toHaveURL(/\/MBD\/dashboard$/);
  await waitForAppReady(page);
  await drainDurableOverlays(page);
  await dismissGuidedStartNudges(page);
  await expectDurableSaveSummary(page);

  await mainNavigation(page).getByRole('link', { name: 'Settings', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'owner-payroll-v34.json',
    mimeType: 'application/json',
    buffer: await buildOwnerPayrollImport(),
  });
  await expect(page.getByText('Imported save into slot 2.')).toBeVisible();
  await page.getByRole('button', { name: 'Load save slot 2', exact: true }).click();
  await expect(page.getByText('Loaded slot 2.')).toBeVisible();
  await waitForAppReady(page);
  await expectDurableSaveSummary(page);
}

async function readDurableOwnerPayrollFacts(page: Page): Promise<DurableOwnerPayrollFacts> {
  return page.evaluate(async ({ saveId, playerId, receipt }) => {
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
      const signed = snapshot.players.find((player: { id: string }) => player.id === playerId);
      const userFlags = snapshot.narrative.storyFlags.find(
        ([teamId]: [string]) => teamId === snapshot.userTeamId,
      )?.[1] ?? [];
      const leagueReceiptCount = snapshot.narrative.storyFlags.reduce(
        (count: number, [, flags]: [string, string[]]) => count + flags.filter((flag) => flag === receipt).length,
        0,
      );
      const userPlayers = snapshot.players.filter((player: { teamId: string }) => player.teamId === snapshot.userTeamId);
      const totalPayroll = userPlayers.reduce(
        (sum: number, player: { contract: { annualSalary: number } }) => sum + player.contract.annualSalary,
        0,
      );
      const taxPayroll = userPlayers
        .filter((player: { rosterStatus: string }) => player.rosterStatus === 'MLB')
        .reduce((sum: number, player: { contract: { annualSalary: number } }) => sum + player.contract.annualSalary, 0);
      const newsId = `owner-payroll-pressure-${snapshot.season}-${snapshot.userTeamId}`;
      return {
        signedAnnualSalary: signed?.contract.annualSalary ?? null,
        signedTeamId: signed?.teamId ?? null,
        totalPayroll: Math.round(totalPayroll * 100) / 100,
        taxPayroll: Math.round(taxPayroll * 100) / 100,
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
  }, {
    saveId: ACTIVE_SAVE_ID,
    playerId: OWNER_PLAYER_ID,
    receipt: OWNER_RECEIPT,
  });
}

async function skipRemainingOffseason(page: Page): Promise<void> {
  const phases = [
    'Free Agency',
    'Amateur Draft',
    'Protection Audit',
    'Rule 5 Draft',
    'International Signing',
    'Coaching Changes',
    'Spring Training',
  ];
  for (const phase of phases) {
    await expect(page.getByRole('heading', { name: phase, exact: true }).first()).toBeVisible();
    const before = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
    await page.getByRole('button', { name: 'Skip Phase', exact: true }).click();
    await expect.poll(async () => (
      await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID)
    ).primaryChecksum, { timeout: 60_000 }).not.toBe(before.primaryChecksum);
    await expectMutationSaved(page);
  }
}

async function expectMobileControlUnoccluded(page: Page, control: Locator): Promise<void> {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeVisible();
  const [bounds, mobileNavBounds, assistantBounds] = await Promise.all([
    control.boundingBox(),
    page.getByRole('navigation', { name: 'Mobile navigation' }).boundingBox(),
    page.getByRole('button', { name: 'Open Assistant' }).boundingBox(),
  ]);
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  const occluderTop = Math.min(
    mobileNavBounds?.y ?? 667,
    assistantBounds?.y ?? 667,
  );
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(occluderTop);
}

async function expectNoOverlap(left: Locator, right: Locator): Promise<void> {
  const [leftBounds, rightBounds] = await Promise.all([left.boundingBox(), right.boundingBox()]);
  expect(leftBounds).not.toBeNull();
  expect(rightBounds).not.toBeNull();
  const separated = leftBounds!.x + leftBounds!.width <= rightBounds!.x
    || rightBounds!.x + rightBounds!.width <= leftBounds!.x
    || leftBounds!.y + leftBounds!.height <= rightBounds!.y
    || rightBounds!.y + rightBounds!.height <= leftBounds!.y;
  expect(separated).toBe(true);
}

test('ECON-OWNER-PAYROLL-PRESSURE-1 crosses advisory lines, reconciles once, and survives reload', async ({ page }) => {
  test.setTimeout(12 * 60_000);
  await importAndLoadFixture(page);
  const imported = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
  expect(imported.primaryChecksum).toBe(imported.backupChecksum);

  await test.step('show the same source-owned lines on Finance and the mobile offer lane', async () => {
    await mainNavigation(page).getByRole('link', { name: 'Offseason', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Qualifying Offers', exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Skip Phase', exact: true }).click();
    await expectMutationSaved(page);
    await expect(page.getByRole('heading', { name: 'Free Agency', exact: true }).first()).toBeVisible();

    await mainNavigation(page).getByRole('link', { name: 'Finance', exact: true }).click();
    const ownerPlan = appMain(page).getByRole('region', { name: 'Owner Plan', exact: true });
    const projectedTax = appMain(page).getByRole('region', { name: 'Projected Tax', exact: true });
    await expect(ownerPlan).toContainText('Inside owner plan');
    await expect(ownerPlan).toContainText('Floor$115.00M');
    await expect(ownerPlan).toContainText('Soft ceiling$230.00M');
    await expect(projectedTax).toContainText('Tax payroll$220.00M');
    await expect(projectedTax).toContainText('Line$230.00M');

    await mainNavigation(page).getByRole('link', { name: 'Free Agency', exact: true }).click();
    await page.getByPlaceholder('Search name or position...').fill(OWNER_PLAYER_NAME);
    const available = page.getByRole('region', { name: 'Available Free Agents (1)', exact: true });
    await expect(available).toBeVisible();
    await available.getByRole('button', {
      name: `Select ${OWNER_PLAYER_NAME} for a contract offer`,
      exact: true,
    }).click();
    const salary = page.getByLabel(/^Annual Salary:/);
    await salary.focus();
    await salary.press('End');
    await expect(page.getByText('Owner soft ceiling room', { exact: true })).toBeVisible();
    await expect(page.getByText(/over$/, { exact: true }).first()).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    const offerPanel = appMain(page).getByRole('region', { name: 'Contract Offer', exact: true });
    await expect(offerPanel).toContainText('Projected payroll$265.0M');
    await expect(offerPanel).toContainText('Owner soft ceiling room$35.0M over');
    await expect(offerPanel).toContainText('Tax line room ($230.0M)$35.0M over');
    await expect(offerPanel).toContainText('Advisory owner floor: $115.0M');
    const offer = page.locator('[data-mobile-critical-control="free-agency-offer-contract"]');
    const criticalMobileRows = [
      offerPanel.getByText('Projected payroll', { exact: true }).locator('..'),
      offerPanel.getByText('Owner soft ceiling room', { exact: true }).locator('..'),
      offerPanel.getByText('Tax line room ($230.0M)', { exact: true }).locator('..'),
      offerPanel.getByText('Advisory owner floor: $115.0M', { exact: true }),
      offer,
    ];
    for (const control of criticalMobileRows) {
      await expectMobileControlUnoccluded(page, control);
    }
    await offer.focus();
    await expect(offer).toBeFocused();
    await page.screenshot({ path: MOBILE_EVIDENCE_PATH, fullPage: true });

    await offer.click();
    await expect(offerPanel.getByRole('status'))
      .toContainText(`Signed! ${OWNER_PLAYER_NAME} joins your team.`);
    await expectMutationSaved(page);
    expect(await drainDurableOverlays(page)).toBe(true);
    await expectMutationSaved(page);
    const signed = await readDurableOwnerPayrollFacts(page);
    expect(signed).toMatchObject({
      signedAnnualSalary: SIGNING_SALARY,
      signedTeamId: 'nym',
      totalPayroll: 265,
      taxPayroll: 265,
      userReceiptCount: 0,
      leagueReceiptCount: 0,
    });
  });

  let completedFacts: DurableOwnerPayrollFacts | null = null;
  await test.step('complete through public exact-save commands and publish one factual league reconciliation', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mainNavigation(page).getByRole('link', { name: 'Offseason', exact: true }).click();
    await skipRemainingOffseason(page);
    completedFacts = await readDurableOwnerPayrollFacts(page);
    expect(completedFacts).toEqual({
      signedAnnualSalary: SIGNING_SALARY,
      signedTeamId: 'nym',
      totalPayroll: 275,
      taxPayroll: 265,
      userReceiptCount: 1,
      leagueReceiptCount: 32,
      newsCount: 1,
      briefingCount: 1,
    });
    const integrity = await readIndexedDbSaveIntegrityPair(page, ACTIVE_SAVE_ID);
    expect(integrity.primaryChecksum).toBe(integrity.backupChecksum);
    expect(integrity.primaryChecksum).not.toBe(imported.primaryChecksum);
  });

  await test.step('hard reload retains the contract, pressure story, and singular receipts', async () => {
    await freshRuntimeReload(page, { ready: async () => waitForAppReady(page) });
    if (!completedFacts) throw new Error('Missing completed owner-payroll facts.');
    await expect(readDurableOwnerPayrollFacts(page)).resolves.toEqual(completedFacts);
    await mainNavigation(page).getByRole('link', { name: 'News', exact: true }).click();
    await expect(page.getByText('Ownership marks an aggressive payroll finish', { exact: true })).toBeVisible();
    await expect(page.getByText(/projected exposure/i)).toBeVisible();

    await mainNavigation(page).getByRole('link', { name: 'Finance', exact: true }).click();
    await expect(appMain(page).getByText('Above soft ceiling', { exact: true })).toBeVisible();
    await expect(appMain(page).getByRole('region', { name: 'Total Payroll', exact: true }))
      .toContainText('$275.00M');
    await expect(
      appMain(page)
        .getByRole('region', { name: 'Projected Tax', exact: true })
        .getByText('$265.00M', { exact: true }),
    ).toBeVisible();
    const assistantLauncher = page.getByRole('button', { name: 'Open Assistant' });
    await expectNoOverlap(
      appMain(page).getByRole('region', { name: 'Owner Plan', exact: true }),
      assistantLauncher,
    );
    await expectNoOverlap(
      appMain(page).getByRole('region', { name: 'Projected Tax', exact: true }),
      assistantLauncher,
    );
    await page.screenshot({ path: DESKTOP_EVIDENCE_PATH, fullPage: true });
  });
});
