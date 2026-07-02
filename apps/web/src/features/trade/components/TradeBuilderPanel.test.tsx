import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TradeBuilderPanel from './TradeBuilderPanel';
import type { DraftPickAsset } from './TradeAssetSelectionGrid';
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

describe('TradeBuilderPanel', () => {
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

  it('composes the builder sections and preserves route-owned callback delegation', async () => {
    const yourPick: DraftPickAsset = { type: 'draft_pick', season: 4, round: 1, originalTeamId: 'nym' };
    const targetPick: DraftPickAsset = { type: 'draft_pick', season: 5, round: 2, originalTeamId: 'bos' };
    const onOpenMultiTeamBuilder = vi.fn();
    const onSelectTeam = vi.fn();
    const onToggleOfferingPlayer = vi.fn();
    const onToggleRequestingPlayer = vi.fn();
    const onSubmit = vi.fn();
    const onClear = vi.fn();

    await act(async () => {
      root.render(
        <TradeBuilderPanel
          activeNegotiation={null}
          assetGridProps={{
            disabledReason: '',
            filteredTargetRoster: [
              player({
                id: 'bos-1',
                firstName: 'Roman',
                lastName: 'Anthony',
                position: 'CF',
                teamId: 'bos',
                displayRating: 76,
                letterGrade: 'A',
              }),
            ],
            filteredYourRoster: [
              player({
                id: 'nym-1',
                firstName: 'Anthony',
                lastName: 'Volpe',
                position: 'SS',
                displayRating: 72,
              }),
            ],
            offering: ['nym-1'],
            offeringIFAAmount: '',
            offeringPicks: [yourPick],
            onChangeOfferingFilter: vi.fn(),
            onChangeOfferingIFAAmount: vi.fn(),
            onChangeRequestingFilter: vi.fn(),
            onChangeRequestingIFAAmount: vi.fn(),
            onToggleOfferingPick: vi.fn(),
            onToggleOfferingPlayer,
            onToggleRequestingPick: vi.fn(),
            onToggleRequestingPlayer,
            requesting: ['bos-1'],
            requestingIFAAmount: '',
            requestingPicks: [targetPick],
            selectedTeam: 'bos',
            targetAssetFilter: 'all',
            targetInventory: inventory(targetPick, 3),
            targetRosterCount: 1,
            tradeMarketOpen: true,
            yourAssetFilter: 'all',
            yourInventory: inventory(yourPick),
            yourRosterCount: 1,
          }}
          contextProps={{
            activeCounterOfferId: null,
            disabledReason: '',
            gmDialogue: {
              mode: 'buyer',
              urgency: 'medium',
              headline: 'Boston wants controllable impact.',
              lines: ['We can work if the package keeps our window intact.'],
            },
            onOpenMultiTeamBuilder,
            onSelectTeam,
            otherTeams: [{ id: 'bos', name: 'Boston Noreasters', abbr: 'BOS' }],
            relationshipsByTeamId: new Map(),
            selectedRelationship: null,
            selectedTeam: 'bos',
            tradeMarketOpen: true,
          }}
          negotiationProps={{
            dialogueMode: 'buyer',
            onAccept: vi.fn(),
            onCounter: vi.fn(),
            onReject: vi.fn(),
            playerById: (playerId) => (playerId === 'nym-1'
              ? player({ id: 'nym-1', firstName: 'Anthony', lastName: 'Volpe', position: 'SS' })
              : undefined),
            proposing: false,
          }}
          packageEvaluationProps={{
            activeCounterOfferId: null,
            activeNegotiation: false,
            disabledReason: '',
            fairnessRatio: 0.5,
            hasOfferingAssets: true,
            hasRequestingAssets: true,
            offerTotal: 48,
            offeringSummary: [{ key: 'player:nym-1', label: 'Anthony Volpe · SS' }],
            onClear,
            onSubmit,
            packageFairness: { text: 'Fair trade', color: 'text-accent-success' },
            proposing: false,
            requestTotal: 50,
            requestingSummary: [{ key: 'player:bos-1', label: 'Roman Anthony · CF' }],
            selectedTeam: 'bos',
            tradeMarketOpen: true,
          }}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Trade Builder');
    expect(container.textContent).toContain('Negotiation Flow');
    expect(container.textContent).toContain('Your Assets');
    expect(container.textContent).toContain('Target Roster');
    expect(container.textContent).toContain('Package Evaluation');
    expect(container.textContent).toContain('Anthony Volpe · SS');
    expect(container.textContent).toContain('Roman Anthony · CF');

    await act(async () => {
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('3+ Team Trade')) as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('BOS')) as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('tbody tr')).find((row) => row.textContent?.includes('Anthony Volpe')) as HTMLTableRowElement).click();
      (Array.from(container.querySelectorAll('tbody tr')).find((row) => row.textContent?.includes('Roman Anthony')) as HTMLTableRowElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Start Negotiation')) as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Clear')) as HTMLButtonElement).click();
    });

    expect(onOpenMultiTeamBuilder).toHaveBeenCalledOnce();
    expect(onSelectTeam).toHaveBeenCalledWith('bos');
    expect(onToggleOfferingPlayer).toHaveBeenCalledWith('nym-1');
    expect(onToggleRequestingPlayer).toHaveBeenCalledWith('bos-1');
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onClear).toHaveBeenCalledOnce();
  });
});
