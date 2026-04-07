import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@mbd/ui';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { PageShell } from '@/shared/components/PageShell';

/* ---------- stat definitions ---------- */

interface StatDefinition {
  key: string;
  name: string;
  abbreviation: string;
  category: 'batting' | 'pitching' | 'universal';
  formula: string;
  description: string;
  excellent: string;
  good: string;
  average: string;
  poor: string;
  /** true = lower is better (ERA, FIP, WHIP) */
  invertedScale: boolean;
}

const STAT_DEFINITIONS: StatDefinition[] = [
  {
    key: 'war',
    name: 'Wins Above Replacement',
    abbreviation: 'WAR',
    category: 'universal',
    formula: 'Batting Runs + Baserunning Runs + Fielding + Positional Adj + Replacement Level, divided by Runs Per Win',
    description: 'A single number that captures a player\'s total contribution in all facets of the game, measured in wins above a theoretical replacement-level player.',
    excellent: '6.0+',
    good: '3.0 - 5.9',
    average: '1.0 - 2.9',
    poor: 'Below 1.0',
    invertedScale: false,
  },
  {
    key: 'woba',
    name: 'Weighted On-Base Average',
    abbreviation: 'wOBA',
    category: 'batting',
    formula: '(0.69*BB + 0.72*HBP + 0.88*1B + 1.24*2B + 1.56*3B + 1.95*HR) / (AB + BB + HBP + SF)',
    description: 'Weights each offensive event by its run value. More accurate than OPS at measuring offensive production because it properly values each outcome.',
    excellent: '.370+',
    good: '.340 - .369',
    average: '.310 - .339',
    poor: 'Below .310',
    invertedScale: false,
  },
  {
    key: 'wrcPlus',
    name: 'Weighted Runs Created Plus',
    abbreviation: 'wRC+',
    category: 'batting',
    formula: '((wOBA - lgWOBA) / wobaScale + runsPerPA) / runsPerPA * 100, adjusted for park factor',
    description: 'Park- and league-adjusted version of wOBA, scaled so 100 is league average. A wRC+ of 120 means 20% better than average.',
    excellent: '130+',
    good: '110 - 129',
    average: '90 - 109',
    poor: 'Below 90',
    invertedScale: false,
  },
  {
    key: 'opsPlus',
    name: 'OPS Plus',
    abbreviation: 'OPS+',
    category: 'batting',
    formula: '(OPS / lgOPS) * 100, adjusted for park factor',
    description: 'Park- and league-adjusted OPS. 100 is average. Simpler than wRC+ but less precise because it equally weights OBP and SLG.',
    excellent: '130+',
    good: '110 - 129',
    average: '90 - 109',
    poor: 'Below 90',
    invertedScale: false,
  },
  {
    key: 'iso',
    name: 'Isolated Power',
    abbreviation: 'ISO',
    category: 'batting',
    formula: 'SLG - AVG',
    description: 'Measures raw power by isolating extra-base hit ability. Strips out singles to show pure slugging.',
    excellent: '.250+',
    good: '.180 - .249',
    average: '.120 - .179',
    poor: 'Below .120',
    invertedScale: false,
  },
  {
    key: 'fip',
    name: 'Fielding Independent Pitching',
    abbreviation: 'FIP',
    category: 'pitching',
    formula: '(13*HR + 3*(BB+HBP) - 2*K) / IP + constant',
    description: 'Evaluates a pitcher based only on outcomes they can control: strikeouts, walks, hit batters, and home runs. Removes the effect of fielding and luck on balls in play.',
    excellent: 'Below 3.00',
    good: '3.00 - 3.49',
    average: '3.50 - 4.19',
    poor: '4.20+',
    invertedScale: true,
  },
  {
    key: 'xfip',
    name: 'Expected Fielding Independent Pitching',
    abbreviation: 'xFIP',
    category: 'pitching',
    formula: 'Same as FIP but uses expected HR (flyBalls * lgHR/FB rate) instead of actual HR',
    description: 'Normalizes FIP by replacing actual home runs with expected home runs based on fly ball rate. Better predictor of future performance than FIP.',
    excellent: 'Below 3.20',
    good: '3.20 - 3.69',
    average: '3.70 - 4.29',
    poor: '4.30+',
    invertedScale: true,
  },
  {
    key: 'whip',
    name: 'Walks + Hits per Inning Pitched',
    abbreviation: 'WHIP',
    category: 'pitching',
    formula: '(BB + H) / IP',
    description: 'Measures how many baserunners a pitcher allows per inning. Simple but effective at measuring a pitcher\'s ability to prevent traffic on the bases.',
    excellent: 'Below 1.00',
    good: '1.00 - 1.19',
    average: '1.20 - 1.39',
    poor: '1.40+',
    invertedScale: true,
  },
  {
    key: 'kPer9',
    name: 'Strikeouts Per 9 Innings',
    abbreviation: 'K/9',
    category: 'pitching',
    formula: '(K * 9) / IP',
    description: 'Rate of strikeouts per nine innings pitched. Higher is better. A key indicator of a pitcher\'s ability to miss bats.',
    excellent: '10.0+',
    good: '8.0 - 9.9',
    average: '6.5 - 7.9',
    poor: 'Below 6.5',
    invertedScale: false,
  },
  {
    key: 'kBb',
    name: 'Strikeout-to-Walk Ratio',
    abbreviation: 'K/BB',
    category: 'pitching',
    formula: 'K / BB',
    description: 'The ratio of strikeouts to walks. Measures a pitcher\'s command and control. Elite pitchers can strike out hitters without walking many.',
    excellent: '4.0+',
    good: '3.0 - 3.9',
    average: '2.0 - 2.9',
    poor: 'Below 2.0',
    invertedScale: false,
  },
];

