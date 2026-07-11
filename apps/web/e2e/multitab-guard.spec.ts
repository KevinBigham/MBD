import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  dismissGuidedStartNudges,
  drainDurableOverlays,
  expectDurableSaveSummary,
  expectMutationSaved,
  freshRuntimeReload,
  handlePressConference,
  installTutorialDismissal,
  readIndexedDbSaveIntegrityPair,
  runGlobalSimulation,
  waitForAppReady,
  type IndexedDbSaveIntegrityPair,
} from './helpers/dynasty';

const SAVE_ID = 'save-slot-1';
const WEB_LOCK_PROBE_KEY = '__mbdWebLockRequestProbe';

interface WebLockRequestProbe {
  attempts: number;
  holdNext: boolean;
  release: (() => void) | null;
}

async function installWebLockRequestProbe(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const probeKey = '__mbdWebLockRequestProbe';
    const lockManager = navigator.locks;
    if (!lockManager) return;

    const probe: WebLockRequestProbe = {
      attempts: 0,
      holdNext: false,
      release: null,
    };
    Object.defineProperty(window, probeKey, {
      configurable: true,
      value: probe,
    });

    // This test harness delays one request but always delegates to the native
    // Web Locks implementation; it never grants, denies, or replaces a lock.
    const nativeRequest = lockManager.request.bind(lockManager) as (
      ...args: unknown[]
    ) => Promise<unknown>;
    Object.defineProperty(lockManager, 'request', {
      configurable: true,
      value: async (...args: unknown[]) => {
        probe.attempts += 1;
        if (probe.holdNext) {
          probe.holdNext = false;
          await new Promise<void>((resolve) => {
            probe.release = resolve;
          });
          probe.release = null;
        }
        return nativeRequest(...args);
      },
    });
  });
}

async function retryWhileOccupied(
  page: Page,
  expectedPair: IndexedDbSaveIntegrityPair,
): Promise<void> {
  const checkAgain = page
    .getByRole('alertdialog', { name: 'Dynasty already open' })
    .getByRole('button');
  const attemptsBefore = await page.evaluate((probeKey) => {
    const probe = (window as unknown as Record<string, unknown>)[probeKey] as WebLockRequestProbe | undefined;
    if (!probe) throw new Error('The test Web Locks request probe was not installed.');
    return probe.attempts;
  }, WEB_LOCK_PROBE_KEY);
  await page.evaluate((probeKey) => {
    const probe = (window as unknown as Record<string, unknown>)[probeKey] as WebLockRequestProbe | undefined;
    if (!probe) throw new Error('The test Web Locks request probe was not installed.');
    if (probe.release || probe.holdNext) {
      throw new Error('A previous Web Locks request is still held by the test probe.');
    }
    probe.holdNext = true;
  }, WEB_LOCK_PROBE_KEY);

  const click = checkAgain.click();
  await expect.poll(
    () => page.evaluate((probeKey) => {
      const probe = (window as unknown as Record<string, unknown>)[probeKey] as WebLockRequestProbe | undefined;
      if (!probe) throw new Error('The test Web Locks request probe was not installed.');
      return probe.attempts;
    }, WEB_LOCK_PROBE_KEY),
    { message: 'Check again must start a fresh native Web Locks request.' },
  ).toBeGreaterThan(attemptsBefore);
  await expect(checkAgain).toBeDisabled();
  await expect(checkAgain).toHaveAttribute('aria-busy', 'true');
  await expect(checkAgain).toHaveText('Checking…');
  await expect(page.getByRole('status')).toHaveText('Checking for exclusive access…');

  await page.evaluate((probeKey) => {
    const probe = (window as unknown as Record<string, unknown>)[probeKey] as WebLockRequestProbe | undefined;
    if (!probe) throw new Error('The test Web Locks request probe was not installed.');
    if (!probe.release) {
      throw new Error('The test Web Locks request did not enter its held lifecycle.');
    }
    probe.release();
  }, WEB_LOCK_PROBE_KEY);
  await click;

  await expect(checkAgain).toBeEnabled();
  await expect(checkAgain).toHaveAttribute('aria-busy', 'false');
  await expect(checkAgain).toHaveText('Check again');
  await expect(page.getByRole('alertdialog', { name: 'Dynasty already open' }))
    .toHaveAttribute('data-failure-kind', 'contended');
  await expectIntegrityPair(page, expectedPair);
}

