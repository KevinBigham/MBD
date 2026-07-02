import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import SetupSeasonPreviewPanel from './SetupSeasonPreviewPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const dynastyPreview = {
  teamId: 'nym',
  teamName: 'New York Tycoons',
  division: 'AL_EAST',
  archetype: 'Empire Under Pressure',
  franchiseHook: 'The sport’s loudest market wants October immediately.',
  whyNow: 'The roster can win now if the room is aligned.',
  marketSize: 'large',
  timeline: 'Win now',
  payrollTier: 'Premier',
  farmSystemRating: 'B+',
  strengths: ['middle-of-order thump', 'rotation depth'],
  weaknesses: ['bullpen stability', 'prospect pipeline'],
  teamIdentityBlurb: 'Big-market expectations with enough prospects to support a push.',
  projectedRecord: '88-74',
  topPlayers: [
    { playerId: 'p-judge', name: 'Aaron Judge', position: 'RF', overall: 78 },
  ],
  divisionRivals: [
    { teamId: 'bos', teamName: 'Boston Noreasters' },
  ],
} as const;

const budgetScenario = {
  id: 'budget-squeeze',
  name: 'Small Market Squeeze',
  description: 'Win while navigating a small payroll and a thin veteran core.',
  difficulty: 'hard',
  maxSeasons: 3,
  requiresCareerMode: true,
  startingTeamId: 'kc',
} as const;

describe('SetupSeasonPreviewPanel', () => {
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

  it('renders dynasty preview cards from an already-loaded setup preview', async () => {
    await act(async () => {
      root.render(
        <SetupSeasonPreviewPanel
          wizardMode="dynasty"
          activePreview={dynastyPreview}
          selectedScenario={null}
          teamId="nym"
        />,
      );
    });

    expect(container.textContent).toContain('Season Preview');
    expect(container.textContent).toContain('New York Tycoons');
    expect(container.textContent).toContain('Big-market expectations');
    expect(container.textContent).toContain('Empire Under Pressure');
    expect(container.textContent).toContain('The sport’s loudest market wants October immediately.');
    expect(container.textContent).toContain('The roster can win now if the room is aligned.');
    expect(container.textContent).toContain('88-74');
    expect(container.textContent).toContain('Premier');
    expect(container.textContent).toContain('B+');
    expect(container.textContent).toContain('Aaron Judge');
    expect(container.textContent).toContain('RF · 78 OVR');
    expect(container.textContent).toContain('Boston Noreasters');
    expect(container.textContent).toContain('middle-of-order thump');
    expect(container.textContent).toContain('bullpen stability');
  });

  it('renders scenario constraints and objectives without route state', async () => {
    await act(async () => {
      root.render(
        <SetupSeasonPreviewPanel
          wizardMode="scenario"
          activePreview={{
            ...dynastyPreview,
            teamId: 'kc',
            teamName: 'Kansas City BBQ Fountains',
            projectedRecord: '74-88',
            payrollTier: 'Lean',
          }}
          selectedScenario={budgetScenario}
          teamId="nym"
        />,
      );
    });

    expect(container.textContent).toContain('Small Market Squeeze');
    expect(container.textContent).toContain('Win while navigating a small payroll and a thin veteran core.');
    expect(container.textContent).toContain('Challenge Preview');
    expect(container.textContent).toContain('Kansas City BBQ Fountains');
    expect(container.textContent).toContain('Career mode required');
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('Every marginal dollar matters.');
    expect(container.textContent).toContain('Resolve the challenge inside 3 seasons.');
    expect(container.textContent).toContain('Career mode is required; firing routes you through the job market.');
    expect(container.textContent).toContain('74-88');
    expect(container.textContent).toContain('Lean');
  });
});
