import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import MilestoneTrackerCardBody, { type MilestoneAlert } from './MilestoneTrackerCardBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('MilestoneTrackerCardBody', () => {
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

  async function renderBody({
    loading = false,
    alerts = [],
  }: {
    loading?: boolean;
    alerts?: MilestoneAlert[];
  }) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <MilestoneTrackerCardBody loading={loading} alerts={alerts} />
        </MemoryRouter>,
      );
    });
  }

  it('renders loading and empty states without route data side effects', async () => {
    await renderBody({ loading: true });
    expect(container.textContent ?? '').toContain('Loading...');

    await renderBody({});
    expect(container.textContent ?? '').toContain('No milestone watches active');
  });

  it('renders capped milestone alerts with progress, urgency, and overflow copy', async () => {
    const alerts: MilestoneAlert[] = [
      {
        playerId: 'p-1',
        playerName: 'Aaron Judge',
        milestoneLabel: 'Home Runs',
        currentValue: 499,
        threshold: 500,
        remaining: 1,
        urgency: 'imminent',
      },
      {
        playerId: 'p-2',
        playerName: 'Bobby Witt Jr.',
        milestoneLabel: 'Hits',
        currentValue: 1988,
        threshold: 2000,
        remaining: 12,
        urgency: 'close',
      },
      {
        playerId: 'p-3',
        playerName: 'Cole Ragans',
        milestoneLabel: 'Strikeouts',
        currentValue: 1475,
        threshold: 1500,
        remaining: 25,
        urgency: 'approaching',
      },
      {
        playerId: 'p-4',
        playerName: 'Vinnie Pasquantino',
        milestoneLabel: 'Runs Batted In',
        currentValue: 980,
        threshold: 1000,
        remaining: 20,
        urgency: 'close',
      },
      {
        playerId: 'p-5',
        playerName: 'Maikel Garcia',
        milestoneLabel: 'Steals',
        currentValue: 99,
        threshold: 100,
        remaining: 1,
        urgency: 'imminent',
      },
      {
        playerId: 'p-6',
        playerName: 'Salvador Perez',
        milestoneLabel: 'Games',
        currentValue: 1990,
        threshold: 2000,
        remaining: 10,
        urgency: 'close',
      },
    ];

    await renderBody({ alerts });

    const text = container.textContent ?? '';
    expect(text).toContain('Aaron Judge');
    expect(text).toContain('Home Runs');
    expect(text).toContain('Imminent');
    expect(text).toContain('499 / 500');
    expect(text).toContain('1 to go');
    expect(text).toContain('Bobby Witt Jr.');
    expect(text).toContain('1,988 / 2,000');
    expect(text).toContain('12 to go');
    expect(text).toContain('Approaching');
    expect(text).toContain('and 1 more...');
    expect(text).not.toContain('Salvador Perez');
    expect(container.querySelector('a[href="/players/p-1"]')).not.toBeNull();
    expect(
      (container.querySelector('.bg-accent-warning') as HTMLElement | null)?.style.width,
    ).toBe('99.8%');
  });
});
