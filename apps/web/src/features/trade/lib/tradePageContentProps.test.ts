import { describe, expect, it, vi } from 'vitest';
import type { TradeCondition } from '@mbd/contracts';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type {
  MultiTeamFairnessView,
  TradeDeadlineStateView,
  TradeHistoryView,
  TradeNegotiationView,
  TradeOfferView,
} from '@/workers/sim.worker.trade';
import type { RelationshipView } from '../components/TradeBuilderContextPanel';
import type { MultiTeamLaneState } from '../components/MultiTeamLaneCard';
import type { TradeAssetFilter } from '../components/TradeAssetSelectionGrid';
import type { TradeResultView } from '../components/TradeResultBanner';
import { buildTradePageContentProps, type BuildTradePageContentPropsInput } from './tradePageContentProps';

function player(id: string, teamId = 'nym'): PlayerDTO {
  return {
    id,
    firstName: 'Test',
    lastName: id.toUpperCase(),
    age: 24,
    position: 'SS',
    overallRating: 70,
    displayRating: 70,
    letterGrade: 'B',
    rosterStatus: 'MLB',
    teamId,
    stats: null,
  } as unknown as PlayerDTO;
}

function baseInput(overrides: Partial<BuildTradePageContentPropsInput> = {}): BuildTradePageContentPropsInput {
  const lanes: MultiTeamLaneState[] = [
    { laneId: 'lane-1', teamId: 'nym', role: 'initiator', outgoing: [] },
    { laneId: 'lane-2', teamId: 'bos', role: 'partner', outgoing: [] },
    { laneId: 'lane-3', teamId: 'sea', role: 'facilitator', outgoing: [] },
  ];
  const condition: TradeCondition = {
    type: 'performance',
    playerId: 'moved-player',
    threshold: 2,
    deadline: 120,
    description: 'moved-player reaches 2 WAR',
  };

  return {
    activeCounterOfferId: null,
    activeNegotiation: null,
    conditionPlayerId: 'moved-player',
    conditionTargets: [{ playerId: 'moved-player', label: 'Moved Player' }],
    conditions: [condition],
    deadlineDramaSlot: 'Deadline slot',
    deadlineState: null,
    executionResult: null,
    fairness: { score: 51, label: 'Balanced', tone: 'success', netValues: [] } as unknown as MultiTeamFairnessView,
    filteredTargetRoster: [player('target-player', 'bos')],
    filteredYourRoster: [player('your-player')],
    gmDialogue: null,
    handleAcceptOffer: vi.fn(),
    handleAddConditionalClause: vi.fn(),
    handleCounterOffer: vi.fn(),
    handleDeclineOffer: vi.fn(),
    handleExecuteMultiTeamFramework: vi.fn(),
    handleEvaluateMultiTeamFramework: vi.fn(),
    handleProposeMultiTeamFramework: vi.fn(),
    handleResolveNegotiation: vi.fn(),
    incomingOffers: [],
    marketCopy: {
      detail: 'Phones are hot.',
      disabledReason: '',
      headline: '4 days until deadline',
    },
    multiTeamLanes: lanes,
    multiTeamMessage: 'Room read complete.',
    multiTeamMovedPlayers: [{ playerId: 'moved-player', label: 'Moved Player' }],
    multiTeamOpen: false,
    multiTeamProposalResult: null,
    multiTeamProposalTeams: [],
    multiTeamRosters: { nym: [player('your-player')], bos: [player('target-player', 'bos')] },
    multiTeamSubmitting: false,
    offerTotal: 25,
    offering: ['your-player'],
    offeringAssetCount: 1,
    offeringIFAAmount: '',
    offeringPicks: [],
    offeringSummary: [{ key: 'player:your-player', label: 'Test YOUR-PLAYER' }],
    onAddMultiTeamLane: vi.fn(),
    onChangeLaneDestination: vi.fn(),
    onChangeLaneTeam: vi.fn(),
    onChangeOfferingFilter: vi.fn(),
    onChangeOfferingIFAAmount: vi.fn(),
    onChangeRequestingFilter: vi.fn(),
    onChangeRequestingIFAAmount: vi.fn(),
    onChangeConditionPlayer: vi.fn(),
    onClearTrade: vi.fn(),
    onCloseMultiTeamBuilder: vi.fn(),
    onCounterNegotiation: vi.fn(),
    onRemoveMultiTeamLane: vi.fn(),
    onSelectTeam: vi.fn(),
    onSubmitTrade: vi.fn(),
    onToggleLanePlayer: vi.fn(),
    onToggleOfferingPick: vi.fn(),
    onToggleOfferingPlayer: vi.fn(),
    onToggleRequestingPick: vi.fn(),
    onToggleRequestingPlayer: vi.fn(),
    openMultiTeamBuilder: vi.fn(),
    openNegotiations: [],
    openNegotiationsLoading: false,
    otherTeams: [{ id: 'bos', name: 'Boston Noreasters', abbr: 'BOS' }],
    playerById: (id) => player(id),
    proposing: false,
    quickStartProps: {
      disabledReason: '',
      filteredTargetRoster: [player('target-player', 'bos')],
      filteredYourRoster: [player('your-player')],
      mode: 'quick',
      offerTotal: 25,
      offering: ['your-player'],
      offeringSummary: [{ key: 'player:your-player', label: 'Test YOUR-PLAYER' }],
      onSelectTeam: vi.fn(),
      onSubmitTrade: vi.fn(),
      onToggleOfferingPlayer: vi.fn(),
      onToggleRequestingPlayer: vi.fn(),
      otherTeams: [{ id: 'bos', name: 'Boston Noreasters', abbr: 'BOS' }],
      packageFairness: { text: 'Balanced', color: 'text-accent-success' },
      preselectedPlayerId: null,
      proposing: false,
      requestTotal: 25,
      requesting: ['target-player'],
      requestingSummary: [{ key: 'player:target-player', label: 'Test TARGET-PLAYER' }],
      selectedTeam: 'bos',
      tradeMarketOpen: true,
    },
    relationshipsByTeamId: new Map<string, RelationshipView>(),
    requestTotal: 25,
    requesting: ['target-player'],
    requestingAssetCount: 1,
    requestingIFAAmount: '',
    requestingPicks: [],
    requestingSummary: [{ key: 'player:target-player', label: 'Test TARGET-PLAYER' }],
    resumeNegotiation: vi.fn(),
    season: 4,
    selectedRelationship: null,
    selectedTeam: 'bos',
    targetAssetFilter: 'all' as TradeAssetFilter,
    targetInventory: { draftPicks: [], ifaRemaining: 0 },
    targetRosterCount: 1,
    tradeHistory: [] as TradeHistoryView[],
    tradeMarketOpen: true,
    tradeResult: { status: 'counter', message: 'Counter ready.' } as TradeResultView,
    yourAssetFilter: 'all' as TradeAssetFilter,
    yourInventory: { draftPicks: [], ifaRemaining: 0 },
    yourRosterCount: 1,
    ...overrides,
  };
}

