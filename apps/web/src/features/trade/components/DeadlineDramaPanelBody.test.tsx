import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import DeadlineDramaPanelBody, {
  type TradeDeadlineDrama,
} from './DeadlineDramaPanelBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const baseDrama: TradeDeadlineDrama = {
  season: 4,
  day: 100,
  deadlineDay: 102,
  daysUntilDeadline: 2,
  isPastDeadline: false,
  contenderCount: 9,
  sellerCount: 11,
  todayEvents: [
    {
      id: 'today-1',
      type: 'last_minute_offer',
      day: 100,
      description: 'The Noreasters pushed a final offer for a late-inning arm.',
      involvedTeamIds: ['bos', 'nym'],
      involvedPlayerIds: ['p-1'],
      urgency: 4,
      isPublic: true,
    },
  ],
  fullTimeline: [
    {
      id: 'old-1',
      type: 'rumor_surfaces',
      day: 96,
      description: 'Boston scouts watched New York relievers in back-to-back games.',
      involvedTeamIds: ['bos', 'nym'],
      involvedPlayerIds: ['p-2'],
      urgency: 2,
      isPublic: true,
    },
    {
      id: 'today-1',
      type: 'last_minute_offer',
      day: 100,
      description: 'The Noreasters pushed a final offer for a late-inning arm.',
      involvedTeamIds: ['bos', 'nym'],
      involvedPlayerIds: ['p-1'],
      urgency: 4,
      isPublic: true,
    },
  ],
  activeBiddingWar: {
    targetPlayerId: 'target-1',
    targetPlayerName: 'Roman Anthony',
    winnerId: 'bos',
    settled: true,
    rounds: [
      {
        teamId: 'nym',
        offerDescription: 'New York offered a top-100 infielder.',
        round: 1,
      },
      {
        teamId: 'bos',
        offerDescription: 'Boston added a controllable starter.',
        round: 2,
      },
    ],
  },
};

describe('DeadlineDramaPanelBody', () => {
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

  async function renderBody(
    props: Partial<Parameters<typeof DeadlineDramaPanelBody>[0]> = {},
  ) {
    await act(async () => {
      root.render(
        <DeadlineDramaPanelBody
          drama={props.drama === undefined ? baseDrama : props.drama}
          loading={props.loading ?? false}
          onToggleTimeline={props.onToggleTimeline ?? vi.fn()}
          phase={props.phase ?? 'regular'}
          timelineExpanded={props.timelineExpanded ?? false}
        />,
      );
    });
  }

  it('renders loading and phase-aware empty states', async () => {
    await renderBody({ drama: null, loading: true });
    expect(container.textContent).toContain('Loading deadline intel...');

    await renderBody({ drama: null, loading: false, phase: 'offseason' });
    expect(container.textContent).toContain('Offseason roster work lives in free agency.');
  });

  it('renders deadline activity and delegates timeline expansion', async () => {
    const onToggleTimeline = vi.fn();

    await renderBody({ onToggleTimeline });

    const text = container.textContent ?? '';
    expect(text).toContain('2');
    expect(text).toContain('Days');
    expect(text).toContain('9');
    expect(text).toContain('Buyers');
    expect(text).toContain('11');
    expect(text).toContain('Sellers');
    expect(text).toContain('The Noreasters pushed a final offer');
    expect(text).toContain('Active Bidding War');
    expect(text).toContain('Roman Anthony');
    expect(text).not.toContain('Boston scouts watched New York relievers');

    const timelineButton = container.querySelector('button[aria-expanded="false"]');
    await act(async () => {
      timelineButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onToggleTimeline).toHaveBeenCalledTimes(1);

    await renderBody({ timelineExpanded: true });
    expect(container.textContent).toContain('Boston scouts watched New York relievers');
  });
});
