import { TEAM_MARKETS } from '../finance/contracts.js';
import { TEAMS, getTeamById } from '../league/teams.js';
import { toDisplayRating } from '../player/attributes.js';
import {
  HITTER_POSITIONS,
  PITCHER_POSITIONS,
  type GeneratedPlayer,
  type Position,
} from '../player/generation.js';
import type { AGMCandidateId } from './agmCandidates.js';

export type DayOneBudgetAllocation = 'spend_now' | 'balanced' | 'future_flex';
export type DayOnePromotionStance = 'aggressive' | 'measured' | 'patient';
export type DayOneCrisisType = 'injury_shock' | 'prospect_pressure' | 'bullpen_instability' | 'rotation_hole';
export type DayOneOrgTier = 'elite' | 'strong' | 'average' | 'thin' | 'bottom';

export interface DayOneOpeningBullpenPlan {
  closerId: string | null;
  setupIds: string[];
  longReliefId: string | null;
}

export interface DayOneOpeningPlan {
  lineupPlayerIds: string[];
  rotationPlayerIds: string[];
  bullpen: DayOneOpeningBullpenPlan | null;
}

export interface DayOneProjectedImpact {
  label: string;
  direction: 'up' | 'down' | 'neutral';
  summary: string;
}

export interface DayOneTeaser {
  headline: string;
  agmReaction: string;
  localPressNote: string;
  aprilWatchItems: string[];
  openingDayPrompt: string;
}

export interface DayOneNarrativeContext {
  teamId: string;
  teamName: string;
  marketSize: 'large' | 'medium' | 'small';
  archetype: string;
  projectedWins: number;
  topWeakness: string;
  topProspectName?: string | null;
  agmId?: AGMCandidateId | null;
  seasonGoal?: 'championship' | 'playoff' | 'rebuild' | 'compete' | null;
  budgetAllocation?: DayOneBudgetAllocation | null;
  developmentStyle?: 'aggressive' | 'balanced' | 'patient' | null;
  promotionStance?: DayOnePromotionStance | null;
  crisisType?: DayOneCrisisType | null;
  crisisResponseId?: string | null;
}

export interface DayOneNarrativePack {
  owner: {
    summary: string;
    expectation: string;
    stakes: string;
  };
  agmPitches: Record<AGMCandidateId, string>;
  orgReviewIntro: string;
  crisis: {
    title: string;
    summary: string;
  };
  teaser: DayOneTeaser;
}

export interface DayOneCrisisResponseOption {
  id: string;
  label: string;
  summary: string;
}

export interface DayOneCrisis {
  type: DayOneCrisisType;
  title: string;
  summary: string;
  responseOptions: DayOneCrisisResponseOption[];
}

export interface DayOneTeamCardInput {
  teamId: string;
  teamName?: string;
  division?: string;
  payrollTier: string;
  farmSystemRating: string;
  projectedRecord: string;
  strengths: string[];
  weaknesses: string[];
  topPlayers: Array<{
    playerId: string;
    name: string;
    position: string;
    overall: number;
  }>;
  divisionRivals: Array<{
    teamId: string;
    teamName: string;
  }>;
  teamIdentityBlurb?: string;
}

export interface DayOneTeamCard extends DayOneTeamCardInput {
  teamName: string;
  division: string;
  teamIdentityBlurb: string;
  archetype: string;
  franchiseHook: string;
  whyNow: string;
  marketSize: 'large' | 'medium' | 'small';
  timeline: string;
}

export interface DayOneDefaults {
  seasonGoal: 'championship' | 'playoff' | 'rebuild' | 'compete';
  budgetAllocation: DayOneBudgetAllocation;
  developmentStyle: 'aggressive' | 'balanced' | 'patient';
  promotionStance: DayOnePromotionStance;
  openingDayPlan: DayOneOpeningPlan;
}

export interface DayOneOrgReview {
  mlbRank: number;
  farmRank: number;
  mlbTier: DayOneOrgTier;
  farmTier: DayOneOrgTier;
  strengths: string[];
  weaknesses: string[];
  inheritedStory: string;
  topProspectName: string | null;
  projectedWins: number;
}

interface TeamUnitScores {
  teamId: string;
  offense: number;
  rotation: number;
  bullpen: number;
  defense: number;
  farm: number;
  mlb: number;
  winStrength: number;
  topProspectName: string | null;
}

interface DayOneTeamMetadata {
  archetype: string;
  franchiseHook: string;
  whyNow: string;
  orgStory: string;
}

const REQUIRED_LINEUP_POSITIONS: readonly Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const LEAGUE_AVERAGE_WINS = 81;
const PROJECTED_WIN_MAX_SPREAD = 14;
const PROJECTED_WIN_CURVE_EXPONENT = 1.2;
const ROSTER_WIN_WEIGHTS = {
  offense: 0.4,
  rotation: 0.34,
  bullpen: 0.18,
  defense: 0.08,
} as const;

