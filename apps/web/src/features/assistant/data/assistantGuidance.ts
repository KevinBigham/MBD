import type { AssistantMode } from '../lib/assistantState';

export const REQUIRED_ASSISTANT_ROUTE_KEYS = [
  'setup',
  'onboarding',
  'dashboard',
  'roster',
  'minors',
  'players',
  'player-compare',
  'player-profile',
  'scouting',
  'staff',
  'draft',
  'trade',
  'standings',
  'leaders',
  'schedule',
  'box-score',
  'press-room',
  'playoffs',
  'free-agency',
  'offseason',
  'finance',
  'career',
  'history',
  'achievements',
  'rivalries',
  'front-office',
  'pulse',
  'scenarios',
  'stats',
  'records',
  'settings',
] as const;

export type AssistantRouteKey = typeof REQUIRED_ASSISTANT_ROUTE_KEYS[number];

export interface AssistantAction {
  label: string;
  route: string;
  reason: string;
}

export interface AssistantGuidance {
  routeKey: AssistantRouteKey;
  title: string;
  pagePurpose: string;
  whenToUse: string;
  decision: string;
  ratingsFocus: string;
  suggestedAction: AssistantAction;
  deeperStrategy: string;
  mobileTip: string;
}

export interface AssistantNextActionContext {
  routeKey: AssistantRouteKey;
  phase: string;
  day: number;
  season: number;
  mode: AssistantMode;
}

export interface AssistantTickerItem {
  id: string;
  category?: string;
  text: string;
}

export interface AssistantStoryCallback {
  id: string;
  tone: 'neutral' | 'success' | 'warning' | 'excited';
  title: string;
  body: string;
}

export interface AssistantStoryContext {
  phase: string;
  day: number;
  season: number;
  routeKey: AssistantRouteKey;
  seenStoryCallbacks: Record<string, true>;
  tickerFeed: readonly AssistantTickerItem[];
}

function action(label: string, route: string, reason: string): AssistantAction {
  return { label, route, reason };
}

