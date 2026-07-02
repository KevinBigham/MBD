import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { ShieldAlert } from 'lucide-react';
import type { PressRoomEntry } from '@/shared/types/pressRoom';
import PressRoomSourceBoard, {
  type PressRoomFeedSection,
  type PressRoomSectionKey,
} from './PressRoomSourceBoard';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const unreadEntry: PressRoomEntry = {
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

const pinnedEntry: PressRoomEntry = {
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
    groups: [{ label: 'Season 3 • Day 44', items: [unreadEntry, pinnedEntry] }],
    unreadCount: 1,
  },
];

describe('PressRoomSourceBoard', () => {
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

  it('renders pinned stories, grouped sections, unread state, and delegates actions', async () => {
    const onMarkAllRead = vi.fn();
    const onSelectTeam = vi.fn();
    const onSelectCategory = vi.fn();
    const onSelectTag = vi.fn();
    const onToggleSection = vi.fn();
    const onTogglePinned = vi.fn();

    await act(async () => {
      root.render(
        <PressRoomSourceBoard
          categoryOptions={['owner', 'trade']}
          groupedFeed={groupedFeed}
          isEntryPinned={(entry) => entry.id === pinnedEntry.id}
          isEntryUnread={(entry) => entry.id === unreadEntry.id}
          onMarkAllRead={onMarkAllRead}
          onSelectCategory={onSelectCategory}
          onSelectTag={onSelectTag}
          onSelectTeam={onSelectTeam}
          onTogglePinned={onTogglePinned}
          onToggleSection={onToggleSection}
          openSections={{ briefings: true } as Record<PressRoomSectionKey, boolean>}
          pinnedFeed={[pinnedEntry]}
          selectedCategory="all"
          selectedTag="all"
          selectedTeam="all"
          teamOptions={['nym', 'bos']}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Source Board');
    expect(container.textContent).toContain('Read Later');
    expect(container.textContent).toContain('Breaking trade headline');
    expect(container.textContent).toContain('Team Briefings');
    expect(container.textContent).toContain('2 stories');
    expect(container.textContent).toContain('1 new');
    expect(container.textContent).toContain('Unread');
    expect(container.textContent).toContain('Owner pressure is rising.');
    expect(container.textContent).toContain('Season 3 • Day 44');

    const markAllReadButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Mark All Read'),
    );
    const sectionToggle = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Team Briefings'),
    );
    const pinnedButtons = Array.from(container.querySelectorAll('button')).filter((button) =>
      button.textContent?.includes('Pinned') || button.textContent?.includes('Unpin'),
    );

    await act(async () => {
      markAllReadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      sectionToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      pinnedButtons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    expect(onToggleSection).toHaveBeenCalledWith('briefings');
    expect(onTogglePinned).toHaveBeenCalledWith(pinnedEntry);
  });

  it('renders the quiet empty state when no filtered sections match', async () => {
    await act(async () => {
      root.render(
        <PressRoomSourceBoard
          categoryOptions={[]}
          groupedFeed={[]}
          isEntryPinned={() => false}
          isEntryUnread={() => false}
          onMarkAllRead={vi.fn()}
          onSelectCategory={vi.fn()}
          onSelectTag={vi.fn()}
          onSelectTeam={vi.fn()}
          onTogglePinned={vi.fn()}
          onToggleSection={vi.fn()}
          openSections={{ briefings: true } as Record<PressRoomSectionKey, boolean>}
          pinnedFeed={[]}
          selectedCategory="all"
          selectedTag="all"
          selectedTeam="all"
          teamOptions={[]}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('The room is quiet.');
    expect(container.textContent).toContain('clear a filter');
  });
});
