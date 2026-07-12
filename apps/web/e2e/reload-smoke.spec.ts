import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  appMain,
  clickFreshOverlayAction,
  disableIndexedDbSaveFault,
  dismissGuidedStartNudges,
  drainDurableOverlays,
  enableIndexedDbSaveFault,
  expectDurableSaveSummary,
  escapeRegExp,
  expectFreshMutationRuntime,
  expectMutationSaved,
  freshRuntimeReload,
  handlePressConference,
  indexedDbSaveFaultState,
  installIndexedDbSaveFault,
  installTutorialDismissal,
  navigateFromSidebar,
  normalizeVisibleLabel,
  readIndexedDbSaveIntegrityPair,
  runGlobalSimulation,
  selectExactlyOneVisibleOverlayAction,
  saveSummary,
  saveStatus,
  tamperIndexedDbSaveChecksum,
  waitForAppReady,
} from './helpers/dynasty';

test('fresh overlay-action oracle never retains a stale report control', async () => {
  const firstRead = selectExactlyOneVisibleOverlayAction([
    { name: 'Continue', visible: true, enabled: true },
    { name: 'Dismiss', visible: false, enabled: false },
  ] as const);
  const secondRead = selectExactlyOneVisibleOverlayAction([
    { name: 'Continue', visible: false, enabled: false },
    { name: 'Dismiss', visible: true, enabled: true },
  ] as const);
  const clicked: string[] = [];
  expect(firstRead).toEqual({ kind: 'ready', name: 'Continue' });
  expect(secondRead).toEqual({ kind: 'ready', name: 'Dismiss' });
  if (secondRead.kind === 'ready') clicked.push(secondRead.name);
  expect(clicked).toEqual(['Dismiss']);

  expect(() => selectExactlyOneVisibleOverlayAction([
    { name: 'Continue', visible: true, enabled: true },
    { name: 'Dismiss', visible: true, enabled: true },
  ] as const)).toThrow('multiple visible actions');
  expect(selectExactlyOneVisibleOverlayAction([
    { name: 'Continue', visible: false, enabled: false },
    { name: 'Dismiss', visible: false, enabled: false },
  ] as const)).toEqual({ kind: 'waiting' });
  expect(selectExactlyOneVisibleOverlayAction([
    { name: 'Dismiss', visible: true, enabled: false },
  ] as const)).toEqual({ kind: 'waiting' });
  await expect(clickFreshOverlayAction({
    click: async () => { throw new Error('detached fresh action'); },
  } as never)).rejects.toThrow('detached fresh action');
});

const DEVELOPMENT_RECOVERY_SAVED_AT = '2026-04-02T19:41:02.000Z';
const DEVELOPMENT_RECOVERY_SUMMARY = 'Last saved 7:41:02 PM · 0 pending writes';
const ACCEPTED_TRADE_SAVED_AT = '2026-04-02T19:42:03.000Z';
const ACCEPTED_TRADE_SUMMARY = 'Last saved 7:42:03 PM · 0 pending writes';

interface BoundingRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

function rectanglesOverlap(first: BoundingRect, second: BoundingRect): boolean {
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y;
}

interface DevelopmentCandidate {
  category: string;
  expectedProgram: string | null;
  level: string;
  playerId: string;
  playerName: string;
}

interface DownloadedSaveExport {
  kind?: unknown;
  snapshot?: {
    players?: Array<{
      developmentProgram?: unknown;
      id?: unknown;
    }>;
    schemaVersion?: unknown;
  };
}

interface DownloadedRawSaveRecord {
  id?: unknown;
  integrity?: {
    checksum?: unknown;
  };
  snapshot?: DownloadedSaveExport['snapshot'];
  updatedAt?: unknown;
}

function expectedProgram(category: string, level: string): string | null {
  if (category === 'promotion_window') return 'mlb prep';
  if (category === 'accelerate_challenge') return null;
  if (category !== 'recalibrate_plan' && category !== 'protect_runway') return null;

  switch (level) {
    case 'ROOKIE':
      return 'tools';
    case 'A':
    case 'A_PLUS':
      return 'fundamentals';
    case 'AA':
      return 'refinement';
    case 'AAA':
    default:
      return 'mlb prep';
  }
}

async function readCurrentProgram(
  page: Page,
  playerName: string,
  playerId: string,
): Promise<string> {
  await handlePressConference(page, 'skip');
  await navigateFromSidebar(page, '/players', 'Players');
  await page.getByPlaceholder('Search players or nicknames...').fill(playerName);
  const playerLink = appMain(page).locator(`a[href="/MBD/players/${playerId}"]`).first();
  await expect(playerLink).toBeVisible();
  await playerLink.click();
  await expect(
    appMain(page).getByRole('heading', { name: playerName, exact: true }),
  ).toBeVisible();
  await appMain(page).getByRole('tab', { name: 'Development', exact: true }).click();
  const currentProgramLabel = appMain(page).getByText('Current Program', { exact: true });
  const value = currentProgramLabel.locator('xpath=following-sibling::div[1]');
  await expect(value).toBeVisible();
  return (await value.innerText()).trim();
}

