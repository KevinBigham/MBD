import { Badge, GradeBar } from '@mbd/ui';
import type { TeamChemistry } from '@mbd/contracts';
import { Building2, Users } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';

export interface FrontOfficeReputationView {
  reputation: number;
  draftScore: number;
  tradeScore: number;
  freeAgencyScore: number;
  playoffScore: number;
  summary: string;
}

function chemTierTone(tier: string): string {
  switch (tier) {
    case 'electric': return 'text-accent-primary bg-accent-primary/10 border-accent-primary/30';
    case 'connected': return 'text-accent-success bg-accent-success/10 border-accent-success/30';
    case 'steady': return 'text-accent-warning bg-accent-warning/10 border-accent-warning/30';
    case 'tense': return 'text-accent-warning bg-accent-warning/10 border-accent-warning/30';
    case 'fractured': return 'text-accent-danger bg-accent-danger/10 border-accent-danger/30';
    case 'neutral': return 'text-accent-warning bg-accent-warning/10 border-accent-warning/30';
    case 'disconnected': return 'text-accent-primary bg-accent-primary/10 border-accent-primary/30';
    case 'toxic': return 'text-accent-danger bg-accent-danger/10 border-accent-danger/30';
    default: return 'text-dynasty-muted bg-dynasty-elevated border-dynasty-border';
  }
}

function scoreToGrade(score: number): number {
  return Math.round(((score + 40) / 80) * 100);
}

export function FrontOfficeReputationCard({
  reputation,
}: {
  reputation: FrontOfficeReputationView;
}) {
  return (
    <DensePanel
      title="Front Office Reputation"
      icon={<Building2 className="h-4 w-4" />}
      bodyClassName="space-y-4"
    >
        <div className="text-center">
          <div className="font-brand text-4xl text-accent-primary">{reputation.reputation}</div>
          <div className="font-data text-xs text-dynasty-muted">Overall Rating</div>
        </div>
        <GradeBar grade={reputation.reputation} label="Overall" showValue />

        <div className="space-y-3">
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Draft Acumen</span><span>{reputation.draftScore > 0 ? '+' : ''}{reputation.draftScore}</span>
            </div>
            <GradeBar grade={scoreToGrade(reputation.draftScore)} />
          </div>
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Trade Savvy</span><span>{reputation.tradeScore > 0 ? '+' : ''}{reputation.tradeScore}</span>
            </div>
            <GradeBar grade={scoreToGrade(reputation.tradeScore)} />
          </div>
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Free Agency</span><span>{reputation.freeAgencyScore > 0 ? '+' : ''}{reputation.freeAgencyScore}</span>
            </div>
            <GradeBar grade={scoreToGrade(reputation.freeAgencyScore)} />
          </div>
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Playoff Success</span><span>{reputation.playoffScore > 0 ? '+' : ''}{reputation.playoffScore}</span>
            </div>
            <GradeBar grade={scoreToGrade(reputation.playoffScore)} />
          </div>
        </div>

        <p className="font-data text-xs italic text-dynasty-muted">{reputation.summary}</p>
    </DensePanel>
  );
}

export function FrontOfficeChemistryCard({
  chemistry,
}: {
  chemistry: TeamChemistry;
}) {
  return (
    <DensePanel
      title="Clubhouse Chemistry"
      icon={<Users className="h-4 w-4" />}
      bodyClassName="space-y-3"
    >
        <div className="flex items-center gap-3">
          <div className="font-brand text-3xl text-dynasty-textBright">{chemistry.score}</div>
          <div>
            <Badge className={chemTierTone(chemistry.tier)}>{chemistry.tier}</Badge>
            <div className="mt-0.5 font-data text-[10px] text-dynasty-muted">
              Trend: {chemistry.trend === 'rising' ? 'Improving' : chemistry.trend === 'falling' ? 'Declining' : 'Stable'}
            </div>
          </div>
        </div>
        <GradeBar grade={chemistry.score} />
        {chemistry.reasons.length > 0 && (
          <div className="space-y-1">
            {chemistry.reasons.map((reason, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-dynasty-muted" />
                <span className="font-data text-xs text-dynasty-muted">{reason}</span>
              </div>
            ))}
          </div>
        )}
        <p className="font-data text-xs italic text-dynasty-muted">{chemistry.summary}</p>
    </DensePanel>
  );
}