describe('buildTradePageContentProps', () => {
  it('builds pure route content props and wraps route-owned async offer actions', () => {
    const deadlineState = {
      ticker: [{ id: 'tick-1', message: 'Boston is taking calls.' }],
    } as unknown as TradeDeadlineStateView;
    const handleAcceptOffer = vi.fn().mockResolvedValue(undefined);
    const handleDeclineOffer = vi.fn().mockResolvedValue(undefined);
    const input = baseInput({ deadlineState, handleAcceptOffer, handleDeclineOffer });

    const props = buildTradePageContentProps(input);

    expect(props.deadlineDashboardProps).toEqual({
      deadlineState,
      detail: 'Phones are hot.',
      headline: '4 days until deadline',
      tradeMarketOpen: true,
    });
    expect(props.deadlineDramaSlot).toBe('Deadline slot');
    expect(props.activityColumnProps.ticker).toEqual(deadlineState.ticker);
    expect(props.activityColumnProps.activeNegotiationId).toBeNull();
    expect(props.builderStackProps.result).toEqual({ status: 'counter', message: 'Counter ready.' });
    expect(props.builderStackProps.multiTeamModalProps).toBeNull();

    props.activityColumnProps.onAcceptOffer('offer-1');
    props.activityColumnProps.onDeclineOffer('offer-2');

    expect(handleAcceptOffer).toHaveBeenCalledWith('offer-1');
    expect(handleDeclineOffer).toHaveBeenCalledWith('offer-2');
  });

  it('includes builder and multi-team modal props only when the route modal is open', () => {
    const handleResolveNegotiation = vi.fn().mockResolvedValue(undefined);
    const handleEvaluateMultiTeamFramework = vi.fn().mockResolvedValue(undefined);
    const handleExecuteMultiTeamFramework = vi.fn().mockResolvedValue(undefined);
    const handleProposeMultiTeamFramework = vi.fn().mockResolvedValue(undefined);
    const onSubmitTrade = vi.fn().mockResolvedValue(undefined);
    const input = baseInput({
      activeCounterOfferId: 'offer-9',
      handleEvaluateMultiTeamFramework,
      handleExecuteMultiTeamFramework,
      handleProposeMultiTeamFramework,
      handleResolveNegotiation,
      multiTeamOpen: true,
      onSubmitTrade,
    });

    const props = buildTradePageContentProps(input);

    expect(props.builderStackProps.builderProps.contextProps).toMatchObject({
      activeCounterOfferId: 'offer-9',
      disabledReason: '',
      selectedTeam: 'bos',
      tradeMarketOpen: true,
    });
    expect(props.builderStackProps.builderProps.packageEvaluationProps).toMatchObject({
      activeCounterOfferId: 'offer-9',
      fairnessRatio: 0.5,
      hasOfferingAssets: true,
      hasRequestingAssets: true,
      selectedTeam: 'bos',
    });
    expect(props.builderStackProps.multiTeamModalProps).toMatchObject({
      conditionPlayerId: 'moved-player',
      disabled: false,
      lanes: input.multiTeamLanes,
      message: 'Room read complete.',
      rosters: input.multiTeamRosters,
    });
    expect(props.builderStackProps.multiTeamModalProps?.teamOptions[0]?.label).toContain(' - ');

    props.builderStackProps.builderProps.negotiationProps.onAccept();
    props.builderStackProps.builderProps.packageEvaluationProps.onSubmit();
    props.builderStackProps.multiTeamModalProps?.onEvaluate();
    props.builderStackProps.multiTeamModalProps?.onPropose();
    props.builderStackProps.multiTeamModalProps?.onExecute();

    expect(handleResolveNegotiation).toHaveBeenCalledWith('accept');
    expect(onSubmitTrade).toHaveBeenCalledTimes(1);
    expect(handleEvaluateMultiTeamFramework).toHaveBeenCalledTimes(1);
    expect(handleProposeMultiTeamFramework).toHaveBeenCalledTimes(1);
    expect(handleExecuteMultiTeamFramework).toHaveBeenCalledTimes(1);
  });
});
