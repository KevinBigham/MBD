import { expect, test, type Page } from '@playwright/test';
import {
  appMain,
  dismissGuidedStartNudges,
  drainDurableOverlays,
  expectDurableSaveSummary,
  escapeRegExp,
  expectFreshMutationRuntime,
  expectMutationSaved,
  freshRuntimeReload,
  handlePressConference,
  installTutorialDismissal,
  navigateFromSidebar,
  normalizeVisibleLabel,
  runGlobalSimulation,
  saveSummary,
  saveStatus,
  waitForAppReady,
} from './helpers/dynasty';

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
  test.setTimeout(8 * 60_000);
  await installTutorialDismissal(page);
  await page.clock.setFixedTime(new Date('2026-04-01T12:00:00.000Z'));

  let developmentPlayer = '';
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
    await apply.click();

    const result = appMain(page).getByText(
      new RegExp(`^${escapeRegExp(developmentPlayer)}: (.+) plan applied\\.$`),
    );
    await expect(result).toBeVisible();
    const resultText = (await result.innerText()).trim();
    const match = resultText.match(
      new RegExp(`^${escapeRegExp(developmentPlayer)}: (.+) plan applied\\.$`),
    );
    expect(match?.[1]).toBeTruthy();
    developmentProgram = match?.[1] ?? '';
    expect(normalizeVisibleLabel(developmentProgram)).not.toBe(
      normalizeVisibleLabel(selection.beforeProgram),
    );
    if (selection.candidate.expectedProgram) {
      expect(normalizeVisibleLabel(developmentProgram)).toBe(
        normalizeVisibleLabel(selection.candidate.expectedProgram),
      );
    }
    await expectMutationSaved(page);

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

    await freshRuntimeReload(page, { press: 'skip' });
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
