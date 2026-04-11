import type { AGMCandidateId } from './agmCandidates.js';
import type { DialogueLine, DialogueTone } from './chapterDialogue.js';
import type { RevisedChapterId } from './flowEngine.js';

function line(
  text: string,
  tone: DialogueTone,
  emphasis: string | null = null,
): DialogueLine {
  return {
    speaker: 'assistant_gm',
    text,
    tone,
    emphasis,
    referencedPlayerName: null,
    referencedStat: null,
  };
}

export const ROUND_THREE_DIALOGUE = {
  marcus_chen: {
    agm_selection: [
      line("Marcus Chen. I built Portland's projection system. They fired me for being right too loudly. You won't. Probably.", 'informative'),
      line('What I bring: I know what every player is worth, to the dollar. The other two will tell you stories. I will tell you the expected value.', 'serious'),
      line('Good. My model gave you a 67% chance of picking me. Updating priors.', 'informative'),
    ],
    owners_office: [
      line("Owner is [OWNER_NAME]. Net worth $[NET_WORTH]B. Made money in [INDUSTRY]. Bought the team in [YEAR].", 'informative'),
      line("Spending pattern: payroll correlates to projected wins at r=0.73. He'll spend if he thinks you'll win. He won't if he thinks you'll lose.", 'informative'),
      line("He's saying 'compete.' That means payroll stays at $[PAYROLL]M. Listen for the number, not the word.", 'cautionary'),
    ],
    roster_review: [
      line('Roster has [TOTAL_WAR] WAR projected. That is [WINS] wins. Payroll is $[PAYROLL]M. Efficiency matters here.', 'informative'),
      line('We have [STARS] players above 3 WAR, [REGULARS] between 1 and 3, and [REPLACEMENTS] below 1. That is your distribution.', 'informative'),
      line('Biggest gaps: [POSITION] is -1.2 WAR below average. [POSITION2] is -0.8. Everything else is inside half a win.', 'serious'),
    ],
    hire_coaches: [
      line('Three coaching positions are open. Combined, they influence roughly 12 wins per season through decision-making and development.', 'informative'),
      line('Choose for fit, not resume. The wrong manager can cost three wins. The right one can find you two.', 'informative'),
      line('Approach coach versus power coach is close, but patience scales a little better over a full season.', 'cautionary'),
    ],
    farm_system: [
      line('Farm ranked [RANK]. Total prospect value: [VALUE] WAR. Top three account for 68 percent.', 'informative'),
      line('Patient development is the cleanest path. Fast-tracking prospects reduces peak WAR by an average of 0.8.', 'cautionary'),
    ],
    hire_scouts: [
      line('Scouting director shapes the next five to ten years. Choose the most efficient market, not the loudest one.', 'informative'),
      line('Draft is usually the most efficient market. International is high variance. Pro coverage helps faster, but the long-term value is thinner.', 'informative'),
    ],
    financial_plan: [
      line('Payroll is $[PAYROLL]M. Committed money runs through [YEAR]. Flexibility is [AMOUNT]M.', 'informative'),
      line('Efficiency matters more than amount. [TEAM] spent $180M last year and won 74 games.', 'informative'),
      line('If expected value points toward a championship, spend. If we are rebuilding, do not buy noise.', 'serious'),
    ],
    season_strategy: [
      line('Competitive window: [WINDOW]. Expected playoff probability: [PROB]%.', 'informative'),
      line('Buyer if the math supports it. Seller if future value clearly beats present value. Opportunistic is optimal under uncertainty.', 'informative'),
    ],
    press_conference: [
      line('Reporters are waiting. Key topics: firings, budget, timeline.', 'informative'),
      line('Give them numbers, not narratives. Numbers are defensible. And do not promise a timeline.', 'cautionary'),
      line('Measured is still the optimal posture. Expected value stays highest there.', 'encouraging'),
    ],
  },
  elena_vargas: {
    agm_selection: [
      line("Elena Vargas. I signed players for fourteen years in the DR. I know what a big leaguer looks like at sixteen. I also know what heartbreak looks like.", 'encouraging'),
      line('I want this job because this farm system has kids who need someone to fight for them. I fight for my guys.', 'encouraging'),
      line("Gracias. You won't regret this. Well, you might, but we'll figure it out together.", 'excited'),
    ],
    owners_office: [
      line("Owner is [OWNER_NAME]. I met him once at a charity event. Nice suit, firm handshake. He asks about your family before he asks about baseball.", 'encouraging'),
      line('He is patient, mostly. He fired the last GM because the clubhouse was toxic, not just because they lost. He cares about culture.', 'informative'),
      line("He's saying the right things about building something sustainable. That means he probably will not force you to trade prospects for a rental.", 'encouraging'),
    ],
    roster_review: [
      line("Okay, let's meet your guys. I've watched most of these kids come up. Some I signed myself.", 'encouraging'),
      line("You've got some talent here. Not a finished product, but there are pieces to work with.", 'encouraging'),
      line('We need help at [POSITION], and we could use a veteran in the rotation to show the young guys how to be pros.', 'concerned'),
    ],
    hire_coaches: [
      line('These hires shape your culture. Players spend more time with coaches than they do with family during the season.', 'encouraging'),
      line('Choose people, not resumes. The best coaches care about the person first and the player second.', 'encouraging'),
      line("I'd lean approach on the hitting side. It is harder to teach patience than power.", 'informative'),
    ],
    farm_system: [
      line("Let's go see the kids. I know most of these guys. Good group.", 'encouraging'),
      line('Balanced development is the right call here. One size does not fit all, and pushing the wrong kid only hurts him.', 'encouraging'),
    ],
    hire_scouts: [
      line('This hire shapes your next decade. You need someone who knows people, not just numbers.', 'encouraging'),
      line('Best amateur scout I ever worked with. The international specialist knows everyone, and they trust him.', 'excited'),
    ],
    financial_plan: [
      line("Okay, the books. Not my favorite part, but here we are.", 'encouraging'),
      line("Money's always tight, but you cannot develop players without investing in them.", 'concerned'),
      line('If you pinch pennies, do not cut the minor-league budget. Kids need resources more than slogans.', 'serious'),
    ],
    season_strategy: [
      line("Let's talk about what we're really trying to do. No owner, no press, just us.", 'encouraging'),
      line('If you buy, make sure it is the right move. If you sell, make sure the step back actually leads somewhere.', 'encouraging'),
    ],
    press_conference: [
      line("Reporters are people too. They're just doing their job.", 'encouraging'),
      line('Tell them the truth. Not all of it, but whatever you say should be true.', 'encouraging'),
      line('Do not attack them. They hold grudges longer than fans do.', 'cautionary'),
    ],
  },
  walt_kowalski: {
    agm_selection: [
      line("Walt Kowalski. Played twelve years, coached eight, scouted six. I've seen a lot of baseball. Most of it bad.", 'serious'),
      line("I want this job because I'm tired of watching teams get built by people who never played. You need someone who's been in the clubhouse.", 'serious'),
      line("Good choice, kid. Let's get to work.", 'serious'),
    ],
    owners_office: [
      line("Owner's [OWNER_NAME]. Made his money in [INDUSTRY]. Doesn't know much about baseball, knows a lot about winning.", 'serious'),
      line('Last GM got fired because he lost the clubhouse. Nobody looked the owner in the eye. That is when he knew.', 'serious'),
      line("He's talking about doing things the right way. Hustle, fundamentals, no excuses. Old school. Good.", 'encouraging'),
    ],
    roster_review: [
      line("Here's your roster. Some can play, some can't. Let's figure out which is which.", 'serious'),
      line("Paper doesn't matter. I've seen 90-win teams on paper win 70, and vice versa.", 'serious'),
      line('Need a guy at [POSITION] who can pick it, and we need a starter who throws strikes. Too many walks on this staff.', 'informative'),
    ],
    hire_coaches: [
      line("Need a manager, pitching coach, hitting coach. Previous staff got fired with the old GM. Clean slate.", 'serious'),
      line('Manager sets the tone. Everything flows from there. Choose wisely.', 'serious'),
      line("I'd take the players' manager or the veteran before the analyst. Book smarts do not win the room on their own.", 'cautionary'),
    ],
    farm_system: [
      line("Minor league complex. Let's see what we got.", 'serious'),
      line("If the kid can play, he plays. That's baseball. Patient only makes sense when the player is not ready.", 'encouraging'),
    ],
    hire_scouts: [
      line("Scouting director finds the players nobody else sees. Important hire.", 'serious'),
      line('The draft guy knows the board cold. The pro guy knows the league. International is a crapshoot until it is not.', 'informative'),
    ],
    financial_plan: [
      line("Money's tight. Always is. Back in '98 we had a $40M payroll and still won 88 games.", 'serious'),
      line("It isn't about money, it's about the right guys. Spend it where it changes who you are.", 'serious'),
    ],
    season_strategy: [
      line("What's the plan, kid? Win now, build, or split the difference?", 'serious'),
      line('Go for it if you can. Flags fly forever. If you have to sell, then at least make it count.', 'philosophical'),
    ],
    press_conference: [
      line('Reporters are waiting. Just the facts.', 'serious'),
      line('Keep it short and never promise anything. Promises get GMs fired.', 'cautionary'),
      line("Presser's over, you survived, and that is enough for day one.", 'serious'),
    ],
  },
} satisfies Record<AGMCandidateId, Record<RevisedChapterId, DialogueLine[]>>;
