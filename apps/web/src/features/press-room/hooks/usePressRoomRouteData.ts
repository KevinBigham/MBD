import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  Mic,
  Radio,
  Search,
  ShieldAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { logger } from '@/shared/lib/logger';
import type { PressRoomEntry } from '@/shared/types/pressRoom';
import type {
  PressRoomFeedSection,
  PressRoomSectionKey,
} from '../components/PressRoomSourceBoard';

const SECTION_DEFINITIONS: Array<{
  key: PressRoomSectionKey;
  label: string;
  description: string;
  icon: LucideIcon;
  matches: (entry: PressRoomEntry) => boolean;
}> = [
  {
    key: 'briefings',
    label: 'Team Briefings',
    description: 'Internal pulses from ownership, chemistry, and the front office desk.',
    icon: ShieldAlert,
    matches: (entry) => entry.source === 'briefing' && entry.category !== 'development',
  },
  {
    key: 'league_wire',
    label: 'League Wire',
    description: 'League movement, rumor circulation, and broader narrative spillover.',
    icon: Radio,
    matches: (entry) => entry.source === 'league_wire' || entry.source === 'news',
  },
  {
    key: 'press_conferences',
    label: 'Press Conferences',
    description: 'Media-room framing, sharper questions, and public-facing tension points.',
    icon: Mic,
    matches: (entry) => entry.source === 'press_conference',
  },
  {
    key: 'scouting',
    label: 'Scouting Reports',
    description: 'Prospect momentum, development notes, and promotion pressure from the farm.',
    icon: Search,
    matches: (entry) => entry.category === 'development',
  },
];

const DEFAULT_OPEN_SECTIONS: Record<PressRoomSectionKey, boolean> = {
  briefings: true,
  league_wire: true,
  press_conferences: true,
  scouting: true,
};

const PRESS_READ_STORAGE_KEY = 'mbd-press-room-read-ids';
const PRESS_PINNED_STORAGE_KEY = 'mbd-press-room-pinned-ids';

interface UsePressRoomRouteDataOptions {
  day: number;
  getPressRoomFeed: (limit: number) => Promise<unknown>;
  isInitialized: boolean;
  lastVisitedPressRoomAt: string | null;
  phase: string;
  season: number;
  setLastVisitedPressRoomAt: (timestamp: string) => void;
  workerReady: boolean;
}

interface UsePressRoomRouteDataResult {
  briefingCount: number;
  categoryOptions: string[];
  feed: PressRoomEntry[];
  groupedFeed: PressRoomFeedSection[];
  isEntryPinned: (entry: PressRoomEntry) => boolean;
  isEntryUnread: (entry: PressRoomEntry) => boolean;
  markAllRead: () => void;
  openSections: Record<PressRoomSectionKey, boolean>;
  pinnedFeed: PressRoomEntry[];
  scoutingCount: number;
  selectedCategory: string;
  selectedTag: 'all' | PressRoomEntry['tag'];
  selectedTeam: string;
  setSelectedCategory: Dispatch<SetStateAction<string>>;
  setSelectedTag: Dispatch<SetStateAction<'all' | PressRoomEntry['tag']>>;
  setSelectedTeam: Dispatch<SetStateAction<string>>;
  teamOptions: string[];
  togglePinned: (entry: PressRoomEntry) => void;
  toggleSection: (section: PressRoomSectionKey) => void;
  transactionFeed: PressRoomEntry[];
  unreadCount: number;
}

function entryKey(entry: PressRoomEntry): string {
  return `${entry.source}:${entry.id}:${entry.timestamp}`;
}

function readStoredIdSet(key: string): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    const parsed = rawValue ? JSON.parse(rawValue) as unknown : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeStoredIdSet(key: string, values: Set<string>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(Array.from(values).slice(-300)));
}

function parseTimestamp(timestamp: string): number {
  if (timestamp === 'NOW') return Number.MAX_SAFE_INTEGER;
  const match = /^S(\d+)D(\d+)$/.exec(timestamp);
  if (!match) return 0;
  return Number(match[1]) * 1000 + Number(match[2]);
}

function formatTimestampLabel(timestamp: string): string {
  if (timestamp === 'NOW') return 'Now';
  const match = /^S(\d+)D(\d+)$/.exec(timestamp);
  if (!match) return timestamp;
  return `Season ${match[1]} • Day ${match[2]}`;
}

function groupFeedByTimestamp(feed: PressRoomEntry[]): Array<{ label: string; items: PressRoomEntry[] }> {
  const groups = new Map<string, PressRoomEntry[]>();
  for (const entry of feed) {
    const current = groups.get(entry.timestamp) ?? [];
    current.push(entry);
    groups.set(entry.timestamp, current);
  }

  return Array.from(groups.entries()).map(([timestamp, items]) => ({
    label: formatTimestampLabel(timestamp),
    items,
  }));
}

function isTransactionEntry(entry: PressRoomEntry): boolean {
  return ['trade', 'signing', 'extension', 'qualifying_offer', 'coaching', 'roster_move'].includes(entry.category);
}