export const ASSISTANT_GUIDANCE: Record<AssistantRouteKey, AssistantGuidance> = {
  setup: {
    routeKey: 'setup',
    title: 'Start the dynasty cleanly',
    pagePurpose: 'The Save Hub is where you create, continue, branch, or delete local dynasties.',
    whenToUse: 'Use it when starting a new club, continuing a long save, or branching a what-if timeline.',
    decision: 'Choose Quick Start if you want the front office fast; choose Full Day One if you want more context and role-play.',
    ratingsFocus: 'Team previews include player OVR so you can spot whether the club starts star-heavy, balanced, or rebuilding.',
    suggestedAction: action('Start or continue a save', '/', 'A live save unlocks the Assistant and route-aware guidance.'),
    deeperStrategy: 'For a first save, a balanced club is easier than a teardown. Hardcore players may prefer a weak roster with payroll room.',
    mobileTip: 'Save actions stack vertically on mobile; keep the Assistant collapsed until the first dashboard.',
  },
  onboarding: {
    routeKey: 'onboarding',
    title: 'Get through Day One with intent',
    pagePurpose: 'Onboarding introduces the owner, staff, roster, scouting, finances, and first front-office identity.',
    whenToUse: 'Use this flow once per new dynasty, or replay guidance from Settings if the opening choices blur together.',
    decision: 'Pick the style and early priorities that match the club you want to build.',
    ratingsFocus: 'Roster and staff grades summarize current ability; treat them as a first diagnosis, not a final plan.',
    suggestedAction: action('Finish Day One', '/onboarding', 'Completing onboarding hands you to the real dashboard with a prepared save.'),
    deeperStrategy: 'Your choices should create a mental model: win now, develop, spend carefully, or aggressively reshape the club.',
    mobileTip: 'Read one chapter at a time and use the primary CTA at the bottom of each panel.',
  },
  dashboard: {
    routeKey: 'dashboard',
    title: 'Know the next move before you sim',
    pagePurpose: 'The dashboard is the command center for standings, roster health, farm, trades, finances, stories, and sim controls.',
    whenToUse: 'Use it before every sim chunk to decide whether the club is ready for more days to pass.',
    decision: 'Decide whether to sim, fix a roster issue, scout, check finances, review trades, or read the latest story.',
    ratingsFocus: 'Dashboard cards do not show every OVR, but roster health, farm, and trade intel all point you toward rating checks.',
    suggestedAction: action('Review one red or yellow card', '/dashboard', 'Handle urgent cards before simming a week or month.'),
    deeperStrategy: 'A good rhythm is dashboard, one decision page, then sim. Avoid simming past deadlines without checking roster and budget.',
    mobileTip: 'Use the Assistant route link instead of hunting through More when a card points to a deeper page.',
  },
  roster: {
    routeKey: 'roster',
    title: 'Turn ratings into a legal roster',
    pagePurpose: 'Roster manages the active club, 40-man, lineup, depth chart, contracts, promotions, and compliance.',
    whenToUse: 'Use it after injuries, trades, promotions, or any compliance alert.',
    decision: 'Choose who plays, who sits, who moves levels, and who leaves the roster.',
    ratingsFocus: 'OVR and grade show current talent; position, service time, options, stats, and role fit decide the actual move.',
    suggestedAction: action('Check roster compliance', '/roster', 'A legal roster keeps simulation moving and prevents avoidable losses.'),
    deeperStrategy: 'Do not chase OVR blindly. A 61 OVR shortstop can be more useful than a 64 OVR bat without a defensive home.',
    mobileTip: 'Roster tables scroll horizontally; use Assistant explanations before making a dense mobile move.',
  },
  minors: {
    routeKey: 'minors',
    title: 'Develop the next core',
    pagePurpose: 'Minors tracks affiliates, development, prospects, breakout signals, and promotion candidates.',
    whenToUse: 'Use it monthly, after injuries, and before the deadline or offseason.',
    decision: 'Decide whether a prospect should stay, move up, change role, or become trade capital.',
    ratingsFocus: 'OVR is current readiness; ceiling, age, level, momentum, and scouting confidence tell the development story.',
    suggestedAction: action('Review promotion candidates', '/minors', 'Ready prospects can patch the MLB roster or raise your long-term ceiling.'),
    deeperStrategy: 'A promotion should solve a role and match the player timeline. Rushing a high-ceiling player can waste development value.',
    mobileTip: 'Use one prospect card at a time; avoid comparing too many minor league rows on a small screen.',
  },
  players: {
    routeKey: 'players',
    title: 'Find the right player, not just the famous one',
    pagePurpose: 'Players is the searchable league directory and quick scan for names, teams, positions, OVR, grades, and stats.',
    whenToUse: 'Use it when chasing leaders, researching trade targets, or finding a player profile.',
    decision: 'Decide who deserves a deeper profile or comparison.',
    ratingsFocus: 'OVR and grade are the quick filter; recent stats and age decide whether to investigate more.',
    suggestedAction: action('Search a need position', '/players', 'Start with role fit, then open profiles for ratings and story.'),
    deeperStrategy: 'Hardcore scan: position, OVR, age, WAR, then profile tabs for durability, development, and contract context.',
    mobileTip: 'Rows become cards on mobile; tap a player for the profile instead of over-reading the table.',
  },
  'player-compare': {
    routeKey: 'player-compare',
    title: 'Choose between two paths',
    pagePurpose: 'Compare puts two players side by side across ratings, attributes, production, and fit.',
    whenToUse: 'Use it before trades, promotions, free-agent offers, or lineup decisions.',
    decision: 'Decide which player fits the role, timeline, and risk profile.',
    ratingsFocus: 'OVR is the headline; attribute spread, age, contract, and trend explain why two equal OVR players are not equal.',
    suggestedAction: action('Compare two candidates', '/players/compare', 'A side-by-side view prevents name-value mistakes.'),
    deeperStrategy: 'Use compare for replacement decisions: if the gain is marginal, keep the cheaper or more flexible player.',
    mobileTip: 'Compare works best when you pick two players first, then read one section at a time.',
  },
  'player-profile': {
    routeKey: 'player-profile',
    title: 'Read the full player file',
    pagePurpose: 'Profiles explain a player through ratings, stats, scouting, development, personality, moments, and history.',
    whenToUse: 'Use it before any meaningful player-specific decision.',
    decision: 'Decide whether to play, promote, trade, extend, bench, or build around the player.',
    ratingsFocus: 'Current OVR, grade bars, ceiling/floor, and tab-specific reports show talent, risk, and trajectory.',
    suggestedAction: action('Check development and scouting tabs', '/players', 'Current OVR matters more when you understand where it is heading.'),
    deeperStrategy: 'Profile reading order: header OVR, role/position, recent stats, development trend, contract, then story/personality.',
    mobileTip: 'Use tabs as chapters; do not try to consume the full profile in one scroll.',
  },
  scouting: {
    routeKey: 'scouting',
    title: 'Reduce uncertainty before big bets',
    pagePurpose: 'Scouting manages reports, international prospects, scout learning, and disagreements.',
    whenToUse: 'Use it before draft picks, signings, trades, and international spending.',
    decision: 'Decide who needs more looks and whose report you trust.',
    ratingsFocus: 'Scouted OVR, ceiling, floor, confidence, and scout conflicts tell you how much to believe the number.',
    suggestedAction: action('Scout one uncertain target', '/scouting', 'Better information prevents paying full price for guesswork.'),
    deeperStrategy: 'Low-confidence high-upside reports are portfolio bets; high-confidence average reports are depth bets.',
    mobileTip: 'Use the report panel for detail; tables are for narrowing the pool.',
  },
  staff: {
    routeKey: 'staff',
    title: 'Make development better on purpose',
    pagePurpose: 'Staff controls coaches and development infrastructure.',
    whenToUse: 'Use it during onboarding and offseason, or when development outcomes lag.',
    decision: 'Decide which coaches improve your player pipeline and clubhouse fit.',
    ratingsFocus: 'Teaching, impact, specialty, and fit are coach ratings; they change how player OVR evolves over time.',
    suggestedAction: action('Review weakest staff role', '/staff', 'One poor coach can drag a whole development lane.'),
    deeperStrategy: 'Match staff to club direction: rebuilding clubs need teaching; contenders need role fit and stability.',
    mobileTip: 'Coach cards are easier than tables on mobile; compare one role at a time.',
  },
  draft: {
    routeKey: 'draft',
    title: 'Draft for value and timeline',
    pagePurpose: 'Draft is where you scout, rank, pick, and sign amateur talent.',
    whenToUse: 'Use it during offseason and pre-draft prep.',
    decision: 'Decide between current ability, ceiling, signability, need, and risk.',
    ratingsFocus: 'OVR is present value; ceiling is upside; confidence tells how much trust to place in the report.',
    suggestedAction: action('Scout the top of your board', '/draft', 'Your best pick is usually the best blend of upside, confidence, and need.'),
    deeperStrategy: 'A contender can draft upside; a thin system may need safer players who reach useful OVR sooner.',
    mobileTip: 'Open details before picking; do not make draft decisions from one cramped row.',
  },
  trade: {
    routeKey: 'trade',
    title: 'Price the player and the situation',
    pagePurpose: 'Trade lets you build packages, review offers, negotiate, and react to deadline pressure.',
    whenToUse: 'Use it near the deadline, after injuries, during rebuilds, or when payroll needs a reset.',
    decision: 'Decide who is expendable and what return matches your competitive window.',
    ratingsFocus: 'OVR starts the value conversation; age, contract, control, role, scarcity, and GM personality finish it.',
    suggestedAction: action('Audit deadline value', '/trade', 'Know what you can buy or sell before the market closes.'),
    deeperStrategy: 'Never trade only from OVR. A cheaper 62 OVR player with control can be worth more than an expensive 68 rental.',
    mobileTip: 'Use smaller packages on mobile and inspect selected-player summaries carefully.',
  },
  standings: {
    routeKey: 'standings',
    title: 'Know your window',
    pagePurpose: 'Standings show division, playoff, streak, games-back, and run-differential context.',
    whenToUse: 'Use it before deciding to buy, sell, hold, or push prospects.',
    decision: 'Decide whether the season position justifies aggressive moves.',
    ratingsFocus: 'Ratings are indirect here; standings tell whether your roster OVR is translating into wins.',
    suggestedAction: action('Check run differential', '/league/standings', 'Run differential is often the truth behind the record.'),
    deeperStrategy: 'A team with a bad record but strong differential may buy cautiously; a weak differential contender should avoid overpaying.',
    mobileTip: 'Division cards stack cleanly; focus on your division first.',
  },
  leaders: {
    routeKey: 'leaders',
    title: 'See who is shaping the league',
    pagePurpose: 'Leaders show top performers across hitting, pitching, and advanced stats.',
    whenToUse: 'Use it for award races, scouting context, trade research, and story tracking.',
    decision: 'Decide which production is real enough to investigate.',
    ratingsFocus: 'OVR beside production helps separate true talent from streaks.',
    suggestedAction: action('Open one leader profile', '/league/leaders', 'The profile explains whether the stat line is sustainable.'),
    deeperStrategy: 'Production plus strong OVR is star signal; production without OVR is a sell-high or small-sample question.',
    mobileTip: 'Use category switching sparingly on mobile to avoid losing context.',
  },
  schedule: {
    routeKey: 'schedule',
    title: 'Choose when to inspect the games',
    pagePurpose: 'Schedule shows completed results, upcoming games, and links to box scores.',
    whenToUse: 'Use it after sim chunks or before important series.',
    decision: 'Decide whether a result deserves deeper review.',
    ratingsFocus: 'Ratings are indirect; use box scores to see whether your high-OVR roster is performing.',
    suggestedAction: action('Inspect a recent loss', '/schedule', 'Loss patterns can reveal lineup, rotation, or bullpen problems.'),
    deeperStrategy: 'Hardcore players should audit repeated one-run losses, bullpen collapses, and weak starter turns.',
    mobileTip: 'Tap one game at a time; the full schedule is dense.',
  },
  'box-score': {
    routeKey: 'box-score',
    title: 'Learn from one game',
    pagePurpose: 'Box Score explains the line score, player performance, and play-by-play.',
    whenToUse: 'Use it after close games, playoff games, collapses, or milestone performances.',
    decision: 'Decide whether a result points to a real roster issue or normal baseball noise.',
    ratingsFocus: 'Ratings are context here; one bad game from a strong OVR player is not a crisis.',
    suggestedAction: action('Read the decisive inning', '/schedule', 'The play-by-play often explains what the final score hides.'),
    deeperStrategy: 'Look for repeatable problems: walks, poor defense, bullpen fatigue, or empty offense against a handedness split.',
    mobileTip: 'Use play-by-play in short sections on mobile.',
  },
  'press-room': {
    routeKey: 'press-room',
    title: 'Separate signal from story flavor',
    pagePurpose: 'Press Room collects briefings, league news, rumors, press conferences, and transaction context.',
    whenToUse: 'Use it after sim chunks and before big public-facing choices.',
    decision: 'Decide which stories change your next move.',
    ratingsFocus: 'Ratings appear indirectly when stories point to player performance, scouting, or market value.',
    suggestedAction: action('Read unread briefings', '/press-room', 'Important stories can explain why a route needs attention.'),
    deeperStrategy: 'Treat rumors as prompts to investigate, not as instructions to act.',
    mobileTip: 'Filters help reduce the story feed on small screens.',
  },
  playoffs: {
    routeKey: 'playoffs',
    title: 'Manage the October moment',
    pagePurpose: 'Playoffs shows brackets, series state, momentum, and postseason sim flow.',
    whenToUse: 'Use it once the regular season ends or when watching league postseason outcomes.',
    decision: 'Decide whether to inspect series state or advance.',
    ratingsFocus: 'Ratings matter through matchup depth, rotation quality, bullpen leverage, and star reliability.',
    suggestedAction: action('Review playoff matchup', '/playoffs', 'Know the opponent before advancing the series.'),
    deeperStrategy: 'Short series magnify pitching depth and bullpen quality. Do not overreact to one game unless fatigue compounds.',
    mobileTip: 'Bracket views are dense; use series panels first.',
  },
  'free-agency': {
    routeKey: 'free-agency',
    title: 'Buy wins without buying regret',
    pagePurpose: 'Free Agency is the market for signing external players and reading market intelligence.',
    whenToUse: 'Use it during offseason or when planning future payroll.',
    decision: 'Decide who is worth money, years, roster space, and opportunity cost.',
    ratingsFocus: 'OVR gives current talent; age, trend, role, demand, and contract length decide whether the deal ages well.',
    suggestedAction: action('Filter by roster need', '/free-agency', 'The best signing solves a specific weakness.'),
    deeperStrategy: 'Hardcore rule: pay for prime years, avoid paying star money for decline years unless the title window is now.',
    mobileTip: 'Select one target to read the detail panel before offering.',
  },
  offseason: {
    routeKey: 'offseason',
    title: 'Work the offseason in order',
    pagePurpose: 'Offseason collects arbitration, extensions, free agency, draft prep, Rule 5, transactions, and next-season start.',
    whenToUse: 'Use it after playoffs and before starting the next season.',
    decision: 'Decide which required and optional tasks must happen before Opening Day.',
    ratingsFocus: 'OVR appears in candidates and transaction targets, but budget, control, and roster limits decide sequencing.',
    suggestedAction: action('Open offseason checklist', '/offseason', 'Completing the required tasks prevents accidental roster holes.'),
    deeperStrategy: 'Start with obligations, then roster holes, then upside. The order prevents expensive moves from boxing you in.',
    mobileTip: 'Treat each offseason panel as a step; avoid jumping between all tasks at once.',
  },
  finance: {
    routeKey: 'finance',
    title: 'Turn payroll into flexibility',
    pagePurpose: 'Finance shows payroll, luxury tax, budget, commitments, and contract pressure.',
    whenToUse: 'Use it before trades, free agency, extensions, and deadline buying.',
    decision: 'Decide whether the team can afford the next move now and later.',
    ratingsFocus: 'OVR is not enough; compare talent to salary, years, age, and roster window.',
    suggestedAction: action('Check future commitments', '/finance', 'A move that fits this year can still damage the next three seasons.'),
    deeperStrategy: 'Payroll flexibility is a strategic asset. Rebuilders should buy control; contenders can rent impact.',
    mobileTip: 'Focus on one budget section at a time; finance tables are dense.',
  },
  career: {
    routeKey: 'career',
    title: 'Measure the GM legacy',
    pagePurpose: 'GM Career tracks record, job history, legacy, and career-level outcomes.',
    whenToUse: 'Use it between seasons or after major owner/front-office events.',
    decision: 'Decide whether the current job path supports your long-term goals.',
    ratingsFocus: 'Ratings are indirect; sustained player OVR and roster quality become wins, awards, and job security.',
    suggestedAction: action('Review legacy score', '/career', 'Career context shows whether the dynasty is growing or stalling.'),
    deeperStrategy: 'A strong GM career is not only titles: development, finances, and owner trust all compound.',
    mobileTip: 'Career cards are scan-friendly; open details only when needed.',
  },
  history: {
    routeKey: 'history',
    title: 'Read the dynasty so far',
    pagePurpose: 'History stores archives, timelines, season recaps, branches, and long-save memory.',
    whenToUse: 'Use it after seasons, milestones, or when returning to an old save.',
    decision: 'Decide what the current era means and what comes next.',
    ratingsFocus: 'Historical OVR and peak OVR explain player eras, decline, breakouts, and record context.',
    suggestedAction: action('Open latest season recap', '/history', 'The recap turns results into a story you can act on.'),
    deeperStrategy: 'Use history to avoid repeating mistakes: failed windows, overpaid cores, and missed prospect waves.',
    mobileTip: 'Use timeline chapters as anchors on small screens.',
  },
  achievements: {
    routeKey: 'achievements',
    title: 'Pick optional goals',
    pagePurpose: 'Achievements give long-term challenges and progress markers.',
    whenToUse: 'Use it when a save needs direction beyond the standings.',
    decision: 'Decide which optional target would make the dynasty more fun.',
    ratingsFocus: 'Ratings are indirect; many achievements reward building, development, records, and sustained talent.',
    suggestedAction: action('Choose one active chase', '/achievements', 'A clear optional goal can make the next season more compelling.'),
    deeperStrategy: 'Hardcore players can use achievements as constraints for self-imposed save identity.',
    mobileTip: 'Scan progress bars, then open only the category that interests you.',
  },
  rivalries: {
    routeKey: 'rivalries',
    title: 'Account for enemies',
    pagePurpose: 'Rivalries tracks intensity, head-to-head records, playoff meetings, trades, and narrative stakes.',
    whenToUse: 'Use it before rivalry trades, playoff series, or division planning.',
    decision: 'Decide whether rivalry context changes risk or value.',
    ratingsFocus: 'Ratings are indirect; rivalry pressure changes how valuable wins and trades feel.',
    suggestedAction: action('Check your hottest rivalry', '/rivalries', 'Rival context can explain owner, fan, and trade pressure.'),
    deeperStrategy: 'Do not hand rivals the exact player archetype they need unless the return clearly wins your window.',
    mobileTip: 'Read one rivalry card at a time.',
  },
  'front-office': {
    routeKey: 'front-office',
    title: 'Keep ownership aligned',
    pagePurpose: 'Owner Intel shows patience, expectations, chemistry, reputation, and front-office risk.',
    whenToUse: 'Use it after losing streaks, budget stress, press events, and season checkpoints.',
    decision: 'Decide how much risk ownership will tolerate.',
    ratingsFocus: 'Ratings are indirect; roster OVR must become wins or credible development progress.',
    suggestedAction: action('Check owner patience', '/front-office', 'Owner pressure changes how aggressive your next move should be.'),
    deeperStrategy: 'A rebuild needs communication and visible prospect progress; a contender needs wins and payroll discipline.',
    mobileTip: 'Owner cards are designed for scanning; focus on red/yellow signals first.',
  },
  pulse: {
    routeKey: 'pulse',
    title: 'Handle the monthly decision queue',
    pagePurpose: 'Pulse summarizes monthly performance, urgent decisions, and scenario progress.',
    whenToUse: 'Use it at month boundaries or after a pulse overlay.',
    decision: 'Decide which monthly signal needs action before more simming.',
    ratingsFocus: 'Ratings are indirect; Pulse points toward roster, farm, finance, or player pages when ratings matter.',
    suggestedAction: action('Open highest-urgency item', '/pulse', 'Pulse is the save telling you what changed.'),
    deeperStrategy: 'Monthly review prevents slow problems from becoming offseason surprises.',
    mobileTip: 'Use urgency color first, then route links.',
  },
  scenarios: {
    routeKey: 'scenarios',
    title: 'Play with a constraint',
    pagePurpose: 'Challenges offer scenario goals and alternate save identities.',
    whenToUse: 'Use it when you want a focused objective instead of an open-ended dynasty.',
    decision: 'Decide which constraint sounds fun and achievable.',
    ratingsFocus: 'Ratings vary by scenario; OVR helps identify whether the challenge starts with talent, depth, or scarcity.',
    suggestedAction: action('Read one scenario objective', '/scenarios', 'A clear constraint can make decisions sharper.'),
    deeperStrategy: 'Pick scenarios that force uncomfortable tradeoffs, not just ones you already solve well.',
    mobileTip: 'Scenario cards are easier to compare by objective, not flavor.',
  },
  stats: {
    routeKey: 'stats',
    title: 'Translate numbers into decisions',
    pagePurpose: 'Stats Encyclopedia explains advanced metrics and baseball stat language.',
    whenToUse: 'Use it when a stat in another page is unfamiliar.',
    decision: 'Decide which stat answers your actual baseball question.',
    ratingsFocus: 'Stats complement ratings: OVR estimates talent, stats show what happened, advanced stats help explain sustainability.',
    suggestedAction: action('Look up one unclear stat', '/stats', 'Understanding the stat makes the next roster decision less guessy.'),
    deeperStrategy: 'Use rate stats for skill, counting stats for volume, and advanced stats for context.',
    mobileTip: 'Search or scan by category instead of reading the whole encyclopedia.',
  },
  records: {
    routeKey: 'records',
    title: 'Track legacy chases',
    pagePurpose: 'Record Watch shows players chasing franchise and league records.',
    whenToUse: 'Use it during strong seasons and long saves.',
    decision: 'Decide whether a record chase should influence playing time or story focus.',
    ratingsFocus: 'Ratings are historical context; great OVR plus production creates credible record chases.',
    suggestedAction: action('Check active record chases', '/records', 'Records turn a good season into a save story.'),
    deeperStrategy: 'A record chase is usually worth attention, but not if it damages playoff odds or development.',
    mobileTip: 'Open active chases first; archives can wait.',
  },
  settings: {
    routeKey: 'settings',
    title: 'Tune the interface',
    pagePurpose: 'Settings controls preferences, accessibility, diagnostics, save tools, and tutorial replay.',
    whenToUse: 'Use it when the game feels too dense, too fast, too loud, or when you want help replayed.',
    decision: 'Decide how the interface should support your play style.',
    ratingsFocus: 'Ratings are not a Settings decision, but tutorial replay and density can make rating-heavy pages easier to read.',
    suggestedAction: action('Review accessibility and tutorial controls', '/settings', 'A comfortable UI makes long saves easier to sustain.'),
    deeperStrategy: 'Hardcore players may prefer denser tables; newcomers should keep more breathing room until routes feel familiar.',
    mobileTip: 'Settings controls are mobile-safe; change one preference and test it before changing several.',
  },
};

