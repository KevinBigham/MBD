import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ChaseWatchCardBody, {
  type CareerChase,
  type PaceChase,
} from './ChaseWatchCardBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ChaseWatchCardBody', () => {
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

  async function renderBody({
    loading = false,
    careerChases = [],
    paceChases = [],
  }: {
    loading?: boolean;
    careerChases?: CareerChase[];
    paceChases?: PaceChase[];
  }) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <ChaseWatchCardBody
            loading={loading}
            careerChases={careerChases}
            paceChases={paceChases}
          />
        </MemoryRouter>,
      );
    });
  }

  it('renders loading and empty states without route data side effects', async () => {
    await renderBody({ loading: true });
    expect(container.textContent ?? '').toContain('Loading...');

    await renderBody({});
    expect(container.textContent ?? '').toContain('Chasers appear here');
  });

  it('renders career and pace chase sections with badges, progress, and team tags', async () => {
    await renderBody({
      careerChases: [
        {
          playerId: 'player-hr-legend',
          playerName: 'Marco Reyes',
          teamId: 'lad',
          milestoneLabel: 'Home Runs',
          currentValue: 495,
          threshold: 500,
          remaining: 5,
          urgency: 'imminent',
        },
      ],
      paceChases: [
        {
          playerId: 'player-slugger',
          playerName: 'Diego Navarro',
          teamId: 'nym',
          category: 'Power Pace',
          projectedValue: '47 HR',
          benchmark: '40 HR',
          paceDescription: 'On pace for 47 HR and 112 RBI.',
          confidenceLevel: 'high',
        },
      ],
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Career Chases');
    expect(text).toContain('Marco Reyes');
    expect(text).toContain('Home Runs');
    expect(text).toContain('Imminent');
    expect(text).toContain('495 / 500');
    expect(text).toContain('5 to go');
    expect(text).toContain('LAD');
    expect(text).toContain('Season Pace');
    expect(text).toContain('Diego Navarro');
    expect(text).toContain('Power Pace');
    expect(text).toContain('47 HR');
    expect(text).toContain('40 HR');
    expect(text).toContain('On pace for 47 HR and 112 RBI.');
    expect(text).toContain('High');
    expect(text).toContain('NYM');
  });
});