async function seasonHeaderText(page: Page): Promise<string> {
  const heading = page.locator('header').getByText(/^Season \d+ — /).first();
  await expect(heading).toBeVisible();
  return (await heading.innerText()).trim().replace(/\/162$/, '');
}

async function expectIntegrityPair(
  page: Page,
  expected: IndexedDbSaveIntegrityPair,
): Promise<void> {
  await expect.poll(
    () => readIndexedDbSaveIntegrityPair(page, SAVE_ID),
    { message: 'the blocked tab must not change either durable integrity row' },
  ).toEqual(expected);
}

async function waitForIntegrityChange(
  page: Page,
  before: IndexedDbSaveIntegrityPair,
): Promise<IndexedDbSaveIntegrityPair> {
  let observed = await readIndexedDbSaveIntegrityPair(page, SAVE_ID);
  await expect.poll(async () => {
    observed = await readIndexedDbSaveIntegrityPair(page, SAVE_ID);
    return observed.primaryChecksum;
  }, {
    message: 'the accepted public mutation should produce a new durable save generation',
    timeout: 60_000,
  }).not.toBe(before.primaryChecksum);

  expect(observed.primaryChecksum).toBe(observed.backupChecksum);
  expect(observed.primaryUpdatedAt).toBe(observed.backupUpdatedAt);
  return observed;
}

