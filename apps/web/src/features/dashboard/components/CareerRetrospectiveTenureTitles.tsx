import {
  Flag,
  Star,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

export interface CareerRetrospectiveTenureTitlesView {
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
}

function formatWinPct(pct: number): string {
  return pct.toFixed(3).replace(/^0/, '');
}

export default function CareerRetrospectiveTenureTitles({
  view,
}: {
  view: CareerRetrospectiveTenureTitlesView;
}) {
  return (
    <>
      <TenureStrip view={view} />
      <TitlesRow titles={view.titles} />
    </>
  );
}

function TenureStrip({ view }: { view: CareerRetrospectiveTenureTitlesView }) {
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

function TitlesRow({ titles }: { titles: CareerRetrospectiveTenureTitlesView['titles'] }) {
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
  icon: LucideIcon;
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
