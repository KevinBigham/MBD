import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TradeAssetSelectionGrid, { type DraftPickAsset } from './TradeAssetSelectionGrid';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { TradeAssetInventoryView } from '@/workers/sim.worker.trade';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function player(overrides: Partial<PlayerDTO> & Pick<PlayerDTO, 'id' | 'firstName' | 'lastName' | 'position'>): PlayerDTO {
  return {
    id: overrides.id,
    firstName: overrides.firstName,
    lastName: overrides.lastName,
    age: overrides.age ?? 24,
    position: overrides.position,
    overallRating: overrides.overallRating ?? 70,
    displayRating: overrides.displayRating ?? 70,
    letterGrade: overrides.letterGrade ?? 'B',
    rosterStatus: overrides.rosterStatus ?? 'MLB',
    teamId: overrides.teamId ?? 'nym',
    serviceTimeDays: overrides.serviceTimeDays ?? 365,
    optionYearsUsed: overrides.optionYearsUsed ?? 0,
    isOutOfOptions: overrides.isOutOfOptions ?? false,
    minorLeagueLevel: overrides.minorLeagueLevel ?? null,
    contract: overrides.contract ?? {
      years: 1,
      annualSalary: 1,
      totalValue: 1,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    ceiling: overrides.ceiling ?? 80,
    floor: overrides.floor ?? 55,
    developmentProgram: overrides.developmentProgram ?? null,
    developmentTrajectory: overrides.developmentTrajectory ?? 'stable',
    personalityTraits: overrides.personalityTraits,
    extensionHistory: overrides.extensionHistory ?? [],
    stats: overrides.stats ?? null,
    advanced: overrides.advanced ?? null,
    historical: overrides.historical,
    historicalSummary: overrides.historicalSummary,
  };
}

function inventory(asset: DraftPickAsset, ifaRemaining = 2.5): TradeAssetInventoryView {
  return {
    draftPicks: [
      {
        key: `draft:${asset.season}:${asset.round}:${asset.originalTeamId}`,
        label: `R${asset.round} ${asset.season}`,
        detail: `${asset.originalTeamId.toUpperCase()} original`,
        asset,
      },
    ],
    ifaRemaining,
  };
}

describe('TradeAssetSelectionGrid', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders both asset columns and routes player, pick, filter, and IFA changes', async () => {
    const yourPick: DraftPickAsset = { type: 'draft_pick', season: 4, round: 1, originalTeamId: 'nym' };
    const targetPick: DraftPickAsset = { type: 'draft_pick', season: 5, round: 2, originalTeamId: 'bos' };
    const onToggleOfferingPlayer = vi.fn();
    const onToggleRequestingPlayer = vi.fn();
    const onToggleOfferingPick = vi.fn();
    const onToggleRequestingPick = vi.fn();
    const onChangeOfferingFilter = vi.fn();
    const onChangeRequestingFilter = vi.fn();
    const onChangeOfferingIFAAmount = vi.fn();
    const onChangeRequestingIFAAmount = vi.fn();

    await act(async () => {
      root.render(
        <TradeAssetSelectionGrid
          disabledReason="The trade market is closed."
          filteredTargetRoster={[
            player({
              id: 'bos-1',
              firstName: 'Roman',
              lastName: 'Anthony',
              position: 'CF',
              teamId: 'bos',
              displayRating: 76,
              letterGrade: 'A',
            }),
          ]}
          filteredYourRoster={[
            player({
              id: 'nym-1',
              firstName: 'Anthony',
              lastName: 'Volpe',
              position: 'SS',
              displayRating: 72,
              letterGrade: 'B',
            }),
          ]}
          offering={['nym-1']}
          offeringIFAAmount="0.5"
          offeringPicks={[yourPick]}
          onChangeOfferingFilter={onChangeOfferingFilter}
          onChangeOfferingIFAAmount={onChangeOfferingIFAAmount}
          onChangeRequestingFilter={onChangeRequestingFilter}
          onChangeRequestingIFAAmount={onChangeRequestingIFAAmount}
          onToggleOfferingPick={onToggleOfferingPick}
          onToggleOfferingPlayer={onToggleOfferingPlayer}
          onToggleRequestingPick={onToggleRequestingPick}
          onToggleRequestingPlayer={onToggleRequestingPlayer}
          requesting={[]}
          requestingIFAAmount=""
          requestingPicks={[]}
          selectedTeam="bos"
          targetAssetFilter="all"
          targetInventory={inventory(targetPick, 3)}
          targetRosterCount={4}
          tradeMarketOpen
          yourAssetFilter="selected"
          yourInventory={inventory(yourPick)}
          yourRosterCount={3}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Your Assets');
    expect(container.textContent).toContain('1/3');
    expect(container.textContent).toContain('Selected · 1');
    expect(container.textContent).toContain('Anthony Volpe');
    expect(container.textContent).toContain('R1 4 · NYM original');
    expect(container.textContent).toContain('Remaining $2.50M');
    expect(container.textContent).toContain('Target Roster');
    expect(container.textContent).toContain('1/4');
    expect(container.textContent).toContain('Roman Anthony');
    expect(container.textContent).toContain('R2 5 · BOS original');

    const rows = Array.from(container.querySelectorAll('tbody tr'));
    await act(async () => {
      rows.find((row) => row.textContent?.includes('Anthony Volpe'))?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      rows.find((row) => row.textContent?.includes('Roman Anthony'))?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('R1 4')) as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('R2 5')) as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Prospects') as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).filter((button) => button.textContent === 'Hitters')[1] as HTMLButtonElement).click();
    });

    const offeringInput = container.querySelector('input[name="offering-ifa-pool"]') as HTMLInputElement;
    const requestingInput = container.querySelector('input[name="requesting-ifa-pool"]') as HTMLInputElement;
    await act(async () => {
      offeringInput.value = '1.5';
      offeringInput.dispatchEvent(new Event('input', { bubbles: true }));
      requestingInput.value = '2.0';
      requestingInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(onToggleOfferingPlayer).toHaveBeenCalledWith('nym-1');
    expect(onToggleRequestingPlayer).toHaveBeenCalledWith('bos-1');
    expect(onToggleOfferingPick).toHaveBeenCalledWith(yourPick);
    expect(onToggleRequestingPick).toHaveBeenCalledWith(targetPick);
    expect(onChangeOfferingFilter).toHaveBeenCalledWith('prospects');
    expect(onChangeRequestingFilter).toHaveBeenCalledWith('hitters');
    expect(onChangeOfferingIFAAmount).toHaveBeenCalledWith('1.5');
    expect(onChangeRequestingIFAAmount).toHaveBeenCalledWith('2.0');
  });

  it('disables asset actions when the market is closed or no target team is selected', async () => {
    const yourPick: DraftPickAsset = { type: 'draft_pick', season: 4, round: 1, originalTeamId: 'nym' };
    const onToggleOfferingPlayer = vi.fn();
    const onToggleOfferingPick = vi.fn();

    await act(async () => {
      root.render(
        <TradeAssetSelectionGrid
          disabledReason="Formal offers unlock on Opening Day."
          filteredTargetRoster={[]}
          filteredYourRoster={[
            player({
              id: 'nym-1',
              firstName: 'Anthony',
              lastName: 'Volpe',
              position: 'SS',
            }),
          ]}
          offering={[]}
          offeringIFAAmount=""
          offeringPicks={[]}
          onChangeOfferingFilter={vi.fn()}
          onChangeOfferingIFAAmount={vi.fn()}
          onChangeRequestingFilter={vi.fn()}
          onChangeRequestingIFAAmount={vi.fn()}
          onToggleOfferingPick={onToggleOfferingPick}
          onToggleOfferingPlayer={onToggleOfferingPlayer}
          onToggleRequestingPick={vi.fn()}
          onToggleRequestingPlayer={vi.fn()}
          requesting={[]}
          requestingIFAAmount=""
          requestingPicks={[]}
          selectedTeam=""
          targetAssetFilter="all"
          targetInventory={{ draftPicks: [], ifaRemaining: 0 }}
          targetRosterCount={0}
          tradeMarketOpen={false}
          yourAssetFilter="all"
          yourInventory={inventory(yourPick)}
          yourRosterCount={1}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Select a team to inspect its pick inventory.');
    const row = Array.from(container.querySelectorAll('tbody tr')).find((candidate) => candidate.textContent?.includes('Anthony Volpe'));
    const offeringPickButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('R1 4')) as HTMLButtonElement;
    const offeringInput = container.querySelector('input[name="offering-ifa-pool"]') as HTMLInputElement;
    const requestingInput = container.querySelector('input[name="requesting-ifa-pool"]') as HTMLInputElement;

    expect(offeringPickButton.disabled).toBe(true);
    expect(offeringPickButton.title).toBe('Formal offers unlock on Opening Day.');
    expect(offeringInput.disabled).toBe(true);
    expect(offeringInput.title).toBe('Formal offers unlock on Opening Day.');
    expect(requestingInput.disabled).toBe(true);
    expect(requestingInput.title).toBe('Formal offers unlock on Opening Day.');

    await act(async () => {
      row?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      offeringPickButton.click();
    });

    expect(onToggleOfferingPlayer).not.toHaveBeenCalled();
    expect(onToggleOfferingPick).not.toHaveBeenCalled();
  });
});
