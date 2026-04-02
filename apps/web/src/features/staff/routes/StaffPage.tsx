import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, GradeBar, StatLine, Tabs, TabsContent, TabsList, TabsTrigger } from '@mbd/ui';
import { BriefcaseBusiness, Handshake, Sparkles, Wallet } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

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

function roleLabel(role: string): string {
  return role.replaceAll('_', ' ');
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
  const [activeTab, setActiveTab] = useState<'overview' | 'market'>('overview');
  const [staff, setStaff] = useState<CoachView[]>([]);
  const [market, setMarket] = useState<CoachView[]>([]);
  const [impact, setImpact] = useState<CoachingImpactView[]>([]);
  const [budget, setBudget] = useState<StaffBudgetView | null>(null);
  const [busyCoachId, setBusyCoachId] = useState<string | null>(null);

  const canManage = phase === 'offseason';

  const fetchStaffData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;

    const [staffData, marketData, impactData, budgetData] = await Promise.all([
      worker.getCoachingStaff(userTeamId),
      worker.getCoachMarket(),
      worker.getCoachingImpact(userTeamId),
      worker.getStaffBudget(userTeamId),
    ]);

    setStaff((staffData ?? []) as CoachView[]);
    setMarket((marketData ?? []) as CoachView[]);
    setImpact((impactData ?? []) as CoachingImpactView[]);
    setBudget((budgetData ?? null) as StaffBudgetView | null);
  }, [isInitialized, userTeamId, worker, workerReady]);

  useEffect(() => {
    void fetchStaffData();
  }, [fetchStaffData, season, day, phase]);

  const projectedVacancies = useMemo(() => new Set(staff.map((coach) => coach.role)), [staff]);

  const handleHire = useCallback(async (coachId: string) => {
    setBusyCoachId(coachId);
    try {
      await worker.hireCoach(coachId);
      await fetchStaffData();
    } finally {
      setBusyCoachId(null);
    }
  }, [fetchStaffData, worker]);

  const handleFire = useCallback(async (coachId: string) => {
    setBusyCoachId(coachId);
    try {
      await worker.fireCoach(coachId);
      await fetchStaffData();
    } finally {
      setBusyCoachId(null);
    }
  }, [fetchStaffData, worker]);

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