const DAY_ONE_TEAM_METADATA: Record<string, DayOneTeamMetadata> = {
  nym: {
    archetype: 'Empire Under Pressure',
    franchiseHook: 'The sport’s loudest market wants October immediately and has zero patience for excuses.',
    whyNow: 'This job is about surviving pressure while turning resources into a real juggernaut.',
    orgStory: 'You inherited a loaded brand with the city already keeping score.',
  },
  phi: {
    archetype: 'Blue-Collar Contender',
    franchiseHook: 'A fierce city and a strong payroll base expect hard baseball and an honest push.',
    whyNow: 'The window is open, but the room will turn fast if the club looks soft.',
    orgStory: 'This franchise rewards conviction more than caution.',
  },
  bos: {
    archetype: 'Historic Cauldron',
    franchiseHook: 'Prestige, money, and scrutiny all show up on day one in Boston.',
    whyNow: 'The roster can win now, but every weakness will be magnified all summer.',
    orgStory: 'You walked into a famous room that treats second place as failure.',
  },
  bal: {
    archetype: 'Sharp Small-Market Climber',
    franchiseHook: 'The club cannot win with brute-force spending, so every edge has to be earned.',
    whyNow: 'A disciplined front office can turn a narrow margin into a lasting run.',
    orgStory: 'This is a high-leverage job where smart sequencing matters.',
  },
  wsh: {
    archetype: 'Capital Reset',
    franchiseHook: 'There is enough market weight here to matter, but the baseball identity needs sharpening.',
    whyNow: 'A smart opening season can reintroduce the franchise to its own fanbase.',
    orgStory: 'You inherited a club that can move quickly if the direction is clear.',
  },
  chi: {
    archetype: 'Big-Market Powder Keg',
    franchiseHook: 'Chicago gives you money, spotlight, and an endless appetite for bold moves.',
    whyNow: 'If the core is real, you can accelerate fast. If not, the noise gets loud.',
    orgStory: 'This franchise invites ambition and punishes hesitation.',
  },
  det: {
    archetype: 'Industrial Rebuild With Teeth',
    franchiseHook: 'A proud market is ready to believe again if the baseball plan feels real.',
    whyNow: 'The next few decisions decide whether this is a real rise or another false dawn.',
    orgStory: 'You inherited a fanbase that respects toughness and progress.',
  },
  cle: {
    archetype: 'Efficiency Machine',
    franchiseHook: 'The budget is never infinite, but the room expects smart baseball every year.',
    whyNow: 'Player development and timing can turn this club into a permanent nuisance.',
    orgStory: 'This is a franchise built to squeeze value out of every inch.',
  },
  col: {
    archetype: 'Sleeping Giant',
    franchiseHook: 'The club has room to matter, but it needs a strong baseball identity to wake up.',
    whyNow: 'The right first season can shift this franchise from anonymous to dangerous.',
    orgStory: 'You inherited a market still waiting for a team worth obsessing over.',
  },
  pit: {
    archetype: 'Rust-Belt Underdog',
    franchiseHook: 'The margin for error is thin, which makes every smart decision feel bigger.',
    whyNow: 'This is a job for conviction, development, and a clear long view.',
    orgStory: 'The franchise needs coherence more than headlines.',
  },
  kc: {
    archetype: 'Balanced Mid-Market Builder',
    franchiseHook: 'The club can compete, but only if the roster and pipeline stay aligned.',
    whyNow: 'This is the sweet spot for a patient contender build.',
    orgStory: 'You inherited enough talent to matter and enough gaps to stay honest.',
  },
  msp: {
    archetype: 'Northern Heavyweight',
    franchiseHook: 'There is real competitive potential here if the front office can keep the roster sharp.',
    whyNow: 'A well-run first season can convert latent strength into a real window.',
    orgStory: 'This organization is closer than it looks if the edges are cleaned up.',
  },
  stl: {
    archetype: 'Stable Winner',
    franchiseHook: 'The baseline is competence. The challenge is turning competence into dominance.',
    whyNow: 'This is a club that can win now if the front office is decisive.',
    orgStory: 'You inherited a franchise that expects the right baseball answer, not a flashy one.',
  },
  ind: {
    archetype: 'Market-On-The-Rise',
    franchiseHook: 'There is room here for a modern baseball identity and a fanbase ready for one.',
    whyNow: 'A good first season can create lasting momentum for the whole organization.',
    orgStory: 'This job is about turning possibility into structure.',
  },
  mil: {
    archetype: 'Lean Contender',
    franchiseHook: 'The club has to fight above its payroll weight by staying sharp everywhere else.',
    whyNow: 'This is one of the best jobs in the game if you love finding hidden leverage.',
    orgStory: 'You inherited a club that can win if it stays disciplined.',
  },
  nas: {
    archetype: 'Expansion Energy',
    franchiseHook: 'The market is ready to fall in love with a good team, but the baseball spine has to arrive first.',
    whyNow: 'A coherent first year can define the franchise’s personality early.',
    orgStory: 'This is a chance to author a club’s identity instead of inheriting one.',
  },
  mia: {
    archetype: 'Volatile Talent Bet',
    franchiseHook: 'The ceiling is loud, the floor is slippery, and the market expects electricity.',
    whyNow: 'Your first calls decide whether this club is dangerous or directionless.',
    orgStory: 'You inherited talent that still needs structure.',
  },
  atl: {
    archetype: 'Modern Powerhouse',
    franchiseHook: 'The roster is expected to matter immediately and the fanbase knows what winning looks like.',
    whyNow: 'This is a championship pressure job disguised as a fun one.',
    orgStory: 'You inherited a club built to compete, not learn on the fly.',
  },
  cha: {
    archetype: 'Regional Upside',
    franchiseHook: 'There is enough local energy and enough room to build something sticky here.',
    whyNow: 'A sharp first season can move this club from novelty to legitimacy.',
    orgStory: 'This franchise needs identity and traction more than noise.',
  },
  orl: {
    archetype: 'Fresh-Market Project',
    franchiseHook: 'The club can become relevant fast if the baseball product feels credible.',
    whyNow: 'This is a clean-slate market if you can produce quick signals of progress.',
    orgStory: 'You inherited a club with upside and very little prewritten story.',
  },
  ral: {
    archetype: 'Patient Builder',
    franchiseHook: 'The payroll is tighter, but the runway is real for a disciplined plan.',
    whyNow: 'This is a classic development-first job with enough upside to matter.',
    orgStory: 'You inherited a franchise that needs structure, not panic.',
  },
  hou: {
    archetype: 'Win-Now Machine',
    franchiseHook: 'The city expects authority, efficiency, and deep October baseball.',
    whyNow: 'This roster is built to win immediately, which means every weakness is expensive.',
    orgStory: 'You inherited a room that expects the right answer quickly.',
  },
  dal: {
    archetype: 'Big-Swing Aspirant',
    franchiseHook: 'There is money, swagger, and an appetite for aggressive baseball decisions.',
    whyNow: 'This franchise can jump a tier fast if the first-season calls are sharp.',
    orgStory: 'You inherited a club that wants to matter now, not eventually.',
  },
  sat: {
    archetype: 'Disciplined Climber',
    franchiseHook: 'The market is strong enough to support a winner, but the roster needs an adult plan.',
    whyNow: 'A good first year can turn this club from interesting to dangerous.',
    orgStory: 'This organization is waiting for someone to unify the baseball logic.',
  },
  den: {
    archetype: 'Chaos With Altitude',
    franchiseHook: 'The park changes everything, which means ordinary roster logic is not enough.',
    whyNow: 'This is one of the highest-variance jobs in the league and the right edge compounds.',
    orgStory: 'You inherited a team that demands custom answers.',
  },
  aus: {
    archetype: 'Modern Challenger',
    franchiseHook: 'There is money, ambition, and a market that will reward a clear baseball identity.',
    whyNow: 'This is the kind of club that can jump from fun to feared in one sharp season.',
    orgStory: 'You inherited momentum that still needs discipline.',
  },
  lax: {
    archetype: 'Star Market',
    franchiseHook: 'The market loves names, but the franchise still has to win hard games.',
    whyNow: 'Your first season decides whether this is a glamor project or a real monster.',
    orgStory: 'You inherited a room where style only matters if substance follows it.',
  },
  sfb: {
    archetype: 'Smart Giant',
    franchiseHook: 'There is prestige and money here, but the brand expects cleverness too.',
    whyNow: 'A polished first season can create a sustainable advantage fast.',
    orgStory: 'You inherited a franchise that wants to outthink people without falling behind them.',
  },
  phx: {
    archetype: 'Sunbelt Sleeper',
    franchiseHook: 'The roster has enough juice to matter if the front office chooses the right lane early.',
    whyNow: 'This is a perfect job for a decisive first-season identity play.',
    orgStory: 'You inherited talent that needs a coherent operating plan.',
  },
  sea: {
    archetype: 'Patient Heavyweight',
    franchiseHook: 'The market is ready for a long run if the club can finally turn promise into force.',
    whyNow: 'The first season can either deepen belief or deepen frustration.',
    orgStory: 'You inherited a room full of possibility and unfinished business.',
  },
  sdg: {
    archetype: 'Edge-Seeking Contender',
    franchiseHook: 'This is a roster that can compete right away, but the margins will decide how far.',
    whyNow: 'The club is close enough that your first few decisions are amplified.',
    orgStory: 'You inherited a team with real upside and no room for lazy thinking.',
  },
  por: {
    archetype: 'Northwest Build',
    franchiseHook: 'The market will reward a team with personality, patience, and guts.',
    whyNow: 'This is a strong development job if the first season creates believable direction.',
    orgStory: 'You inherited a franchise still deciding what kind of baseball it wants to play.',
  },
};

