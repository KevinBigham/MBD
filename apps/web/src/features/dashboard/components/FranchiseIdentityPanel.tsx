import { ProgressFill } from '@/shared/components/ProgressFill';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { divisionLabel } from '@/shared/lib/labels';

type FanSentimentTrend = 'rising' | 'stable' | 'falling';

interface MetricPillProps {
  label: string;
  value: string;
  detail: string;
  toneClassName?: string;
  progressToneClassName?: string;
  progressValue?: number;
}

interface FranchiseIdentityPanelProps {
  teamId: string | null;
  teamName: string;
  gmName: string;
  season: number;
  record: string;
  division: string;
  divisionRank: number;
  dynastyGrade: string;
  dynastyScore: number;
  fanSentimentScore: number;
  fanSentimentTrend: FanSentimentTrend;
  fanSentimentSummary: string;
  ownerMeterValue: number;
  ownerSummary: string;
}

function ownerTone(value: number | undefined): string {
  if (value == null) return 'bg-dynasty-border';
  if (value >= 65) return 'bg-accent-success';
  if (value >= 40) return 'bg-accent-warning';
  return 'bg-accent-danger';
}

function fanTrendTone(trend: FanSentimentTrend | undefined): string {
  switch (trend) {
    case 'rising':
      return 'text-accent-success';
    case 'falling':
      return 'text-accent-danger';
    default:
      return 'text-dynasty-textBright';
  }
}

function MetricPill({
  label,
  value,
  detail,
  toneClassName = 'text-dynasty-textBright',
  progressToneClassName,
  progressValue,
}: MetricPillProps) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-3">
      <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">{label}</div>
      <div className={`mt-2 font-data text-2xl ${toneClassName}`}>{value}</div>
      {progressToneClassName && progressValue != null ? (
        <div className="mt-2">
          <ProgressFill toneClassName={progressToneClassName} value={progressValue} />
        </div>
      ) : null}
      <div className="mt-2 font-heading text-xs text-dynasty-muted">{detail}</div>
    </div>
  );
}

export default function FranchiseIdentityPanel({
  teamId,
  teamName,
  gmName,
  season,
  record,
  division,
  divisionRank,
  dynastyGrade,
  dynastyScore,
  fanSentimentScore,
  fanSentimentTrend,
  fanSentimentSummary,
  ownerMeterValue,
  ownerSummary,
}: FranchiseIdentityPanelProps) {
  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-surface p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="font-data text-[11px] uppercase tracking-[0.2em] text-accent-info">Franchise Identity</div>
          <div className="mt-3 flex items-center gap-4">
            {teamId && <TeamLogo teamId={teamId} size="xl" />}
            <h1 className="font-brand text-4xl text-dynasty-textBright">{teamName}</h1>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 font-heading text-sm text-dynasty-muted">
            <span>GM {gmName}</span>
            <span>Season {season}</span>
            <span>{record}</span>
            <span>{divisionLabel(division)} · {divisionRank} place</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricPill label="Dynasty" value={dynastyGrade} detail={`${dynastyScore} pts`} />
          <MetricPill
            detail={fanSentimentSummary}
            label="Fan Mood"
            toneClassName={fanTrendTone(fanSentimentTrend)}
            value={`${Math.round(fanSentimentScore)}`}
          />
          <MetricPill
            detail={ownerSummary}
            label="Owner Heat"
            progressToneClassName={ownerTone(ownerMeterValue)}
            progressValue={ownerMeterValue}
            value={`${Math.round(ownerMeterValue)}`}
          />
        </div>
      </div>
    </section>
  );
}
