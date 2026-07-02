import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { StaffMentorshipPanel, type MentorshipView } from './StaffMentorshipPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mentorship: MentorshipView = {
  mentorCount: 4,
  protegeeCount: 5,
  leaders: [
    {
      playerId: 'leader-2',
      playerName: 'Manny Steady',
      position: 'C',
      role: 'Culture setter',
      leadership: 90,
      score: 91,
      summary: 'Manny Steady keeps the room steady.',
      traits: ['Leader'],
    },
    {
      playerId: 'leader-1',
      playerName: 'Elias Anchor',
      position: 'SS',
      role: 'Clubhouse captain',
      leadership: 96,
      score: 98,
      summary: 'Elias Anchor sets the room with 96 leadership.',
      traits: ['Leader', 'Mentor'],
    },
    {
      playerId: 'leader-4',
      playerName: 'Troy Hidden',
      position: 'RF',
      role: 'Bench voice',
      leadership: 83,
      score: 84,
      summary: 'Troy Hidden sits below the visible leader cut.',
      traits: ['Mentor'],
    },
    {
      playerId: 'leader-3',
      playerName: 'Omar Glue',
      position: '2B',
      role: 'Bridge voice',
      leadership: 88,
      score: 89,
      summary: 'Omar Glue bridges veteran and prospect lanes.',
      traits: ['Professional'],
    },
  ],
  conflictRisks: [
    {
      playerId: 'risk-2',
      playerName: 'Beto Quiet',
      position: 'LF',
      severity: 'medium',
      riskScore: 72,
      reason: 'Beto Quiet is losing role clarity.',
      mitigation: 'Give him a clear bench lane.',
    },
    {
      playerId: 'risk-1',
      playerName: 'Rico Flash',
      position: 'CF',
      severity: 'high',
      riskScore: 84,
      reason: 'Rico Flash brings 97 competitiveness with low leadership support.',
      mitigation: 'Pair with a veteran leader before role changes.',
    },
    {
      playerId: 'risk-3',
      playerName: 'Luca Depth',
      position: '1B',
      severity: 'low',
      riskScore: 55,
      reason: 'Luca Depth has a smaller role concern.',
      mitigation: 'Keep communication open.',
    },
    {
      playerId: 'risk-4',
      playerName: 'Hidden Tension',
      position: 'RP',
      severity: 'medium',
      riskScore: 40,
      reason: 'Hidden Tension should not make the top-three cut.',
      mitigation: 'Monitor quietly.',
    },
  ],
  pairings: [
    {
      mentorId: 'mentor-2',
      protegeeId: 'protegee-2',
      mentorName: 'Manny Steady',
      protegeeName: 'Omar Prospect',
      quality: 72,
      developmentBonus: 0.1,
      compatibilityFactors: ['Shared preparation habits.', 'Same defensive unit.', 'Extra hidden factor.'],
    },
    {
      mentorId: 'mentor-1',
      protegeeId: 'protegee-1',
      mentorName: 'Elias Anchor',
      protegeeName: 'Milo Spark',
      quality: 88,
      developmentBonus: 0.13,
      compatibilityFactors: ['Shared traits: Leader.', 'Same team context.'],
    },
    {
      mentorId: 'mentor-3',
      protegeeId: 'protegee-3',
      mentorName: 'Cal Mentor',
      protegeeName: 'Nico Rookie',
      quality: 64,
      developmentBonus: 0.08,
      compatibilityFactors: ['Veteran ladder.'],
    },
    {
      mentorId: 'mentor-4',
      protegeeId: 'protegee-4',
      mentorName: 'Zed Hidden',
      protegeeName: 'Hidden Rookie',
      quality: 51,
      developmentBonus: 0.03,
      compatibilityFactors: ['Hidden lane.'],
    },
  ],
};

describe('StaffMentorshipPanel', () => {
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

  it('renders sorted leader, conflict, and mentor lanes with a top-three cap', async () => {
    await act(async () => {
      root.render(<StaffMentorshipPanel mentorship={mentorship} />);
    });

    expect(container.textContent).toContain('Clubhouse Mentorship');
    expect(container.textContent).toContain('Mentors');
    expect(container.textContent).toContain('4');
    expect(container.textContent).toContain('Protegees');
    expect(container.textContent).toContain('5');
    expect(container.textContent).toContain('Pairings');
    expect(container.textContent).toContain('4');

    expect(container.textContent).toContain('Clubhouse Leaders');
    expect(container.textContent).toContain('Elias Anchor');
    expect(container.textContent).toContain('Manny Steady');
    expect(container.textContent).toContain('Omar Glue');
    expect(container.textContent).not.toContain('Troy Hidden');

    expect(container.textContent).toContain('Conflict Watch');
    expect(container.textContent).toContain('Rico Flash');
    expect(container.textContent).toContain('Beto Quiet');
    expect(container.textContent).toContain('Luca Depth');
    expect(container.textContent).not.toContain('Hidden Tension');

    const text = container.textContent ?? '';
    expect(text.indexOf('Elias Anchor')).toBeLessThan(text.indexOf('Manny Steady'));
    expect(text.indexOf('Rico Flash')).toBeLessThan(text.indexOf('Beto Quiet'));
    expect(text.indexOf('Elias Anchor')).toBeLessThan(text.indexOf('Manny Steady'));
    expect(text).toContain('13% lift');
    expect(text).toContain('Shared traits: Leader.');
    expect(text).toContain('Same team context.');
    expect(text).not.toContain('Extra hidden factor.');
    expect(text).not.toContain('Zed Hidden');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });

  it('labels active and recommended mentor lanes separately', async () => {
    await act(async () => {
      root.render(
        <StaffMentorshipPanel
          mentorship={{
            mentorCount: 2,
            protegeeCount: 2,
            activePairingCount: 1,
            recommendedPairingCount: 1,
            pairings: [
              {
                mentorId: 'mentor-active',
                protegeeId: 'protegee-active',
                mentorName: 'Elias Anchor',
                protegeeName: 'Milo Spark',
                quality: 50,
                developmentBonus: 0.08,
                compatibilityFactors: ['Saved clubhouse lane.'],
                status: 'active',
                summary: 'Elias Anchor has taken Milo Spark under wing.',
              },
              {
                mentorId: 'mentor-recommended',
                protegeeId: 'protegee-recommended',
                mentorName: 'Manny Steady',
                protegeeName: 'Omar Prospect',
                quality: 88,
                developmentBonus: 0.13,
                compatibilityFactors: ['Recommended fit.'],
                status: 'recommended',
              },
            ],
          }}
        />,
      );
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Active Lanes');
    expect(text).toContain('Recommended');
    expect(text).toContain('Active');
    expect(text.indexOf('Elias Anchor')).toBeLessThan(text.indexOf('Manny Steady'));
    expect(text).toContain('Elias Anchor has taken Milo Spark under wing.');
  });

  it('renders the mentor-lane empty state when no pairings are available', async () => {
    await act(async () => {
      root.render(
        <StaffMentorshipPanel
          mentorship={{
            mentorCount: 0,
            protegeeCount: 0,
            pairings: [],
          }}
        />,
      );
    });

    expect(container.textContent).toContain('Clubhouse Mentorship');
    expect(container.textContent).toContain('No active mentor lanes are available from the current roster mix.');
  });
});
