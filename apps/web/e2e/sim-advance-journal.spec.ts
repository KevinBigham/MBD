import { expect, test, type Page } from '@playwright/test';
import {
  disableIndexedDbSaveFault,
  dismissGuidedStartNudges,
  drainDurableOverlays,
  enableIndexedDbSaveFault,
  expectDurableSaveSummary,
  expectMutationSaved,
  handlePressConference,
  indexedDbSaveFaultState,
  installIndexedDbSaveFault,
  installTutorialDismissal,
  readIndexedDbSimAdvanceJournalEvidence,
  saveStatus,
  simFooter,
  waitForAppReady,
  type IndexedDbSimAdvanceJournalEvidence,
} from './helpers/dynasty';

const SAVE_ID = 'save-slot-1';

async function createPublicRegularSeasonDynasty(page: Page): Promise<void> {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New Dynasty', exact: true }).click();
  await page.getByRole('button', { name: /^Challenge Scenario/ }).click();
  await page.getByRole('button', { name: /^Trade Shark\b/ }).click();
  await page.getByLabel('GM Name').fill('Journal Browser GM');
  await page.locator('[data-mobile-critical-control="setup-wizard-submit"]').click();
  await expect(page).toHaveURL(/\/MBD\/dashboard$/);
  await waitForAppReady(page);
  await drainDurableOverlays(page);
  await dismissGuidedStartNudges(page);
  await expectDurableSaveSummary(page);
  const nextMonth = page.getByRole('button', { name: 'Next Month (Ctrl+Space)', exact: true });
  const footer = simFooter(page);
  const reloadRequired = page.getByRole('alertdialog', { name: 'Reload required' });
  await expect(nextMonth).toBeEnabled();
  await nextMonth.click();
  await expect(footer).toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
  await expect.poll(async () => {
    if (await reloadRequired.isVisible().catch(() => false)) return 'reload';
    return footer.getAttribute('aria-busy').catch(() => null);
  }, { timeout: 180_000 }).toMatch(/^(false|reload)$/);
  if (await reloadRequired.isVisible().catch(() => false)) {
    const failedEvidence = await readIndexedDbSimAdvanceJournalEvidence(page, SAVE_ID);
    throw new Error(`Preseason Next Month failed closed with evidence ${JSON.stringify(failedEvidence)}`);
  }
  await expectMutationSaved(page);
  await drainDurableOverlays(page);
  await handlePressConference(page, 'skip');
  await expect(
    page.locator('header').getByText(/^Season 1 — Day \d+\/162$/, { exact: true }),
  ).toBeVisible();
  await expectDurableSaveSummary(page);
}

function expectExactBaseline(
  observed: IndexedDbSimAdvanceJournalEvidence,
  baseline: IndexedDbSimAdvanceJournalEvidence,
): void {
  expect(observed.primary).toEqual(baseline.primary);
  expect(observed.shadow).toEqual(baseline.shadow);
}

async function clickPublicSimDay(page: Page): Promise<void> {
  const simDay = page.getByRole('button', { name: 'Sim Day (Space)', exact: true });
  await expect(simDay).toBeEnabled();
  await simDay.click();
}

