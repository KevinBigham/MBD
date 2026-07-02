import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import DevelopmentDecisionPanel from './DevelopmentDecisionPanel';
import type { DevelopmentReportsView } from './playerProfileShared';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type DevelopmentDecision = NonNullable<DevelopmentReportsView['developmentDecision']>;

const baseDecision = {
  plan: {
    label: 'MLB Prep',
    summary: 'Keep Marco on the current MLB prep lane while his swing decisions stabilize.',
  },
  risk: {
    level: 'medium',
    summary: 'One hot streak is helping, but recent reports still need confirmation.',
  },
  coachFit: {
    coachName: 'Mina Torres',
    summary: 'Mina Torres is the best current coach fit for this checkpoint.',
    score: 84,
  },
  mentorship: {
    mentorName: 'Elias Anchor',
    partnerName: 'Elias Anchor',
    partnerPlayerId: 'veteran-mentor',
    relationshipRole: 'protegee',
    summary: 'Elias Anchor is guiding the next clubhouse adjustment.',
    startedSeason: 5,
  },
  nextMilestone: {
    label: 'Push to AAA',
    summary: 'Next milestone: prove the AA gains can travel to AAA.',
  },
  evidence: ['Improved first-step reads and contact quality.', 'Drafted Round 1, 3'],
} satisfies DevelopmentDecision;

describe('DevelopmentDecisionPanel', () => {
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

  async function renderPanel(decision: DevelopmentDecision = baseDecision) {
    await act(async () => {
      root.render(<DevelopmentDecisionPanel decision={decision} />);
    });
  }

  it('renders the full development decision brief with evidence', async () => {
    await renderPanel();

    expect(container.textContent).toContain('Development Decision');
    expect(container.textContent).toContain('MLB Prep');
    expect(container.textContent).toContain('Medium Risk');
    expect(container.textContent).toContain('Mina Torres');
    expect(container.textContent).toContain('Mentor');
    expect(container.textContent).toContain('Elias Anchor');
    expect(container.textContent).toContain('Push to AAA');
    expect(container.textContent).toContain('Improved first-step reads and contact quality.');
    expect(container.textContent).toContain('Drafted Round 1, 3');
  });

  it('labels veteran mentor cards by protege', async () => {
    await renderPanel({
      ...baseDecision,
      mentorship: {
        mentorName: 'Marco Ascension',
        partnerName: 'Dani Rise',
        partnerPlayerId: 'protege-1',
        relationshipRole: 'mentor',
        summary: 'Marco Ascension is guiding Dani Rise through the next checkpoint.',
        startedSeason: 5,
      },
    });

    expect(container.textContent).toContain('Protege');
    expect(container.textContent).toContain('Dani Rise');
    expect(container.textContent).not.toContain('No pairing');
  });

  it('uses stable fallbacks when coach or mentorship data is absent', async () => {
    await renderPanel({
      ...baseDecision,
      coachFit: {
        coachName: null,
        summary: 'No dedicated coach is currently assigned.',
        score: null,
      },
      mentorship: {
        mentorName: null,
        partnerName: null,
        partnerPlayerId: null,
        relationshipRole: null,
        summary: 'No active mentorship lane is currently assigned.',
        startedSeason: null,
      },
      evidence: [],
    });

    expect(container.textContent).toContain('Unassigned');
    expect(container.textContent).toContain('Mentorship');
    expect(container.textContent).toContain('No pairing');
    expect(container.textContent).toContain('No active mentorship lane is currently assigned.');
  });
});
