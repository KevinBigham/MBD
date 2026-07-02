import type { ComponentProps } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MultiTeamTradeModal from './MultiTeamTradeModal';
import TradeBuilderPanel from './TradeBuilderPanel';
import TradeBuilderStack from './TradeBuilderStack';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type TradeBuilderPanelProps = ComponentProps<typeof TradeBuilderPanel>;
type MultiTeamTradeModalProps = ComponentProps<typeof MultiTeamTradeModal>;

function baseBuilderProps(): TradeBuilderPanelProps {
  return {
    activeNegotiation: null,
    assetGridProps: {
      disabledReason: '',
      filteredTargetRoster: [],
      filteredYourRoster: [],
      offering: [],
      offeringIFAAmount: '',
      offeringPicks: [],
      onChangeOfferingFilter: vi.fn(),
      onChangeOfferingIFAAmount: vi.fn(),
      onChangeRequestingFilter: vi.fn(),
      onChangeRequestingIFAAmount: vi.fn(),
      onToggleOfferingPick: vi.fn(),
      onToggleOfferingPlayer: vi.fn(),
      onToggleRequestingPick: vi.fn(),
      onToggleRequestingPlayer: vi.fn(),
      requesting: [],
      requestingIFAAmount: '',
      requestingPicks: [],
      selectedTeam: '',
      targetAssetFilter: 'all',
      targetInventory: { draftPicks: [], ifaRemaining: 0 },
      targetRosterCount: 0,
      tradeMarketOpen: true,
      yourAssetFilter: 'all',
      yourInventory: { draftPicks: [], ifaRemaining: 0 },
      yourRosterCount: 0,
    },
    contextProps: {
      activeCounterOfferId: null,
      disabledReason: '',
      gmDialogue: null,
      onOpenMultiTeamBuilder: vi.fn(),
      onSelectTeam: vi.fn(),
      otherTeams: [{ id: 'bos', name: 'Boston Noreasters', abbr: 'BOS' }],
      relationshipsByTeamId: new Map(),
      selectedRelationship: null,
      selectedTeam: '',
      tradeMarketOpen: true,
    },
    negotiationProps: {
      dialogueMode: 'buyer',
      onAccept: vi.fn(),
      onCounter: vi.fn(),
      onReject: vi.fn(),
      playerById: () => undefined,
      proposing: false,
    },
    packageEvaluationProps: {
      activeCounterOfferId: null,
      activeNegotiation: false,
      disabledReason: '',
      fairnessRatio: 0.5,
      hasOfferingAssets: false,
      hasRequestingAssets: false,
      offerTotal: 0,
      offeringSummary: [],
      onClear: vi.fn(),
      onSubmit: vi.fn(),
      packageFairness: { text: 'Fair trade', color: 'text-accent-success' },
      proposing: false,
      requestTotal: 0,
      requestingSummary: [],
      selectedTeam: '',
      tradeMarketOpen: true,
    },
  };
}

function baseMultiTeamModalProps(): MultiTeamTradeModalProps {
  return {
    lanes: [
      { laneId: 'lane-1', teamId: 'nym', role: 'initiator', outgoing: [] },
      { laneId: 'lane-2', teamId: 'bos', role: 'partner', outgoing: [] },
      { laneId: 'lane-3', teamId: 'sea', role: 'facilitator', outgoing: [] },
    ],
    teamOptions: [
      { id: 'nym', label: 'NYM - New York Metros' },
      { id: 'bos', label: 'BOS - Boston Noreasters' },
      { id: 'sea', label: 'SEA - Seattle Drizzle' },
    ],
    rosters: { nym: [], bos: [], sea: [] },
    movedPlayers: [],
    proposalTeams: [],
    conditionPlayerId: '',
    conditionTargets: [],
    conditions: [],
    disabled: false,
    fairness: null,
    message: 'Room read updated.',
    proposalResult: null,
    executionResult: null,
    onAddLane: vi.fn(),
    onClose: vi.fn(),
    onRemoveLane: vi.fn(),
    onChangeLaneTeam: vi.fn(),
    onToggleLanePlayer: vi.fn(),
    onChangeLaneDestination: vi.fn(),
    onAddCondition: vi.fn(),
    onChangeConditionPlayer: vi.fn(),
    onEvaluate: vi.fn(),
    onPropose: vi.fn(),
    onExecute: vi.fn(),
    teamDisplayName: (teamId) => teamId.toUpperCase(),
  };
}

describe('TradeBuilderStack', () => {
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

  it('renders the builder without result or multi-team modal when route state is empty', async () => {
    await act(async () => {
      root.render(
        <TradeBuilderStack
          builderProps={baseBuilderProps()}
          multiTeamModalProps={null}
          result={null}
        />,
      );
    });

    expect(container.textContent).toContain('Trade Builder');
    expect(container.textContent).toContain('Package Evaluation');
    expect(container.textContent).not.toContain('Deal Completed');
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders route-provided result and multi-team modal slots', async () => {
    await act(async () => {
      root.render(
        <TradeBuilderStack
          builderProps={baseBuilderProps()}
          multiTeamModalProps={baseMultiTeamModalProps()}
          result={{ status: 'accepted', message: 'Boston accepted the framework.' }}
        />,
      );
    });

    expect(container.textContent).toContain('Deal Completed');
    expect(container.textContent).toContain('Boston accepted the framework.');
    expect(container.textContent).toContain('Room read updated.');
    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('3+ Team Trade');
  });
});
