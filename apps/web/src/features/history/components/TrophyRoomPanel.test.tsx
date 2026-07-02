import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TrophyRoomPanel, { type AchievementSummary } from './TrophyRoomPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const achievements: AchievementSummary[] = [
  {
    id: 'champion',
    category: 'dynasty',
    name: 'Champion',
    description: 'Win the World Series.',
    unlocked: true,
    unlockedAt: 'S2D180',
    unlockSummary: 'Won the World Series.',
    progress: {
      current: 1,
      target: 1,
      summary: 'World Series titles',
    },
  },
  {
    id: 'decade',
    category: 'longevity',
    name: 'Decade',
    description: 'Stay with one club for 10 seasons.',
    unlocked: false,
    unlockedAt: null,
    unlockSummary: null,
    progress: {
      current: 2,
      target: 10,
      summary: 'Seasons managed',
    },
  },
];

describe('TrophyRoomPanel', () => {
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

  it('renders achievement count, selected achievement detail, and achievement cards', async () => {
    const onSelectAchievement = vi.fn();

    await act(async () => {
      root.render(
        <TrophyRoomPanel
          achievements={achievements}
          onSelectAchievement={onSelectAchievement}
          selectedAchievement={achievements[0]!}
        />,
      );
    });

    expect(container.textContent).toContain('Trophy Room');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('1/2');
    expect(container.textContent).toContain('Champion');
    expect(container.textContent).toContain('Dynasty');
    expect(container.textContent).toContain('S2D180');
    expect(container.textContent).toContain('1 / 1 World Series titles');
    expect(container.textContent).toContain('Decade');
    expect(container.textContent).toContain('2 / 10');

    const decadeButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Decade'));
    expect(decadeButton).toBeTruthy();

    await act(async () => {
      decadeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelectAchievement).toHaveBeenCalledWith('decade');
  });

  it('renders the empty state when no achievements are unlocked yet', async () => {
    await act(async () => {
      root.render(
        <TrophyRoomPanel
          achievements={[{ ...achievements[1]!, progress: { current: 0, target: 10, summary: 'Seasons managed' } }]}
          onSelectAchievement={vi.fn()}
          selectedAchievement={achievements[1]!}
        />,
      );
    });

    expect(container.textContent).toContain('0/1');
    expect(container.textContent).toContain('No achievements unlocked yet');
    expect(container.textContent).toContain('Keep pushing seasons, titles, and milestones to fill the trophy room.');
    expect(container.textContent).toContain('Locked');
  });
});
