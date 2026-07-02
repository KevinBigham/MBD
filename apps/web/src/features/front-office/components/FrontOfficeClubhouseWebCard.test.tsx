import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  FrontOfficeClubhouseWebCard,
  type FrontOfficeMentorshipView,
} from './FrontOfficeClubhouseWebCard';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mentorship: FrontOfficeMentorshipView = {
  mentorCount: 3,
  protegeeCount: 4,
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
      reason: 'Rico Flash brings elite competitiveness with low leadership support.',
      mitigation: 'Pair with a veteran leader before role changes.',
    },
  ],
  pairings: [
    {
      mentorId: 'mentor-2',
      protegeeId: 'protegee-2',
      mentorName: 'Manny Steady',
      protegeeName: 'Omar Prospect',
      quality: 72,
      compatibilityFactors: ['Shared preparation habits.'],
      developmentBonus: 0.1,
    },
    {
      mentorId: 'mentor-1',
      protegeeId: 'protegee-1',
      mentorName: 'Elias Anchor',
      protegeeName: 'Milo Spark',
      quality: 88,
      compatibilityFactors: ['Shared traits: Leader.'],
      developmentBonus: 0.13,
    },
  ],
};

describe('FrontOfficeClubhouseWebCard', () => {
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

  it('renders the strongest mentor lane, leader, and conflict risk for front-office scanning', async () => {
    await act(async () => {
      root.render(<FrontOfficeClubhouseWebCard mentorship={mentorship} />);
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Clubhouse Web');
    expect(text).toContain('Mentors');
    expect(text).toContain('3');
    expect(text).toContain('Protegees');
    expect(text).toContain('4');
    expect(text).toContain('At Risk');
    expect(text).toContain('2');

    expect(text).toContain('Mentor Lane');
    expect(text).toContain('Elias Anchor');
    expect(text).toContain('mentoring Milo Spark');
    expect(text).toContain('88');
    expect(text).toContain('13% lift');
    expect(text).not.toContain('Manny Steady');
    expect(text).not.toContain('Omar Prospect');

    expect(text).toContain('Room Captain');
    expect(text).toContain('Clubhouse captain');
    expect(text).toContain('96');
    expect(text).toContain('Elias Anchor sets the room with 96 leadership.');

    expect(text).toContain('Conflict Watch');
    expect(text).toContain('Rico Flash');
    expect(text).toContain('high');
    expect(text).toContain('Pair with a veteran leader before role changes.');
    expect(text).not.toContain('Beto Quiet');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });

  it('prefers an active mentor lane over a higher-quality recommendation', async () => {
    await act(async () => {
      root.render(
        <FrontOfficeClubhouseWebCard
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
                compatibilityFactors: ['Saved clubhouse lane.'],
                developmentBonus: 0.08,
                status: 'active',
              },
              {
                mentorId: 'mentor-recommended',
                protegeeId: 'protegee-recommended',
                mentorName: 'Manny Steady',
                protegeeName: 'Omar Prospect',
                quality: 88,
                compatibilityFactors: ['Recommended fit.'],
                developmentBonus: 0.13,
                status: 'recommended',
              },
            ],
          }}
        />,
      );
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Elias Anchor');
    expect(text).toContain('mentoring Milo Spark');
    expect(text).toContain('50');
    expect(text).toContain('8% lift');
    expect(text).not.toContain('Manny Steady');
    expect(text).not.toContain('Omar Prospect');
  });

  it('renders empty states when mentorship signals are unavailable', async () => {
    await act(async () => {
      root.render(
        <FrontOfficeClubhouseWebCard
          mentorship={{
            mentorCount: 0,
            protegeeCount: 0,
            pairings: [],
          }}
        />,
      );
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Clubhouse Web');
    expect(text).toContain('No active mentor lane.');
    expect(text).toContain('No clear clubhouse captain.');
    expect(text).toContain('No acute conflict risk.');
  });
});