export function resolveAssistantRouteKey(pathname: string): AssistantRouteKey {
  const normalized = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');

  if (normalized === '/') return 'setup';
  if (normalized === '/onboarding') return 'onboarding';
  if (normalized === '/dashboard') return 'dashboard';
  if (normalized === '/roster') return 'roster';
  if (normalized === '/minors') return 'minors';
  if (normalized === '/players') return 'players';
  if (normalized === '/players/compare') return 'player-compare';
  if (normalized.startsWith('/players/')) return 'player-profile';
  if (normalized === '/scouting') return 'scouting';
  if (normalized === '/staff') return 'staff';
  if (normalized === '/draft') return 'draft';
  if (normalized === '/trade') return 'trade';
  if (normalized === '/standings' || normalized === '/league/standings') return 'standings';
  if (normalized === '/leaders' || normalized === '/league/leaders') return 'leaders';
  if (normalized === '/schedule') return 'schedule';
  if (normalized.startsWith('/games/')) return 'box-score';
  if (normalized === '/press-room') return 'press-room';
  if (normalized === '/playoffs') return 'playoffs';
  if (normalized === '/free-agency') return 'free-agency';
  if (normalized === '/offseason') return 'offseason';
  if (normalized === '/finance') return 'finance';
  if (normalized === '/career') return 'career';
  if (normalized === '/history') return 'history';
  if (normalized === '/achievements') return 'achievements';
  if (normalized === '/rivalries') return 'rivalries';
  if (normalized === '/front-office') return 'front-office';
  if (normalized === '/pulse') return 'pulse';
  if (normalized === '/scenarios') return 'scenarios';
  if (normalized === '/stats') return 'stats';
  if (normalized === '/records') return 'records';
  if (normalized === '/settings') return 'settings';

  return 'dashboard';
}

