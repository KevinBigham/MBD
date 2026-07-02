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
});