/* ---------- league context ---------- */

interface LeagueContextView {
  leagueWoba: number;
  leagueOps: number;
  leagueEra: number;
  leagueFip: number;
  runsPerWin: number;
}

/* ---------- category filter ---------- */

type CategoryFilter = 'all' | 'batting' | 'pitching' | 'universal';

const FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'All Stats' },
  { key: 'universal', label: 'Universal' },
  { key: 'batting', label: 'Batting' },
  { key: 'pitching', label: 'Pitching' },
];

/* ---------- components ---------- */

function QualityBadge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`inline-block rounded border px-2 py-0.5 font-data text-[10px] ${tone}`}>
      {label}
    </span>
  );
}

function StatCard({ stat }: { stat: StatDefinition }) {
  const categoryTone =
    stat.category === 'batting'
      ? 'text-accent-success border-accent-success/30'
      : stat.category === 'pitching'
        ? 'text-accent-info border-accent-info/30'
        : 'text-accent-warning border-accent-warning/30';

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-5 transition-colors hover:border-dynasty-muted">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-brand text-xl tracking-wide text-accent-primary">{stat.abbreviation}</h3>
          <p className="mt-0.5 font-heading text-sm text-dynasty-text">{stat.name}</p>
        </div>
        <Badge className={categoryTone}>{stat.category}</Badge>
      </div>

      {/* Description */}
      <p className="mt-3 font-data text-xs leading-relaxed text-dynasty-muted">{stat.description}</p>

      {/* Formula */}
      <div className="mt-3 rounded border border-dynasty-border bg-dynasty-base/50 px-3 py-2">
        <div className="font-heading text-[10px] uppercase tracking-wider text-dynasty-muted">Formula</div>
        <div className="mt-1 font-data text-xs text-dynasty-text">{stat.formula}</div>
      </div>

      {/* Quality scale */}
      <div className="mt-3">
        <div className="font-heading text-[10px] uppercase tracking-wider text-dynasty-muted">Quality Scale</div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <div className="flex items-center gap-2">
            {stat.invertedScale ? (
              <TrendingDown className="h-3 w-3 text-accent-success" />
            ) : (
              <TrendingUp className="h-3 w-3 text-accent-success" />
            )}
            <QualityBadge label={stat.excellent} tone="border-accent-success/40 text-accent-success bg-accent-success/5" />
            <span className="font-data text-[10px] text-dynasty-muted">Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3" />
            <QualityBadge label={stat.good} tone="border-accent-info/40 text-accent-info bg-accent-info/5" />
            <span className="font-data text-[10px] text-dynasty-muted">Good</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3" />
            <QualityBadge label={stat.average} tone="border-dynasty-muted/40 text-dynasty-muted bg-dynasty-elevated" />
            <span className="font-data text-[10px] text-dynasty-muted">Average</span>
          </div>
          <div className="flex items-center gap-2">
            {stat.invertedScale ? (
              <TrendingUp className="h-3 w-3 text-accent-danger" />
            ) : (
              <TrendingDown className="h-3 w-3 text-accent-danger" />
            )}
            <QualityBadge label={stat.poor} tone="border-accent-danger/40 text-accent-danger bg-accent-danger/5" />
            <span className="font-data text-[10px] text-dynasty-muted">Poor</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeagueContextPanel({ context }: { context: LeagueContextView | null }) {
  if (!context) {
    return (
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4 text-center font-data text-sm text-dynasty-muted">
        Sim games to generate league context data.
      </div>
    );
  }

  const items = [
    { label: 'League wOBA', value: context.leagueWoba.toFixed(3) },
    { label: 'League OPS', value: context.leagueOps.toFixed(3) },
    { label: 'League ERA', value: context.leagueEra.toFixed(2) },
    { label: 'League FIP', value: context.leagueFip.toFixed(2) },
    { label: 'Runs/Win', value: context.runsPerWin.toFixed(1) },
  ];

  return (
    <div className="rounded-lg border border-accent-primary/20 bg-accent-primary/5 p-4">
      <div className="font-heading text-xs uppercase tracking-wider text-dynasty-muted">
        Current League Environment
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {items.map((item) => (
          <div key={item.label}>
            <div className="font-data text-lg font-bold text-accent-primary">{item.value}</div>
            <div className="font-data text-[10px] text-dynasty-muted">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- main page ---------- */

export default function StatsEncyclopediaPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, season, day, phase } = useGameStore();
  const [leagueContext, setLeagueContext] = useState<LeagueContextView | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const fetchContext = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    try {
      const diag = await worker.getPerformanceDiagnostics();
      if (diag && typeof diag === 'object' && 'leagueContext' in diag) {
        setLeagueContext(diag.leagueContext as LeagueContextView);
      }
    } catch {
      // noop — league context is optional
    }
  }, [isInitialized, workerReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void fetchContext();
  }, [fetchContext, season, day, phase]);

  const filtered =
    filter === 'all'
      ? STAT_DEFINITIONS
      : STAT_DEFINITIONS.filter((s) => s.category === filter);

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-brand text-3xl tracking-wide text-dynasty-textBright">Stats Encyclopedia</h1>
            <p className="mt-1 font-data text-sm text-dynasty-muted">
              Advanced sabermetric reference &mdash; how every stat works and what&apos;s &ldquo;good&rdquo;
            </p>
          </div>
          <Link
            to="/league/leaders"
            className="flex items-center gap-2 rounded-md border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-xs text-dynasty-muted transition-colors hover:border-accent-primary hover:text-accent-primary"
          >
            <BarChart3 className="h-4 w-4" />
            Leaderboards
          </Link>
        </div>

        {/* League context */}
        <LeagueContextPanel context={leagueContext} />

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={[
                'focus-ring rounded-md border px-3 py-1.5 font-heading text-xs transition-colors',
                filter === f.key
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                  : 'border-dynasty-border bg-dynasty-surface text-dynasty-muted hover:border-dynasty-muted hover:text-dynasty-text',
              ].join(' ')}
            >
              {f.label}
              <span className="ml-1.5 font-data text-[10px] opacity-70">
                {f.key === 'all'
                  ? STAT_DEFINITIONS.length
                  : STAT_DEFINITIONS.filter((s) => s.category === f.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((stat) => (
            <StatCard key={stat.key} stat={stat} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
