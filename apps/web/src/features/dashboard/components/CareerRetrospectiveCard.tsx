import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  ChevronRight,
  Crown,
  Flag,
  Flame,
  ScrollText,
  Sparkles,
  Star,
  Swords,
  Trophy,
} from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { humanizeLabel, momentTypeLabel } from '@/shared/lib/labels';

const SeasonStoryReelModal = lazy(() => import('./SeasonStoryReelModal'));

interface TeamMomentEntry {
  type: string;
  description: string;
  season: number;
  day: number | null;
  impact: number;
  relevance: number;
}

interface LegendArcEntry {
  playerId: string;
  playerName: string;
  arcType: string;
  resolvedSeason: number;
  milestoneHeadline: string | null;
}

interface AwardsShelfView {
  mvp: number;
  cyYoung: number;
  rookieOfTheYear: number;
  goldGlove: number;
  silverSlugger: number;
  allStar: number;
  other: number;
  total: number;
}

interface TopRivalryView {
  opponentTeamId: string;
  opponentTeamName: string;
  opponentAbbreviation: string;
  intensity: number;
  summary: string;
  currentSeasonRecord: string;
  historicalRecord: string;
}

interface CareerRetrospectiveView {
  franchise: {
    gmName: string;
    teamId: string;
    teamName: string;
    abbreviation: string;
    hiredSeason: number;
    currentSeason: number;
  };
  tenure: {
    yearsServed: number;
    overallRecord: { wins: number; losses: number };
    winPct: number;
    reputation: number;
  };
  titles: {
    worldSeries: number;
    pennants: number;
    divisionTitles: number;
    playoffAppearances: number;
  };
  teamMoments: TeamMomentEntry[];
  legendArcs: LegendArcEntry[];
  awardsShelf: AwardsShelfView;
  topRivalry: TopRivalryView | null;
}

function formatWinPct(pct: number): string {
  return pct.toFixed(3).replace(/^0/, '');
}

export default function CareerRetrospectiveCard() {
  const { getCareerRetrospective, isReady } = useWorker();
  const [view, setView] = useState<CareerRetrospectiveView | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  const fetchRetrospective = useCallback(async () => {
    if (!isReady || typeof getCareerRetrospective !== 'function') {
      setView(null);
      setLoading(false);
      return;
    }

    try {
      const data = await getCareerRetrospective();
      setView(data as CareerRetrospectiveView);
    } catch {
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [getCareerRetrospective, isReady]);

  useEffect(() => {
    void fetchRetrospective();
  }, [fetchRetrospective]);

  const hasContent = view != null && (
    view.titles.worldSeries > 0
    || view.titles.pennants > 0
    || view.titles.divisionTitles > 0
    || view.titles.playoffAppearances > 0
    || view.teamMoments.length > 0
    || view.legendArcs.length > 0
    || view.awardsShelf.total > 0
    || view.topRivalry != null
  );

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-accent-warning" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Career Retrospective</h2>
        </div>
        <Link
          to="/gm-career"
          className="flex items-center gap-1 font-heading text-xs text-accent-info hover:text-accent-primary"
        >
          GM dossier <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading...</div>
      ) : view == null ? (
        <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
          Career retrospective is unavailable right now.
        </div>
      ) : !hasContent ? (
        <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
          Your career story is still being written. Titles, legend arcs, and rivalries will fill in as the dynasty unfolds.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <TenureStrip view={view} />
          <TitlesRow titles={view.titles} />
          {view.awardsShelf.total > 0 ? <AwardsShelf shelf={view.awardsShelf} /> : null}
          {view.teamMoments.length > 0 ? (
            <SignatureBeats
              moments={view.teamMoments.slice(0, 3)}
              onSelectSeason={setSelectedSeason}
            />
          ) : null}
          {view.legendArcs.length > 0 ? (
            <LegendArcs arcs={view.legendArcs.slice(0, 3)} onSelectSeason={setSelectedSeason} />
          ) : null}
          {view.topRivalry ? <TopRivalry rivalry={view.topRivalry} /> : null}
        </div>
      )}

      {selectedSeason != null ? (
        <Suspense fallback={null}>
          <SeasonStoryReelModal
            seasonYear={selectedSeason}
            onDismiss={() => setSelectedSeason(null)}
          />
        </Suspense>
      ) : null}
    </section>
  );
}

