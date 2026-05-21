import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, GradeBar, StatLine, Tabs, TabsContent, TabsList, TabsTrigger } from '@mbd/ui';
import { AlertTriangle, BriefcaseBusiness, Handshake, Link2, Sparkles, Unlink2, Wallet } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import { humanizeLabel, roleLabel } from '@/shared/lib/labels';
import CoachingRadarChart from '../components/CoachingRadarChart';

interface CoachView {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  specialty: string;
  teachingAbility: number;
  developmentBonus: number;
  personalityFit: number;
  annualSalary: number;
}

interface CoachingImpactView {
  id: string;
  role: string;
  name: string;
  specialty: string;
  teachingAbility: number;
  developmentBonus: number;
  personalityFit: number;
}

interface StaffBudgetView {
  payroll: number;
  budget: number;
  remaining: number;
}

interface SynergyEntry {
  coachAId: string;
  coachBId: string;
  synergyScore: number;
  factors: string[];
}

interface ChemistryView {
  harmony: {
    overallScore: number;
    synergies: SynergyEntry[];
    weakestLink: SynergyEntry | null;
    strongestBond: SynergyEntry | null;
  };
  issues: Array<{ severity: 'low' | 'medium' | 'high'; description: string; involvedIds: string[] }>;
  playerAffinities: Array<{
    playerId: string;
    playerName: string;
    position: string;
    bestCoach: {
      coachId: string;
      coachName: string;
      affinityScore: number;
      factors: string[];
      developmentBonus: number;
    } | null;
  }>;
  coaches: Array<{ id: string; name: string; role: string; specialty: string; teaching: number; impact: number; fit: number; salary: number }>;
}

function ratingFromFraction(value: number): number {
  return Math.round(20 + (value * 60));
}

function moneyLabel(value: number): string {
  return `$${value.toFixed(2)}M`;
}

