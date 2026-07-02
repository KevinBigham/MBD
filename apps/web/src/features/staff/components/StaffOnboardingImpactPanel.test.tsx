import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StaffOnboardingImpactPanel } from './StaffOnboardingImpactPanel';
import type { CoachView, PlayerAffinityView } from './staffPresentation';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const STAFF: CoachView[] = [
  {
    id: 'coach-1',
    firstName: 'Ruben',
    lastName: 'Serrano',
    role: 'hitting_coach',
    specialty: 'contact',
    teachingAbility: 0.83,
    developmentBonus: 0.14,
    personalityFit: 0.75,
    annualSalary: 2.3,
  },
  {
    id: 'coach-2',
    firstName: 'Mina',
    lastName: 'Park',
    role: 'pitching_coach',
    specialty: 'command',
    teachingAbility: 0.78,
    developmentBonus: 0.11,
    personalityFit: 0.44,
    annualSalary: 2.1,
  },
];

const AFFINITIES: PlayerAffinityView[] = [
  {
    playerId: 'player-1',
    playerName: 'Milo Spark',
    position: 'CF',
    bestCoach: {
      coachId: 'coach-1',
      coachName: 'Ruben Serrano',
      affinityScore: 91,
      factors: ['Contact-first work plan.'],
      developmentBonus: 0.12,
    },
  },
];

describe('StaffOnboardingImpactPanel', () => {
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
  });

  it('renders top staff impact cards and player fit readout', async () => {
    await act(async () => {
      root.render(
        <StaffOnboardingImpactPanel
          staff={STAFF}
          topAffinities={AFFINITIES}
        />,
      );
    });

    expect(container.textContent).toContain('Onboarding Staff Impact');
    expect(container.textContent).toContain('Ruben Serrano');
    expect(container.textContent).toContain('75% fit');
    expect(container.textContent).toContain('14% development lift in Contact');
    expect(container.textContent).toContain('No major culture drag flagged.');
    expect(container.textContent).toContain('Mina Park');
    expect(container.textContent).toContain('Monitor fit with the room before changing development plans.');
    expect(container.textContent).toContain('Player fit readout');
    expect(container.textContent).toContain('Milo Spark');
    expect(container.textContent).toContain('best with Ruben Serrano');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });
});
