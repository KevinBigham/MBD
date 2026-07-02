import { useMemo, useState } from 'react';
import { Badge } from '@mbd/ui';
import { Zap } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';

export interface FrontOfficeRelationshipView {
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  score: number;
  tier: 'hostile' | 'strained' | 'neutral' | 'friendly' | 'trusted';
  tooltip: string;
  lastInteractionSeason: number;
  lastEventLabel: string;
  latestMemoryDescription: string | null;
}

function relationshipTone(tier: FrontOfficeRelationshipView['tier']): string {
  switch (tier) {
    case 'hostile':
      return 'border-accent-danger/40 bg-accent-danger/10 text-accent-danger';
    case 'strained':
      return 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning';
    case 'friendly':
      return 'border-accent-info/40 bg-accent-info/10 text-accent-info';
    case 'trusted':
      return 'border-accent-success/40 bg-accent-success/10 text-accent-success';
    case 'neutral':
    default:
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
  }
}

function relationshipLabel(tier: FrontOfficeRelationshipView['tier']): string {
  switch (tier) {
    case 'hostile':
      return 'Hostile';
    case 'strained':
      return 'Strained';
    case 'friendly':
      return 'Friendly';
    case 'trusted':
      return 'Trusted';
    case 'neutral':
    default:
      return 'Neutral';
  }
}

export function FrontOfficeLeagueStandingCard({
  relationships,
}: {
  relationships: FrontOfficeRelationshipView[];
}) {
  const [sortKey, setSortKey] = useState<'score' | 'team' | 'season'>('score');
  const sorted = useMemo(
    () => relationships
      .slice()
      .sort((left, right) => {
        if (sortKey === 'team') {
          return left.teamName.localeCompare(right.teamName) || left.teamId.localeCompare(right.teamId);
        }
        if (sortKey === 'season') {
          return right.lastInteractionSeason - left.lastInteractionSeason
            || right.score - left.score
            || left.teamName.localeCompare(right.teamName);
        }
        return right.score - left.score
          || left.teamName.localeCompare(right.teamName)
          || left.teamId.localeCompare(right.teamId);
      }),
    [relationships, sortKey],
  );

  return (
    <DensePanel
      title="League Standing"
      icon={<Zap className="h-4 w-4" />}
      bodyClassName="space-y-4"
    >
        <div className="flex gap-2">
          {[
            ['score', 'Score'],
            ['team', 'Team'],
            ['season', 'Last Event'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSortKey(value as 'score' | 'team' | 'season')}
              className={[
                'focus-ring rounded border px-2.5 py-1 font-heading text-[11px] uppercase tracking-[0.18em] transition-colors',
                sortKey === value
                  ? 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary'
                  : 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted hover:text-dynasty-text',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {sorted.map((relationship) => (
            <div
              key={relationship.teamId}
              className="rounded-md border border-dynasty-border bg-dynasty-base p-3"
              title={relationship.tooltip}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-heading text-sm text-dynasty-textBright">
                    {relationship.teamAbbreviation} · {relationship.teamName}
                  </div>
                  <div className="mt-1 font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
                    Last event {relationship.lastEventLabel}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={relationshipTone(relationship.tier)}>
                    {relationshipLabel(relationship.tier)}
                  </Badge>
                  <span className="font-data text-xs text-dynasty-textBright">{relationship.score}</span>
                </div>
              </div>
              <p className="mt-2 font-data text-xs text-dynasty-muted">
                {relationship.latestMemoryDescription ?? 'No memorable front-office friction or goodwill logged yet.'}
              </p>
            </div>
          ))}
        </div>
    </DensePanel>
  );
}
