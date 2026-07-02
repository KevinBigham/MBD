import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import RivalryHistoryStack, {
  type DashboardRivalrySummary,
  type DashboardThisDayInHistory,
} from './RivalryHistoryStack';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const rivalry: DashboardRivalrySummary = {
  id: 'rivalry-kcr-stl',
  opponentTeamId: 'stl',
  intensity: 74,
  summary: 'A tense I-70 series is shaping the summer standings race.',
  currentSeasonRecord: 'KCR leads 4-2 this season',
  historicalRecord: 'STL leads 118-109 all-time',
};

const thisDayInHistory: DashboardThisDayInHistory = {
  season: 12,
  headline: 'Game 7 became the franchise origin myth',
  summary: 'The bullpen covered five scoreless innings to finish the first championship run.',
};

describe('RivalryHistoryStack', () => {
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

  it('renders rivalry intensity and this-day-in-history memory cards', async () => {
    await act(async () => {
      root.render(
        <RivalryHistoryStack
          franchiseAbbreviation="KCR"
          rivalry={rivalry}
          thisDayInHistory={thisDayInHistory}
        />,
      );
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Rivalry Watch');
    expect(text).toContain('KCR vs STL');
    expect(text).toContain('A tense I-70 series is shaping the summer standings race.');
    expect(text).toContain('KCR leads 4-2 this season');
    expect(text).toContain('STL leads 118-109 all-time');
    expect(text).toContain('This Day in History');
    expect(text).toContain('Season 12');
    expect(text).toContain('Game 7 became the franchise origin myth');
    expect(text).toContain('The bullpen covered five scoreless innings to finish the first championship run.');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(2);
    expect(container.innerHTML).toContain('width: 74%');
  });

  it('renders empty-state copy when no rivalry or history memories are available', async () => {
    await act(async () => {
      root.render(
        <RivalryHistoryStack
          franchiseAbbreviation="KCR"
          rivalry={null}
          thisDayInHistory={null}
        />,
      );
    });

    const text = container.textContent ?? '';
    expect(text).toContain('No rivalry has reached the front-burner tier yet.');
    expect(text).toContain('Archived season history will appear here once the dynasty has real mileage.');
  });
});
