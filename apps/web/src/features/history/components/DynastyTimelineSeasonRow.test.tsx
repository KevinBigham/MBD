import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import DynastyTimelineSeasonRow from './DynastyTimelineSeasonRow';
import type { DynastyTimelineChapter } from '../lib/buildDynastyTimelineChapters';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type DynastyTimelineSeason = DynastyTimelineChapter['seasons'][number];

function makeSeason(overrides: Partial<DynastyTimelineSeason> = {}): DynastyTimelineSeason {
  return {
    id: 'season-12',
    season: 12,
    record: '96-66',
    wins: 96,
    losses: 66,
    playoffResult: 'Won Division Series',
    championship: false,
    playoffAppearance: true,
    dynastyScore: 88,
    keyAcquisitions: [],
    keyDepartures: [],
    storylineHook: 'The rotation set the tone for October.',
    memoryBeats: [
      {
        id: 'beat-1',
        kind: 'identity',
        label: 'Rotation Identity',
        summary: 'The rotation became the spine of the contender.',
        playerIds: ['ace-1'],
        playerNameFallbacks: { 'ace-1': 'Archived Ace' },
        teamIds: ['nym'],
        gameIndex: 41,
      },
    ],
    state: 'contention',
    ...overrides,
  };
}

describe('DynastyTimelineSeasonRow', () => {
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

  it('renders season details, memory beats, and delegates recap opening', async () => {
    const onOpenRecap = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <DynastyTimelineSeasonRow
            season={makeSeason()}
            canOpenRecap={() => true}
            onOpenRecap={onOpenRecap}
            playerNames={{ 'ace-1': 'Mina Stone' }}
            teamNames={{ nym: 'New York Tycoons' }}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Season');
    expect(container.textContent).toContain('12');
    expect(container.textContent).toContain('96-66');
    expect(container.textContent).toContain('The rotation set the tone for October.');
    expect(container.textContent).toContain('Timeline Memory');
    expect(container.querySelector('a[href="/players/ace-1"]')?.textContent).toContain('Mina Stone');
    expect(container.querySelector('a[href="/games/41"]')?.textContent).toContain('Box Score');

    const recapButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Open Recap'),
    );
    expect(recapButton).toBeDefined();

    await act(async () => {
      recapButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onOpenRecap).toHaveBeenCalledWith(12);
  });

  it('falls back to playoff result copy and disables unavailable recaps', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <DynastyTimelineSeasonRow
            season={makeSeason({ storylineHook: null, memoryBeats: [] })}
            canOpenRecap={() => false}
            onOpenRecap={vi.fn()}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Won Division Series');
    expect(container.textContent).not.toContain('Timeline Memory');
    const recapButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Open Recap'),
    ) as HTMLButtonElement | undefined;
    expect(recapButton?.disabled).toBe(true);
  });
});
