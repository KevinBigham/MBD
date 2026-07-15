import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileText } from 'lucide-react';
import OffseasonPageContent, { type OffseasonPageContentProps } from './OffseasonPageContent';

vi.mock('@/shared/components/SeasonNarrativePanel', () => ({
  SeasonNarrativePanel: ({ headline, recap }: { headline: string; recap: string }) => (
    <section data-testid="season-narrative">
      {headline}::{recap}
    </section>
  ),
}));

vi.mock('./OffseasonPhaseTrackerPanel', () => ({
  OffseasonPhaseTrackerPanel: ({ currentPhaseIndex, phases }: { currentPhaseIndex: number; phases: unknown[] }) => (
    <section data-testid="phase-tracker">
      phase-tracker:{currentPhaseIndex}:{phases.length}
    </section>
  ),
}));

vi.mock('./OffseasonCurrentPhasePanel', () => ({
  OffseasonCurrentPhasePanel: ({
    label,
    onAdvance,
    onSkip,
  }: {
    label: string;
    onAdvance: () => void;
    onSkip: () => void;
  }) => (
    <section data-testid="current-phase">
      {label}
      <button type="button" onClick={onAdvance}>advance</button>
      <button type="button" onClick={onSkip}>skip</button>
    </section>
  ),
}));

vi.mock('./OffseasonCommandCenterPanel', () => ({
  OffseasonCommandCenterPanel: () => <section data-testid="command-center">command-center</section>,
}));

vi.mock('./OffseasonMarketDayBriefingPanel', () => ({
  OffseasonMarketDayBriefingPanel: ({ summaries }: { summaries: unknown[] }) => (
    <section data-testid="market-day">market-day:{summaries.length}</section>
  ),
}));

vi.mock('./OffseasonResultSummaryGrid', () => ({
  OffseasonResultSummaryGrid: () => <section data-testid="result-grid">result-grid</section>,
}));

vi.mock('./OffseasonExtensionCandidatesPanel', () => ({
  OffseasonExtensionCandidatesPanel: ({ candidates }: { candidates: unknown[] }) => (
    <section data-testid="extensions">extensions:{candidates.length}</section>
  ),
}));

vi.mock('./OffseasonQualifyingOffersPanel', () => ({
  OffseasonQualifyingOffersPanel: ({
    onIssue,
    onResolve,
  }: {
    onIssue: (playerId: string) => void;
    onResolve: () => void;
  }) => (
    <section data-testid="qualifying-offers">
      qualifying-offers
      <button type="button" onClick={() => onIssue('qo-1')}>issue-qo</button>
      <button type="button" onClick={onResolve}>resolve-qo</button>
    </section>
  ),
}));

vi.mock('./OffseasonRule5Panel', () => ({
  OffseasonRule5Panel: ({
    onLockProtection,
    onPassRule5Pick,
    onResolveOfferBack,
    onRule5Pick,
    onToggleProtection,
    userTeamId,
  }: {
    onLockProtection: () => void;
    onPassRule5Pick: () => void;
    onResolveOfferBack: (playerId: string, acceptReturn: boolean) => void;
    onRule5Pick: (playerId: string) => void;
    onToggleProtection: (playerId: string) => void;
    userTeamId: string | null;
  }) => (
    <section data-testid="rule5">
      rule5:{userTeamId}
      <button type="button" onClick={() => onToggleProtection('protect-1')}>protect</button>
      <button type="button" onClick={onLockProtection}>lock</button>
      <button type="button" onClick={() => onRule5Pick('pick-1')}>pick</button>
      <button type="button" onClick={onPassRule5Pick}>pass</button>
      <button type="button" onClick={() => onResolveOfferBack('offer-1', true)}>return</button>
    </section>
  ),
}));

vi.mock('./OffseasonSpringTrainingPanel', () => ({
  OffseasonSpringTrainingPanel: () => <section data-testid="spring-training">spring-training</section>,
}));