const FLAGSHIP_DAY_ONE_TEAMS = new Set(['nym', 'bos', 'bal', 'col', 'hou', 'nas']);

function playerName(player: GeneratedPlayer | null | undefined) {
  return player ? `${player.firstName} ${player.lastName}` : null;
}

function compactTeamName(teamName: string) {
  return teamName.replace(/^(New York|San Francisco|San Antonio|Kansas City|St\. Louis)\s+/, '$1 ');
}

function agmLabel(agmId: AGMCandidateId | null | undefined) {
  switch (agmId) {
    case 'marcus_chen':
      return 'Marcus';
    case 'walt_kowalski':
      return 'Walt';
    case 'elena_vargas':
      return 'Elena';
    default:
      return 'Your AGM';
  }
}

function seasonGoalFrame(seasonGoal: DayOneNarrativeContext['seasonGoal'], projectedWins: number) {
  if (seasonGoal === 'championship') {
    return 'anything short of a real October push feels like underachievement';
  }
  if (seasonGoal === 'playoff') {
    return 'the room expects meaningful baseball right away';
  }
  if (seasonGoal === 'rebuild') {
    return 'you bought runway, but only if the long view looks intentional';
  }
  if (seasonGoal === 'compete') {
    return 'the club needs traction quickly without behaving like a panic buy';
  }
  return projectedWins >= 88
    ? 'the talent on the field already invites pressure'
    : projectedWins >= 78
      ? 'the room wants evidence before it grants belief'
      : 'clarity matters more than noise right now';
}

function candidatePitch(context: DayOneNarrativeContext, candidateId: AGMCandidateId) {
  const weakness = context.topWeakness.toLowerCase();
  const weaknessLine = weakness.includes('bullpen')
    ? 'stabilize the late innings before the room starts chasing bad outs'
    : weakness.includes('rotation')
      ? 'clean up the back end of the staff before April exposes it'
      : weakness.includes('prospect')
        ? 'set prospect timing before the first loud debate arrives'
        : `solve the ${context.topWeakness} problem before it becomes the team’s identity`;

  if (candidateId === 'marcus_chen') {
    return FLAGSHIP_DAY_ONE_TEAMS.has(context.teamId)
      ? `Marcus frames ${context.teamName} as a high-leverage market-pressure asset. He wants to ${weaknessLine}, keep the budget posture coherent, and treat every early decision like it will be judged in July and October.`
      : `Marcus thinks ${context.teamName} is a solvable front-office problem if you sequence the first decisions correctly. He wants to ${weaknessLine}.`;
  }
  if (candidateId === 'walt_kowalski') {
    return FLAGSHIP_DAY_ONE_TEAMS.has(context.teamId)
      ? `Walt thinks ${context.teamName} needs a steadier heartbeat before anything else. He wants to ${weaknessLine}, protect the room from panic, and make the club feel tougher than it did yesterday.`
      : `Walt sees ${context.teamName} as a club that will reveal itself fast. He wants to ${weaknessLine} and make sure the room never feels soft.`;
  }
  return FLAGSHIP_DAY_ONE_TEAMS.has(context.teamId)
    ? `Elena sees ${context.teamName} as a franchise that can move people emotionally if the baseball decisions feel alive. She wants to ${weaknessLine}, keep the talent pipeline in view, and make the room believe your first week has a plan.`
    : `Elena thinks ${context.teamName} can create belief fast if the first baseball calls feel human and sharp. She wants to ${weaknessLine}.`;
}

function buildSystemicTeaser(context: DayOneNarrativeContext): DayOneTeaser {
  const agmName = agmLabel(context.agmId);
  const teamName = compactTeamName(context.teamName);
  const prospectLine = context.topProspectName
    ? `${context.topProspectName} is one hot week away from testing the room.`
    : 'The first hot player will challenge your development posture immediately.';
  const deadlineLine = context.budgetAllocation === 'future_flex'
    ? 'Your budget posture preserved July ammo, but it also narrowed the excuses the room will accept in April.'
    : context.budgetAllocation === 'spend_now'
      ? 'You spent like the season matters right now, which means a slow first month gets judged hard.'
      : 'You kept the budget balanced, which buys flexibility only if the room sees progress quickly.';

  return {
    headline: `${teamName} already feels like your franchise now.`,
    agmReaction: `${agmName} thinks the first ten games will tell the room whether your Day One posture was conviction or theater.`,
    localPressNote: `${deadlineLine}`,
    aprilWatchItems: [
      `Watch how ${context.topWeakness} behaves once the games count.`,
      prospectLine,
      `${teamName} opens with ${seasonGoalFrame(context.seasonGoal, context.projectedWins)}.`,
    ],
    openingDayPrompt: 'Opening Day is next. The room knows what you said. Now it gets to find out whether you meant it.',
  };
}