async function chooseRealDevelopmentMutation(page: Page): Promise<{
  beforeProgram: string;
  candidate: DevelopmentCandidate;
} | null> {
  const cards = appMain(page).getByTestId('development-focus-card');
  await expect(cards.first()).toBeVisible();

  const candidates: DevelopmentCandidate[] = [];
  for (let index = 0; index < await cards.count(); index += 1) {
    const card = cards.nth(index);
    const apply = card.getByRole('button', { name: /^Apply development plan for / });
    const label = await apply.getAttribute('aria-label');
    const category = await card.getAttribute('data-focus-category');
    const level = await card.getAttribute('data-player-level');
    const playerId = await card.getAttribute('data-player-id');
    if (!label || !category || !level || !playerId) continue;
    candidates.push({
      category,
      expectedProgram: expectedProgram(category, level),
      level,
      playerId,
      playerName: label.replace('Apply development plan for ', ''),
    });
  }

  for (const candidate of candidates) {
    const beforeProgram = await readCurrentProgram(page, candidate.playerName, candidate.playerId);
    await navigateFromSidebar(page, '/minors', 'Minor League Hub');

    const before = normalizeVisibleLabel(beforeProgram);
    if (candidate.expectedProgram) {
      if (before !== normalizeVisibleLabel(candidate.expectedProgram)) {
        return { beforeProgram, candidate };
      }
      continue;
    }

    if (
      candidate.category === 'accelerate_challenge'
      && before !== 'power'
      && before !== 'velocity'
    ) {
      return { beforeProgram, candidate };
    }
  }

  return null;
}

