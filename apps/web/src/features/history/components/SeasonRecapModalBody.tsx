import type { ReactNode } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Star,
  Target,
  Trophy,
} from 'lucide-react';
import SeasonRecapAwardsSlide from './SeasonRecapAwardsSlide';
import SeasonRecapLeadersSlide from './SeasonRecapLeadersSlide';
import SeasonRecapNarrativeSlide from './SeasonRecapNarrativeSlide';
import SeasonRecapRecordSlide from './SeasonRecapRecordSlide';
import SeasonRecapTitleSlide from './SeasonRecapTitleSlide';
import SeasonRecapTransactionsSlide from './SeasonRecapTransactionsSlide';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeasonRecapData {
  season: number;
  teamName: string;
  teamId: string;
  record: string;
  winPct: string;
  divisionRank: number;
  gamesBack: number;
  playoffResult: string | null;
  isChampion: boolean;
  statLeaders: {
    hr: { name: string; value: string } | null;
    rbi: { name: string; value: string } | null;
    avg: { name: string; value: string } | null;
    era: { name: string; value: string } | null;
    k: { name: string; value: string } | null;
    w: { name: string; value: string } | null;
  };
  awards: Array<{ award: string; playerName: string }>;
  keyTransactions: Array<{ description: string }>;
  narrative: string;
  storylines: string[];
  fanSentiment: number | null;
  payroll: string | null;
}

export type SeasonRecapSlideId = 'title' | 'record' | 'leaders' | 'awards' | 'transactions' | 'narrative';

export interface SeasonRecapSlideConfig {
  id: SeasonRecapSlideId;
  label: string;
  icon: ReactNode;
  shouldShow: (data: SeasonRecapData) => boolean;
}

interface SeasonRecapModalBodyProps {
  data: SeasonRecapData;
  slideId: SeasonRecapSlideId;
  reducedMotion: boolean;
}

// ---------------------------------------------------------------------------
// Slide Definitions
// ---------------------------------------------------------------------------

export const SEASON_RECAP_SLIDES: SeasonRecapSlideConfig[] = [
  {
    id: 'title',
    label: 'Season',
    icon: <Target className="h-4 w-4" />,
    shouldShow: () => true,
  },
  {
    id: 'record',
    label: 'Record',
    icon: <BarChart3 className="h-4 w-4" />,
    shouldShow: () => true,
  },
  {
    id: 'leaders',
    label: 'Leaders',
    icon: <Star className="h-4 w-4" />,
    shouldShow: (d) => Object.values(d.statLeaders).some((v) => v != null),
  },
  {
    id: 'awards',
    label: 'Awards',
    icon: <Trophy className="h-4 w-4" />,
    shouldShow: (d) => d.awards.length > 0,
  },
  {
    id: 'transactions',
    label: 'Moves',
    icon: <ArrowLeftRight className="h-4 w-4" />,
    shouldShow: (d) => d.keyTransactions.length > 0,
  },
  {
    id: 'narrative',
    label: 'Story',
    icon: <BookOpen className="h-4 w-4" />,
    shouldShow: () => true,
  },
];

export function getVisibleSeasonRecapSlides(data: SeasonRecapData): SeasonRecapSlideConfig[] {
  return SEASON_RECAP_SLIDES.filter((slide) => slide.shouldShow(data));
}

// ---------------------------------------------------------------------------
// Slides
// ---------------------------------------------------------------------------

function renderSlide(data: SeasonRecapData, slideId: SeasonRecapSlideId) {
  switch (slideId) {
    case 'title':
      return <SeasonRecapTitleSlide data={data} />;
    case 'record':
      return <SeasonRecapRecordSlide data={data} />;
    case 'leaders':
      return <SeasonRecapLeadersSlide data={data} />;
    case 'awards':
      return <SeasonRecapAwardsSlide data={data} />;
    case 'transactions':
      return <SeasonRecapTransactionsSlide data={data} />;
    case 'narrative':
      return <SeasonRecapNarrativeSlide data={data} />;
    default:
      return null;
  }
}

export function SeasonRecapModalBody({ data, slideId, reducedMotion }: SeasonRecapModalBodyProps) {
  const animClass = reducedMotion ? '' : 'motion-safe:animate-ceremony-fade-in';

  return (
    <div className={`min-h-[320px] px-8 py-8 ${animClass}`}>
      {renderSlide(data, slideId)}
    </div>
  );
}