function buildFlagshipNarrativePack(context: DayOneNarrativeContext): DayOneNarrativePack {
  const agmPitches = {
    marcus_chen: candidatePitch(context, 'marcus_chen'),
    walt_kowalski: candidatePitch(context, 'walt_kowalski'),
    elena_vargas: candidatePitch(context, 'elena_vargas'),
  } satisfies Record<AGMCandidateId, string>;

  switch (context.teamId) {
    case 'nym':
      return {
        owner: {
          summary: 'New York does not grant apprenticeships. The city wants October, the back pages want a storyline, and this franchise expects you to carry both at once.',
          expectation: 'You inherited a heavyweight operation with a short fuse. Act like the first month matters because everyone around you already does.',
          stakes: 'If the room feels uncertain, the noise gets weaponized immediately. If it feels decisive, the whole organization gets louder with you.',
        },
        agmPitches,
        orgReviewIntro: 'This is an empire-under-pressure roster. The talent is real, the scrutiny is louder, and the weakest unit will define the conversation unless you get there first.',
        crisis: {
          title: 'The City Found The Crack First',
          summary: 'The first weak spot already feels bigger because this market never waits for a second opinion.',
        },
        teaser: {
          headline: 'New York already sounds different after your first day.',
          agmReaction: `${agmLabel(context.agmId)} can feel the room leaning in. If April starts well, the club gets swagger. If it starts flat, the city starts writing for you.`,
          localPressNote: 'The local read is simple: you made win-now decisions and invited scrutiny on purpose.',
          aprilWatchItems: [
            'Every late-inning wobble will get treated like a referendum on your authority.',
            context.topProspectName ? `${context.topProspectName} is already a future headline if the bench looks thin.` : 'The first good Triple-A week will become a promotion question instantly.',
            'The owner expects urgency without chaos, which is a narrow lane in this market.',
          ],
          openingDayPrompt: 'Opening Day is waiting with the volume already turned up.',
        },
      };
    case 'bos':
      return {
        owner: {
          summary: 'Boston remembers every spring. Prestige buys attention, not forgiveness, and this room expects to feel serious immediately.',
          expectation: 'The roster is good enough to matter, but the weak edge will get magnified quickly if you do not define the tone first.',
          stakes: 'The club does not have to be perfect on day one. It does have to feel coherent.',
        },
        agmPitches,
        orgReviewIntro: 'This is a historic-cauldron job. Enough talent to win now, enough scrutiny to make every soft spot feel public.',
        crisis: {
          title: 'The First Soft Spot Is Already Echoing',
          summary: 'In Boston, one unstable unit becomes a citywide argument faster than it should.',
        },
        teaser: {
          headline: 'Boston already has a temperature on you.',
          agmReaction: `${agmLabel(context.agmId)} thinks the club can carry pressure if the answers stay sharp, but not if the first weakness goes public unchecked.`,
          localPressNote: 'The media read: you did not arrive here to drift. Now they want the first proof point.',
          aprilWatchItems: [
            `The first sustained problem in ${context.topWeakness} becomes the talk-show topic.`,
            'A clean first homestand buys trust. A sloppy one reopens every inherited argument.',
            context.topProspectName ? `${context.topProspectName} is the first name waiting behind the glass.` : 'The farm will be treated as a solution the moment the big club looks ordinary.',
          ],
          openingDayPrompt: 'Opening Day is less a celebration here than an opening statement.',
        },
      };
    case 'bal':
      return {
        owner: {
          summary: 'Baltimore will not hand you luxury-tax cover or infinite patience. It will reward sharp sequencing, disciplined spending, and a room that looks smarter than the market around it.',
          expectation: 'This job is about leverage, not noise. Your first choices need to compound.',
          stakes: 'If the baseball logic feels tight, the franchise can climb fast. If it feels sloppy, the margin disappears.',
        },
        agmPitches,
        orgReviewIntro: 'This is a sharp small-market climber. The bones are there, but the edge comes from discipline, not brute force.',
        crisis: {
          title: 'The Margin Just Got Thinner',
          summary: 'One weakness matters more here because there is less room to drown it in payroll.',
        },
        teaser: {
          headline: 'Baltimore already feels like a sequencing test.',
          agmReaction: `${agmLabel(context.agmId)} likes the shape of the room, but thinks April will expose whether your Day One decisions actually compound or just sound good.`,
          localPressNote: 'The local reaction is respectful so far: disciplined, intentional, and clearly tied to a real baseball plan.',
          aprilWatchItems: [
            `Your handling of ${context.topWeakness} decides whether the club feels efficient or fragile.`,
            'The budget posture will be judged by whether it creates breathing room instead of hesitation.',
            context.topProspectName ? `${context.topProspectName} is the first big leverage point if the major-league roster needs help.` : 'The first prospect decision will tell everyone how patient you really are.',
          ],
          openingDayPrompt: 'Opening Day will not be loud. It will be revealing.',
        },
      };
    case 'col':
      return {
        owner: {
          summary: 'Columbus is still waiting for a team worth obsessing over. That makes the first season powerful: you are not just running a club, you are setting the emotional terms.',
          expectation: 'The roster has enough life to matter if the front office creates a clear identity quickly.',
          stakes: 'If the first month feels like drift, the market stays cold. If it feels alive, people start leaning in.',
        },
        agmPitches,
        orgReviewIntro: 'This is a sleeping-giant setup. The job is less about tradition than ignition.',
        crisis: {
          title: 'The Wake-Up Call Came Early',
          summary: 'The first real weakness showed up before the club could fully settle into its new identity.',
        },
        teaser: {
          headline: 'Columbus can feel the shape of the thing now.',
          agmReaction: `${agmLabel(context.agmId)} thinks this franchise is closer to a pulse than people realize, but only if April feels authored instead of accidental.`,
          localPressNote: 'The early market read: your first day made the club feel more intentional than anonymous.',
          aprilWatchItems: [
            `If ${context.topWeakness} holds, belief builds fast here.`,
            context.topProspectName ? `${context.topProspectName} is the first player who could make the whole market feel the future.` : 'The first breakthrough player will reshape how this room talks about itself.',
            'The first home stand matters because this market is still deciding how much to care.',
          ],
          openingDayPrompt: 'Opening Day is your first chance to make the market feel the club has a personality.',
        },
      };
    case 'hou':
      return {
        owner: {
          summary: 'Houston treats competence as the floor, not the ceiling. This is a win-now room and everyone inside it knows what authority is supposed to sound like.',
          expectation: 'You inherited a contender. The challenge is keeping it sharp enough that the first weakness does not become expensive.',
          stakes: 'This club is judged on edge, not effort.',
        },
        agmPitches,
        orgReviewIntro: 'This is a win-now machine. The roster is dangerous, which means even small mistakes get priced like luxury problems.',
        crisis: {
          title: 'The Machine Already Needs Adjustment',
          summary: 'A contender can absorb a flaw, but not if it lingers long enough to feel structural.',
        },
        teaser: {
          headline: 'Houston already sounds like a contender under your watch.',
          agmReaction: `${agmLabel(context.agmId)} thinks the club can carry weight immediately, but only if the first answers settle the room before April turns every weakness into a referendum.`,
          localPressNote: 'The local line is clear: you acted like the window is open and the room expects you to keep acting that way.',
          aprilWatchItems: [
            `Any drag from ${context.topWeakness} gets judged against championship expectations immediately.`,
            'The owner wants precision, not drama. A strong April makes that feel natural.',
            context.topProspectName ? `${context.topProspectName} becomes a weapon only if the big club leaves an opening.` : 'The pipeline matters here mainly as leverage, not comfort.',
          ],
          openingDayPrompt: 'Opening Day is not the start of the dream here. It is the first checkpoint.',
        },
      };
    case 'nas':
      return {
        owner: {
          summary: 'Nashville does not have old ghosts yet. That makes your first season unusually powerful because the franchise personality is still wet paint.',
          expectation: 'The market is ready to attach itself to a team that feels coherent, brave, and worth talking about.',
          stakes: 'If the first month feels alive, the franchise gets a heartbeat fast. If it feels generic, you waste precious runway.',
        },
        agmPitches,
        orgReviewIntro: 'This is expansion-energy baseball. Identity is not a side effect here. It is part of the job.',
        crisis: {
          title: 'The New Room Already Needs A Real Answer',
          summary: 'One early weakness matters extra when the franchise is still teaching the market what kind of team it is.',
        },
        teaser: {
          headline: 'Nashville already has its first draft of you.',
          agmReaction: `${agmLabel(context.agmId)} thinks the room feels new in the best way: every early signal gets remembered because nothing is old enough to drown it out.`,
          localPressNote: 'The early reaction is hungry. People want to know what kind of franchise you just chose to build.',
          aprilWatchItems: [
            `How you answer ${context.topWeakness} helps define the franchise tone immediately.`,
            context.topProspectName ? `${context.topProspectName} could become one of the first real future symbols in town.` : 'The first breakout player will matter more here because the mythology is still being written.',
            'The crowd is waiting for a reason to attach meaning to the first month.',
          ],
          openingDayPrompt: 'Opening Day is less about tradition here than authorship.',
        },
      };
    default:
      return buildSystemicNarrativePack(context);
  }
}

