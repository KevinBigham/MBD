import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { ShieldAlert } from 'lucide-react';
import type { PressRoomEntry } from '@/shared/types/pressRoom';
import PressRoomPageContent from './PressRoomPageContent';
import type {
  PressRoomFeedSection,
  PressRoomSectionKey,
} from './PressRoomSourceBoard';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const briefingEntry: PressRoomEntry = {
  id: 'brief-owner-heat',
  source: 'briefing',
  category: 'owner',
  tag: 'BREAKING',
  priority: 1,
  headline: 'Owner pressure is rising.',
  body: 'Ownership wants a stronger response this month.',
  timestamp: 'S3D44',
  relatedTeamIds: ['nym'],
  relatedPlayerIds: [],
};

const transactionEntry: PressRoomEntry = {
  id: 'news-trade-1',
  source: 'league_wire',
  category: 'trade',
  tag: 'RUMOR',
  priority: 2,
  headline: 'Breaking trade headline',
  body: 'New York added a bullpen arm in a deadline swing.',
  timestamp: 'S3D43',
  relatedTeamIds: ['nym', 'bos'],
  relatedPlayerIds: [],
};

const groupedFeed: PressRoomFeedSection[] = [
  {
    key: 'briefings',
    label: 'Team Briefings',
    description: 'Internal pulses from ownership and the front office desk.',
    icon: ShieldAlert,
    groups: [{ label: 'Season 3 • Day 44', items: [briefingEntry] }],
    unreadCount: 1,
  },
];

describe('PressRoomPageContent', () => {
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

  it('renders press-room summary, source board, transactions, and delegates route-owned callbacks', async () => {
    const onMarkAllRead = vi.fn();
    const onSelectCategory = vi.fn();
    const onSelectTag = vi.fn();
    const onSelectTeam = vi.fn();
    const onTogglePinned = vi.fn();
    const onToggleSection = vi.fn();

    await act(async () => {
      root.render(
        <PressRoomPageContent
          briefingCount={2}
          categoryOptions={['owner', 'trade']}
          feed={[briefingEntry, transactionEntry]}
          groupedFeed={groupedFeed}
          isEntryPinned={(entry) => entry.id === transactionEntry.id}
          isEntryUnread={(entry) => entry.id === briefingEntry.id}
          onMarkAllRead={onMarkAllRead}
          onSelectCategory={onSelectCategory}
          onSelectTag={onSelectTag}
          onSelectTeam={onSelectTeam}
          onTogglePinned={onTogglePinned}
          onToggleSection={onToggleSection}
          openSections={{ briefings: true } as Record<PressRoomSectionKey, boolean>}
          pinnedFeed={[transactionEntry]}
          scoutingCount={1}
          selectedCategory="all"
          selectedTag="all"
          selectedTeam="all"
          teamOptions={['nym', 'bos']}
          transactionFeed={[transactionEntry]}
          unreadCount={1}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Press Room');
    expect(container.textContent).toContain('Archive Size');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('Unread Queue');
    expect(container.textContent).toContain('Scouting Desk');
    expect(container.textContent).toContain('Source Board');
    expect(container.textContent).toContain('Owner pressure is rising.');
    expect(container.textContent).toContain('Transaction Log');
    expect(container.textContent).toContain('Breaking trade headline');
    expect(container.textContent).toContain('Trade');
    expect(container.textContent).toContain('Season 3 • Day 43');
    expect(container.textContent).toContain('2 team briefings tracked');

    const markAllReadButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Mark All Read'),
    );
    const sectionToggle = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Team Briefings'),
    );

    await act(async () => {
      markAllReadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      sectionToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    expect(onToggleSection).toHaveBeenCalledWith('briefings');
  });
});
