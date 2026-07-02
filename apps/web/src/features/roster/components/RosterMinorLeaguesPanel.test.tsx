import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { RosterMinorLeaguesPanel, type AffiliateOverviewView, type PromotionCandidateView } from './RosterMinorLeaguesPanel';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function makeMinorPlayer(overrides: Partial<PlayerDTO> = {}): PlayerDTO {
  return {
    id: 'minor-1',
    firstName: 'Marco',
    lastName: 'Ready',
    age: 22,
    position: 'SS',
    overallRating: 62,
    displayRating: 58,
    letterGrade: 'B',
    rosterStatus: 'MINORS',
    teamId: 'nym',
    serviceTimeDays: 0,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: 'AAA',
    contract: {
      years: 1,
      annualSalary: 0.8,
      totalValue: 0.8,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    ceiling: 72,
    floor: 45,
    developmentProgram: null,
    developmentTrajectory: 'rising',
    extensionHistory: [],
    stats: null,
    advanced: null,
    ...overrides,
  };
}

describe('RosterMinorLeaguesPanel', () => {
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

  it('renders promotion and affiliate intelligence while delegating route actions', async () => {
    const onRequestPromotion = vi.fn();
    const onPromotePlayer = vi.fn();
    const onClaimWaiver = vi.fn();
    const promotionCandidates: PromotionCandidateView[] = [{
      playerId: 'prospect-1',
      playerName: 'Luis Ascending',
      position: 'SS',
      currentLevel: 'AA',
      targetLevel: 'AAA',
      score: 61,
      reason: 'AA production and overall rating merit a look at AAA.',
    }];
    const affiliateOverview: AffiliateOverviewView = {
      affiliates: [{
        teamId: 'nym',
        level: 'AAA',
        label: 'Newark Market Makers',
        shortName: 'Market Makers',
        identityNote: 'Near-ready bats with polished plate plans.',
        wins: 52,
        losses: 38,
        gamesPlayed: 90,
        runDifferential: 41,
        topPerformer: {
          playerId: 'top-1',
          playerName: 'Rafi Spark',
          statLine: '.315/.390/.520',
        },
      }],
      recentBoxScores: [{
        id: 'box-1',
        teamId: 'nym',
        day: 97,
        level: 'AAA',
        label: 'Newark Market Makers',
        shortName: 'Market Makers',
        result: 'W',
        scoreline: '6-2 vs WOR',
        summary: 'Scranton beat Worcester 6-2.',
      }],
      waiverClaims: [{
        playerId: 'waive-1',
        playerName: 'Ben Fringe',
        fromTeamName: 'Boston Noreasters',
        toTeamName: null,
        status: 'pending',
        salary: 1.2,
        priorityIndex: 1,
      }],
    };
    const aaaPlayer = makeMinorPlayer();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RosterMinorLeaguesPanel
            promotionCandidates={promotionCandidates}
            affiliateOverview={affiliateOverview}
            minors={{
              AAA: [aaaPlayer],
              AA: [],
              A_PLUS: [],
              A: [],
              ROOKIE: [],
              INTERNATIONAL: [],
            }}
            busyAction={null}
            onRequestPromotion={onRequestPromotion}
            onPromotePlayer={onPromotePlayer}
            onClaimWaiver={onClaimWaiver}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Promotion recommendations');
    expect(container.textContent).toContain('Luis Ascending');
    expect(container.textContent).toContain('AA to AAA');
    expect(container.textContent).toContain('Newark Market Makers');
    expect(container.textContent).toContain('Near-ready bats with polished plate plans.');
    expect(container.textContent).toContain('Rafi Spark');
    expect(container.textContent).toContain('Scranton beat Worcester 6-2.');
    expect(container.textContent).toContain('Ben Fringe');
    expect(container.textContent).toContain('Marco Ready');
    expect(container.querySelector('[data-testid="roster-affiliate-mark-nym-AAA"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="roster-affiliate-result-mark-nym-box-1"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(10);

    const buttons = Array.from(container.querySelectorAll('button'));
    const cardPromote = buttons.find((button) => button.textContent === 'Promote');
    const waiverClaim = buttons.find((button) => button.textContent?.includes('Claim Ben Fringe'));
    const tablePromote = buttons.filter((button) => button.textContent === 'Promote').at(-1);

    await act(async () => {
      cardPromote?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      waiverClaim?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      tablePromote?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onRequestPromotion).toHaveBeenCalledWith(promotionCandidates[0]);
    expect(onClaimWaiver).toHaveBeenCalledWith(affiliateOverview.waiverClaims[0]);
    expect(onPromotePlayer).toHaveBeenCalledWith(aaaPlayer, 'AAA');
  });

  it('renders empty states and disables only busy promotion and claim controls', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <RosterMinorLeaguesPanel
            promotionCandidates={[]}
            affiliateOverview={{
              affiliates: [],
              recentBoxScores: [],
              waiverClaims: [{
                playerId: 'waive-2',
                playerName: 'Busy Claim',
                fromTeamName: 'Oakland Oaks',
                toTeamName: null,
                status: 'pending',
                salary: 1.1,
                priorityIndex: null,
              }],
            }}
            minors={{
              AAA: [makeMinorPlayer({ id: 'busy-promote', firstName: 'Busy', lastName: 'Prospect' })],
              AA: [],
              A_PLUS: [],
              A: [],
              ROOKIE: [],
              INTERNATIONAL: [makeMinorPlayer({
                id: 'intake-1',
                firstName: 'Intake',
                lastName: 'Prospect',
                minorLeagueLevel: 'INTERNATIONAL',
              })],
            }}
            busyAction="promote-busy-promote"
            onRequestPromotion={vi.fn()}
            onPromotePlayer={vi.fn()}
            onClaimWaiver={vi.fn()}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('No affiliate bats or arms are forcing a promotion today.');
    expect(container.textContent).toContain('Affiliate schedules have not opened yet.');
    expect(container.textContent).toContain('Intake only');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(10);

    const busyPromotion = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent === 'Promote',
    ) as HTMLButtonElement | undefined;
    const busyClaim = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Claim Busy Claim'),
    ) as HTMLButtonElement | undefined;

    expect(busyPromotion?.disabled).toBe(true);
    expect(busyClaim?.disabled).toBe(false);
  });
});