function buildSystemicNarrativePack(context: DayOneNarrativeContext): DayOneNarrativePack {
  const agmPitches = {
    marcus_chen: candidatePitch(context, 'marcus_chen'),
    walt_kowalski: candidatePitch(context, 'walt_kowalski'),
    elena_vargas: candidatePitch(context, 'elena_vargas'),
  } satisfies Record<AGMCandidateId, string>;
  const marketLine = context.marketSize === 'large'
    ? 'The market will read confidence quickly and panic just as quickly.'
    : context.marketSize === 'small'
      ? 'There is not enough margin here to hide sloppy thinking.'
      : 'There is enough support here to build belief if the answers stay coherent.';
  const crisisLead = context.crisisType === 'bullpen_instability'
    ? 'The first crack showed up in the late innings.'
    : context.crisisType === 'rotation_hole'
      ? 'The first crack showed up in the rotation.'
      : context.crisisType === 'prospect_pressure'
        ? 'The first crack showed up in your player-development timeline.'
        : 'The first crack showed up before the season even settled in.';

  return {
    owner: {
      summary: `${context.teamName} is a ${context.archetype.toLowerCase()} job. ${marketLine}`,
      expectation: `With ${context.projectedWins} projected wins, ${seasonGoalFrame(context.seasonGoal, context.projectedWins)}.`,
      stakes: `The room will judge whether you solved ${context.topWeakness} or merely described it.`,
    },
    agmPitches,
    orgReviewIntro: `${context.teamName} already has a shape: ${context.archetype.toLowerCase()}, a ${context.topWeakness} concern, and ${context.topProspectName ? `${context.topProspectName} waiting underneath it` : 'a pipeline question waiting underneath it'}.`,
    crisis: {
      title: 'The First Stress Test Arrived',
      summary: `${crisisLead} Your earlier choices are already being asked to explain themselves.`,
    },
    teaser: buildSystemicTeaser(context),
  };
}

function sortPlayers(left: GeneratedPlayer, right: GeneratedPlayer) {
  return right.overallRating - left.overallRating || left.age - right.age || left.id.localeCompare(right.id);
}

function parseProjectedWins(projectedRecord: string) {
  const match = /^(\d+)-(\d+)$/.exec(projectedRecord);
  return match ? Number(match[1]) : 81;
}

function inferTimeline(projectedWins: number, farmSystemRating: string) {
  if (projectedWins >= 92) {
    return 'Win now';
  }
  if (projectedWins >= 84) {
    return farmSystemRating.startsWith('A') ? 'Contend now, sustain later' : 'Push for October';
  }
  if (projectedWins >= 76) {
    return farmSystemRating.startsWith('A') || farmSystemRating.startsWith('B') ? 'Balanced climb' : 'Competitive retool';
  }
  return farmSystemRating.startsWith('A') || farmSystemRating.startsWith('B') ? 'Patient build with upside' : 'Long runway rebuild';
}

function tierForRank(rank: number, total: number): DayOneOrgTier {
  const percentile = rank / Math.max(1, total);
  if (percentile <= 0.18) {
    return 'elite';
  }
  if (percentile <= 0.38) {
    return 'strong';
  }
  if (percentile <= 0.68) {
    return 'average';
  }
  if (percentile <= 0.84) {
    return 'thin';
  }
  return 'bottom';
}

function tierLabel(tier: DayOneOrgTier) {
  switch (tier) {
    case 'elite':
      return 'top-tier';
    case 'strong':
      return 'strong';
    case 'average':
      return 'middle of the league';
    case 'thin':
      return 'below average';
    case 'bottom':
      return 'bottom-tier';
  }
}

function buildTeamScores(players: GeneratedPlayer[], teamId: string): TeamUnitScores {
  const teamPlayers = players.filter((player) => player.teamId === teamId);
  const mlbPlayers = teamPlayers
    .filter((player) => player.rosterStatus === 'MLB')
    .sort(sortPlayers);
  const hitters = mlbPlayers
    .filter((player) => (HITTER_POSITIONS as readonly string[]).includes(player.position))
    .sort(sortPlayers);
  const starters = mlbPlayers
    .filter((player) => player.position === 'SP')
    .sort(sortPlayers);
  const relievers = mlbPlayers
    .filter((player) => player.position === 'RP' || player.position === 'CL')
    .sort(sortPlayers);
  const farm = teamPlayers
    .filter((player) => player.rosterStatus !== 'MLB')
    .sort(sortPlayers);

  const offense = hitters.slice(0, 9).reduce((sum, player) => sum + toDisplayRating(player.overallRating), 0) / Math.max(1, Math.min(9, hitters.length));
  const rotation = starters.slice(0, 5).reduce((sum, player) => sum + toDisplayRating(player.overallRating), 0) / Math.max(1, Math.min(5, starters.length));
  const bullpen = relievers.slice(0, 4).reduce((sum, player) => sum + toDisplayRating(player.overallRating), 0) / Math.max(1, Math.min(4, relievers.length));
  const defense = hitters.slice(0, 9).reduce((sum, player) => sum + Math.round((player.hitterAttributes.defense ?? 0) / 5.5), 0) / Math.max(1, Math.min(9, hitters.length));
  const farmScore = farm.slice(0, 12).reduce((sum, player) => sum + toDisplayRating(player.overallRating), 0) / Math.max(1, Math.min(12, farm.length));
  const mlb = mlbPlayers.slice(0, 26).reduce((sum, player) => sum + toDisplayRating(player.overallRating), 0) / Math.max(1, Math.min(26, mlbPlayers.length));
  const winStrength = (offense * ROSTER_WIN_WEIGHTS.offense)
    + (rotation * ROSTER_WIN_WEIGHTS.rotation)
    + (bullpen * ROSTER_WIN_WEIGHTS.bullpen)
    + (defense * ROSTER_WIN_WEIGHTS.defense);

  return {
    teamId,
    offense,
    rotation,
    bullpen,
    defense,
    farm: farmScore,
    mlb,
    winStrength,
    topProspectName: playerName(farm[0]),
  };
}

function projectedWinsForLeagueRank(rankIndex: number, teamCount: number): number {
  const pairCount = Math.floor(teamCount / 2);
  if (pairCount === 0) {
    return LEAGUE_AVERAGE_WINS;
  }

  const middleRank = (teamCount - 1) / 2;
  if (rankIndex === middleRank) {
    return LEAGUE_AVERAGE_WINS;
  }

  const upperHalf = rankIndex < middleRank;
  const pairIndex = upperHalf ? rankIndex : teamCount - 1 - rankIndex;
  const pairStrength = (pairCount - pairIndex) / pairCount;
  const spread = Math.round(PROJECTED_WIN_MAX_SPREAD * Math.pow(pairStrength, PROJECTED_WIN_CURVE_EXPONENT));
  return LEAGUE_AVERAGE_WINS + (upperHalf ? spread : -spread);
}

