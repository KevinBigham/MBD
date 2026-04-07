/**
 * ContextualHelp — A help icon button that shows a brief page explanation
 * in a dismissible popover. Helps new players understand what each page does.
 */

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface ContextualHelpProps {
  /** Short title for the help card */
  title: string;
  /** 1-3 sentence explanation of what this page does */
  description: string;
  /** Optional list of key actions available on this page */
  actions?: string[];
  /** Optional keyboard shortcuts relevant to this page */
  shortcuts?: Array<{ key: string; description: string }>;
}

export function ContextualHelp({ title, description, actions, shortcuts }: ContextualHelpProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="focus-ring rounded-full p-1 text-dynasty-muted transition-colors hover:bg-dynasty-elevated hover:text-dynasty-text"
        aria-label={`Help: ${title}`}
        aria-expanded={open}
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`Help: ${title}`}
          className="absolute right-0 top-8 z-50 w-72 rounded-lg border border-dynasty-border bg-dynasty-surface p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading text-sm font-semibold text-dynasty-textBright">{title}</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-dynasty-muted transition-colors hover:text-dynasty-text"
              aria-label="Close help"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-2 font-data text-xs leading-relaxed text-dynasty-muted">{description}</p>
          {actions && actions.length > 0 && (
            <div className="mt-3 border-t border-dynasty-border pt-2">
              <div className="font-heading text-[10px] uppercase tracking-wider text-dynasty-muted">Key Actions</div>
              <ul className="mt-1 space-y-1">
                {actions.map((action) => (
                  <li key={action} className="flex items-center gap-1.5 font-data text-xs text-dynasty-text">
                    <span className="h-1 w-1 rounded-full bg-accent-primary" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {shortcuts && shortcuts.length > 0 && (
            <div className="mt-3 border-t border-dynasty-border pt-2">
              <div className="font-heading text-[10px] uppercase tracking-wider text-dynasty-muted">Keyboard Shortcuts</div>
              <div className="mt-1 space-y-1">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between gap-2">
                    <span className="font-data text-xs text-dynasty-text">{shortcut.description}</span>
                    <kbd className="rounded border border-dynasty-border bg-dynasty-elevated px-1.5 py-0.5 font-data text-[10px] text-dynasty-muted">{shortcut.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pre-defined help content for each page. Used by PageHeader components
 * to automatically show contextual help without each page defining its own.
 */
export const PAGE_HELP: Record<string, ContextualHelpProps> = {
  '/dashboard': {
    title: 'Front Office',
    description: 'Your command center. See standings, recent game results, roster health, trade intel, farm system status, and financial overview at a glance.',
    actions: ['Sim Day/Week/Month with bottom controls', 'Click cards to navigate to details'],
    shortcuts: [
      { key: 'Space', description: 'Sim one day' },
      { key: 'Shift+Space', description: 'Sim one week' },
      { key: 'Cmd/Ctrl+Space', description: 'Sim one month' },
      { key: 'Cmd/Ctrl+K', description: 'Command palette' },
    ],
  },
  '/front-office': {
    title: 'Owner Intel',
    description: 'Monitor your owner\'s patience, team chemistry, front office reputation, and budget outlook. Keep the owner happy or risk getting fired.',
    actions: ['Track owner satisfaction', 'Monitor team chemistry score'],
  },
  '/roster': {
    title: 'Roster Management',
    description: 'Manage your 26-man MLB roster, 40-man roster, and minor league affiliates. Set your lineup, manage the depth chart, and make roster moves.',
    actions: ['Drag players to set lineup', 'Promote/demote players', 'DFA players off the 40-man'],
  },
  '/minors': {
    title: 'Minor League System',
    description: 'Track prospect development across your 5-level farm system. See pipeline rankings, affiliate box scores, and identify promotion candidates.',
    actions: ['View prospect development reports', 'Identify callup candidates'],
  },
  '/scouting': {
    title: 'Scouting Department',
    description: 'Your scouts evaluate players with varying accuracy based on their quality and specialty. International free agent pool and scout conflicts are tracked here.',
    actions: ['Scout players for reports', 'Sign IFA prospects', 'Resolve scout conflicts'],
  },
  '/staff': {
    title: 'Coaching Staff',
    description: 'Manage your 12-role coaching staff. Each coach has teaching ability, specialty, and personality fit that affect player development.',
    actions: ['Hire/fire coaches (offseason only)', 'View coaching impact on development'],
  },
  '/draft': {
    title: 'Draft Room',
    description: 'The annual 20-round amateur draft. Scout prospects, manage your big board, and make picks. AI teams draft based on BPA + need + signability.',
    actions: ['Scout prospects pre-draft', 'Make draft picks', 'Sign drafted players'],
  },
  '/trade': {
    title: 'Trade Center',
    description: 'Propose trades, review incoming offers, and negotiate with AI GMs. Each GM has a personality that affects trade tendencies. Watch the deadline ticker for league-wide action.',
    actions: ['Build trade packages', 'Counter-offer incoming trades', 'Monitor deadline chatter'],
  },
  '/league/standings': {
    title: 'League Standings',
    description: 'Division standings for all 32 teams across 6 divisions. Track wins, losses, winning percentage, games back, and streaks.',
  },
  '/league/leaders': {
    title: 'League Leaders',
    description: 'Leaderboards for batting and pitching stats. Includes advanced sabermetrics: WAR, wOBA, FIP, xFIP, wRC+, and more.',
    actions: ['Switch between stat categories', 'Click player names for profiles'],
  },
  '/stats': {
    title: 'Stats Encyclopedia',
    description: 'Reference guide for every advanced stat used in MBD. Learn what WAR, wOBA, FIP, and other sabermetrics mean, how they\'re calculated, and what values are considered good.',
  },
  '/records': {
    title: 'Record Watch',
    description: 'Track players who are on pace to break franchise or league records. See projected values, current progress, and the records they\'re chasing.',
    actions: ['View active record chases', 'Browse franchise/league record books'],
  },
  '/schedule': {
    title: 'Season Schedule',
    description: 'Your team\'s 162-game schedule with results. Click any completed game to see the box score and play-by-play.',
    actions: ['Click games for box scores'],
  },
  '/playoffs': {
    title: 'Playoff Bracket',
    description: 'The postseason bracket: Wild Card, Division Series, Championship Series, and World Series. Sim games or watch series unfold.',
    actions: ['Sim playoff games/series', 'View series results'],
  },
  '/press-room': {
    title: 'Press Room',
    description: 'All team and league news, briefings, and narrative updates. Stories are tagged by category (BREAKING, ANALYSIS, RECAP, RUMOR, WATCH).',
    actions: ['Mark stories as read', 'Filter by source/category'],
  },
  '/history': {
    title: 'Franchise History',
    description: 'Your dynasty\'s complete history: season archives, franchise/league records, Hall of Fame, dynasty score, dynasty cards, and timeline branches.',
    actions: ['Compare seasons side-by-side', 'View dynasty cards', 'Manage what-if branches'],
  },
  '/career': {
    title: 'GM Career',
    description: 'Your career as a general manager across teams. Track your legacy score, job history, and apply for new jobs if fired.',
    actions: ['View career stats', 'Apply for open GM positions'],
  },
  '/achievements': {
    title: 'Trophy Room',
    description: 'Track progress toward 48+ achievements across 5 categories: dynasty, development, moneyball, records, and longevity.',
  },
  '/finance': {
    title: 'Team Finances',
    description: 'Payroll breakdown, luxury tax status, budget allocation, and contract details. Keep spending under control to avoid owner frustration.',
  },
  '/rivalries': {
    title: 'Rivalries',
    description: 'Dynamic rivalries form from division proximity, playoff meetings, and blockbuster trades. Track intensity, head-to-head records, and rivalry narratives.',
  },
  '/pulse': {
    title: 'Monthly Pulse',
    description: 'Monthly reports with your team\'s performance, key decisions that need attention, and scenario progress updates.',
    actions: ['Acknowledge monthly reports', 'Make highlighted decisions'],
  },
  '/scenarios': {
    title: 'Challenge Mode',
    description: '10 pre-built scenarios with unique win conditions. Test your GM skills under specific constraints like salary caps, rebuild timelines, or dynasty goals.',
    actions: ['Select and start challenges', 'Track active progress'],
  },
  '/free-agency': {
    title: 'Free Agency',
    description: 'The international free agent pool. Scout IFA prospects, make bonus offers, and trade pool space with other teams.',
    actions: ['Scout IFA prospects', 'Sign players with bonus money', 'Trade pool space'],
  },
  '/offseason': {
    title: 'Offseason',
    description: 'The 12-phase offseason: arbitration, tender decisions, extensions, qualifying offers, coaching, draft, IFA, retirements, and spring training.',
    actions: ['Advance through phases', 'Make offseason decisions'],
  },
  '/settings': {
    title: 'Settings',
    description: 'Customize sim speed, audio preferences, table density, visual themes, and accessibility options.',
  },
};