export function selectRouteGuidance(pathname: string): AssistantGuidance {
  return ASSISTANT_GUIDANCE[resolveAssistantRouteKey(pathname)];
}

export function buildAssistantNextAction(context: AssistantNextActionContext): AssistantAction {
  if (context.phase === 'offseason') {
    return action('Open offseason checklist', '/offseason', 'Offseason tasks are easiest when handled in sequence.');
  }

  if (context.phase === 'playoffs') {
    return action('Review playoff matchup', '/playoffs', 'Short series reward knowing the opponent before advancing.');
  }

  if (context.routeKey === 'trade') {
    return context.mode === 'hardcore'
      ? action('Audit deadline value', '/trade', 'Price talent against age, control, contract, and market pressure.')
      : action('Review one trade target', '/trade', 'Start with one need instead of building a five-player package.');
  }

  if (context.routeKey === 'dashboard' && context.phase === 'regular' && context.day <= 30) {
    return action('Scout early-season needs', '/scouting', 'Early reports give you time before the draft and deadline.');
  }

  if (context.routeKey === 'dashboard' && context.phase === 'regular' && context.day >= 60 && context.day <= 105) {
    return action('Check trade and budget fit', '/trade', 'The deadline window rewards knowing needs before offers arrive.');
  }

  return ASSISTANT_GUIDANCE[context.routeKey].suggestedAction;
}