function buildProjectedWinsByTeam(teamScores: TeamUnitScores[]): Map<string, number> {
  const ranked = [...teamScores].sort((left, right) =>
    right.winStrength - left.winStrength
    || right.mlb - left.mlb
    || right.farm - left.farm
    || left.teamId.localeCompare(right.teamId));
  return new Map(ranked.map((entry, index) => [entry.teamId, projectedWinsForLeagueRank(index, ranked.length)]));
}

function categoryLabels(scores: TeamUnitScores) {
  return [
    { label: 'middle-of-order thump', score: scores.offense },
    { label: 'rotation depth', score: scores.rotation },
    { label: 'bullpen stability', score: scores.bullpen },
    { label: 'run prevention', score: scores.defense },
    { label: 'prospect pipeline', score: scores.farm },
  ];
}

function inferBiggestWeakness(weaknesses: string[]) {
  return weaknesses[0] ?? 'rotation depth';
}

function bullpenResponseOptions(type: DayOneCrisisType): DayOneCrisisResponseOption[] {
  switch (type) {
    case 'bullpen_instability':
      return [
        { id: 'lock_closer', label: 'Lock down roles', summary: 'Stabilize the back end and trust the hierarchy.' },
        { id: 'play_matchups', label: 'Play matchups', summary: 'Keep options open and ride the hot hand.' },
        { id: 'shop_depth_arm', label: 'Shop for relief', summary: 'Preserve your leverage by looking outside the room.' },
      ];
    case 'rotation_hole':
      return [
        { id: 'protect_rotation', label: 'Protect the staff', summary: 'Shorten outings and lean on depth early.' },
        { id: 'promote_arm', label: 'Summon an arm', summary: 'Test your promotion stance immediately.' },
        { id: 'trade_for_starter', label: 'Explore the market', summary: 'Treat the weakness as urgent.' },
      ];
    case 'prospect_pressure':
      return [
        { id: 'promote_now', label: 'Promote now', summary: 'Cash in upside immediately.' },
        { id: 'hold_line', label: 'Hold the line', summary: 'Protect the long view even if the room gets noisy.' },
        { id: 'split_time', label: 'Create a runway', summary: 'Ease the prospect in without blowing up the plan.' },
      ];
    case 'injury_shock':
    default:
      return [
        { id: 'patch_in_house', label: 'Patch it in-house', summary: 'Trust depth and stay disciplined.' },
        { id: 'accelerate_callup', label: 'Accelerate a call-up', summary: 'Force your development stance into action.' },
        { id: 'seek_stopgap', label: 'Find a stopgap', summary: 'Preserve the season by buying breathing room.' },
      ];
  }
}

export function buildDayOneTeamCard(input: DayOneTeamCardInput): DayOneTeamCard {
  const team = getTeamById(input.teamId);
  const metadata = DAY_ONE_TEAM_METADATA[input.teamId] ?? {
    archetype: 'Open Job',
    franchiseHook: 'This is a live front-office job with real leverage on day one.',
    whyNow: 'The first season will define the room quickly.',
    orgStory: 'You inherited a franchise waiting for direction.',
  };
  const projectedWins = parseProjectedWins(input.projectedRecord);

  return {
    ...input,
    teamName: input.teamName ?? (team ? `${team.city} ${team.name}` : input.teamId.toUpperCase()),
    division: input.division ?? (team?.division ?? 'UNKNOWN'),
    archetype: metadata.archetype,
    franchiseHook: metadata.franchiseHook,
    whyNow: metadata.whyNow,
    marketSize: TEAM_MARKETS[input.teamId]?.size ?? 'medium',
    timeline: inferTimeline(projectedWins, input.farmSystemRating),
    teamIdentityBlurb: input.teamIdentityBlurb ?? `${metadata.orgStory} ${metadata.whyNow}`,
  };
}

export function buildDayOneOrgReview(players: GeneratedPlayer[], teamId: string): DayOneOrgReview {
  const teamScores = TEAMS.map((team) => buildTeamScores(players, team.id));
  const projectedWinsByTeam = buildProjectedWinsByTeam(teamScores);
  const current = teamScores.find((entry) => entry.teamId === teamId) ?? buildTeamScores(players, teamId);
  const mlbRank = [...teamScores]
    .sort((left, right) => right.mlb - left.mlb || right.winStrength - left.winStrength || left.teamId.localeCompare(right.teamId))
    .findIndex((entry) => entry.teamId === teamId) + 1;
  const farmRank = [...teamScores]
    .sort((left, right) => right.farm - left.farm || right.mlb - left.mlb || left.teamId.localeCompare(right.teamId))
    .findIndex((entry) => entry.teamId === teamId) + 1;
  const labels = categoryLabels(current).sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
  const strengths = labels.slice(0, 2).map((entry) => entry.label);
  const weaknesses = [...labels].reverse().slice(0, 2).map((entry) => entry.label);
  const metadata = DAY_ONE_TEAM_METADATA[teamId];
  const mlbTier = tierForRank(mlbRank, teamScores.length);
  const farmTier = tierForRank(farmRank, teamScores.length);

  return {
    mlbRank,
    farmRank,
    mlbTier,
    farmTier,
    strengths,
    weaknesses,
    inheritedStory: `${metadata?.orgStory ?? 'You inherited a franchise with a real identity problem.'} The MLB club is ${tierLabel(mlbTier)} right now and the farm is ${tierLabel(farmTier)} behind it.`,
    topProspectName: current.topProspectName,
    projectedWins: projectedWinsByTeam.get(teamId) ?? LEAGUE_AVERAGE_WINS,
  };
}

export function buildOpeningDayPlan(
  players: GeneratedPlayer[],
  _choices?: Partial<Pick<DayOneDefaults, 'seasonGoal' | 'budgetAllocation' | 'developmentStyle' | 'promotionStance'>>,
): DayOneOpeningPlan {
  const mlbPlayers = players
    .filter((player) => player.rosterStatus === 'MLB')
    .sort(sortPlayers);
  const hitters = mlbPlayers
    .filter((player) => (HITTER_POSITIONS as readonly string[]).includes(player.position))
    .sort(sortPlayers);
  const used = new Set<string>();
  const lineup: string[] = [];

  for (const position of REQUIRED_LINEUP_POSITIONS) {
    const candidate = hitters.find((player) => player.position === position && !used.has(player.id));
    if (!candidate) {
      continue;
    }
    used.add(candidate.id);
    lineup.push(candidate.id);
  }

  for (const hitter of hitters) {
    if (lineup.length >= 9) {
      break;
    }
    if (used.has(hitter.id)) {
      continue;
    }
    used.add(hitter.id);
    lineup.push(hitter.id);
  }

  const pitchers = mlbPlayers
    .filter((player) => (PITCHER_POSITIONS as readonly string[]).includes(player.position))
    .sort(sortPlayers);
  const rotation = pitchers
    .filter((player) => player.position === 'SP')
    .slice(0, 5)
    .map((player) => player.id);
  const relievers = pitchers
    .filter((player) => player.position === 'RP' || player.position === 'CL');
  const closer = relievers.find((player) => player.position === 'CL') ?? relievers[0] ?? null;
  const setupIds = relievers
    .filter((player) => player.id !== closer?.id)
    .slice(0, 2)
    .map((player) => player.id);
  const longRelief = relievers.find((player) => player.id !== closer?.id && !setupIds.includes(player.id)) ?? null;

  return {
    lineupPlayerIds: lineup,
    rotationPlayerIds: rotation,
    bullpen: relievers.length === 0 ? null : {
      closerId: closer?.id ?? null,
      setupIds,
      longReliefId: longRelief?.id ?? null,
    },
  };
}

