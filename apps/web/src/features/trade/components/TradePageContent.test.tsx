import type { ComponentProps } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TradeActivityColumn from './TradeActivityColumn';
import TradeBuilderPanel from './TradeBuilderPanel';
import TradeBuilderStack from './TradeBuilderStack';
import TradeDeadlineDashboard from './TradeDeadlineDashboard';
import TradePageContent from './TradePageContent';
import TradeQuickStartPanel from './TradeQuickStartPanel';

type TradeActivityColumnProps = ComponentProps<typeof TradeActivityColumn>;
type TradeBuilderPanelProps = ComponentProps<typeof TradeBuilderPanel>;
type TradeBuilderStackProps = ComponentProps<typeof TradeBuilderStack>;
type TradeDeadlineDashboardProps = Omit<ComponentProps<typeof TradeDeadlineDashboard>, 'deadlineDramaSlot'>;
type TradeQuickStartPanelProps = ComponentProps<typeof TradeQuickStartPanel>;

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function baseActivityColumnProps(): TradeActivityColumnProps {
  return {
    activeNegotiationId: null,
    incomingOffers: [],
    onAcceptOffer: vi.fn(),
    onCounterOffer: vi.fn(),
    onDeclineOffer: vi.fn(),
    onResumeNegotiation: vi.fn(),
    openNegotiations: [],
    openNegotiationsLoading: false,
    playerById: () => undefined,
    season: 4,
    ticker: [],
    tradeHistory: [],
  };
}

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

function baseBuilderStackProps(): TradeBuilderStackProps {
  return {
    builderProps: baseBuilderProps(),
    multiTeamModalProps: null,
    result: null,
  };
}

function baseDeadlineDashboardProps(): TradeDeadlineDashboardProps {
  return {
    deadlineState: null,
    detail: 'Four days remain before the deadline window closes.',
    headline: 'Deadline room is live.',
    tradeMarketOpen: true,
  };
}

function baseQuickStartProps(): TradeQuickStartPanelProps {
  return {
    disabledReason: '',
    filteredTargetRoster: [],
    filteredYourRoster: [],
    mode: 'quick',
    offerTotal: 0,
    offering: [],
    offeringSummary: [],
    onSelectTeam: vi.fn(),
    onSubmitTrade: vi.fn(),
    onToggleOfferingPlayer: vi.fn(),
    onToggleRequestingPlayer: vi.fn(),
    otherTeams: [{ id: 'bos', name: 'Boston Noreasters', abbr: 'BOS' }],
    packageFairness: { text: 'Fair trade', color: 'text-accent-success' },
    preselectedPlayerId: null,
    proposing: false,
    requestTotal: 0,
    requesting: [],
    requestingSummary: [],
    selectedTeam: '',
    tradeMarketOpen: true,
  };
}

describe('TradePageContent', () => {
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

  it('composes the trade route header, deadline dashboard, activity column, and builder stack', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <TradePageContent
            activityColumnProps={baseActivityColumnProps()}
            builderStackProps={baseBuilderStackProps()}
            deadlineDashboardProps={baseDeadlineDashboardProps()}
            deadlineDramaSlot={<div data-testid="deadline-drama-slot">Deadline drama slot</div>}
            quickStartProps={baseQuickStartProps()}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Trade Center');
    expect(container.textContent).toContain('Deadline room is live.');
    expect(container.textContent).toContain('Deadline drama slot');
    expect(container.textContent).toContain('Quick Trade');
    expect(container.textContent).toContain('Hot Offers');
    expect(container.textContent).toContain('Trade Builder');
  });
});