export function usePressRoomRouteData({
  day,
  getPressRoomFeed,
  isInitialized,
  lastVisitedPressRoomAt,
  phase,
  season,
  setLastVisitedPressRoomAt,
  workerReady,
}: UsePressRoomRouteDataOptions): UsePressRoomRouteDataResult {
  const visitBaselineRef = useRef(lastVisitedPressRoomAt);
  const [feed, setFeed] = useState<PressRoomEntry[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState<'all' | PressRoomEntry['tag']>('all');
  const [openSections, setOpenSections] = useState<Record<PressRoomSectionKey, boolean>>(DEFAULT_OPEN_SECTIONS);
  const [readIds, setReadIds] = useState<Set<string>>(() => readStoredIdSet(PRESS_READ_STORAGE_KEY));
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => readStoredIdSet(PRESS_PINNED_STORAGE_KEY));

  const fetchFeed = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    try {
      const nextFeed = await getPressRoomFeed(100);
      setFeed((nextFeed ?? []) as PressRoomEntry[]);
    } catch (err) {
      logger.error('Failed to fetch press room feed:', err);
    }
  }, [getPressRoomFeed, isInitialized, workerReady]);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed, day, season, phase]);

  useEffect(() => {
    writeStoredIdSet(PRESS_READ_STORAGE_KEY, readIds);
  }, [readIds]);

  useEffect(() => {
    writeStoredIdSet(PRESS_PINNED_STORAGE_KEY, pinnedIds);
  }, [pinnedIds]);

  useEffect(() => {
    if (feed.length === 0) {
      return;
    }

    const latestTimestamp = feed.reduce(
      (latest, entry) => (parseTimestamp(entry.timestamp) > parseTimestamp(latest) ? entry.timestamp : latest),
      feed[0]!.timestamp,
    );
    if (latestTimestamp !== lastVisitedPressRoomAt) {
      setLastVisitedPressRoomAt(latestTimestamp);
    }
  }, [feed, lastVisitedPressRoomAt, setLastVisitedPressRoomAt]);

  const isEntryUnread = useCallback((entry: PressRoomEntry) => {
    if (readIds.has(entryKey(entry))) {
      return false;
    }
    const visitBaseline = visitBaselineRef.current;
    if (!visitBaseline) {
      return true;
    }
    return parseTimestamp(entry.timestamp) > parseTimestamp(visitBaseline);
  }, [readIds]);

  const briefingCount = feed.filter((entry) => entry.source === 'briefing' && entry.category !== 'development').length;
  const scoutingCount = feed.filter((entry) => entry.category === 'development').length;
  const unreadCount = feed.filter(isEntryUnread).length;
  const teamOptions = useMemo(() => {
    const ids = new Set(feed.flatMap((entry) => entry.relatedTeamIds));
    return Array.from(ids).sort();
  }, [feed]);
  const categoryOptions = useMemo(() => Array.from(new Set(feed.map((entry) => entry.category))).sort(), [feed]);

  const filteredFeed = feed.filter((entry) => {
    const teamMatch = selectedTeam === 'all' || entry.relatedTeamIds.includes(selectedTeam);
    const categoryMatch = selectedCategory === 'all' || entry.category === selectedCategory;
    const tagMatch = selectedTag === 'all' || entry.tag === selectedTag;
    return teamMatch && categoryMatch && tagMatch;
  });

  const pinnedFeed = useMemo(
    () => feed.filter((entry) => pinnedIds.has(entryKey(entry))).slice(0, 8),
    [feed, pinnedIds],
  );

  const groupedFeed = useMemo<PressRoomFeedSection[]>(() => SECTION_DEFINITIONS
    .map((section) => {
      const entries = filteredFeed.filter(section.matches);
      return {
        key: section.key,
        label: section.label,
        description: section.description,
        icon: section.icon,
        groups: groupFeedByTimestamp(entries),
        unreadCount: entries.filter(isEntryUnread).length,
      };
    })
    .filter((section) => section.groups.length > 0), [filteredFeed, isEntryUnread]);

  const transactionFeed = filteredFeed.filter(isTransactionEntry).slice(0, 12);

  const markAllRead = useCallback(() => {
    setReadIds((current) => {
      const next = new Set(current);
      for (const entry of filteredFeed) {
        next.add(entryKey(entry));
      }
      return next;
    });

    if (filteredFeed.length > 0) {
      const latestTimestamp = filteredFeed.reduce(
        (latest, entry) => (parseTimestamp(entry.timestamp) > parseTimestamp(latest) ? entry.timestamp : latest),
        filteredFeed[0]!.timestamp,
      );
      visitBaselineRef.current = latestTimestamp;
      setLastVisitedPressRoomAt(latestTimestamp);
    }
  }, [filteredFeed, setLastVisitedPressRoomAt]);

  const togglePinned = useCallback((entry: PressRoomEntry) => {
    const key = entryKey(entry);
    setPinnedIds((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleSection = useCallback((section: PressRoomSectionKey) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }, []);

  const isEntryPinned = useCallback((entry: PressRoomEntry) => (
    pinnedIds.has(entryKey(entry))
  ), [pinnedIds]);

  return {
    briefingCount,
    categoryOptions,
    feed,
    groupedFeed,
    isEntryPinned,
    isEntryUnread,
    markAllRead,
    openSections,
    pinnedFeed,
    scoutingCount,
    selectedCategory,
    selectedTag,
    selectedTeam,
    setSelectedCategory,
    setSelectedTag,
    setSelectedTeam,
    teamOptions,
    togglePinned,
    toggleSection,
    transactionFeed,
    unreadCount,
  };
}