export function buildDayOneDefaults(players: GeneratedPlayer[], teamId: string): DayOneDefaults {
  const review = buildDayOneOrgReview(players, teamId);
  const marketSize = TEAM_MARKETS[teamId]?.size ?? 'medium';

  const seasonGoal = review.projectedWins >= 92
    ? 'championship'
    : review.projectedWins >= 84
      ? 'playoff'
      : review.projectedWins >= 76
        ? 'compete'
        : 'rebuild';
  const budgetAllocation = seasonGoal === 'championship'
    ? 'spend_now'
    : seasonGoal === 'playoff'
      ? (marketSize === 'small' ? 'balanced' : 'spend_now')
      : seasonGoal === 'compete'
        ? 'balanced'
        : 'future_flex';
  const developmentStyle = review.farmTier === 'elite' || review.farmTier === 'strong'
    ? 'patient'
    : seasonGoal === 'rebuild'
      ? 'patient'
      : seasonGoal === 'championship'
        ? 'aggressive'
        : 'balanced';
  const promotionStance = developmentStyle === 'aggressive'
    ? 'aggressive'
    : developmentStyle === 'patient'
      ? 'patient'
      : 'measured';

  return {
    seasonGoal,
    budgetAllocation,
    developmentStyle,
    promotionStance,
    openingDayPlan: buildOpeningDayPlan(players, {
      seasonGoal,
      budgetAllocation,
      developmentStyle,
      promotionStance,
    }),
  };
}

export function buildDayOneNarrativePack(context: DayOneNarrativeContext): DayOneNarrativePack {
  return FLAGSHIP_DAY_ONE_TEAMS.has(context.teamId)
    ? buildFlagshipNarrativePack(context)
    : buildSystemicNarrativePack(context);
}

export function buildDayOneTeaser(context: DayOneNarrativeContext): DayOneTeaser {
  return buildDayOneNarrativePack(context).teaser;
}

export function pickDayOneCrisis(context: {
  teamId: string;
  projectedWins: number;
  biggestWeakness: string;
  topProspectName?: string | null;
  agmId?: AGMCandidateId | null;
  seasonGoal?: DayOneDefaults['seasonGoal'] | null;
  budgetAllocation?: DayOneBudgetAllocation | null;
  developmentStyle?: DayOneDefaults['developmentStyle'] | null;
  promotionStance?: DayOnePromotionStance | null;
}): DayOneCrisis {
  const normalizedWeakness = context.biggestWeakness.toLowerCase();
  const team = getTeamById(context.teamId);
  const teamName = team ? `${team.city} ${team.name}` : context.teamId.toUpperCase();

  let type: DayOneCrisisType = 'injury_shock';
  if (normalizedWeakness.includes('bullpen') || normalizedWeakness.includes('closer')) {
    type = 'bullpen_instability';
  } else if (normalizedWeakness.includes('rotation') || normalizedWeakness.includes('starter')) {
    type = 'rotation_hole';
  } else if (normalizedWeakness.includes('prospect') || normalizedWeakness.includes('pipeline') || normalizedWeakness.includes('development')) {
    type = 'prospect_pressure';
  }

  const marketSize = TEAM_MARKETS[context.teamId]?.size ?? 'medium';
  const teamCard = buildDayOneTeamCard({
    teamId: context.teamId,
    teamName,
    payrollTier: marketSize === 'large' ? 'Premier' : marketSize === 'medium' ? 'Competitive' : 'Lean',
    farmSystemRating: context.topProspectName ? 'B+' : 'B',
    projectedRecord: `${context.projectedWins}-${162 - context.projectedWins}`,
    strengths: [],
    weaknesses: [context.biggestWeakness],
    topPlayers: [],
    divisionRivals: [],
  });
  const narrativePack = buildDayOneNarrativePack({
    teamId: context.teamId,
    teamName,
    marketSize,
    archetype: teamCard.archetype,
    projectedWins: context.projectedWins,
    topWeakness: context.biggestWeakness,
    topProspectName: context.topProspectName,
    agmId: context.agmId,
    seasonGoal: context.seasonGoal,
    budgetAllocation: context.budgetAllocation,
    developmentStyle: context.developmentStyle,
    promotionStance: context.promotionStance,
    crisisType: type,
  });

  const responseOptions = (() => {
    switch (type) {
      case 'bullpen_instability':
        return [
          {
            id: 'lock_closer',
            label: context.seasonGoal === 'championship' ? 'Act like contenders and lock it down' : 'Lock down roles',
            summary: context.seasonGoal === 'championship'
              ? 'Treat the ninth like a real contender problem and give the room a firmer hierarchy.'
              : 'Stabilize the back end and trust the hierarchy.',
          },
          {
            id: 'play_matchups',
            label: 'Play matchups',
            summary: context.budgetAllocation === 'future_flex'
              ? 'Preserve flexibility and let the leverage picture settle before spending resources.'
              : 'Keep options open and ride the hot hand.',
          },
          {
            id: 'shop_depth_arm',
            label: context.budgetAllocation === 'future_flex' ? 'Protect July ammo first' : 'Shop for relief',
            summary: context.budgetAllocation === 'future_flex'
              ? 'Look for a narrow solution that does not burn the budget posture you just chose.'
              : 'Preserve your leverage by looking outside the room.',
          },
        ];
      case 'rotation_hole':
        return [
          {
            id: 'protect_rotation',
            label: 'Protect the staff',
            summary: context.budgetAllocation === 'spend_now'
              ? 'Shorten outings now so the room can survive until the bigger answer shows up.'
              : 'Shorten outings and lean on depth early.',
          },
          {
            id: 'promote_arm',
            label: context.promotionStance === 'patient' ? 'Break your own patience' : 'Summon an arm',
            summary: context.promotionStance === 'patient'
              ? 'Force your promotion stance to bend immediately and see whether the talent is worth it.'
              : 'Test your promotion stance immediately.',
          },
          {
            id: 'trade_for_starter',
            label: context.seasonGoal === 'rebuild' ? 'Price the market anyway' : 'Explore the market',
            summary: context.seasonGoal === 'rebuild'
              ? 'Even in a longer build, you need to know what the weakness would cost to patch.'
              : 'Treat the weakness as urgent.',
          },
        ];
      case 'prospect_pressure':
        return [
          {
            id: 'promote_now',
            label: context.promotionStance === 'aggressive' ? 'Do what you said' : 'Promote now',
            summary: context.promotionStance === 'aggressive'
              ? 'Your stated posture already invited this. Cash in the upside immediately.'
              : 'Cash in upside immediately.',
          },
          {
            id: 'hold_line',
            label: context.developmentStyle === 'patient' ? 'Protect the long runway' : 'Hold the line',
            summary: context.developmentStyle === 'patient'
              ? 'Defend the development posture you just sold to the room.'
              : 'Protect the long view even if the room gets noisy.',
          },
          {
            id: 'split_time',
            label: 'Create a runway',
            summary: context.seasonGoal === 'playoff' || context.seasonGoal === 'championship'
              ? 'Ease the talent in without pretending the big-league stakes are small.'
              : 'Ease the prospect in without blowing up the plan.',
          },
        ];
      case 'injury_shock':
      default:
        return [
          {
            id: 'patch_in_house',
            label: context.budgetAllocation === 'future_flex' ? 'Trust your depth chart' : 'Patch it in-house',
            summary: context.budgetAllocation === 'future_flex'
              ? 'Stay disciplined and make the internal depth prove it deserves trust.'
              : 'Trust depth and stay disciplined.',
          },
          {
            id: 'accelerate_callup',
            label: context.promotionStance === 'patient' ? 'Accelerate anyway' : 'Accelerate a call-up',
            summary: context.promotionStance === 'patient'
              ? 'Break your own patience because the big-league room already needs oxygen.'
              : 'Force your development stance into action.',
          },
          {
            id: 'seek_stopgap',
            label: context.seasonGoal === 'championship' ? 'Buy breathing room now' : 'Find a stopgap',
            summary: context.seasonGoal === 'championship'
              ? 'A contender cannot treat this like a philosophical exercise. Preserve the season.'
              : 'Preserve the season by buying breathing room.',
          },
        ];
    }
  })();

  switch (type) {
    case 'bullpen_instability':
      return {
        type,
        title: narrativePack.crisis.title || 'The Ninth Inning Is Already Wobbling',
        summary: `${teamName} enters Opening Day with real leverage but very little trust at the back end. ${narrativePack.crisis.summary}`,
        responseOptions,
      };
    case 'rotation_hole':
      return {
        type,
        title: narrativePack.crisis.title || 'The Fifth Spot Is A Problem',
        summary: `${teamName} can survive a weak back-end starter for a week, not a season. ${narrativePack.crisis.summary}`,
        responseOptions,
      };
    case 'prospect_pressure':
      return {
        type,
        title: narrativePack.crisis.title || 'The Prospect Is Knocking',
        summary: context.topProspectName
          ? `${context.topProspectName} looks ready enough to force the issue, and your promotion stance is about to be tested for real. ${narrativePack.crisis.summary}`
          : `Your top prospect is already putting pressure on the big-league roster and the room wants a decision. ${narrativePack.crisis.summary}`,
        responseOptions,
      };
    case 'injury_shock':
    default:
      return {
        type: 'injury_shock',
        title: narrativePack.crisis.title || 'A Key Piece Tweaks Something',
        summary: `${teamName} loses a little certainty before the real baseball even starts, and your depth chart gets stressed immediately. ${narrativePack.crisis.summary}`,
        responseOptions,
      };
  }
}

