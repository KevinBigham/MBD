import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RosterPageContent, { type RosterPageContentProps } from './RosterPageContent';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function buildProps(overrides: Partial<RosterPageContentProps> = {}): RosterPageContentProps {
  return {
    activeTab: 'contracts',
    actionConfirmationModalProps: null,
    contractsPanelProps: {
      candidates: [{
        playerId: 'ext-1',
        playerName: 'Diego Future',
        position: 'SS',
        yearsRemaining: 1,
        currentSalary: 6.8,
        willingness: 0.78,
        demandMultiplier: 1.12,
      }],
      onOpenNegotiation: vi.fn(),
    },
    extensionNegotiationModalProps: null,
    lineupPanelProps: {
      depthChartGroups: [],
      lineupPlayers: [],
      rotationPlayers: [],
      onDepthReorder: vi.fn(),
      onLineupReorder: vi.fn(),
      onRotationReorder: vi.fn(),
    },
    minorsPanelProps: {
      affiliateOverview: null,
      busyAction: null,
      minors: {},
      promotionCandidates: [],
      onClaimWaiver: vi.fn(),
      onPromotePlayer: vi.fn(),
      onRequestPromotion: vi.fn(),
    },
    mlbControlPanelProps: {
      busyAction: null,
      compliance: null,
      hitterColumns: [],
      hitters: [],
      pitcherColumns: [],
      pitchers: [],
      onRequestDfa: vi.fn(),
    },
    onChangeTab: vi.fn(),
    statusPanelProps: {
      activeRosterCount: 26,
      actionMessage: null,
      chemistry: null,
    },
    ...overrides,
  };
}

describe('RosterPageContent', () => {
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

  it('renders the active roster surface and delegates tab changes', async () => {
    const onChangeTab = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RosterPageContent {...buildProps({ onChangeTab })} />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('26 players on active roster');
    expect(container.textContent).toContain('Extension Candidates');
    expect(container.textContent).toContain('Diego Future');
    expect(container.textContent).not.toContain('Position Players');

    const lineupTab = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Lineup Builder'),
    );

    await act(async () => {
      lineupTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onChangeTab).toHaveBeenCalledWith('lineup');
  });
});
