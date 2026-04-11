import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle, GradeBar } from '@mbd/ui';
import { Building2, Clock, Coins, TrendingUp, Users, Zap } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { PageShell } from '@/shared/components/PageShell';

interface OwnerState {
  archetype: string;
  patience: number;
  confidence: number;
  hotSeat: boolean;
  summary: string;
  expectations: { winsTarget: number; playoffTarget: boolean; payrollTarget: number };
  satisfaction: number;
  spendingWillingness: number;
  winNowPressure: number;
  meddlingLevel: number;
  annualBudget: number;
  payrollCap: number;
  draftBonusPool: number;
  ifaBonusPool: number;
  staffBudget: number;
}

interface FrontOfficeState {
  reputation: number;
  draftScore: number;
  tradeScore: number;
  freeAgencyScore: number;
  playoffScore: number;
  summary: string;
}

interface TeamChemistry {
  score: number;
  tier: string;
  trend: string;
  summary: string;
  reasons: string[];
}

interface RelationshipView {
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

function archetypeIcon(archetype: string) {
  switch (archetype) {
    case 'win_now': return <TrendingUp className="h-4 w-4" />;
    case 'patient_builder': return <Clock className="h-4 w-4" />;
    case 'penny_pincher': return <Coins className="h-4 w-4" />;
    default: return <Building2 className="h-4 w-4" />;
  }
}

function archetypeLabel(archetype: string): string {
  return archetype.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function chemTierTone(tier: string): string {
  switch (tier) {
    case 'electric': return 'text-accent-primary bg-accent-primary/10 border-accent-primary/30';
    case 'connected': return 'text-accent-success bg-accent-success/10 border-accent-success/30';
    case 'neutral': return 'text-accent-warning bg-accent-warning/10 border-accent-warning/30';
    case 'disconnected': return 'text-accent-primary bg-accent-primary/10 border-accent-primary/30';
    case 'toxic': return 'text-accent-danger bg-accent-danger/10 border-accent-danger/30';
    default: return 'text-dynasty-muted bg-dynasty-elevated border-dynasty-border';
  }
}

function scoreToGrade(score: number): number {
  // Map -40..+40 -> 0..100
  return Math.round(((score + 40) / 80) * 100);
}

function relationshipTone(tier: RelationshipView['tier']): string {
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

function relationshipLabel(tier: RelationshipView['tier']): string {
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

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function OwnerProfileCard({ owner }: { owner: OwnerState }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {archetypeIcon(owner.archetype)}
          Owner Profile
          {owner.hotSeat && (
            <Badge className="ml-auto border-accent-danger/40 bg-accent-danger/10 text-accent-danger motion-safe:animate-pulse">
              HOT SEAT
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge className="border-dynasty-border bg-dynasty-elevated text-dynasty-text">
          {archetypeLabel(owner.archetype)}
        </Badge>

        <div className="space-y-3">
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Patience</span><span>{owner.patience}</span>
            </div>
            <GradeBar grade={owner.patience} />
          </div>
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Confidence</span><span>{owner.confidence}</span>
            </div>
            <GradeBar grade={owner.confidence} />
          </div>
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Satisfaction</span><span>{owner.satisfaction}</span>
            </div>
            <GradeBar grade={owner.satisfaction} />
          </div>
        </div>

        <div className="rounded-md border border-dynasty-border bg-dynasty-base p-3">
          <div className="font-heading text-xs text-dynasty-muted">Expectations</div>
          <div className="mt-1.5 space-y-1 font-data text-xs text-dynasty-text">
            <div>Win target: <span className="text-accent-primary">{owner.expectations.winsTarget}+</span> wins</div>
            <div>Playoffs: <span className={owner.expectations.playoffTarget ? 'text-accent-success' : 'text-dynasty-muted'}>{owner.expectations.playoffTarget ? 'Expected' : 'Optional'}</span></div>
            <div>Payroll cap: <span className="text-accent-warning">{formatMoney(owner.expectations.payrollTarget)}</span></div>
          </div>
        </div>

        <p className="font-data text-xs italic text-dynasty-muted">{owner.summary}</p>
      </CardContent>
    </Card>
  );
}

function ReputationCard({ fo }: { fo: FrontOfficeState }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Front Office Reputation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="font-brand text-4xl text-accent-primary">{fo.reputation}</div>
          <div className="font-data text-xs text-dynasty-muted">Overall Rating</div>
        </div>
        <GradeBar grade={fo.reputation} label="Overall" showValue />

        <div className="space-y-3">
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Draft Acumen</span><span>{fo.draftScore > 0 ? '+' : ''}{fo.draftScore}</span>
            </div>
            <GradeBar grade={scoreToGrade(fo.draftScore)} />
          </div>
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Trade Savvy</span><span>{fo.tradeScore > 0 ? '+' : ''}{fo.tradeScore}</span>
            </div>
            <GradeBar grade={scoreToGrade(fo.tradeScore)} />
          </div>
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Free Agency</span><span>{fo.freeAgencyScore > 0 ? '+' : ''}{fo.freeAgencyScore}</span>
            </div>
            <GradeBar grade={scoreToGrade(fo.freeAgencyScore)} />
          </div>
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Playoff Success</span><span>{fo.playoffScore > 0 ? '+' : ''}{fo.playoffScore}</span>
            </div>
            <GradeBar grade={scoreToGrade(fo.playoffScore)} />
          </div>
        </div>

        <p className="font-data text-xs italic text-dynasty-muted">{fo.summary}</p>
      </CardContent>
    </Card>
  );
}

function ChemistryCard({ chem }: { chem: TeamChemistry }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Clubhouse Chemistry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="font-brand text-3xl text-dynasty-textBright">{chem.score}</div>
          <div>
            <Badge className={chemTierTone(chem.tier)}>{chem.tier}</Badge>
            <div className="mt-0.5 font-data text-[10px] text-dynasty-muted">
              Trend: {chem.trend === 'improving' ? 'Improving' : chem.trend === 'declining' ? 'Declining' : 'Stable'}
            </div>
          </div>
        </div>
        <GradeBar grade={chem.score} />
        {chem.reasons.length > 0 && (
          <div className="space-y-1">
            {chem.reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-dynasty-muted" />
                <span className="font-data text-xs text-dynasty-muted">{r}</span>
              </div>
            ))}
          </div>
        )}
        <p className="font-data text-xs italic text-dynasty-muted">{chem.summary}</p>
      </CardContent>
    </Card>
  );
}

function BudgetCard({ owner }: { owner: OwnerState }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-4 w-4" />
          Budget Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Annual Budget', value: formatMoney(owner.annualBudget) },
            { label: 'Payroll Cap', value: formatMoney(owner.payrollCap) },
            { label: 'Draft Bonus Pool', value: formatMoney(owner.draftBonusPool) },
            { label: 'IFA Bonus Pool', value: formatMoney(owner.ifaBonusPool) },
            { label: 'Staff Budget', value: formatMoney(owner.staffBudget) },
            { label: 'Spending Will', value: `${owner.spendingWillingness}` },
          ].map((item) => (
            <div key={item.label} className="rounded-md border border-dynasty-border bg-dynasty-base p-2.5">
              <div className="font-data text-[10px] text-dynasty-muted">{item.label}</div>
              <div className="mt-0.5 font-data text-sm text-dynasty-textBright">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Win-Now Pressure</span><span>{owner.winNowPressure}</span>
            </div>
            <GradeBar grade={owner.winNowPressure} />
          </div>
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Meddling Level</span><span>{owner.meddlingLevel}</span>
            </div>
            <GradeBar grade={owner.meddlingLevel} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeagueStandingCard({
  relationships,
}: {
  relationships: RelationshipView[];
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          League Standing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}

export default function FrontOfficePage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, season, day, phase } = useGameStore();
  const [owner, setOwner] = useState<OwnerState | null>(null);
  const [fo, setFO] = useState<FrontOfficeState | null>(null);
  const [chem, setChem] = useState<TeamChemistry | null>(null);
  const [relationships, setRelationships] = useState<RelationshipView[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    const [ownerData, foData, chemData, relationshipData] = await Promise.all([
      worker.getOwnerState(),
      worker.getFrontOfficeState(),
      worker.getTeamChemistry(),
      worker.getRelationships(),
    ]);
    setOwner((ownerData ?? null) as OwnerState | null);
    setFO((foData ?? null) as FrontOfficeState | null);
    setChem((chemData ?? null) as TeamChemistry | null);
    setRelationships((relationshipData as RelationshipView[]) ?? []);
    setLoading(false);
  }, [isInitialized, worker, workerReady]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, season, day, phase]);

  return (
    <PageShell loading={loading}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-brand text-3xl tracking-wide text-dynasty-textBright">Owner Intel</h1>
          <p className="mt-1 font-data text-sm text-dynasty-muted">
            Front office intelligence and organizational health
          </p>
        </div>

        {/* Two-column grid */}
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-4">
            {owner && <OwnerProfileCard owner={owner} />}
            {chem && <ChemistryCard chem={chem} />}
          </div>
          <div className="space-y-4">
            {fo && <ReputationCard fo={fo} />}
            {owner && <BudgetCard owner={owner} />}
          </div>
        </div>

        {relationships.length > 0 ? <LeagueStandingCard relationships={relationships} /> : null}
      </div>
    </PageShell>
  );
}