export function buildDayOneImpacts(context: {
  teamId?: string;
  seasonGoal: DayOneDefaults['seasonGoal'];
  budgetAllocation: DayOneBudgetAllocation;
  developmentStyle: DayOneDefaults['developmentStyle'];
  promotionStance: DayOnePromotionStance;
  crisisType?: DayOneCrisisType | null;
  agmId?: AGMCandidateId | null;
}): DayOneProjectedImpact[] {
  const impacts: DayOneProjectedImpact[] = [];
  const marketSize = context.teamId ? (TEAM_MARKETS[context.teamId]?.size ?? 'medium') : 'medium';

  impacts.push({
    label: 'Season Pressure',
    direction: context.seasonGoal === 'rebuild' ? 'down' : 'up',
    summary: context.seasonGoal === 'championship'
      ? marketSize === 'large'
        ? 'You told the market this club should matter now. A flat April becomes oxygen for outside pressure immediately.'
        : 'You set a contender posture, so even small stumbles will get judged like missed opportunities.'
      : context.seasonGoal === 'playoff'
        ? 'The room now expects visible traction in the first few series, not vague optimism.'
        : context.seasonGoal === 'compete'
          ? 'You gave yourself room to build belief, but not enough to hide a shapeless April.'
          : 'You bought yourself runway, but only if the club looks like it is building toward something real.',
  });

  impacts.push({
    label: 'Deadline Flexibility',
    direction: context.budgetAllocation === 'future_flex' ? 'up' : context.budgetAllocation === 'spend_now' ? 'down' : 'neutral',
    summary: context.budgetAllocation === 'future_flex'
      ? 'You kept July ammunition in reserve, which helps later but makes every early roster flaw easier to notice.'
      : context.budgetAllocation === 'spend_now'
        ? 'You front-loaded support for the major-league room, which narrows later maneuvering if the first answers miss.'
        : 'You kept enough optionality to move later without telling the clubhouse it is on its own.',
  });

  impacts.push({
    label: 'Farm Growth',
    direction: context.developmentStyle === 'patient' ? 'up' : context.developmentStyle === 'aggressive' ? 'down' : 'neutral',
    summary: context.developmentStyle === 'patient'
      ? 'You protected development time even if the major-league room gets noisy fast.'
      : context.developmentStyle === 'aggressive'
        ? 'You told the system to squeeze upside forward, which can create help fast and regret just as fast.'
        : 'You kept the pipeline in play without promising the room instant answers.',
  });

  impacts.push({
    label: 'Call-Up Urgency',
    direction: context.promotionStance === 'aggressive' ? 'up' : context.promotionStance === 'patient' ? 'down' : 'neutral',
    summary: context.promotionStance === 'aggressive'
      ? 'A hot two weeks in Triple-A can now force your hand much faster.'
      : context.promotionStance === 'patient'
        ? 'Prospects will need to pound on the door clearly before you move, even if the bench starts wobbling.'
        : 'You left yourself room to move the right player at the right time without pretending every streak is destiny.',
  });

  if (context.crisisType) {
    impacts.push({
      label: 'Immediate Risk',
      direction: 'up',
      summary: context.crisisType === 'bullpen_instability'
        ? 'One weak late-inning bridge can hijack the first month before the club settles.'
        : context.crisisType === 'rotation_hole'
          ? 'A soft rotation spot will test your depth chart before the room gets comfortable.'
          : context.crisisType === 'prospect_pressure'
            ? 'Your development stance is about to meet a real baseball argument, not a theoretical one.'
            : 'Depth is already under stress before Opening Day can even feel normal.',
    });
  }

  return impacts;
}