test('four high-emotion mutations remain durable after real browser reloads', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  await installTutorialDismissal(page);
  await installIndexedDbSaveFault(page);
  await page.clock.setFixedTime(new Date('2026-04-01T12:00:00.000Z'));

  let developmentPlayer = '';
  let developmentPlayerId = '';
  let developmentProgram = '';
  let incomingPlayerId = '';
  let incomingPlayerName = '';
  let incomingPlayerOriginalTeam = '';
  let pressQuote = '';
  let draftedProspectId = '';
  let draftedProspectName = '';
  const remainingDeadlineDays = [31, 62, 92];

  await test.step('launches a fixed-time Trade Shark dynasty through public setup', async () => {
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Mr. Baseball Dynasty', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'New Dynasty', exact: true }).click();
    await page.getByRole('button', { name: /^Challenge Scenario/ }).click();
    await page.getByRole('button', { name: /^Trade Shark\b/ }).click();
    await page.getByLabel('GM Name').fill('Reload Smoke GM');

    const launch = page.locator('[data-mobile-critical-control="setup-wizard-submit"]');
    await expect(launch).toHaveText('Launch Scenario');
    await expect(launch).toBeEnabled({ timeout: 60_000 });
    await launch.click();

    await expect(page).toHaveURL(/\/MBD\/dashboard$/);
    await expect(
      page.locator('[data-tour="dashboard-grid"][data-tour-ready="true"]'),
    ).toBeVisible({ timeout: 60_000 });
    await waitForAppReady(page);
    await expect(
      page.locator('header').getByText('Season 1 — Spring Training', { exact: true }),
    ).toBeVisible();
    await drainDurableOverlays(page);
    await dismissGuidedStartNudges(page);
  });

  await test.step('development-plan apply changes one player and survives reload', async () => {
    await navigateFromSidebar(page, '/minors', 'Minor League Hub');
    let selection = await chooseRealDevelopmentMutation(page);
    while (!selection && remainingDeadlineDays.length > 0) {
      const day = remainingDeadlineDays.shift();
      expect(day).toBeTruthy();
      await runGlobalSimulation(page, 'Next Month (Ctrl+Space)');
      await expect(
        page.locator('header').getByText(`Season 1 — Day ${day}/162`, { exact: true }),
      ).toBeVisible();
      await drainDurableOverlays(page);
      await handlePressConference(page, 'skip');
      await navigateFromSidebar(page, '/minors', 'Minor League Hub');
      selection = await chooseRealDevelopmentMutation(page);
    }
    if (!selection) {
      throw new Error(
        'No public development-focus recommendation produced a real program change by the day-92 deadline checkpoint.',
      );
    }
    developmentPlayer = selection.candidate.playerName;
    developmentPlayerId = selection.candidate.playerId;

    await freshRuntimeReload(page, {
      ready: async () => {
        await expect(
          appMain(page).getByRole('heading', { name: 'Minor League Hub', exact: true }),
        ).toBeVisible();
      },
    });

    const card = appMain(page).locator(
      `[data-testid="development-focus-card"][data-player-id="${selection.candidate.playerId}"]`,
    );
    const apply = card.getByRole('button', {
      name: `Apply development plan for ${developmentPlayer}`,
      exact: true,
    });
    await handlePressConference(page, 'skip');
    await expectFreshMutationRuntime(page);
    const durableSummaryBeforeDevelopment = await expectDurableSaveSummary(page);
    await enableIndexedDbSaveFault(page);
    const recoveryToast = page.getByTestId('active-save-recovery-toast');
    const retry = saveStatus(page).getByRole('button', { name: 'Retry failed save' });
    const firstFailureState = Promise.all([
      expect(saveStatus(page)).toContainText('Save failed — storage full'),
      expect(recoveryToast).toHaveCount(1),
      expect(recoveryToast).toContainText('Local storage is full.'),
      expect(recoveryToast).toContainText(
        'Automatic persistence retry 1 of 2 is scheduled.',
      ),
    ]);
    await apply.click();
    await firstFailureState;

    await expect(retry).toBeVisible();
    await expect(saveSummary(page)).toHaveAttribute(
      'data-last-saved-at',
      durableSummaryBeforeDevelopment.lastSavedAt,
    );
    await expect(saveSummary(page)).toHaveAttribute('data-pending-writes', '1');
    await expect(saveSummary(page)).toContainText('1 pending write');

    await expect.poll(
      async () => (await indexedDbSaveFaultState(page)).blockedAttempts,
      { timeout: 10_000 },
    ).toBe(2);
    await expect(recoveryToast).toHaveCount(1);
    await expect(recoveryToast).toContainText(
      'Automatic persistence retry 2 of 2 is scheduled.',
    );

    await expect.poll(
      async () => (await indexedDbSaveFaultState(page)).blockedAttempts,
      { timeout: 10_000 },
    ).toBe(3);
    await expect(recoveryToast).toHaveCount(1);
    await expect(recoveryToast).toContainText('Local save still failed.');
    await expect(recoveryToast).toContainText(
      'Download a backup, then use Retry when browser storage is available.',
    );
    const downloadBackup = recoveryToast.getByRole('button', {
      name: 'Download backup',
      exact: true,
    });
    await expect(downloadBackup).toBeVisible();

    const result = appMain(page).getByText(
      new RegExp(`^${escapeRegExp(developmentPlayer)}: (.+) plan applied\\.$`),
    );
    await expect(result).toHaveCount(0);
    const pendingDevelopmentCopy = appMain(page).getByText(
      'The development plan changed in memory. Save status is the authority for durability.',
      { exact: true },
    );
    await expect(pendingDevelopmentCopy).toBeVisible();

    const exhaustedAttempts = await indexedDbSaveFaultState(page);
    expect(exhaustedAttempts).toMatchObject({ blockedAttempts: 3, totalAttempts: 3 });
    await page.waitForTimeout(4_000);
    expect(await indexedDbSaveFaultState(page)).toEqual(exhaustedAttempts);
    await expect(saveStatus(page)).toContainText('Save failed — storage full');
    await expect(saveSummary(page)).toHaveAttribute(
      'data-last-saved-at',
      durableSummaryBeforeDevelopment.lastSavedAt,
    );
    await expect(saveSummary(page)).toHaveAttribute('data-pending-writes', '1');

    const desktopViewport = page.viewportSize();
    if (!desktopViewport) throw new Error('Desktop recovery viewport was unavailable.');
    const desktopToastBox = await recoveryToast.boundingBox();
    const desktopStatusBox = await saveStatus(page).boundingBox();
    const desktopSummaryBox = await saveSummary(page).boundingBox();
    const desktopFooterBox = await page.locator('footer[data-tour="sim-controls"]').boundingBox();
    const desktopCommand = page.getByRole('button', { name: 'Open command palette', exact: true });
    const desktopSettings = page.locator('header').getByRole('link', { name: 'Settings', exact: true });
    const desktopCommandBox = await desktopCommand.boundingBox();
    const desktopSettingsBox = await desktopSettings.boundingBox();
    if (
      !desktopToastBox
      || !desktopStatusBox
      || !desktopSummaryBox
      || !desktopFooterBox
      || !desktopCommandBox
      || !desktopSettingsBox
    ) {
      throw new Error('Desktop autosave-recovery geometry was unavailable.');
    }
    expect(desktopToastBox.x).toBeGreaterThanOrEqual(0);
    expect(desktopToastBox.y).toBeGreaterThanOrEqual(0);
    expect(desktopToastBox.x + desktopToastBox.width).toBeLessThanOrEqual(desktopViewport.width);
    expect(desktopToastBox.y + desktopToastBox.height).toBeLessThanOrEqual(desktopViewport.height);
    expect(rectanglesOverlap(desktopToastBox, desktopStatusBox)).toBe(false);
    expect(rectanglesOverlap(desktopToastBox, desktopSummaryBox)).toBe(false);
    expect(rectanglesOverlap(desktopToastBox, desktopFooterBox)).toBe(false);
    expect(rectanglesOverlap(desktopToastBox, desktopCommandBox)).toBe(false);
    expect(rectanglesOverlap(desktopToastBox, desktopSettingsBox)).toBe(false);
    expect(rectanglesOverlap(desktopStatusBox, desktopSummaryBox)).toBe(false);
    expect(rectanglesOverlap(desktopStatusBox, desktopCommandBox)).toBe(false);
    expect(rectanglesOverlap(desktopStatusBox, desktopSettingsBox)).toBe(false);
    await retry.click({ trial: true });
    await downloadBackup.click({ trial: true });
    await desktopCommand.click({ trial: true });
    await desktopSettings.click({ trial: true });
    await test.info().attach('autosave-recovery-desktop.png', {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });

    await page.setViewportSize({ width: 375, height: 667 });
    await expect.poll(async () => {
      const box = await recoveryToast.boundingBox();
      return box
        && box.x >= 0
        && box.y >= 0
        && box.x + box.width <= 375
        && box.y + box.height <= 667;
    }, {
      message: 'the recovery toast should settle inside the 375x667 viewport',
    }).toBe(true);
    await retry.click({ trial: true });
    await downloadBackup.click({ trial: true });
    const mobileCommand = page.getByRole('button', { name: 'Open command palette', exact: true });
    const mobileSettings = page.locator('header').getByRole('link', { name: 'Settings', exact: true });
    await mobileCommand.click({ trial: true });
    await mobileSettings.click({ trial: true });
    const mobileToastBox = await recoveryToast.boundingBox();
    const mobileStatusBox = await saveStatus(page).boundingBox();
    const mobileSummaryBox = await saveSummary(page).boundingBox();
    const mobileFooterBox = await page.locator('footer[data-tour="sim-controls"]').boundingBox();
    const mobileCommandBox = await mobileCommand.boundingBox();
    const mobileSettingsBox = await mobileSettings.boundingBox();
    if (
      !mobileToastBox
      || !mobileStatusBox
      || !mobileSummaryBox
      || !mobileFooterBox
      || !mobileCommandBox
      || !mobileSettingsBox
    ) {
      throw new Error('Mobile autosave-recovery geometry was unavailable.');
    }
    expect(mobileToastBox.x).toBeGreaterThanOrEqual(0);
    expect(mobileToastBox.y).toBeGreaterThanOrEqual(0);
    expect(mobileToastBox.x + mobileToastBox.width).toBeLessThanOrEqual(375);
    expect(mobileToastBox.y + mobileToastBox.height).toBeLessThanOrEqual(667);
    expect(rectanglesOverlap(mobileToastBox, mobileStatusBox)).toBe(false);
    expect(rectanglesOverlap(mobileToastBox, mobileSummaryBox)).toBe(false);
    expect(rectanglesOverlap(mobileToastBox, mobileFooterBox)).toBe(false);
    expect(rectanglesOverlap(mobileToastBox, mobileCommandBox)).toBe(false);
    expect(rectanglesOverlap(mobileToastBox, mobileSettingsBox)).toBe(false);
    expect(rectanglesOverlap(mobileStatusBox, mobileSummaryBox)).toBe(false);
    expect(rectanglesOverlap(mobileStatusBox, mobileCommandBox)).toBe(false);
    expect(rectanglesOverlap(mobileStatusBox, mobileSettingsBox)).toBe(false);
    await test.info().attach('autosave-recovery-mobile.png', {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });

    await downloadBackup.focus();
    await expect(downloadBackup).toBeFocused();
    const [backupDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press('Enter'),
    ]);
    expect(backupDownload.suggestedFilename()).toMatch(/^mbd-.+-pending-\d+\.json$/);
    const backupPath = await backupDownload.path();
    if (!backupPath) throw new Error('The autosave recovery backup had no local download path.');
    const downloadedPayload = JSON.parse(
      await readFile(backupPath, 'utf8'),
    ) as DownloadedSaveExport;
    expect(downloadedPayload.kind).toBe('mbd-save-export');
    expect(downloadedPayload.snapshot?.schemaVersion).toBe(34);
    const downloadedPlayer = downloadedPayload.snapshot?.players?.find(
      (player) => player.id === selection.candidate.playerId,
    );
    expect(downloadedPlayer).toBeTruthy();
    developmentProgram = String(downloadedPlayer?.developmentProgram ?? '');
    expect(developmentProgram).not.toBe('');
    expect(normalizeVisibleLabel(developmentProgram)).not.toBe(
      normalizeVisibleLabel(selection.beforeProgram),
    );
    if (selection.candidate.expectedProgram) {
      expect(normalizeVisibleLabel(developmentProgram)).toBe(
        normalizeVisibleLabel(selection.candidate.expectedProgram),
      );
    }
    expect(normalizeVisibleLabel(String(downloadedPlayer?.developmentProgram ?? ''))).toBe(
      normalizeVisibleLabel(developmentProgram),
    );
    await expect(recoveryToast).toContainText('Backup download requested.');
    await expect(recoveryToast).toContainText('Local saving is still pending.');
    await expect(
      recoveryToast.getByRole('button', { name: 'Download again', exact: true }),
    ).toBeVisible();
    await expect(saveStatus(page)).toContainText('Save failed — storage full');
    await expect(retry).toBeVisible();
    await expect(saveSummary(page)).toHaveAttribute(
      'data-last-saved-at',
      durableSummaryBeforeDevelopment.lastSavedAt,
    );
    await expect(saveSummary(page)).toHaveAttribute('data-pending-writes', '1');

    await page.setViewportSize(desktopViewport);
    await disableIndexedDbSaveFault(page);
    await page.clock.setFixedTime(new Date(DEVELOPMENT_RECOVERY_SAVED_AT));
    await retry.click();
    await expectMutationSaved(page);
    await expectDurableSaveSummary(page, {
      lastSavedAt: DEVELOPMENT_RECOVERY_SAVED_AT,
      text: DEVELOPMENT_RECOVERY_SUMMARY,
    });
    await expect(recoveryToast).toContainText('Local save recovered.');
    await expect(recoveryToast).toContainText(
      'Your latest changes are now durable on this device.',
    );
    await expect(
      recoveryToast.getByRole('button', { name: /Download (?:backup|again)/ }),
    ).toHaveCount(0);
    await expect.poll(async () => (await indexedDbSaveFaultState(page)).totalAttempts).toBe(4);
    await expect.poll(async () => (await indexedDbSaveFaultState(page)).blockedAttempts).toBe(3);
    await expect(pendingDevelopmentCopy).toBeVisible();

    await freshRuntimeReload(page);
    const persistedProgram = await readCurrentProgram(
      page,
      developmentPlayer,
      selection.candidate.playerId,
    );
    expect(normalizeVisibleLabel(persistedProgram)).toBe(
      normalizeVisibleLabel(developmentProgram),
    );
  });

  await test.step('tampered primary integrity blocks load and restores the exact verified copy', async () => {
    const integrityBefore = await readIndexedDbSaveIntegrityPair(page, 'save-slot-1');
    expect(integrityBefore.primaryChecksum).toBe(integrityBefore.backupChecksum);
    expect(integrityBefore.primaryUpdatedAt).toBe(DEVELOPMENT_RECOVERY_SAVED_AT);
    expect(integrityBefore.backupUpdatedAt).toBe(DEVELOPMENT_RECOVERY_SAVED_AT);

    const tampered = await tamperIndexedDbSaveChecksum(page, 'save-slot-1');
    expect(tampered.beforeChecksum).toBe(integrityBefore.primaryChecksum);
    expect(tampered.afterChecksum).not.toBe(tampered.beforeChecksum);

    await page.reload({ waitUntil: 'domcontentloaded' });
    const dialog = page.getByRole('dialog', { name: 'Slot 1 needs recovery' });
    await expect(dialog).toBeVisible({ timeout: 60_000 });
    await expect(dialog).toContainText('This local save changed after MBD sealed it.');
    await expect(dialog).toContainText('accidental local corruption');
    await expect(dialog).toContainText('verified copy of the same save generation');
    await expect(dialog).toContainText('not a security guarantee or an older-save rollback');

    const exportRaw = dialog.getByRole('button', { name: 'Export raw JSON', exact: true });
    const restore = dialog.getByRole('button', { name: 'Restore verified copy', exact: true });
    const recoveryRetry = dialog.getByRole('button', { name: 'Retry', exact: true });
    const deleteSave = dialog.getByRole('button', { name: 'Delete this save', exact: true });
    const details = dialog.getByRole('button', { name: 'View error details', exact: true });
    const close = dialog.getByRole('button', { name: 'Close save recovery dialog', exact: true });
    await expect(restore).toBeVisible();

    await exportRaw.focus();
    await expect(exportRaw).toBeFocused();
    const [rawDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press('Enter'),
    ]);
    expect(rawDownload.suggestedFilename()).toBe('mbd-save-slot-1-recovery.json');
    const rawPath = await rawDownload.path();
    if (!rawPath) throw new Error('The raw integrity evidence had no local download path.');
    const rawRecord = JSON.parse(
      await readFile(rawPath, 'utf8'),
    ) as DownloadedRawSaveRecord;
    expect(rawRecord.id).toBe('save-slot-1');
    expect(rawRecord.integrity?.checksum).toBe(tampered.afterChecksum);
    expect(rawRecord.updatedAt).toBe(DEVELOPMENT_RECOVERY_SAVED_AT);
    const rawPlayer = rawRecord.snapshot?.players?.find(
      (player) => player.id === developmentPlayerId,
    );
    expect(normalizeVisibleLabel(String(rawPlayer?.developmentProgram ?? ''))).toBe(
      normalizeVisibleLabel(developmentProgram),
    );
    await expect(dialog).toBeVisible();

    const desktopViewport = page.viewportSize();
    if (!desktopViewport) throw new Error('Desktop save-integrity viewport was unavailable.');
    const panel = dialog.locator(':scope > div');
    const desktopPanelBox = await panel.boundingBox();
    if (!desktopPanelBox) throw new Error('Desktop save-integrity panel geometry was unavailable.');
    expect(desktopPanelBox.x).toBeGreaterThanOrEqual(0);
    expect(desktopPanelBox.y).toBeGreaterThanOrEqual(0);
    expect(desktopPanelBox.x + desktopPanelBox.width).toBeLessThanOrEqual(desktopViewport.width);
    expect(desktopPanelBox.y + desktopPanelBox.height).toBeLessThanOrEqual(desktopViewport.height);
    await exportRaw.click({ trial: true });
    await restore.click({ trial: true });
    await recoveryRetry.click({ trial: true });
    await deleteSave.click({ trial: true });
    await details.click({ trial: true });
    await close.click({ trial: true });
    await test.info().attach('save-integrity-recovery-desktop.png', {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(dialog).toBeVisible();
    const mobilePanelBox = await panel.boundingBox();
    if (!mobilePanelBox) throw new Error('Mobile save-integrity panel geometry was unavailable.');
    expect(mobilePanelBox.x).toBeGreaterThanOrEqual(0);
    expect(mobilePanelBox.y).toBeGreaterThanOrEqual(0);
    expect(mobilePanelBox.x + mobilePanelBox.width).toBeLessThanOrEqual(375);
    expect(mobilePanelBox.y + mobilePanelBox.height).toBeLessThanOrEqual(667);
    await exportRaw.click({ trial: true });
    await restore.click({ trial: true });
    await recoveryRetry.click({ trial: true });
    await deleteSave.click({ trial: true });
    await details.click({ trial: true });
    await close.click({ trial: true });
    await test.info().attach('save-integrity-recovery-mobile.png', {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });

    await page.setViewportSize(desktopViewport);
    await restore.focus();
    await expect(restore).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden({ timeout: 60_000 });
    await waitForAppReady(page);
    await expectDurableSaveSummary(page, {
      lastSavedAt: DEVELOPMENT_RECOVERY_SAVED_AT,
      text: DEVELOPMENT_RECOVERY_SUMMARY,
    });

    const integrityAfter = await readIndexedDbSaveIntegrityPair(page, 'save-slot-1');
    expect(integrityAfter).toEqual(integrityBefore);
    await handlePressConference(page, 'skip');
    const restoredProgram = await readCurrentProgram(
      page,
      developmentPlayer,
      developmentPlayerId,
    );
    expect(normalizeVisibleLabel(restoredProgram)).toBe(
      normalizeVisibleLabel(developmentProgram),
    );

    await freshRuntimeReload(page);
    await expectDurableSaveSummary(page, {
      lastSavedAt: DEVELOPMENT_RECOVERY_SAVED_AT,
      text: DEVELOPMENT_RECOVERY_SUMMARY,
    });
    const reloadedProgram = await readCurrentProgram(
      page,
      developmentPlayer,
      developmentPlayerId,
    );
    expect(normalizeVisibleLabel(reloadedProgram)).toBe(
      normalizeVisibleLabel(developmentProgram),
    );
  });

  await test.step('advances publicly to deterministic deadline offers', async () => {
    for (const day of remainingDeadlineDays) {
      await runGlobalSimulation(page, 'Next Month (Ctrl+Space)');
      await expect(
        page.locator('header').getByText(`Season 1 — Day ${day}/162`, { exact: true }),
      ).toBeVisible();
      await drainDurableOverlays(page);
      await handlePressConference(page, 'skip');
    }
    await expect(
      page.locator('header').getByText('Season 1 — Day 92/162', { exact: true }),
    ).toBeVisible();
  });

  await test.step('accepted incoming trade survives a hard reload', async () => {
    await navigateFromSidebar(page, '/trade', 'Trade Center');
    const hotOffers = appMain(page).getByRole('region', { name: 'Hot Offers' });
    await expect(hotOffers).toBeVisible();
    await expect(
      hotOffers.locator('[data-testid="trade-offering-asset"][data-asset-type="player"]').first(),
    ).toBeVisible({ timeout: 60_000 });

    await freshRuntimeReload(page, {
      ready: async () => {
        await expect(
          appMain(page).getByRole('heading', { name: 'Trade Center', exact: true }),
        ).toBeVisible();
      },
    });

    const reloadedHotOffers = appMain(page).getByRole('region', { name: 'Hot Offers' });
    const incomingAsset = reloadedHotOffers
      .locator('[data-testid="trade-offering-asset"][data-asset-type="player"]')
      .first();
    await expect(incomingAsset).toBeVisible();
    incomingPlayerId = await incomingAsset.getAttribute('data-player-id') ?? '';
    const assetText = (await incomingAsset.innerText()).trim();
    incomingPlayerName = assetText.split(' · ')[0]?.trim() ?? '';
    expect(incomingPlayerId).not.toBe('');
    expect(incomingPlayerName).not.toBe('');

    const offer = incomingAsset.locator('xpath=ancestor::article[1]');
    incomingPlayerOriginalTeam = await offer.getAttribute('data-from-team-abbreviation') ?? '';
    expect(incomingPlayerOriginalTeam).not.toBe('');
    expect(incomingPlayerOriginalTeam).not.toBe('SEA');
    await handlePressConference(page, 'skip');
    await expectFreshMutationRuntime(page);
    const durableSummaryBeforeTrade = await expectDurableSaveSummary(page);
    expect(durableSummaryBeforeTrade.lastSavedAt).not.toBe(ACCEPTED_TRADE_SAVED_AT);
    await page.clock.setFixedTime(new Date(ACCEPTED_TRADE_SAVED_AT));
    await offer.getByRole('button', { name: 'Accept', exact: true }).click();
    await expect(
      appMain(page).getByRole('heading', { name: 'Deal Completed', exact: true }),
    ).toBeVisible();
    await expectMutationSaved(page);

    const durableSummaryAfterTrade = await expectDurableSaveSummary(page, {
      lastSavedAt: ACCEPTED_TRADE_SAVED_AT,
      text: ACCEPTED_TRADE_SUMMARY,
    });
    expect(durableSummaryAfterTrade.lastSavedAt).not.toBe(
      durableSummaryBeforeTrade.lastSavedAt,
    );

    await freshRuntimeReload(page, { press: 'preserve' });
    const acceptedTradeConference = page.getByRole('dialog', { name: /press conference/i });
    await expect(acceptedTradeConference).toBeVisible({ timeout: 60_000 });
    await expect(acceptedTradeConference).toContainText('Season 1 · Day 92');
    await expect(acceptedTradeConference).toContainText('That recent deal is being debated around the league.');
    await acceptedTradeConference.getByRole('button', { name: 'Skip', exact: true }).click();
    await expect(acceptedTradeConference).toBeHidden();
    await expectDurableSaveSummary(page, durableSummaryAfterTrade);
    await navigateFromSidebar(page, '/players', 'Players');
    await page.getByPlaceholder('Search players or nicknames...').fill(incomingPlayerName);
    const playerLink = appMain(page)
      .locator(`a[href="/MBD/players/${incomingPlayerId}"]`)
      .first();
    await expect(playerLink).toBeVisible();
    const playerRow = playerLink.locator('xpath=ancestor::tr[1]');
    await expect(playerRow.getByText('SEA', { exact: true })).toBeVisible();
  });

  await test.step('confident press response survives reload and does not reopen', async () => {
    await freshRuntimeReload(page, { press: 'preserve' });
    const dialog = page.getByRole('dialog', { name: 'Press Conference' });
    await expect(dialog).toBeVisible({ timeout: 60_000 });
    await expectFreshMutationRuntime(page);

    const confident = dialog
      .getByText('confident', { exact: true })
      .locator('xpath=ancestor::button[1]');
    await expect(confident).toBeVisible();
    pressQuote = (await confident.locator('p').innerText())
      .replace(/[“”"]/g, '')
      .trim();
    expect(pressQuote).not.toBe('');
    await confident.click();
    await dialog.getByRole('button', { name: 'Deliver Response', exact: true }).click();
    await expect(dialog.getByText('Response delivered.', { exact: true })).toBeVisible();
    await expectMutationSaved(page);
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(dialog).toBeHidden();

    await freshRuntimeReload(page, { press: 'preserve' });
    await navigateFromSidebar(page, '/press-room', 'Press Room');
    const consequence = appMain(page).getByRole('heading', {
      level: 3,
      name: /^Press tone (matched the Day One posture|created identity friction)\.$/,
    }).first();
    await expect(consequence).toBeVisible();
    const consequenceArticle = consequence.locator('xpath=ancestor::article[1]');
    await expect(consequenceArticle).toContainText(pressQuote);
    await expect(consequenceArticle).toContainText('Confident response');
    await expect(dialog).toHaveCount(0);
  });

  await test.step('draft pick survives reload after public postseason flow', async () => {
    await runGlobalSimulation(page, 'Fast-forward to the playoff cutoff');
    await drainDurableOverlays(page);
    await handlePressConference(page, 'skip');
    await expect(
      appMain(page).getByRole('heading', { name: 'Season Summary', exact: true }),
    ).toBeVisible();

    await appMain(page)
      .getByRole('button', { name: /^(Go to Playoffs|Watch Playoffs)$/ })
      .click();
    await expect(page).toHaveURL(/\/MBD\/playoffs$/);
    await expect(
      appMain(page).getByRole('heading', { name: 'Playoffs', exact: true }),
    ).toBeVisible();
    await waitForAppReady(page);
    await drainDurableOverlays(page);

    const startBracket = appMain(page).locator(
      '[data-mobile-critical-control="playoffs-start-bracket"]',
    );
    const simAll = appMain(page).locator('[data-mobile-critical-control="playoffs-sim-all"]');
    if (await startBracket.isVisible().catch(() => false)) {
      await startBracket.click();
      await expect(simAll).toBeVisible({ timeout: 60_000 });
      await expectMutationSaved(page);
    }

    await expect(simAll).toBeEnabled();
    await simAll.click();
    await expect(
      appMain(page).getByRole('button', { name: 'Proceed to Offseason', exact: true }),
    ).toBeVisible({ timeout: 180_000 });
    await expectMutationSaved(page);
    await drainDurableOverlays(page);

    await appMain(page)
      .getByRole('button', { name: 'Proceed to Offseason', exact: true })
      .click();
    await expect(
      page.locator('header').getByText(/^Season 1 — Offseason:/),
    ).toBeVisible({ timeout: 60_000 });
    await expectMutationSaved(page);
    await drainDurableOverlays(page);

    await navigateFromSidebar(page, '/draft', 'Draft Room');
    await dismissGuidedStartNudges(page);
    await freshRuntimeReload(page, {
      ready: async () => {
        await expect(
          appMain(page).getByRole('button', { name: 'Start Draft', exact: true }),
        ).toBeVisible();
      },
    });
    await expectFreshMutationRuntime(page);
    await page.getByRole('button', { name: 'Start Draft', exact: true }).click();
    await expect(appMain(page).getByText('User Pick', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(appMain(page).getByTestId('draft-prospect-row').first()).toBeVisible();
    await expectMutationSaved(page);

    await freshRuntimeReload(page, {
      ready: async () => {
        await expect(appMain(page).getByText('User Pick', { exact: true })).toBeVisible();
      },
    });
    const prospectRow = appMain(page).getByTestId('draft-prospect-row').first();
    draftedProspectId = await prospectRow.getAttribute('data-prospect-id') ?? '';
    draftedProspectName = (await prospectRow.locator('td').nth(1).innerText()).trim();
    expect(draftedProspectId).not.toBe('');
    expect(draftedProspectName).not.toBe('');

    await expectFreshMutationRuntime(page);
    await prospectRow.click();
    const submit = appMain(page).locator('[data-mobile-critical-control="draft-pick-submit"]');
    await expect(submit).toBeEnabled();
    await submit.click();

    const tickerLine = `SEA selected ${draftedProspectName}`;
    const ticker = appMain(page).getByRole('region', { name: 'Draft Ticker' });
    const draftedPick = ticker.locator(
      `[data-testid="draft-ticker-pick"][data-player-id="${draftedProspectId}"]`,
    );
    await expect(draftedPick.getByText(tickerLine, { exact: true })).toBeVisible();
    await expectMutationSaved(page);

    await freshRuntimeReload(page, {
      ready: async () => {
        await expect(
          appMain(page)
            .getByRole('region', { name: 'Draft Ticker' })
            .locator(
              `[data-testid="draft-ticker-pick"][data-player-id="${draftedProspectId}"]`,
            )
            .getByText(tickerLine, { exact: true }),
        ).toBeVisible();
      },
    });
  });

  await test.info().attach('durable-identities.json', {
    body: Buffer.from(JSON.stringify({
      developmentPlayer,
      developmentProgram,
      incomingPlayerId,
      incomingPlayerName,
      incomingPlayerOriginalTeam,
      pressQuote,
      draftedProspectId,
      draftedProspectName,
    }, null, 2)),
    contentType: 'application/json',
  });

  await test.step('keeps the durable summary bounded and controls reachable on desktop', async () => {
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    if (!viewport) throw new Error('Desktop viewport geometry was unavailable.');
    expect(viewport.width).toBeGreaterThanOrEqual(1024);

    const summary = saveSummary(page);
    const header = summary.locator('xpath=ancestor::header[1]');
    const command = page.getByRole('button', { name: 'Open command palette', exact: true });
    const settings = header.getByRole('link', { name: 'Settings', exact: true });
    await expectDurableSaveSummary(page);
    await expect(header).toBeVisible();
    await expect(command).toBeVisible();
    await expect(settings).toBeVisible();

    const summaryBox = await summary.boundingBox();
    const headerBox = await header.boundingBox();
    const commandBox = await command.boundingBox();
    const settingsBox = await settings.boundingBox();
    if (!summaryBox || !headerBox || !commandBox || !settingsBox) {
      throw new Error('Desktop save-summary geometry was unavailable.');
    }

    expect(summaryBox.x).toBeGreaterThanOrEqual(0);
    expect(summaryBox.y).toBeGreaterThanOrEqual(0);
    expect(summaryBox.x + summaryBox.width).toBeLessThanOrEqual(viewport.width);
    expect(summaryBox.y + summaryBox.height).toBeLessThanOrEqual(viewport.height);
    expect(summaryBox.x).toBeGreaterThanOrEqual(headerBox.x);
    expect(summaryBox.y).toBeGreaterThanOrEqual(headerBox.y);
    expect(summaryBox.x + summaryBox.width).toBeLessThanOrEqual(
      headerBox.x + headerBox.width,
    );
    expect(summaryBox.y + summaryBox.height).toBeLessThanOrEqual(
      headerBox.y + headerBox.height,
    );
    expect(rectanglesOverlap(summaryBox, commandBox)).toBe(false);
    expect(rectanglesOverlap(summaryBox, settingsBox)).toBe(false);

    await command.click({ trial: true });
    await settings.click({ trial: true });

    await test.info().attach('save-persistence-summary-desktop.png', {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });
  });

  await test.step('keeps the durable summary visible and non-occluding at 375x667', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    const summary = saveSummary(page);
    await expectDurableSaveSummary(page);

    const summaryBox = await summary.boundingBox();
    const mainBox = await appMain(page).boundingBox();
    const footerBox = await page.locator('footer[data-tour="sim-controls"]').boundingBox();
    expect(summaryBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    expect(footerBox).not.toBeNull();
    if (!summaryBox || !mainBox || !footerBox) {
      throw new Error('Mobile shell geometry was unavailable.');
    }

    expect(summaryBox.x).toBeGreaterThanOrEqual(0);
    expect(summaryBox.y).toBeGreaterThanOrEqual(0);
    expect(summaryBox.x + summaryBox.width).toBeLessThanOrEqual(375);
    expect(summaryBox.y + summaryBox.height).toBeLessThanOrEqual(667);
    expect(summaryBox.y + summaryBox.height).toBeLessThanOrEqual(mainBox.y + 1);
    expect(summaryBox.y + summaryBox.height).toBeLessThan(footerBox.y);

    await page.getByRole('button', { name: 'Open command palette', exact: true }).click({ trial: true });
    await summary
      .locator('xpath=ancestor::header[1]')
      .getByRole('link', { name: 'Settings', exact: true })
      .click({ trial: true });

    await test.info().attach('save-persistence-summary-mobile.png', {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });
  });

  await expect(saveStatus(page)).toHaveCount(0);
  await expectDurableSaveSummary(page);
});
