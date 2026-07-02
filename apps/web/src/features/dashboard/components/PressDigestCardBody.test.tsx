import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { PressRoomEntry } from '@/shared/types/pressRoom';
import PressDigestCardBody from './PressDigestCardBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const baseEntry: PressRoomEntry = {
  id: 'press-1',
  source: 'league_wire',
  category: 'league',
  tag: 'ANALYSIS',
  priority: 50,
  headline: 'League analysts reset the playoff board',
  body: 'The latest model gives the division leaders breathing room.',
  timestamp: 'Day 45',
  relatedTeamIds: [],
  relatedPlayerIds: [],
};

function entry(overrides: Partial<PressRoomEntry>): PressRoomEntry {
  return {
    ...baseEntry,
    ...overrides,
  };
}

describe('PressDigestCardBody', () => {
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
    feed = [],
    unreadCount = 0,
  }: Partial<Parameters<typeof PressDigestCardBody>[0]> = {}) {
    await act(async () => {
      root.render(
        <PressDigestCardBody
          feed={feed}
          unreadCount={unreadCount}
        />,
      );
    });
  }

  it('renders unread count, caps digest rows, and keeps tag tone classes', async () => {
    await renderBody({
      unreadCount: 4,
      feed: [
        entry({
          id: 'breaking',
          tag: 'BREAKING',
          timestamp: 'Day 45',
          headline: 'Ace returns ahead of rivalry set',
          body: 'The rotation gets a needed jolt.',
        }),
        entry({
          id: 'rumor',
          tag: 'RUMOR',
          timestamp: 'Day 46',
          headline: 'Deadline market starts to move',
          body: 'Rival executives are monitoring late bullpen prices.',
        }),
        entry({
          id: 'analysis',
          tag: 'ANALYSIS',
          timestamp: 'Day 47',
          headline: 'Farm depth draws national notice',
          body: 'Prospects keep pushing the major-league roster.',
        }),
        entry({
          id: 'watch',
          tag: 'WATCH',
          timestamp: 'Day 48',
          headline: 'Fourth item should stay out of the digest',
          body: 'This copy should not render in the capped card body.',
        }),
      ],
    });

    const text = container.textContent ?? '';
    expect(text).toContain('4 unread');
    expect(text).toContain('BREAKING');
    expect(text).toContain('Ace returns ahead of rivalry set');
    expect(text).toContain('Day 46');
    expect(text).toContain('Deadline market starts to move');
    expect(text).toContain('ANALYSIS');
    expect(text).toContain('Farm depth draws national notice');
    expect(text).not.toContain('Fourth item should stay out of the digest');
    expect(container.innerHTML).toContain('border-accent-danger/50 text-accent-danger');
    expect(container.innerHTML).toContain('border-accent-warning/50 text-accent-warning');
    expect(container.innerHTML).toContain('border-dynasty-border text-dynasty-muted');
  });

  it('renders empty press-room fallback copy', async () => {
    await renderBody();

    const text = container.textContent ?? '';
    expect(text).toContain('0 unread');
    expect(text).toContain('The press room will populate as the season builds storylines.');
  });
});
