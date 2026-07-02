import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ScheduleContentPanel, { type ScheduleGameEntry } from './ScheduleContentPanel';

vi.mock('@/shared/components/TeamLogo', () => ({
  TeamLogo: ({ teamId }: { teamId: string }) => <span data-testid={`team-logo-${teamId}`} />,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const schedule: ScheduleGameEntry[] = [
  {
    day: 9,
    opponentId: 'bos',
    opponentName: 'Boston Noreasters',
    opponentAbbr: 'BOS',
    isHome: true,
    isCompleted: true,
    userScore: 5,
    opponentScore: 3,
    result: 'W',
    gameIndex: 17,
  },
  {
    day: 10,
    opponentId: 'bal',
    opponentName: 'Baltimore Crab Cakes',
    opponentAbbr: 'BAL',
    isHome: false,
    isCompleted: false,
  },
  {
    day: 11,
    opponentId: 'tor',
    opponentName: 'Toronto North Stars',
    opponentAbbr: 'TOR',
    isHome: true,
    isCompleted: true,
    userScore: 1,
    opponentScore: 4,
    result: 'L',
    gameIndex: 18,
  },
];

describe('ScheduleContentPanel', () => {
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

  it('renders the schedule record, current day, opponents, results, and current-row ref', async () => {
    const currentDayRowRef = createRef<HTMLTableRowElement>();

    await act(async () => {
      root.render(
        <ScheduleContentPanel
          currentDayRowRef={currentDayRowRef}
          day={10}
          schedule={schedule}
          season={4}
          onOpenGame={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('SEASON SCHEDULE');
    expect(container.textContent).toContain('Record1-1');
    expect(container.textContent).toContain('Season 4 | Day 10');
    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('Boston Noreasters');
    expect(container.textContent).toContain('BAL');
    expect(container.textContent).toContain('Baltimore Crab Cakes');
    expect(container.textContent).toContain('TOR');
    expect(container.textContent).toContain('5-3');
    expect(container.textContent).toContain('1-4');
    expect(currentDayRowRef.current?.textContent).toContain('BAL');
  });

  it('delegates completed-game clicks and ignores unplayed rows', async () => {
    const onOpenGame = vi.fn();

    await act(async () => {
      root.render(
        <ScheduleContentPanel
          currentDayRowRef={createRef<HTMLTableRowElement>()}
          day={10}
          schedule={schedule}
          season={4}
          onOpenGame={onOpenGame}
        />,
      );
    });

    const rows = Array.from(container.querySelectorAll('tbody tr'));

    await act(async () => {
      rows[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      rows[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      rows[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onOpenGame).toHaveBeenCalledTimes(2);
    expect(onOpenGame).toHaveBeenNthCalledWith(1, 17);
    expect(onOpenGame).toHaveBeenNthCalledWith(2, 18);
  });

  it('marks completed games as mobile-critical keyboard-accessible controls', async () => {
    const onOpenGame = vi.fn();

    await act(async () => {
      root.render(
        <ScheduleContentPanel
          currentDayRowRef={createRef<HTMLTableRowElement>()}
          day={10}
          schedule={schedule}
          season={4}
          onOpenGame={onOpenGame}
        />,
      );
    });

    const rows = Array.from(container.querySelectorAll('tbody tr'));

    expect(rows[0]?.getAttribute('data-mobile-critical-control')).toBe('schedule-completed-game');
    expect(rows[0]?.className).toContain('mobile-critical-control');
    expect(rows[0]?.className).toContain('focus-ring');
    expect(rows[0]?.getAttribute('role')).toBe('button');
    expect(rows[0]?.getAttribute('tabindex')).toBe('0');

    expect(rows[1]?.hasAttribute('data-mobile-critical-control')).toBe(false);
    expect(rows[1]?.hasAttribute('role')).toBe(false);
    expect(rows[1]?.hasAttribute('tabindex')).toBe(false);

    await act(async () => {
      rows[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      rows[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      rows[2]?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    expect(onOpenGame).toHaveBeenCalledTimes(2);
    expect(onOpenGame).toHaveBeenNthCalledWith(1, 17);
    expect(onOpenGame).toHaveBeenNthCalledWith(2, 18);
  });

  it('renders the empty schedule state', async () => {
    await act(async () => {
      root.render(
        <ScheduleContentPanel
          currentDayRowRef={createRef<HTMLTableRowElement>()}
          day={1}
          schedule={[]}
          season={1}
          onOpenGame={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('Sim games to see your schedule');
  });
});
