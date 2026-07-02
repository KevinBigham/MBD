import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import type { LeagueEvent, MonthlyPulseState } from '@mbd/contracts';
import { PulseContentPanel } from './PulseContentPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const pulseWithReport: MonthlyPulseState = {
  pendingReport: {
    id: 'report-june',
    season: 5,
    month: 6,
    monthLabel: 'June',
    startDay: 61,
    endDay: 90,
    teamRecord: '18-10',
    overallRecord: '45-30',
    divisionRank: 2,
    divisionMovement: 1,
    playerOfTheMonth: {
      playerId: 'p-trout',
      playerName: 'Mike Trout',
      position: 'CF',
      war: 5.8,
    },
    keyInjuries: ['Aaron Judge - hamstring (15-day IL)'],
    keyReturns: ['Gerrit Cole - returned from elbow'],
    tradeDeadlineCountdown: 28,
    upcomingScheduleDifficulty: {
      score: 62,
      label: 'Above Average',
      summary: 'Three division leaders on deck, two series on the road.',
    },
  },
  decisionQueue: [
    {
      id: 'dec-red',
      title: 'Call up top prospect?',
      body: 'Rodriguez is crushing AAA. Ready for the show?',
      urgency: 'red',
      route: '/minors',
      actionLabel: 'Review Call-Up',
    },
    {
      id: 'dec-yellow',
      title: 'Extension offer expiring',
      body: 'Contract deadline approaching for your ace.',
      urgency: 'yellow',
      route: '/finance',
      actionLabel: 'Open Finance',
    },
  ],
};

const leagueEvents: LeagueEvent[] = [
  {
    type: 'gm_firing',
    season: 5,
    month: 6,
    teamIds: ['nym'],
    playerIds: [],
    headline: 'Tycoons dismiss veteran GM',
    description: 'Ownership opted for a midseason reset after a flat June.',
    gameplayEffect: 'Front-office relationships around the league just became less predictable.',
    effectData: {
      kind: 'gm_reset',
      magnitude: 25,
      newPersonality: 'aggressive',
    },
  },
];

describe('PulseContentPanel', () => {
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

  it('renders monthly report, decision queue, league events, and delegates actions', async () => {
    const onAcknowledgeReport = vi.fn();
    const onDismissDecision = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <PulseContentPanel
            decisions={pulseWithReport.decisionQueue}
            hasContent={true}
            leagueEvents={leagueEvents}
            onAcknowledgeReport={onAcknowledgeReport}
            onDismissDecision={onDismissDecision}
            pendingReport={pulseWithReport.pendingReport}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('June Report');
    expect(container.textContent).toContain('18-10');
    expect(container.textContent).toContain('45-30');
    expect(container.textContent).toContain('#2');
    expect(container.textContent).toContain('Mike Trout');
    expect(container.textContent).toContain('Aaron Judge');
    expect(container.textContent).toContain('Gerrit Cole');
    expect(container.textContent).toContain('28d');
    expect(container.textContent).toContain('Decision Spotlights');
    expect(container.textContent).toContain('Call up top prospect?');
    expect(container.textContent).toContain('Extension offer expiring');
    expect(container.textContent).toContain('League Events');
    expect(container.textContent).toContain('Tycoons dismiss veteran GM');
    expect(container.textContent).toContain('Front-office relationships around the league');

    const markReadButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Mark as Read'),
    );
    await act(async () => {
      markReadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onAcknowledgeReport).toHaveBeenCalledTimes(1);

    const dismissButton = container.querySelector('button[aria-label="Dismiss"]');
    await act(async () => {
      dismissButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onDismissDecision).toHaveBeenCalledWith('dec-red');
  });

  it('renders the empty state when there is no pulse content', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <PulseContentPanel
            decisions={[]}
            hasContent={false}
            leagueEvents={[]}
            onAcknowledgeReport={vi.fn()}
            onDismissDecision={vi.fn()}
            pendingReport={null}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('No pending reports');
    expect(container.textContent).toContain('Monthly pulse reports are generated as the season progresses.');
  });

  it('renders decisions and league events without requiring a pending report', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <PulseContentPanel
            decisions={pulseWithReport.decisionQueue}
            hasContent={true}
            leagueEvents={leagueEvents}
            onAcknowledgeReport={vi.fn()}
            onDismissDecision={vi.fn()}
            pendingReport={null}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Decision Spotlights');
    expect(container.textContent).toContain('Call up top prospect?');
    expect(container.textContent).toContain('League Events');
    expect(container.textContent).toContain('Tycoons dismiss veteran GM');
    expect(container.textContent).not.toContain('June Report');
  });
});
