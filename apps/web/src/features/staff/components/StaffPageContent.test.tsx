import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import StaffPageContent from './StaffPageContent';
import type { ChemistryView, CoachingImpactView } from '../hooks/useStaffRouteData';
import type { CoachView, PlayerAffinityView, StaffBudgetView } from './staffPresentation';
import type { MentorshipView } from './StaffMentorshipPanel';

vi.mock('./StaffBudgetPanel', () => ({
  StaffBudgetPanel: ({ budget }: { budget: StaffBudgetView | null }) => (
    <section data-testid="staff-budget">Budget {budget?.remaining ?? 'loading'}</section>
  ),
}));

vi.mock('./StaffOnboardingImpactPanel', () => ({
  StaffOnboardingImpactPanel: ({
    staff,
    topAffinities,
  }: {
    staff: readonly CoachView[];
    topAffinities: readonly PlayerAffinityView[];
  }) => (
    <section data-testid="staff-onboarding">
      Onboarding {staff.length} {topAffinities.length}
    </section>
  ),
}));

vi.mock('./StaffCurrentStaffPanel', () => ({
  StaffCurrentStaffPanel: ({
    canManage,
    onFire,
    staff,
  }: {
    canManage: boolean;
    onFire: (coachId: string) => void | Promise<void>;
    staff: readonly CoachView[];
  }) => (
    <section data-testid="staff-current">
      Current {staff.length} {canManage ? 'can-manage' : 'locked'}
      <button type="button" onClick={() => void onFire(staff[0]?.id ?? '')}>Fire Coach</button>
    </section>
  ),
}));

vi.mock('./StaffImpactPanel', () => ({
  StaffImpactPanel: ({ impact }: { impact: CoachingImpactView[] }) => (
    <section data-testid="staff-impact">Impact {impact.length}</section>
  ),
}));

vi.mock('./StaffChemistryPanel', () => ({
  StaffChemistryPanel: ({ chemistry }: { chemistry: ChemistryView | null }) => (
    <section data-testid="staff-chemistry">Chemistry {chemistry?.harmony.overallScore ?? 'none'}</section>
  ),
}));

vi.mock('./StaffMentorshipPanel', () => ({
  StaffMentorshipPanel: ({ mentorship }: { mentorship: MentorshipView }) => (
    <section data-testid="staff-mentorship">Mentorship {mentorship.mentorCount}</section>
  ),
}));

vi.mock('./StaffMarketPanel', () => ({
  StaffMarketPanel: ({
    canManage,
    market,
    onFire,
    onHire,
    projectedVacancies,
    staff,
  }: {
    canManage: boolean;
    market: readonly CoachView[];
    onFire: (coachId: string) => void | Promise<void>;
    onHire: (coachId: string) => void | Promise<void>;
    projectedVacancies: ReadonlySet<string>;
    staff: readonly CoachView[];
  }) => (
    <section data-testid="staff-market">
      Market {market.length} {projectedVacancies.has('hitting_coach') ? 'vacancy' : 'no-vacancy'} {canManage ? 'can-manage' : 'locked'}
      <button type="button" onClick={() => void onFire(staff[0]?.id ?? '')}>Fire Market Coach</button>
      <button type="button" onClick={() => void onHire(market[0]?.id ?? '')}>Hire Coach</button>
    </section>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const coach = {
  id: 'coach-1',
  firstName: 'Ruben',
  lastName: 'Serrano',
  role: 'hitting_coach',
  specialty: 'contact',
  teachingAbility: 0.83,
  developmentBonus: 0.14,
  personalityFit: 0.75,
  annualSalary: 2.3,
} satisfies CoachView;

const marketCoach = {
  ...coach,
  id: 'coach-2',
  firstName: 'Nate',
  lastName: 'Braddock',
  specialty: 'power',
} satisfies CoachView;

const impact = [{
  id: 'coach-1',
  role: 'hitting_coach',
  name: 'Ruben Serrano',
  specialty: 'contact',
  teachingAbility: 0.83,
  developmentBonus: 0.14,
  personalityFit: 0.75,
}] satisfies CoachingImpactView[];

const budget = {
  payroll: 11.2,
  budget: 13.4,
  remaining: 2.2,
} satisfies StaffBudgetView;

const chemistry = {
  harmony: { overallScore: 72, synergies: [], weakestLink: null, strongestBond: null },
  issues: [],
  playerAffinities: [],
  coaches: [],
} satisfies ChemistryView;

const mentorship = {
  mentorCount: 1,
  protegeeCount: 1,
  pairings: [],
} satisfies MentorshipView;

describe('StaffPageContent', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  async function renderContent(
    props: Partial<Parameters<typeof StaffPageContent>[0]> = {},
  ) {
    const onFire = vi.fn();
    const onHire = vi.fn();
    const onTabChange = vi.fn();

    await act(async () => {
      root.render(
        <StaffPageContent
          activeTab="overview"
          budget={budget}
          busyCoachId={null}
          canManage
          chemistry={chemistry}
          impact={impact}
          market={[marketCoach]}
          mentorship={mentorship}
          onFire={onFire}
          onHire={onHire}
          onTabChange={onTabChange}
          staff={[coach]}
          topAffinities={[]}
          {...props}
        />,
      );
      await Promise.resolve();
    });

    return { onFire, onHire, onTabChange };
  }

  it('renders the overview shell and delegates tab/fire callbacks', async () => {
    const { onFire, onTabChange } = await renderContent();

    expect(container.textContent).toContain('Staff Overview');
    expect(container.textContent).toContain('Twelve roles, one development pipeline, no wasted budget.');
    expect(container.textContent).toContain('Hiring Window Open');
    expect(container.querySelector('[data-testid="staff-budget"]')?.textContent).toContain('2.2');
    expect(container.querySelector('[data-testid="staff-current"]')?.textContent).toContain('can-manage');
    expect(container.querySelector('[data-testid="staff-impact"]')?.textContent).toContain('1');
    expect(container.querySelector('[data-testid="staff-chemistry"]')?.textContent).toContain('72');
    expect(container.querySelector('[data-testid="staff-mentorship"]')?.textContent).toContain('1');

    await act(async () => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Market'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Fire Coach'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onTabChange).toHaveBeenCalledWith('market');
    expect(onFire).toHaveBeenCalledWith('coach-1');
  });

  it('renders the market tab with projected vacancies and delegates hire/fire callbacks', async () => {
    const { onFire, onHire } = await renderContent({
      activeTab: 'market',
      canManage: false,
    });

    expect(container.textContent).toContain('Read Only');
    expect(container.querySelector('[data-testid="staff-market"]')?.textContent).toContain('vacancy');
    expect(container.querySelector('[data-testid="staff-market"]')?.textContent).toContain('locked');

    await act(async () => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Fire Market Coach'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Hire Coach'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onFire).toHaveBeenCalledWith('coach-1');
    expect(onHire).toHaveBeenCalledWith('coach-2');
  });

  it('marks staff tabs as route-critical mobile controls', async () => {
    await renderContent();

    const tabButtons = Array.from(
      container.querySelectorAll('button[data-mobile-critical-control="staff-view-tab"]'),
    );

    expect(tabButtons).toHaveLength(2);
    for (const button of tabButtons) {
      expect(button.className).toContain('mobile-critical-control');
      expect(button.className).toContain('focus-ring');
    }
  });
});