test('production journal WAL recovers a held post, retries persistence without replay, and survives reload', async ({
  context,
  page: owner,
}) => {
  test.setTimeout(8 * 60_000);
  expect(test.info().retry).toBe(0);
  owner.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      console.log(`[owner:${message.type()}] ${message.text()}`);
    }
  });
  owner.on('pageerror', (error) => console.log(`[owner:pageerror] ${error.message}`));
  await installIndexedDbSaveFault(context);
  await installTutorialDismissal(owner);

  const evidence: Record<string, unknown> = {
    retriesConfigured: test.info().project.retries,
    gameplayClicks: 0,
  };

  await test.step('create one exact durable regular-season baseline', async () => {
    await createPublicRegularSeasonDynasty(owner);
    const baseline = await readIndexedDbSimAdvanceJournalEvidence(owner, SAVE_ID);
    expect(baseline.primary).toEqual(baseline.shadow);
    expect(baseline.intent).toBeNull();
    expect(baseline.primary.phase).toBe('regular');
    evidence.baseline = baseline;
  });

  const baseline = evidence.baseline as IndexedDbSimAdvanceJournalEvidence;
  const contenderPromise = context.waitForEvent('page');
  await owner.evaluate(() => {
    const opened = window.open(window.location.href, '_blank');
    if (!opened) throw new Error('The browser did not open the contender page.');
  });
  const contender = await contenderPromise;
  await contender.waitForLoadState('domcontentloaded');

  await test.step('block the second real page before it can reach gameplay UI', async () => {
    const conflict = contender.getByRole('alertdialog', { name: 'Dynasty already open' });
    const checkAgain = conflict.getByRole('button', { name: 'Check again', exact: true });
    await expect(conflict).toBeVisible({ timeout: 60_000 });
    await expect(contender.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
    await expect(simFooter(contender)).toHaveCount(0);
    await expect(contender.getByTestId('save-persistence-summary')).toHaveCount(0);
    await expect(checkAgain).toBeFocused();
    await contender.keyboard.press('Tab');
    await expect(checkAgain).toBeFocused();
    const desktopBox = await checkAgain.boundingBox();
    expect(desktopBox?.height).toBeGreaterThanOrEqual(44);
    await test.info().attach('sim-advance-conflict-desktop.png', {
      body: await contender.screenshot({ fullPage: false }), contentType: 'image/png',
    });

    await contender.setViewportSize({ width: 375, height: 667 });
    const panel = conflict.locator('[tabindex="-1"]');
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.x).toBeGreaterThanOrEqual(0);
    expect(panelBox!.y).toBeGreaterThanOrEqual(0);
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(375);
    expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(667);
    await checkAgain.focus();
    await expect(checkAgain).toBeFocused();
    await test.info().attach('sim-advance-conflict-mobile-375x667.png', {
      body: await contender.screenshot({ fullPage: false }), contentType: 'image/png',
    });
    await contender.setViewportSize({ width: 1280, height: 720 });
  });

  let heldIntent: IndexedDbSimAdvanceJournalEvidence;
  await test.step('prove write-ahead evidence while the post transaction is storage-faulted', async () => {
    await enableIndexedDbSaveFault(owner);
    await clickPublicSimDay(owner);
    evidence.gameplayClicks = 1;
    const retry = saveStatus(owner).getByRole('button', { name: 'Retry failed save' });
    await expect(retry).toBeVisible({ timeout: 90_000 });
    heldIntent = await readIndexedDbSimAdvanceJournalEvidence(owner, SAVE_ID);
    expectExactBaseline(heldIntent, baseline);
    expect(heldIntent.intent).toMatchObject({
      saveId: SAVE_ID, rootSaveId: SAVE_ID, operation: 'sim_day',
      baselineChecksum: baseline.primary.checksum,
      baselineSeason: baseline.primary.season,
      baselineDay: baseline.primary.day,
      baselinePhase: baseline.primary.phase,
    });
    // The post-save transaction is attempted once, then held for an explicit
    // persistence-only retry. Extra blocked writes would indicate duplicate
    // automatic commit attempts while the journal lane is paused.
    expect((await indexedDbSaveFaultState(owner)).blockedAttempts).toBe(1);
    evidence.heldIntent = heldIntent;
  });

  await test.step('close the owner and recover the exact baseline in the successor without replay', async () => {
    await owner.close();
    const checkAgain = contender.getByRole('alertdialog', { name: 'Dynasty already open' })
      .getByRole('button', { name: 'Check again', exact: true });
    await checkAgain.click();
    await waitForAppReady(contender);
    await expect(contender.getByRole('alertdialog', { name: 'Dynasty already open' })).toHaveCount(0);
    await expect(contender.getByRole('alertdialog', { name: 'Reload required' })).toHaveCount(0);
    await expect(contender.getByText('Restored the last verified saved dynasty. The interrupted simulation was not replayed.')).toBeVisible();
    const rollback = await readIndexedDbSimAdvanceJournalEvidence(contender, SAVE_ID);
    expectExactBaseline(rollback, baseline);
    expect(rollback.intent).toBeNull();
    evidence.rollback = rollback;
    // Press conferences are a deterministic, page-local presentation query;
    // a newly authoritative page may show the same day's optional prompt.
    await handlePressConference(contender, 'skip');
  });

  let retainedRetry: IndexedDbSimAdvanceJournalEvidence;
  await test.step('retry one captured post through storage failure without another public gameplay command', async () => {
    await enableIndexedDbSaveFault(contender);
    await clickPublicSimDay(contender);
    evidence.gameplayClicks = 2;
    const retry = saveStatus(contender).getByRole('button', { name: 'Retry failed save' });
    await expect(retry).toBeVisible({ timeout: 90_000 });
    await expect(saveStatus(contender)).toContainText('Simulation paused — retry exact save');
    retainedRetry = await readIndexedDbSimAdvanceJournalEvidence(contender, SAVE_ID);
    expectExactBaseline(retainedRetry, baseline);
    expect(retainedRetry.intent).toMatchObject({ saveId: SAVE_ID, rootSaveId: SAVE_ID });
    expect((await indexedDbSaveFaultState(contender)).blockedAttempts).toBe(1);
    await contender.setViewportSize({ width: 375, height: 667 });
    const retryBox = await retry.boundingBox();
    expect(retryBox?.height).toBeGreaterThanOrEqual(44);
    await retry.focus();
    await expect(retry).toBeFocused();
    await test.info().attach('sim-advance-retry-mobile-375x667.png', {
      body: await contender.screenshot({ fullPage: false }), contentType: 'image/png',
    });
    await contender.setViewportSize({ width: 1280, height: 720 });

    const faultBeforeManualRetry = await indexedDbSaveFaultState(contender);
    await disableIndexedDbSaveFault(contender);
    await retry.click();
    await expectMutationSaved(contender);
    const durablePost = await readIndexedDbSimAdvanceJournalEvidence(contender, SAVE_ID);
    expect(durablePost.intent).toBeNull();
    expect(durablePost.primary).toEqual(durablePost.shadow);
    expect(durablePost.primary.day).toBe(baseline.primary.day + 1);
    expect(durablePost.primary.rng.callCount).toBeGreaterThan(baseline.primary.rng.callCount);
    expect(durablePost.primary.checksum).not.toBe(baseline.primary.checksum);
    expect((await indexedDbSaveFaultState(contender)).totalAttempts).toBe(faultBeforeManualRetry.totalAttempts + 1);
    // One public click, immutable retained intent token/attempt, one-day post
    // delta, and a manual persistence-only retry bound the browser evidence:
    // the post was not replayed and no second gameplay route was invoked.
    expect(retainedRetry.intent?.token).toBeTruthy();
    evidence.retry = { retained: retainedRetry, faultBeforeManualRetry, durablePost };
  });

  await test.step('hard reload retains the exact durable post with no journal', async () => {
    const durablePost = (evidence.retry as { durablePost: IndexedDbSimAdvanceJournalEvidence }).durablePost;
    await contender.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(contender);
    await expect(contender.getByRole('alertdialog', { name: 'Dynasty already open' })).toHaveCount(0);
    await expect(contender.getByRole('alertdialog', { name: 'Reload required' })).toHaveCount(0);
    const reloaded = await readIndexedDbSimAdvanceJournalEvidence(contender, SAVE_ID);
    expect(reloaded).toEqual(durablePost);
    evidence.reload = reloaded;
  });

  await test.info().attach('sim-advance-journal-evidence.json', {
    body: JSON.stringify(evidence, null, 2), contentType: 'application/json',
  });
});