vi.mock('./OffseasonTransactionLedgerPanel', () => ({
  OffseasonTransactionLedgerPanel: ({
    onToggleGroup,
    transactionGroups,
  }: {
    onToggleGroup: (groupPhase: string) => void;
    transactionGroups: Array<{ phase: string }>;
  }) => (
    <section data-testid="transaction-ledger">
      ledger:{transactionGroups.length}
      <button type="button" onClick={() => onToggleGroup(transactionGroups[0]?.phase ?? 'missing')}>
        toggle-ledger
      </button>
    </section>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function baseProps(overrides: Partial<OffseasonPageContentProps> = {}): OffseasonPageContentProps {
  return {
    advancing: false,
    currentPhaseConfig: {
      description: 'Sign free agents and protect the future.',
      icon: FileText,
      label: 'Qualifying Offers',
    },
    currentPhaseIndex: 4,
    expandedPhases: { qualifying_offers: true },
    extensionCandidates: [{ playerId: 'ext-1', playerName: 'Core Bat' }],
    marketDaySummaries: [{ id: 'market-1' }],
    offseason: {
      currentPhase: 'qualifying_offers',
      phaseDay: 2,
      totalDay: 18,
      completed: false,
      commandCenter: { checklist: [], warnings: [], projectedOpeningDay: {} },
      marketDaySummaries: [{ id: 'market-1' }],
      phaseResults: {
        arbitrationResolved: [],
        coachChanges: [],
        draftPicks: [],
        extensions: [],
        freeAgentSignings: [],
        ifaSignings: [],
        nonTenderedPlayers: [],
        qualifyingOffers: [],
        retiredPlayers: [],
        tenderedPlayers: [],
      },
      rule5: {
        phase: 'protection_audit',
      },
      transactionGroups: [
        {
          phase: 'qualifying_offers',
          label: 'Qualifying Offers',
          rows: [],
        },
      ],
    },
    offseasonHeadline: {
      headline: 'October left a live title window',
      season: 5,
    },
    onAdvance: vi.fn(),
    onIssueQualifyingOffer: vi.fn(),
    onLockProtection: vi.fn(),
    onPassRule5Pick: vi.fn(),
    onResolveOfferBack: vi.fn(),
    onResolveQualifyingOffers: vi.fn(),
    onRule5Pick: vi.fn(),
    onSkip: vi.fn(),
    onToggleGroup: vi.fn(),
    onToggleProtection: vi.fn(),
    phaseSteps: [
      { id: 'season_review', icon: FileText, label: 'Season Review' },
      { id: 'qualifying_offers', icon: FileText, label: 'Qualifying Offers' },
    ],
    qualifyingOfferEligible: [{ playerId: 'qo-1', playerName: 'Victor Veteran' }],
    qualifyingOfferSalary: 21.4,
    season: 5,
    seasonRecap: {
      recap: 'The Tycoons won 94 games.',
      season: 5,
      storylines: [],
    },
    springTraining: {
      currentRosterSize: 26,
      promotionCandidates: [],
      rosterIssues: [],
      rosterLimit: 26,
    },
    userTeamId: 'nym',
    ...overrides,
  } as OffseasonPageContentProps;
}

describe('OffseasonPageContent', () => {
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
    vi.clearAllMocks();
  });

  function button(label: string): HTMLButtonElement {
    const found = Array.from(container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes(label),
    );
    expect(found).toBeTruthy();
    return found as HTMLButtonElement;
  }

  it('renders the offseason shell, common panels, phase-specific QO and Rule 5 panels, and delegates callbacks', async () => {
    const props = baseProps();

    await act(async () => {
      root.render(<OffseasonPageContent {...props} />);
    });

    expect(container.textContent).toContain('Offseason - Season 5');
    expect(container.textContent).toContain('phase-tracker:4:2');
    expect(container.textContent).toContain('Qualifying Offers');
    expect(container.textContent).toContain('October left a live title window');
    expect(container.textContent).toContain('The Tycoons won 94 games.');
    expect(container.textContent).toContain('command-center');
    expect(container.textContent).toContain('market-day:1');
    expect(container.textContent).toContain('result-grid');
    expect(container.textContent).toContain('qualifying-offers');
    expect(container.textContent).toContain('rule5:nym');
    expect(container.textContent).toContain('ledger:1');

    await act(async () => {
      button('advance').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button('skip').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button('issue-qo').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button('resolve-qo').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button('protect').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button('lock').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button('pick').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button('pass').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button('return').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button('toggle-ledger').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onAdvance).toHaveBeenCalledTimes(1);
    expect(props.onSkip).toHaveBeenCalledTimes(1);
    expect(props.onIssueQualifyingOffer).toHaveBeenCalledWith('qo-1');
    expect(props.onResolveQualifyingOffers).toHaveBeenCalledTimes(1);
    expect(props.onToggleProtection).toHaveBeenCalledWith('protect-1');
    expect(props.onLockProtection).toHaveBeenCalledTimes(1);
    expect(props.onRule5Pick).toHaveBeenCalledWith('pick-1');
    expect(props.onPassRule5Pick).toHaveBeenCalledTimes(1);
    expect(props.onResolveOfferBack).toHaveBeenCalledWith('offer-1', true);
    expect(props.onToggleGroup).toHaveBeenCalledWith('qualifying_offers');
  });

  it('renders extension and spring-training panels only for their matching phases', async () => {
    await act(async () => {
      root.render(
        <OffseasonPageContent
          {...baseProps({
            currentPhaseConfig: {
              description: 'Open extension talks.',
              icon: FileText,
              label: 'Extensions',
            },
            offseason: {
              ...baseProps().offseason!,
              currentPhase: 'extensions',
              rule5: undefined,
            },
          })}
        />,
      );
    });

    expect(container.textContent).toContain('extensions:1');
    expect(container.textContent).not.toContain('qualifying-offers');
    expect(container.textContent).not.toContain('spring-training');

    await act(async () => {
      root.render(
        <OffseasonPageContent
          {...baseProps({
            currentPhaseConfig: {
              description: 'Finalize the roster.',
              icon: FileText,
              label: 'Spring Training',
            },
            offseason: {
              ...baseProps().offseason!,
              currentPhase: 'spring_training',
              rule5: undefined,
            },
          })}
        />,
      );
    });

    expect(container.textContent).toContain('spring-training');
    expect(container.textContent).not.toContain('extensions:1');
    expect(container.textContent).not.toContain('qualifying-offers');
  });

  it('keeps terminal qualifying-offer history visible after the active phase', async () => {
    const base = baseProps();
    await act(async () => {
      root.render(
        <OffseasonPageContent
          {...baseProps({
            offseason: {
              ...base.offseason!,
              currentPhase: 'free_agency',
              phaseResults: {
                ...base.offseason!.phaseResults,
                qualifyingOffers: [{
                  playerId: 'qo-1',
                  teamId: 'nym',
                  amount: 21.4,
                  status: 'rejected',
                  signingTeamId: null,
                  compensationPickId: null,
                  compensationTier: null,
                  forfeitedPick: null,
                }],
              },
            },
          })}
        />,
      );
    });

    expect(container.textContent).toContain('qualifying-offers');
  });
});