test('a duplicate tab stays blocked until the owner closes, then reloads the latest durable save', async ({
  context,
  page: owner,
}) => {
  test.setTimeout(6 * 60_000);
  await installTutorialDismissal(owner);

  await test.step('create and durably save a dynasty through public setup', async () => {
    await owner.goto('./', { waitUntil: 'domcontentloaded' });
    await expect(
      owner.getByRole('heading', { name: 'Mr. Baseball Dynasty', exact: true }),
    ).toBeVisible();
    await owner.getByRole('button', { name: 'New Dynasty', exact: true }).click();
    await owner.getByRole('button', { name: /^Challenge Scenario/ }).click();
    await owner.getByRole('button', { name: /^Trade Shark\b/ }).click();
    await owner.getByLabel('GM Name').fill('Multi-Tab Guard GM');

    const launch = owner.locator('[data-mobile-critical-control="setup-wizard-submit"]');
    await expect(launch).toHaveText('Launch Scenario');
    await expect(launch).toBeEnabled({ timeout: 60_000 });
    await launch.click();

    await expect(owner).toHaveURL(/\/MBD\/dashboard$/);
    await waitForAppReady(owner);
    await drainDurableOverlays(owner);
    await dismissGuidedStartNudges(owner);
    await expectDurableSaveSummary(owner);
  });

  const initialPair = await readIndexedDbSaveIntegrityPair(owner, SAVE_ID);
  expect(initialPair.primaryChecksum).toBe(initialPair.backupChecksum);
  expect(initialPair.primaryUpdatedAt).toBe(initialPair.backupUpdatedAt);

  await installWebLockRequestProbe(context);

  const duplicate = await test.step('open the same active target in a second real document', async () => {
    const duplicatePagePromise = context.waitForEvent('page');
    await owner.evaluate(() => {
      const opened = window.open(window.location.href, '_blank');
      if (!opened) {
        throw new Error('The browser did not create the duplicate MBD tab.');
      }
    });
    const duplicatePage = await duplicatePagePromise;
    await duplicatePage.waitForLoadState('domcontentloaded');
    return duplicatePage;
  });

  await test.step('block before gameplay and expose a non-dismissible accessible conflict', async () => {
    const conflict = duplicate.getByRole('alertdialog', { name: 'Dynasty already open' });
    await expect(conflict).toBeVisible({ timeout: 60_000 });
    await expect(conflict).toHaveAttribute('data-failure-kind', 'contended');
    await expect(conflict).toContainText('stopped before gameplay loaded');
    await expect(conflict).toContainText('Leaving the owner in the background does not release');
    await expect(duplicate.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
    await expect(duplicate.locator('footer[data-tour="sim-controls"]')).toHaveCount(0);
    await expect(duplicate.getByTestId('save-persistence-summary')).toHaveCount(0);

    const checkAgain = duplicate.getByRole('button', { name: 'Check again', exact: true });
    await expect(checkAgain).toBeFocused();
    await duplicate.keyboard.press('Tab');
    await expect(checkAgain).toBeFocused();
    await duplicate.keyboard.press('Shift+Tab');
    await expect(checkAgain).toBeFocused();
    await duplicate.keyboard.press('Escape');
    await expect(conflict).toBeVisible();
    await expect(checkAgain).toBeFocused();
    await duplicate.keyboard.press('Space');
    await expect(duplicate.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
    await expect(duplicate.locator('footer[data-tour="sim-controls"]')).toHaveCount(0);
    await expectIntegrityPair(duplicate, initialPair);

    const desktopViewport = duplicate.viewportSize();
    if (!desktopViewport) throw new Error('Desktop duplicate-tab viewport was unavailable.');
    await duplicate.setViewportSize({ width: 375, height: 667 });
    const panel = conflict.locator('[tabindex="-1"]');
    const panelBox = await panel.boundingBox();
    if (!panelBox) throw new Error('Mobile conflict-panel geometry was unavailable.');
    expect(panelBox.x).toBeGreaterThanOrEqual(0);
    expect(panelBox.y).toBeGreaterThanOrEqual(0);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(375);
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(667);
    await checkAgain.click({ trial: true });
    await test.info().attach('multi-tab-conflict-mobile.png', {
      body: await duplicate.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });
    await duplicate.setViewportSize(desktopViewport);

    await retryWhileOccupied(duplicate, initialPair);
  });

  let ownerPair = initialPair;
  let ownerSeasonHeader = '';
  await test.step('retain ownership while hidden, then allow only the owner to mutate and save', async () => {
    const ownerSession = await owner.context().newCDPSession(owner);
    await duplicate.bringToFront();
    await ownerSession.send('Page.setWebLifecycleState', { state: 'frozen' });
    await retryWhileOccupied(duplicate, initialPair);

    await ownerSession.send('Page.setWebLifecycleState', { state: 'active' });
    await ownerSession.detach();
    await owner.bringToFront();
    await runGlobalSimulation(owner, 'Sim Day (Space)');
    await drainDurableOverlays(owner);
    await expectMutationSaved(owner);
    ownerPair = await waitForIntegrityChange(owner, initialPair);
    ownerSeasonHeader = await seasonHeaderText(owner);

    await duplicate.bringToFront();
    const conflict = duplicate.getByRole('alertdialog', { name: 'Dynasty already open' });
    await expect(conflict).toBeVisible();
    await retryWhileOccupied(duplicate, ownerPair);
  });

  await test.step('take over only after close and freshly import the owner\u2019s latest save', async () => {
    await owner.close();
    const conflict = duplicate.getByRole('alertdialog', { name: 'Dynasty already open' });
    await duplicate.getByRole('button', { name: 'Check again', exact: true }).click();
    await expect(conflict).toBeHidden({ timeout: 60_000 });
    await waitForAppReady(duplicate);
    await expect(seasonHeaderText(duplicate)).resolves.toBe(ownerSeasonHeader);
    await expect(duplicate.getByTestId('save-persistence-status')).toHaveCount(0);
    await expectIntegrityPair(duplicate, ownerPair);
  });

  await test.step('persist a public successor mutation and survive its hard reload', async () => {
    await expect(duplicate.getByRole('dialog', { name: 'Press Conference' })).toBeVisible();
    await handlePressConference(duplicate, 'skip');
    await runGlobalSimulation(duplicate, 'Sim Day (Space)');
    await drainDurableOverlays(duplicate);
    await expectMutationSaved(duplicate);
    const successorPair = await waitForIntegrityChange(duplicate, ownerPair);
    const successorSeasonHeader = await seasonHeaderText(duplicate);

    await freshRuntimeReload(duplicate);
    await expect(
      duplicate.getByRole('alertdialog', { name: 'Dynasty already open' }),
    ).toHaveCount(0);
    await expect(seasonHeaderText(duplicate)).resolves.toBe(successorSeasonHeader);
    await expectIntegrityPair(duplicate, successorPair);
  });
});
