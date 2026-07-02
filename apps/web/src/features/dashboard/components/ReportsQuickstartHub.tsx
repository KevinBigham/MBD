import { ArrowRight, BookOpenCheck, FileText, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HubLink {
  label: string;
  detail: string;
  to: string;
}

const REPORT_LINKS: readonly HubLink[] = [
  {
    label: 'Trade Ledger',
    detail: 'Completed deals, active offers, and deadline context.',
    to: '/trade?mode=history',
  },
  {
    label: 'Tx Log',
    detail: 'League moves, signings, briefings, and press-room events.',
    to: '/press-room',
  },
  {
    label: 'Season Recap',
    detail: 'Archived season story, awards, standings, and outcomes.',
    to: '/history',
  },
  {
    label: 'Draft Log',
    detail: 'Past classes, pick history, and prospect stories.',
    to: '/history',
  },
  {
    label: 'FA Market',
    detail: 'Available players, contract asks, and market pressure.',
    to: '/free-agency',
  },
  {
    label: 'Budget Report',
    detail: 'Payroll, owner limits, and spending room.',
    to: '/finance',
  },
  {
    label: 'Player Dev',
    detail: 'Farm system, affiliate movement, and prospect momentum.',
    to: '/minors',
  },
  {
    label: 'History',
    detail: 'Franchise memory, rivalries, and dynasty archive.',
    to: '/history',
  },
  {
    label: 'Records',
    detail: 'Milestones, chase lists, and league record context.',
    to: '/records',
  },
  {
    label: 'Pulse',
    detail: 'Monthly league checkpoint and story changes.',
    to: '/pulse',
  },
  {
    label: 'News',
    detail: 'Unread league wire, team notes, and save-story beats.',
    to: '/news',
  },
];

const QUICKSTART_LINKS: readonly HubLink[] = [
  {
    label: 'Contender',
    detail: 'Check market pressure, deadline fits, and short-term upgrades.',
    to: '/trade?mode=market',
  },
  {
    label: 'Rebuild',
    detail: 'Pick a scenario lane, protect young talent, and reset goals.',
    to: '/scenarios',
  },
  {
    label: 'Small Market',
    detail: 'Start with budget room, contracts, and owner expectations.',
    to: '/finance',
  },
  {
    label: 'Tutorial Day One',
    detail: 'Replay the opening cockpit before committing to long sims.',
    to: '/onboarding',
  },
];

function ReportLinkCard({ link }: { link: HubLink }) {
  return (
    <Link
      to={link.to}
      className="group flex min-h-[88px] flex-col justify-between rounded-lg border border-dynasty-outline bg-dynasty-panel/80 p-3 transition hover:border-accent-primary/60 hover:bg-accent-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="font-heading text-sm text-dynasty-text">{link.label}</span>
        <ArrowRight className="h-4 w-4 text-dynasty-muted transition group-hover:translate-x-0.5 group-hover:text-accent-primary" aria-hidden="true" />
      </span>
      <span className="mt-2 text-xs leading-5 text-dynasty-muted">{link.detail}</span>
    </Link>
  );
}

function QuickstartLinkCard({ link }: { link: HubLink }) {
  return (
    <Link
      to={link.to}
      className="group flex min-h-[116px] flex-col justify-between rounded-lg border border-dynasty-outline bg-dynasty-surface/70 p-4 transition hover:border-accent-secondary/60 hover:bg-accent-secondary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary"
    >
      <span className="flex items-center gap-2 font-heading text-base text-dynasty-text">
        <Rocket className="h-4 w-4 text-accent-secondary" aria-hidden="true" />
        {link.label}
      </span>
      <span className="text-sm leading-6 text-dynasty-muted">{link.detail}</span>
      <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">
        Open lane
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

export default function ReportsQuickstartHub() {
  return (
    <section className="rounded-lg border border-dynasty-outline bg-dynasty-surface/80 p-4 shadow-dynasty" aria-labelledby="reports-quickstart-hub-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-primary">
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
            GM Cockpit
          </p>
          <h2 id="reports-quickstart-hub-title" className="mt-1 font-brand text-2xl text-dynasty-text">
            Reports Hub
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-dynasty-muted">
            Fast paths into the reports that explain what changed, why it matters, and where the next decision lives.
          </p>
        </div>
        <FileText className="hidden h-8 w-8 text-accent-primary sm:block" aria-hidden="true" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {REPORT_LINKS.map((link) => (
          <ReportLinkCard key={`${link.label}-${link.to}`} link={link} />
        ))}
      </div>

      <div className="mt-5 border-t border-dynasty-outline pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-heading text-lg text-dynasty-text">Quickstarts</h3>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-dynasty-muted">Pick a GM arc</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {QUICKSTART_LINKS.map((link) => (
            <QuickstartLinkCard key={`${link.label}-${link.to}`} link={link} />
          ))}
        </div>
      </div>
    </section>
  );
}
