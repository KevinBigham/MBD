import { AlertTriangle, Sparkles } from 'lucide-react';
import type { SignatureMoment } from '@mbd/contracts';
import { momentTypeLabel } from '@/shared/lib/labels';

interface FranchiseLegacySummary {
  total: number;
  positive: number;
  negative: number;
  latest: SignatureMoment | null;
}

interface FranchiseLegacyCardBodyProps {
  loading: boolean;
  moments: SignatureMoment[];
}

function summarize(moments: SignatureMoment[]): FranchiseLegacySummary {
  let positive = 0;
  let negative = 0;
  for (const moment of moments) {
    if (moment.impact >= 0) {
      positive += 1;
    } else {
      negative += 1;
    }
  }
  return {
    total: moments.length,
    positive,
    negative,
    latest: moments[0] ?? null,
  };
}

export default function FranchiseLegacyCardBody({
  loading,
  moments,
}: FranchiseLegacyCardBodyProps) {
  const summary = summarize(moments);

  if (loading) {
    return <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading...</div>;
  }

  if (summary.total === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
        Team identity beats will appear here after your first trade deadline.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Moments" value={String(summary.total)} tone="neutral" />
        <StatTile label="Positive" value={String(summary.positive)} tone="positive" />
        <StatTile label="Setbacks" value={String(summary.negative)} tone="negative" />
      </div>

      {summary.latest ? <LatestMomentBlock moment={summary.latest} /> : null}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'positive' | 'negative';
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-accent-success'
      : tone === 'negative'
        ? 'text-accent-danger'
        : 'text-dynasty-textBright';

  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">{label}</div>
      <div className={`mt-1 font-heading text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function LatestMomentBlock({ moment }: { moment: SignatureMoment }) {
  const positive = moment.impact >= 0;
  const Icon = positive ? Sparkles : AlertTriangle;
  const iconClass = positive
    ? 'bg-accent-success/10 text-accent-success'
    : 'bg-accent-danger/10 text-accent-danger';

  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">Latest</div>
      <div className="mt-2 flex items-start gap-3">
        <div className={`mt-0.5 rounded-full p-1.5 ${iconClass}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <div className="font-heading text-sm text-dynasty-textBright">
            {momentTypeLabel(moment.type)}
          </div>
          <div className="mt-1 font-heading text-sm text-dynasty-text">
            {moment.description}
          </div>
          <div className="mt-2 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            Season {moment.season}
            {moment.day != null ? ` · Day ${moment.day}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
