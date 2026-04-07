/**
 * @module tourDefinition
 * Tour step configurations for the new-player guided tutorial.
 * Pure data — no React imports, no side effects.
 */

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TourStepConfig {
  /** Unique step identifier */
  id: string;
  /** Step title displayed in the popover */
  title: string;
  /** 1-3 sentence explanation */
  description: string;
  /** CSS selector for the element to spotlight. null = centered modal, no spotlight. */
  targetSelector: string | null;
  /** Navigate to this route before showing the step. */
  route?: string;
  /** Preferred popover placement relative to the target. */
  placement?: TourPlacement;
}

export const TOUR_STEPS: readonly TourStepConfig[] = [
  {
    id: 'welcome',
    title: 'Welcome to Mr. Baseball Dynasty',
    description:
      'You are the GM of a professional baseball franchise. Build your roster, develop prospects, make trades, and chase a World Series title across decades of play.',
    targetSelector: null,
    route: '/dashboard',
  },
  {
    id: 'dashboard',
    title: 'The Dashboard',
    description:
      'This is your command center. Standings, roster health, trade intel, farm reports, and finances are all here at a glance. The Game Advisor in the top-right suggests your next move.',
    targetSelector: '[data-tour="dashboard-grid"]',
    route: '/dashboard',
    placement: 'bottom',
  },
  {
    id: 'sim-controls',
    title: 'Sim Controls',
    description:
      'Advance time with these controls. Sim a single day, a full week, or an entire month. Use keyboard shortcuts: Space (day), Shift+Space (week), or Cmd/Ctrl+Space (month).',
    targetSelector: '[data-tour="sim-controls"]',
    route: '/dashboard',
    placement: 'top',
  },
  {
    id: 'sidebar',
    title: 'Navigation',
    description:
      'The sidebar gives you access to every part of your franchise: roster, scouting, draft, trades, finances, and more. On mobile, use the bottom tab bar.',
    targetSelector: '[data-tour="sidebar"]',
    route: '/dashboard',
    placement: 'right',
  },
  {
    id: 'roster',
    title: 'Roster Management',
    description:
      'Manage your 26-man MLB roster and 40-man roster. Set your lineup, promote prospects from the minors, and make roster moves to keep your team competitive.',
    targetSelector: null,
    route: '/roster',
  },
  {
    id: 'draft-trade',
    title: 'Draft & Trade',
    description:
      'The Draft Room lets you scout and select amateur talent. The Trade Center connects you with 31 AI GMs, each with a unique personality that shapes how they negotiate.',
    targetSelector: null,
    route: '/dashboard',
  },
  {
    id: 'press-room',
    title: 'Press Room & Narratives',
    description:
      'The Press Room tracks all league news, from trades to milestones to story arcs. Press conferences let you shape your public image and affect team morale.',
    targetSelector: null,
    route: '/press-room',
  },
  {
    id: 'help-system',
    title: 'Need Help? Look for This Icon',
    description:
      'Every page has a help icon in the top bar. Click it for a quick explanation of what the page does, key actions, and keyboard shortcuts.',
    targetSelector: '[data-tour="contextual-help"]',
    route: '/dashboard',
    placement: 'bottom',
  },
  {
    id: 'ready',
    title: 'You Are Ready',
    description:
      'Start by simming a few days to see your team in action. Check the Press Room for breaking news, then explore the sidebar to dive deeper. Good luck, GM.',
    targetSelector: null,
    route: '/dashboard',
  },
] as const;

export const TOUR_LOCALSTORAGE_KEY = 'mbd-tour-completed';

export const TOUR_TOTAL_STEPS = TOUR_STEPS.length;