export function buildStoryCallback(context: AssistantStoryContext): AssistantStoryCallback | null {
  const relevantTicker = context.tickerFeed.find((entry) => {
    if (context.seenStoryCallbacks[entry.id]) return false;
    return entry.category === 'trade' || entry.category === 'rumor' || entry.category === 'milestone' || entry.category === 'standings';
  });

  if (relevantTicker) {
    const isTrade = relevantTicker.category === 'trade' || relevantTicker.category === 'rumor';
    return {
      id: relevantTicker.id,
      tone: isTrade ? 'warning' : 'success',
      title: isTrade ? 'Market signal' : 'Story signal',
      body: relevantTicker.text,
    };
  }

  if (context.phase === 'playoffs') {
    const id = `phase-playoffs-s${context.season}`;
    if (context.seenStoryCallbacks[id]) return null;
    return {
      id,
      tone: 'excited',
      title: 'October changes the job',
      body: 'Before you advance, check matchups and pitching depth. One short series can rewrite the whole save.',
    };
  }

  if (context.phase === 'offseason') {
    const id = `phase-offseason-s${context.season}`;
    if (context.seenStoryCallbacks[id]) return null;
    return {
      id,
      tone: 'neutral',
      title: 'The story turns into roster work',
      body: 'Start with obligations, then fix holes. The best offseason is usually the one that keeps your next move flexible.',
    };
  }

  if (context.phase === 'regular' && context.day >= 100) {
    const id = `phase-stretch-s${context.season}`;
    if (context.seenStoryCallbacks[id]) return null;
    return {
      id,
      tone: 'warning',
      title: 'Stretch-run checkpoint',
      body: 'This is the time to decide whether the club is buying, selling, or protecting the next core.',
    };
  }

  return null;
}
