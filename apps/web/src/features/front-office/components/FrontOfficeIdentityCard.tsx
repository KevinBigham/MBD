import { Badge, GradeBar } from '@mbd/ui';
import { Compass, Radio, ShieldCheck } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';

export interface FrontOfficeAlignmentScore {
  score: number;
  impact: number;
  label: 'strong' | 'steady' | 'watch' | 'strained';
  summary: string;
}

export interface FrontOfficeIdentityView {
  assistantGM: {
    id: string | null;
    name: string;
    focus: string;
    upside: string;
    watchout: string;
  };
  scoutingDirector: {
    name: string;
    focus: string;
    draftAccuracy: number;
    internationalAccuracy: number;
    proAccuracy: number;
  } | null;
  philosophy: {
    seasonGoal: string;
    developmentStyle: string;
    scoutingFocus: string;
    spendingStyle: string;
    tradeApproach: string;
    mediaTone: string;
  };
  alignment: {
    overall: FrontOfficeAlignmentScore;
    mandate: FrontOfficeAlignmentScore;
    spending: FrontOfficeAlignmentScore;
    trade: FrontOfficeAlignmentScore;
    development: FrontOfficeAlignmentScore;
    media: FrontOfficeAlignmentScore;
  };
  visibleEffects: string[];
  recentConsequence: {
    headline: string;
    body: string;
    timestamp: string;
  } | null;
}

function alignmentTone(label: FrontOfficeAlignmentScore['label']): string {
  switch (label) {
    case 'strong':
      return 'border-accent-success/40 bg-accent-success/10 text-accent-success';
    case 'steady':
      return 'border-accent-info/40 bg-accent-info/10 text-accent-info';
    case 'watch':
      return 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning';
    case 'strained':
    default:
      return 'border-accent-danger/40 bg-accent-danger/10 text-accent-danger';
  }
}

function formatAccuracy(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function FrontOfficeIdentityCard({
  identity,
}: {
  identity: FrontOfficeIdentityView;
}) {
  const philosophyRows: Array<[string, string]> = [
    ['Mandate', identity.philosophy.seasonGoal],
    ['Development', identity.philosophy.developmentStyle],
    ['Scouting', identity.philosophy.scoutingFocus],
    ['Spending', identity.philosophy.spendingStyle],
    ['Trades', identity.philosophy.tradeApproach],
    ['Media', identity.philosophy.mediaTone],
  ];
  const alignmentRows: Array<[string, FrontOfficeAlignmentScore]> = [
    ['Mandate', identity.alignment.mandate],
    ['Spending', identity.alignment.spending],
    ['Trade', identity.alignment.trade],
    ['Development', identity.alignment.development],
    ['Media', identity.alignment.media],
  ];

  return (
    <DensePanel
      title="Front Office Identity"
      icon={<Compass className="h-4 w-4" />}
      meta={(
        <Badge className={alignmentTone(identity.alignment.overall.label)}>
          {identity.alignment.overall.score}
        </Badge>
      )}
      bodyClassName="space-y-4"
    >
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-md border border-dynasty-border bg-dynasty-base p-3">
            <div className="flex items-center gap-2 font-heading text-sm text-dynasty-textBright">
              <ShieldCheck className="h-4 w-4 text-accent-primary" />
              {identity.assistantGM.name}
            </div>
            <p className="mt-2 font-data text-xs text-dynasty-muted">{identity.assistantGM.upside}</p>
            <p className="mt-1 font-data text-xs text-accent-warning">{identity.assistantGM.watchout}</p>
          </div>

          <div className="rounded-md border border-dynasty-border bg-dynasty-base p-3">
            <div className="flex items-center gap-2 font-heading text-sm text-dynasty-textBright">
              <Radio className="h-4 w-4 text-accent-info" />
              {identity.scoutingDirector?.name ?? 'Scouting Director'}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 font-data text-[10px] text-dynasty-muted">
              <div>
                <div>Draft</div>
                <div className="text-xs text-dynasty-textBright">
                  {identity.scoutingDirector ? formatAccuracy(identity.scoutingDirector.draftAccuracy) : 'Base'}
                </div>
              </div>
              <div>
                <div>IFA</div>
                <div className="text-xs text-dynasty-textBright">
                  {identity.scoutingDirector ? formatAccuracy(identity.scoutingDirector.internationalAccuracy) : 'Base'}
                </div>
              </div>
              <div>
                <div>Pro</div>
                <div className="text-xs text-dynasty-textBright">
                  {identity.scoutingDirector ? formatAccuracy(identity.scoutingDirector.proAccuracy) : 'Base'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
            <span>Overall Alignment</span><span>{identity.alignment.overall.label}</span>
          </div>
          <GradeBar grade={identity.alignment.overall.score} />
          <p className="mt-2 font-data text-xs text-dynasty-muted">{identity.alignment.overall.summary}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {philosophyRows.map(([label, value]) => (
            <div key={label} className="rounded-md border border-dynasty-border bg-dynasty-base p-2">
              <div className="font-data text-[10px] text-dynasty-muted">{label}</div>
              <div className="mt-0.5 font-heading text-xs text-dynasty-textBright">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-5">
          {alignmentRows.map(([label, score]) => (
            <div key={label} className="rounded-md border border-dynasty-border bg-dynasty-base p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-data text-[10px] text-dynasty-muted">{label}</span>
                <Badge className={alignmentTone(score.label)}>
                  {score.impact >= 0 ? '+' : ''}{score.impact}
                </Badge>
              </div>
              <div className="mt-1 font-brand text-xl text-dynasty-textBright">{score.score}</div>
            </div>
          ))}
        </div>

        {identity.recentConsequence ? (
          <div className="rounded-md border border-accent-primary/25 bg-accent-primary/10 p-3">
            <div className="font-heading text-sm text-dynasty-textBright">{identity.recentConsequence.headline}</div>
            <p className="mt-1 font-data text-xs text-dynasty-muted">{identity.recentConsequence.body}</p>
          </div>
        ) : null}
    </DensePanel>
  );
}
