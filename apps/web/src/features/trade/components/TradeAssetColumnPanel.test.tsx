import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TradeAssetColumnPanel from './TradeAssetColumnPanel';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { TradeAssetInventoryView } from '@/workers/sim.worker.trade';
import type { DraftPickAsset } from './TradeAssetSelectionGrid';

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

describe('TradeAssetColumnPanel', () => {
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

  async function renderPanel(props: Partial<Parameters<typeof TradeAssetColumnPanel>[0]> = {}) {
    const pick: DraftPickAsset = { type: 'draft_pick', season: 4, round: 1, originalTeamId: 'nym' };
    const draftPicks: TradeAssetInventoryView['draftPicks'] = [
      {
        key: 'draft:4:1:nym',
        label: 'R1 4',
        detail: 'NYM original',
        asset: pick,
      },
    ];

    const defaultProps: Parameters<typeof TradeAssetColumnPanel>[0] = {
      accentClassName: 'border-accent-primary bg-accent-primary/15 text-accent-primary',
      draftPicks,
      emptyDraftPickMessage: 'No current or next-year picks available.',
      filter: 'selected',
      filteredRoster: [
        player({
          id: 'nym-1',
          firstName: 'Anthony',
          lastName: 'Volpe',
          position: 'SS',
          displayRating: 72,
          letterGrade: 'B',
        }),
      ],
      ifaAmount: '0.5',
      ifaDisabled: false,
      ifaInputName: 'offering-ifa-pool',
      ifaRemaining: 2.5,
      ifaTitle: 'Offer international pool space',
      onChangeFilter: vi.fn(),
      onChangeIFAAmount: vi.fn(),
      onTogglePick: vi.fn(),
      onTogglePlayer: vi.fn(),
      rosterCount: 3,
      selectedPickAssets: [pick],
      selectedPlayerIds: ['nym-1'],
      title: 'Your Assets',
      tradeMarketOpen: true,
    };

    const mergedProps = { ...defaultProps, ...props };

    await act(async () => {
      root.render(<TradeAssetColumnPanel {...mergedProps} />);
    });

    return mergedProps;
  }

  it('renders roster rows, selected count, draft picks, and IFA pool controls', async () => {
    const props = await renderPanel();

    expect(container.textContent).toContain('Your Assets');
    expect(container.textContent).toContain('1/3');
    expect(container.textContent).toContain('Selected · 1');
    expect(container.textContent).toContain('Anthony Volpe');
    expect(container.textContent).toContain('R1 4 · NYM original');
    expect(container.textContent).toContain('Remaining $2.50M');

    await act(async () => {
      container.querySelector('tbody tr')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('R1 4')) as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Prospects') as HTMLButtonElement).click();
    });

    const ifaInput = container.querySelector('input[name="offering-ifa-pool"]') as HTMLInputElement;
    await act(async () => {
      ifaInput.value = '1.5';
      ifaInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(props.onTogglePlayer).toHaveBeenCalledWith('nym-1');
    expect(props.onTogglePick).toHaveBeenCalledWith(props.selectedPickAssets[0]);
    expect(props.onChangeFilter).toHaveBeenCalledWith('prospects');
    expect(props.onChangeIFAAmount).toHaveBeenCalledWith('1.5');
  });

  it('blocks player and draft-pick selection when the trade market is closed', async () => {
    const onTogglePlayer = vi.fn();
    const onTogglePick = vi.fn();

    await renderPanel({
      ifaDisabled: true,
      ifaTitle: 'Formal offers unlock on Opening Day.',
      onTogglePick,
      onTogglePlayer,
      tradeMarketOpen: false,
    });

    const pickButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('R1 4')) as HTMLButtonElement;
    const ifaInput = container.querySelector('input[name="offering-ifa-pool"]') as HTMLInputElement;

    expect(pickButton.disabled).toBe(true);
    expect(pickButton.title).toBe('Formal offers unlock on Opening Day.');
    expect(ifaInput.disabled).toBe(true);
    expect(ifaInput.title).toBe('Formal offers unlock on Opening Day.');

    await act(async () => {
      container.querySelector('tbody tr')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      pickButton.click();
    });

    expect(onTogglePlayer).not.toHaveBeenCalled();
    expect(onTogglePick).not.toHaveBeenCalled();
  });

  it('renders keyboard-labelled salary support controls with gross, cap, and option boundary', async () => {
    const selected = player({
      id: 'nym-retained',
      firstName: 'Trade',
      lastName: 'Target',
      position: 'SP',
      contract: {
        years: 3,
        annualSalary: 24,
        totalValue: 72,
        noTradeClause: false,
        noTradeClauseType: 'none',
        playerOption: false,
        teamOption: true,
        optOutYears: [],
        signingBonus: 0,
        buyoutAmount: 0,
        deferredMoney: [],
      },
    });
    const onChangeFinancialTerm = vi.fn();

    await renderPanel({
      filteredRoster: [selected],
      selectedPlayerIds: [selected.id],
      selectedPlayers: [selected],
      financialTermsByPlayerId: {
        [selected.id]: { retainedSalary: '3', cashConsideration: '2' },
      },
      playerFinancials: {
        [selected.id]: {
          playerId: selected.id,
          grossAnnualSalary: 24,
          guaranteedEndSeasonExclusive: 6,
          contractEndSeasonExclusive: 7,
          optionSeason: 6,
          existingRetainedSalary: 4,
          existingCashConsideration: 1,
          remainingRetentionHeadroom: 8,
          remainingCurrentSupportHeadroom: 7,
          currentPayerOffsets: [{
            teamId: 'bos',
            retainedSalary: 4,
            cashConsideration: 1,
            total: 5,
          }],
          guaranteedFutureSeason: 5,
          guaranteedFuturePayerOffsets: [{
            teamId: 'bos',
            retainedSalary: 4,
            cashConsideration: 0,
            total: 4,
          }],
        },
      },
      onChangeFinancialTerm,
    });

    expect(container.textContent).toContain('Salary Support');
    expect(container.textContent).toContain('$24.00M gross · 3 years · $8.00M retention headroom · $7.00M current combined headroom');
    expect(container.textContent).toContain('Prior support: $4.00M retained + $1.00M current cash.');
    expect(container.textContent).toContain('option season 6; that option year remains uncovered');
    expect(container.textContent).toContain('Retain per year (2 guaranteed)');
    const retained = container.querySelector('input[aria-label="Retained salary for Trade Target"]') as HTMLInputElement;
    const cash = container.querySelector('input[aria-label="Cash consideration for Trade Target"]') as HTMLInputElement;
    expect(retained.value).toBe('3');
    expect(cash.value).toBe('2');
    expect(retained.max).toBe('5.00');

    await act(async () => {
      retained.value = '4';
      retained.dispatchEvent(new Event('input', { bubbles: true }));
      cash.value = '2.5';
      cash.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(onChangeFinancialTerm).toHaveBeenCalledWith(selected.id, 'retainedSalary', '4');
    expect(onChangeFinancialTerm).toHaveBeenCalledWith(selected.id, 'cashConsideration', '2.5');
  });
});
