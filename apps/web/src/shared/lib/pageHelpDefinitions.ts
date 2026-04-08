export interface PageHelpEntry {
  readonly title: string;
  readonly description: string;
  readonly tips: readonly string[];
  readonly relatedRoutes: readonly { label: string; path: string }[];
}

export const PAGE_HELP: Record<string, PageHelpEntry> = {
  dashboard: {
    title: 'Dashboard',
    description:
      'Your command center. The dashboard shows franchise identity, top performers, game recaps, and 6 intel cards covering standings, roster health, trade intel, farm reports, finances, and press digest.',
    tips: [
      'Press Space to sim a day, Shift+Space for a week, Ctrl+Space for a month',
      'Click any intel card heading to navigate to the full page',
      'The GameAdvisor at the top suggests your next best action',
      'Active story arcs appear at the bottom — they track season narratives',
    ],
    relatedRoutes: [
      { label: 'Roster', path: '/roster' },
      { label: 'Standings', path: '/league/standings' },
      { label: 'Press Room', path: '/press-room' },
    ],
  },
  roster: {
    title: 'Roster Management',
    description:
      'Manage your 26-man MLB roster and 40-man roster. Promote/demote players, set your lineup, and handle roster compliance.',
    tips: [
      'Drag and drop players in the Lineup tab to set your batting order',
      'Watch for roster compliance alerts — you need minimum pitchers and position players',
      'The Contracts tab shows salary commitments and cap space',
      'Promote top prospects from the Minors tab when they are ready',
    ],
    relatedRoutes: [
      { label: 'Minors', path: '/minors' },
      { label: 'Players', path: '/players' },
      { label: 'Finance', path: '/finance' },
    ],
  },
  draft: {
    title: 'Amateur Draft',
    description:
      'Select from a 750-prospect draft class across multiple rounds. Scout prospects, read draft commentary, and build your farm system.',
    tips: [
      'Scout prospects before picking — scouting reveals true ratings vs. projected',
      'The Big Board shows AI team needs and draft tendencies',
      'Signability matters — high picks cost more bonus pool money',
      'Post-draft, check Draft Grades to see how analysts rate your haul',
    ],
    relatedRoutes: [
      { label: 'Scouting', path: '/scouting' },
      { label: 'Minors', path: '/minors' },
      { label: 'Players', path: '/players' },
    ],
  },
  trade: {
    title: 'Trade Center',
    description:
      'Propose trades, respond to AI offers, and navigate the trade deadline. Each GM has a personality that affects negotiations.',
    tips: [
      'Check the Trade Deadline countdown — activity heats up near the deadline',
      'GM personalities affect willingness: some value prospects, others want win-now pieces',
      'The Trade Dialogue shows real-time negotiation back-and-forth',
      'Rivalry teams may refuse trades with you — check the rivalry penalty',
    ],
    relatedRoutes: [
      { label: 'Roster', path: '/roster' },
      { label: 'Finance', path: '/finance' },
      { label: 'Rivalries', path: '/rivalries' },
    ],
  },
  standings: {
    title: 'League Standings',
    description:
      'View all 6 divisions with win-loss records, winning percentage, games back, run differential, and streaks.',
    tips: [
      'Your team is highlighted in orange',
      'Green run differential means you are outscoring opponents — a sign of a strong team',
      'Watch the GB (games back) column to track your playoff position',
    ],
    relatedRoutes: [
      { label: 'Leaders', path: '/league/leaders' },
      { label: 'Schedule', path: '/schedule' },
      { label: 'Playoffs', path: '/playoffs' },
    ],
  },
  scouting: {
    title: 'Scouting Department',
    description:
      'Your scouting staff evaluates domestic and international talent. Scout quality affects report accuracy.',
    tips: [
      'Higher quality scouts produce more accurate reports',
      'Each scout has biases — they may overrate or underrate certain tools',
      'The IFA (International Free Agents) tab manages your international bonus pool',
      'Scout conflicts arise when your scouts disagree on a prospect — resolve them for clarity',
    ],
    relatedRoutes: [
      { label: 'Draft', path: '/draft' },
      { label: 'Players', path: '/players' },
      { label: 'Staff', path: '/staff' },
    ],
  },
  finance: {
    title: 'Team Finances',
    description:
      'Track payroll, luxury tax, budget, and contract commitments. Stay under the luxury tax threshold or pay the penalty.',
    tips: [
      'The luxury tax has 3 tiers — repeated overspending increases the penalty rate',
      'Check future commitments to plan long-term spending',
      'Market size affects your base budget — small market teams must be more creative',
      'Coaching staff has its own payroll line — factor it into spending plans',
    ],
    relatedRoutes: [
      { label: 'Roster', path: '/roster' },
      { label: 'Trade', path: '/trade' },
      { label: 'Free Agency', path: '/free-agency' },
    ],
  },
  settings: {
    title: 'Settings',
    description:
      'Configure audio, simulation speed, display density, accessibility options, and manage save data.',
    tips: [
      'Sim speed affects how much detail is shown during simulation',
      'Enable reduced motion for a calmer UI experience',
      'The Diagnostics section shows performance metrics and save health',
      'You can restart the tutorial tour from this page',
    ],
    relatedRoutes: [],
  },
  history: {
    title: 'Franchise History',
    description:
      'Browse past seasons, compare timelines, view dynasty chapters, and watch season recap cinematics.',
    tips: [
      'The Timeline Comparison panel lets you compare stats across seasons with charts',
      'Season Recap plays a cinematic slideshow of your season highlights',
      'Dynasty chapters segment your franchise history into narrative eras',
      'Award history tracks MVP, Cy Young, and other honors across all seasons',
    ],
    relatedRoutes: [
      { label: 'Records', path: '/records' },
      { label: 'Achievements', path: '/achievements' },
      { label: 'GM Career', path: '/career' },
    ],
  },
  'press-room': {
    title: 'Press Room',
    description:
      'Your media hub. Read team briefings, league wire stories, scouting reports, and respond to press conferences.',
    tips: [
      'Filter by tag to find BREAKING news, ANALYSIS, or RUMORS',
      'Press conferences pop up during the season — your responses affect morale and owner satisfaction',
      'The transaction log at the bottom tracks all roster moves',
    ],
    relatedRoutes: [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Front Office', path: '/front-office' },
    ],
  },
};