function TenureStrip({ view }: { view: CareerRetrospectiveView }) {
  const { franchise, tenure } = view;
  const record = `${tenure.overallRecord.wins}-${tenure.overallRecord.losses}`;
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">Tenure</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-heading text-sm font-semibold text-dynasty-textBright">{franchise.gmName}</span>
        <span className="font-data text-[11px] uppercase tracking-[0.12em] text-dynasty-muted">
          {franchise.abbreviation} · S{franchise.hiredSeason}-S{franchise.currentSeason}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-data text-[11px] text-dynasty-text">
        <span>
          <span className="text-dynasty-muted">Years </span>
          <span className="text-dynasty-textBright">{tenure.yearsServed}</span>
        </span>
        <span>
          <span className="text-dynasty-muted">Record </span>
          <span className="text-dynasty-textBright">{record}</span>
        </span>
        <span>
          <span className="text-dynasty-muted">Win% </span>
          <span className="text-dynasty-textBright">{formatWinPct(tenure.winPct)}</span>
        </span>
        <span>
          <span className="text-dynasty-muted">Rep </span>
          <span className="text-dynasty-textBright">{Math.round(tenure.reputation)}</span>
        </span>
      </div>
    </div>
  );
}

function TitlesRow({ titles }: { titles: CareerRetrospectiveView['titles'] }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <TitleTile icon={Trophy} label="World Series" value={titles.worldSeries} tone="gold" />
        <TitleTile icon={Flag} label="Pennants" value={titles.pennants} tone="silver" />
        <TitleTile icon={Star} label="Division Titles" value={titles.divisionTitles} tone="bronze" />
      </div>
      {titles.playoffAppearances > 0 ? (
        <div className="mt-2 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
          Playoff Appearances: <span className="text-dynasty-textBright">{titles.playoffAppearances}</span>
        </div>
      ) : null}
    </div>
  );
}

function TitleTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Trophy;
  label: string;
  value: number;
  tone: 'gold' | 'silver' | 'bronze';
}) {
  const accentClass =
    tone === 'gold'
      ? 'text-accent-warning'
      : tone === 'silver'
        ? 'text-dynasty-textBright'
        : 'text-accent-info';
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3 w-3 ${accentClass}`} />
        <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">{label}</div>
      </div>
      <div className={`mt-1 font-heading text-lg font-semibold ${accentClass}`}>{value}</div>
    </div>
  );
}

function AwardsShelf({ shelf }: { shelf: AwardsShelfView }) {
  const items: Array<{ key: string; label: string; count: number; icon: typeof Award }> = [
    { key: 'mvp', label: 'MVP', count: shelf.mvp, icon: Trophy },
    { key: 'cyYoung', label: 'Cy Young', count: shelf.cyYoung, icon: Flame },
    { key: 'roy', label: 'ROY', count: shelf.rookieOfTheYear, icon: Sparkles },
    { key: 'gg', label: 'Gold Glove', count: shelf.goldGlove, icon: Star },
    { key: 'ss', label: 'Silver Slugger', count: shelf.silverSlugger, icon: Award },
    { key: 'allStar', label: 'All-Star', count: shelf.allStar, icon: Star },
  ];

  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-accent-warning" />
          <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">Awards Shelf</div>
        </div>
        <div className="font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
          Total <span className="text-dynasty-textBright">{shelf.total}</span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 md:grid-cols-6">
        {items.map(({ key, label, count, icon: Icon }) => (
          <div
            key={key}
            className="rounded border border-dynasty-border/60 bg-dynasty-elevated/70 px-2 py-1.5"
          >
            <div className="flex items-center gap-1">
              <Icon className="h-3 w-3 text-dynasty-muted" />
              <span className="font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">{label}</span>
            </div>
            <div className={`mt-0.5 font-heading text-base font-semibold ${count > 0 ? 'text-dynasty-textBright' : 'text-dynasty-muted'}`}>
              {count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignatureBeats({
  moments,
  onSelectSeason,
}: {
  moments: TeamMomentEntry[];
  onSelectSeason: (season: number) => void;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-accent-info" />
        <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">Signature Beats</div>
      </div>
      <ul className="mt-2 space-y-2">
        {moments.map((moment, idx) => {
          const positive = moment.impact >= 0;
          const Icon = positive ? Sparkles : AlertTriangle;
          const iconClass = positive ? 'text-accent-success' : 'text-accent-danger';
          return (
            <li key={`${moment.type}-${moment.season}-${moment.day ?? idx}`}>
              <button
                type="button"
                onClick={() => onSelectSeason(moment.season)}
                aria-label={`Open season ${moment.season} story reel`}
                className="flex w-full items-start gap-2 rounded-md px-1 py-1 text-left transition hover:bg-dynasty-elevated/70 focus:bg-dynasty-elevated/70 focus:outline-none focus:ring-1 focus:ring-accent-info/60"
              >
                <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${iconClass}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-heading text-xs text-dynasty-textBright">{momentTypeLabel(moment.type)}</div>
                  <div className="mt-0.5 font-heading text-xs text-dynasty-text">{moment.description}</div>
                  <div className="mt-0.5 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                    Season {moment.season}
                    {moment.day != null ? ` · Day ${moment.day}` : ''}
                  </div>
                </div>
                <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-dynasty-muted" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LegendArcs({
  arcs,
  onSelectSeason,
}: {
  arcs: LegendArcEntry[];
  onSelectSeason: (season: number) => void;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-center gap-1.5">
        <ScrollText className="h-3.5 w-3.5 text-accent-info" />
        <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">Legend Arcs</div>
      </div>
      <ul className="mt-2 space-y-2">
        {arcs.map((arc) => (
          <li key={`${arc.playerId}-${arc.arcType}-${arc.resolvedSeason}`} className="min-w-0">
            <div className="flex items-baseline gap-2">
              <Link
                to={`/players/${arc.playerId}`}
                className="truncate font-heading text-xs text-dynasty-textBright hover:text-accent-primary"
              >
                {arc.playerName}
              </Link>
              <span className="shrink-0 font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
                {humanizeLabel(arc.arcType)}
              </span>
              <button
                type="button"
                onClick={() => onSelectSeason(arc.resolvedSeason)}
                aria-label={`Open season ${arc.resolvedSeason} story reel`}
                className="ml-auto shrink-0 rounded-full border border-dynasty-border/60 bg-dynasty-elevated/70 px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted transition hover:border-accent-info/60 hover:text-accent-info focus:outline-none focus:ring-1 focus:ring-accent-info/60"
              >
                S{arc.resolvedSeason}
              </button>
            </div>
            {arc.milestoneHeadline ? (
              <div className="mt-0.5 font-heading text-xs text-dynasty-text">{arc.milestoneHeadline}</div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopRivalry({ rivalry }: { rivalry: TopRivalryView }) {
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Swords className="h-3.5 w-3.5 text-accent-danger" />
          <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">Top Rivalry</div>
        </div>
        <div className="font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
          Intensity <span className="text-dynasty-textBright">{Math.round(rivalry.intensity)}</span>
        </div>
      </div>
      <div className="mt-2">
        <div className="font-heading text-xs font-semibold text-dynasty-textBright">
          vs {rivalry.opponentTeamName}
        </div>
        <div className="mt-1 font-heading text-xs text-dynasty-text">{rivalry.summary}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
          <span>
            Season <span className="text-dynasty-textBright">{rivalry.currentSeasonRecord}</span>
          </span>
          <span>
            Lifetime <span className="text-dynasty-textBright">{rivalry.historicalRecord}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
