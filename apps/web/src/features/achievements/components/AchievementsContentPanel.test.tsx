import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import AchievementsContentPanel, { type AchievementView } from './AchievementsContentPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const achievements: AchievementView[] = [
  {
    id: 'first_championship',
    category: 'dynasty',
    name: 'Ring Ceremony',
    description: 'Win your first championship.',
    unlocked: true,
    unlockedAt: 3,
    unlockSummary: 'Won the World Series in Season 3.',
    progress: null,
  },
  {
    id: 'moneyball_master',
    category: 'moneyball',
    name: 'Moneyball Master',
    description: 'Win 90+ games with a bottom-5 payroll.',
    unlocked: false,
    unlockedAt: null,
    unlockSummary: null,
    progress: { current: 82, target: 90, summary: '82 wins this season' },
  },
];

describe('AchievementsContentPanel', () => {
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

  it('renders trophy-room counts, cards, filters, and delegates actions', async () => {
    const onChangeFilter = vi.fn<(filter: string) => void>();
    const onOpenCeremony = vi.fn<() => void>();

    await act(async () => {
      root.render(
        <AchievementsContentPanel
          achievements={achievements}
          ceremonyLoading={false}
          filter="all"
          onChangeFilter={onChangeFilter}
          onOpenCeremony={onOpenCeremony}
        />,
      );
    });

    expect(container.textContent).toContain('Trophy Room');
    expect(container.textContent).toContain('/ 2 unlocked');
    expect(container.textContent).toContain('Ring Ceremony');
    expect(container.textContent).toContain('Won the World Series in Season 3');
    expect(container.textContent).toContain('Moneyball Master');
    expect(container.textContent).toContain('82 wins this season');
    expect(container.textContent).toContain('91%');

    const buttons = Array.from(container.querySelectorAll('button'));
    const ceremonyButton = buttons.find((button) => button.textContent?.includes('Awards Ceremony'));
    const moneyballButton = buttons.find((button) => button.textContent?.includes('moneyball'));

    await act(async () => {
      ceremonyButton?.click();
      moneyballButton?.click();
    });

    expect(onOpenCeremony).toHaveBeenCalledTimes(1);
    expect(onChangeFilter).toHaveBeenCalledWith('moneyball');
  });

  it('renders the empty-state copy when the active category has no achievements', async () => {
    await act(async () => {
      root.render(
        <AchievementsContentPanel
          achievements={achievements}
          ceremonyLoading
          filter="records"
          onChangeFilter={vi.fn()}
          onOpenCeremony={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('Loading...');
    expect(container.textContent).toContain('No achievements yet');
    expect(container.textContent).toContain('Keep playing to unlock achievements in this category.');
  });
});