export default function StaffPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, phase, season, day, userTeamId } = useGameStore();
  const autosaveActiveGame = useActiveSaveAutosave();
  const [activeTab, setActiveTab] = useState<'overview' | 'market'>('overview');
  const [staff, setStaff] = useState<CoachView[]>([]);
  const [market, setMarket] = useState<CoachView[]>([]);
  const [impact, setImpact] = useState<CoachingImpactView[]>([]);
  const [budget, setBudget] = useState<StaffBudgetView | null>(null);
  const [busyCoachId, setBusyCoachId] = useState<string | null>(null);
  const [chemistry, setChemistry] = useState<ChemistryView | null>(null);

  const canManage = phase === 'offseason';

  const fetchStaffData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;

    const [staffData, marketData, impactData, budgetData, chemistryData] = await Promise.all([
      worker.getCoachingStaff(userTeamId),
      worker.getCoachMarket(),
      worker.getCoachingImpact(userTeamId),
      worker.getStaffBudget(userTeamId),
      worker.getCoachingChemistry(),
    ]);

    setStaff((staffData ?? []) as CoachView[]);
    setMarket((marketData ?? []) as CoachView[]);
    setImpact((impactData ?? []) as CoachingImpactView[]);
    setBudget((budgetData ?? null) as StaffBudgetView | null);
    setChemistry((chemistryData ?? null) as ChemistryView | null);
  }, [isInitialized, userTeamId, worker, workerReady]);

  useEffect(() => {
    void fetchStaffData();
  }, [fetchStaffData, season, day, phase]);

  const projectedVacancies = useMemo(() => new Set(staff.map((coach) => coach.role)), [staff]);
  const topAffinities = useMemo(() => [...(chemistry?.playerAffinities ?? [])]
    .filter((entry) => entry.bestCoach != null)
    .sort((left, right) => (right.bestCoach?.affinityScore ?? 0) - (left.bestCoach?.affinityScore ?? 0))
    .slice(0, 3), [chemistry]);

  const handleHire = useCallback(async (coachId: string) => {
    setBusyCoachId(coachId);
    try {
      await worker.hireCoach(coachId);
      await fetchStaffData();
      await autosaveActiveGame({ season });
    } finally {
      setBusyCoachId(null);
    }
  }, [autosaveActiveGame, fetchStaffData, season, worker]);

  const handleFire = useCallback(async (coachId: string) => {
    setBusyCoachId(coachId);
    try {
      await worker.fireCoach(coachId);
      await fetchStaffData();
      await autosaveActiveGame({ season });
    } finally {
      setBusyCoachId(null);
    }
  }, [autosaveActiveGame, fetchStaffData, season, worker]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-dynasty-text">Staff Overview</h1>
          <p className="font-data text-sm text-dynasty-muted">
            Twelve roles, one development pipeline, no wasted budget.
          </p>
        </div>
        <Badge variant="outline" className="uppercase">
          {canManage ? 'Hiring Window Open' : 'Read Only'}
        </Badge>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
              <Wallet className="h-4 w-4 text-accent-warning" />
              Budget
            </CardTitle>
          </div>
          <Badge variant={budget && budget.remaining >= 0 ? 'success' : 'danger'}>
            {budget ? `${moneyLabel(budget.remaining)} room` : 'Loading'}
          </Badge>
        </CardHeader>
        <CardContent>
          <StatLine
            stats={[
              { label: 'Payroll', value: budget ? moneyLabel(budget.payroll) : '--' },
              { label: 'Budget', value: budget ? moneyLabel(budget.budget) : '--' },
              { label: 'Remaining', value: budget ? moneyLabel(budget.remaining) : '--' },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
            <Sparkles className="h-4 w-4 text-accent-success" />
            Onboarding Staff Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-3">
            {staff.slice(0, 3).map((coach) => (
              <div key={`impact-${coach.id}`} className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-heading text-sm text-dynasty-textBright">{coach.firstName} {coach.lastName}</div>
                    <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                      {roleLabel(coach.role)}
                    </div>
                  </div>
                  <Badge variant={coach.personalityFit >= 0.68 ? 'success' : coach.personalityFit >= 0.5 ? 'warning' : 'outline'}>
                    {Math.round(coach.personalityFit * 100)}% fit
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                    <div className="font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">Boost</div>
                    <div className="mt-1 text-dynasty-text">{Math.round(coach.developmentBonus * 100)}% development lift in {humanizeLabel(coach.specialty)}</div>
                  </div>
                  <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                    <div className="font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">Risk</div>
                    <div className="mt-1 text-dynasty-muted">
                      {coach.personalityFit >= 0.5 ? 'No major culture drag flagged.' : 'Monitor fit with the room before changing development plans.'}
                    </div>
                  </div>
                  <div className="rounded border border-accent-info/30 bg-accent-info/5 px-3 py-2">
                    <div className="font-heading text-[10px] uppercase tracking-wide text-accent-info">Affected system</div>
                    <div className="mt-1 text-dynasty-text">
                      {roleLabel(coach.role)} decisions, player growth, and clubhouse chemistry.
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {topAffinities.length > 0 ? (
            <div className="mt-4 rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3">
              <div className="font-heading text-xs uppercase tracking-wide text-dynasty-muted">Player fit readout</div>
              <div className="mt-3 grid gap-2 lg:grid-cols-3">
                {topAffinities.map((entry) => (
                  <div key={entry.playerId} className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                    <div className="font-heading text-sm text-dynasty-textBright">{entry.playerName}</div>
                    <div className="mt-1 font-heading text-xs text-dynasty-muted">
                      {entry.position} · best with {entry.bestCoach?.coachName ?? 'staff'} · {entry.bestCoach?.affinityScore ?? 0} affinity
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'market')}>
        <TabsList>
          <TabsTrigger value="overview" onClick={() => setActiveTab('overview')}>Overview</TabsTrigger>
          <TabsTrigger value="market" onClick={() => setActiveTab('market')}>Market</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
                  <BriefcaseBusiness className="h-4 w-4 text-accent-info" />
                  Current Staff
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {staff.map((coach) => (
                  <div key={coach.id} className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-heading text-sm text-dynasty-text">
                          {coach.firstName} {coach.lastName}
                        </div>
                        <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                          {roleLabel(coach.role)}
                        </div>
                      </div>
                      <Badge variant="outline">{coach.specialty}</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      <GradeBar label="Teach" grade={ratingFromFraction(coach.teachingAbility)} />
                      <GradeBar label="Impact" grade={ratingFromFraction(0.5 + coach.developmentBonus)} />
                      <GradeBar label="Fit" grade={ratingFromFraction(coach.personalityFit)} />
                    </div>
                    <StatLine
                      className="mt-3"
                      stats={[
                        { label: 'Salary', value: moneyLabel(coach.annualSalary) },
                        { label: 'Bonus', value: `${Math.round(coach.developmentBonus * 100)}%` },
                      ]}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      disabled={!canManage}
                      loading={busyCoachId === coach.id}
                      onClick={() => void handleFire(coach.id)}
                    >
                      Fire
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
                  <Sparkles className="h-4 w-4 text-accent-success" />
                  Staff Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {impact.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-heading text-sm text-dynasty-text">{entry.name}</div>
                      <Badge variant="info">{entry.specialty}</Badge>
                    </div>
                    <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                      {roleLabel(entry.role)}
                    </div>
                    <StatLine
                      className="mt-3"
                      stats={[
                        { label: 'Teach', value: `${Math.round(entry.teachingAbility * 100)}%` },
                        { label: 'Dev', value: `${Math.round(entry.developmentBonus * 100)}%` },
                        { label: 'Fit', value: `${Math.round(entry.personalityFit * 100)}%` },
                      ]}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {chemistry && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
                  <Handshake className="h-4 w-4 text-accent-primary" />
                  Staff Chemistry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-4">
                  <span
                    className={`font-data text-4xl font-bold ${
                      chemistry.harmony.overallScore >= 70
                        ? 'text-accent-success'
                        : chemistry.harmony.overallScore >= 40
                          ? 'text-accent-warning'
                          : 'text-accent-danger'
                    }`}
                  >
                    {chemistry.harmony.overallScore}
                  </span>
                  <span className="font-heading text-sm text-dynasty-muted">
                    Harmony Score
                  </span>
                </div>

                <CoachingRadarChart
                  coaches={chemistry.coaches.map((c) => ({
                    name: c.name,
                    teaching: c.teaching,
                    impact: c.impact,
                    fit: c.fit,
                    role: c.role,
                  }))}
                />

                {chemistry.issues.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-heading text-sm text-dynasty-text">Issues</h4>
                    {chemistry.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3"
                      >
                        <AlertTriangle
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            issue.severity === 'high'
                              ? 'text-accent-danger'
                              : issue.severity === 'medium'
                                ? 'text-accent-warning'
                                : 'text-dynasty-muted'
                          }`}
                        />
                        <div className="flex-1">
                          <Badge
                            variant={
                              issue.severity === 'high'
                                ? 'danger'
                                : issue.severity === 'medium'
                                  ? 'warning'
                                  : 'outline'
                            }
                            className="mb-1"
                          >
                            {issue.severity}
                          </Badge>
                          <p className="font-data text-sm text-dynasty-text">
                            {issue.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {chemistry.harmony.strongestBond && (
                    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Link2 className="h-4 w-4 text-accent-success" />
                        <span className="font-heading text-sm text-dynasty-text">Strongest Bond</span>
                      </div>
                      <span className="font-data text-2xl font-bold text-accent-success">
                        {chemistry.harmony.strongestBond.synergyScore}
                      </span>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {chemistry.harmony.strongestBond.factors.map((f) => (
                          <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {chemistry.harmony.weakestLink && (
                    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Unlink2 className="h-4 w-4 text-accent-danger" />
                        <span className="font-heading text-sm text-dynasty-text">Weakest Link</span>
                      </div>
                      <span className="font-data text-2xl font-bold text-accent-danger">
                        {chemistry.harmony.weakestLink.synergyScore}
                      </span>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {chemistry.harmony.weakestLink.factors.map((f) => (
                          <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="market">
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
                  <BriefcaseBusiness className="h-4 w-4 text-accent-warning" />
                  Current Staff Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {staff.map((coach) => (
                  <div key={coach.id} className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-heading text-sm text-dynasty-text">
                          {coach.firstName} {coach.lastName}
                        </div>
                        <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                          {roleLabel(coach.role)}
                        </div>
                      </div>
                      <Badge variant="outline">{coach.specialty}</Badge>
                    </div>
                    <StatLine
                      className="mt-3"
                      stats={[
                        { label: 'Salary', value: moneyLabel(coach.annualSalary) },
                        { label: 'Fit', value: `${Math.round(coach.personalityFit * 100)}%` },
                      ]}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      disabled={!canManage}
                      loading={busyCoachId === coach.id}
                      onClick={() => void handleFire(coach.id)}
                    >
                      Fire
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
                  <Handshake className="h-4 w-4 text-accent-primary" />
                  Coach Market
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {market.map((coach) => (
                  <div key={coach.id} className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-heading text-sm text-dynasty-text">
                          {coach.firstName} {coach.lastName}
                        </div>
                        <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                          {roleLabel(coach.role)}
                        </div>
                      </div>
                      <Badge variant={projectedVacancies.has(coach.role) ? 'default' : 'outline'}>
                        {coach.specialty}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      <GradeBar label="Teach" grade={ratingFromFraction(coach.teachingAbility)} />
                      <GradeBar label="Impact" grade={ratingFromFraction(0.5 + coach.developmentBonus)} />
                      <GradeBar label="Fit" grade={ratingFromFraction(coach.personalityFit)} />
                    </div>
                    <StatLine
                      className="mt-3"
                      stats={[
                        { label: 'Salary', value: moneyLabel(coach.annualSalary) },
                        { label: 'Bonus', value: `${Math.round(coach.developmentBonus * 100)}%` },
                      ]}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3 w-full"
                      disabled={!canManage}
                      loading={busyCoachId === coach.id}
                      onClick={() => void handleHire(coach.id)}
                    >
                      Hire
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
