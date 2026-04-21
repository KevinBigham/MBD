import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ChaseWatchCard from './ChaseWatchCard';

const mockWorker = {
  isReady: true,
  getChaseWatch: vi.fn(),
};

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: () => mockWorker,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ChaseWatchCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockWorker.getChaseWatch.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  async function renderCard() {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <ChaseWatchCard />
        </MemoryRouter>,
      );
    });
    // flush the async fetch
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders header and empty state when no chases are active', async () => {
    mockWorker.getChaseWatch.mockResolvedValue({
      season: 7,
      day: 60,
      careerChases: [],
      paceChases: [],
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Chase Watch');
    expect(text).toContain('League-wide');
    expect(text).toContain('Chasers appear here');
    expect(mockWorker.getChaseWatch).toHaveBeenCalledTimes(1);
  });

  it('renders career chases with urgency badges, progress, and team tags', async () => {
    mockWorker.getChaseWatch.mockResolvedValue({
      season: 9,
      day: 120,
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
        {
          playerId: 'player-hits-chaser',
          playerName: 'Julio Castro',
          teamId: 'bos',
          milestoneLabel: 'Hits',
          currentValue: 2820,
          threshold: 3000,
          remaining: 180,
          urgency: 'approaching',
        },
      ],
      paceChases: [],
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Career Chases');
    expect(text).toContain('Marco Reyes');
    expect(text).toContain('Home Runs');
    expect(text).toContain('Imminent');
    expect(text).toContain('495 / 500');
    expect(text).toContain('5 to go');
    expect(text).toContain('LAD');
    expect(text).toContain('Julio Castro');
    expect(text).toContain('Hits');
    expect(text).toContain('Approaching');
    expect(text).toContain('BOS');
  });

  it('renders pace chases with projected value, benchmark, and confidence', async () => {
    mockWorker.getChaseWatch.mockResolvedValue({
      season: 9,
      day: 110,
      careerChases: [],
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

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Season Pace');
    expect(text).toContain('Diego Navarro');
    expect(text).toContain('Power Pace');
    expect(text).toContain('47 HR');
    expect(text).toContain('40 HR');
    expect(text).toContain('On pace for 47 HR and 112 RBI.');
    expect(text).toContain('High');
    expect(text).toContain('NYM');
  });

  it('shows both sections when career + pace chases are present', async () => {
    mockWorker.getChaseWatch.mockResolvedValue({
      season: 9,
      day: 140,
      careerChases: [
        {
          playerId: 'player-wins',
          playerName: 'Quinn Walker',
          teamId: 'atl',
          milestoneLabel: 'Pitcher Wins',
          currentValue: 195,
          threshold: 200,
          remaining: 5,
          urgency: 'imminent',
        },
      ],
      paceChases: [
        {
          playerId: 'player-batting',
          playerName: 'Riley Brooks',
          teamId: 'sdp',
          category: 'Batting Average',
          projectedValue: '.312 AVG',
          benchmark: '.300 AVG',
          paceDescription: 'On pace for a .312 AVG with 188 hits.',
          confidenceLevel: 'medium',
        },
      ],
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Career Chases');
    expect(text).toContain('Season Pace');
    expect(text).toContain('Quinn Walker');
    expect(text).toContain('Riley Brooks');
    expect(text).toContain('ATL');
    expect(text).toContain('SDP');
  });

  it('re-sorts career chases by urgency before display', async () => {
    mockWorker.getChaseWatch.mockResolvedValue({
      season: 9,
      day: 140,
      careerChases: [
        {
          playerId: 'player-approaching',
          playerName: 'Alan Approaching',
          teamId: 'sfg',
          milestoneLabel: 'Saves',
          currentValue: 370,
          threshold: 400,
          remaining: 30,
          urgency: 'approaching',
        },
        {
          playerId: 'player-imminent',
          playerName: 'Ivan Imminent',
          teamId: 'chc',
          milestoneLabel: 'Saves',
          currentValue: 395,
          threshold: 400,
          remaining: 5,
          urgency: 'imminent',
        },
      ],
      paceChases: [],
    });

    await renderCard();

    const text = container.textContent ?? '';
    const imminentIndex = text.indexOf('Ivan Imminent');
    const approachingIndex = text.indexOf('Alan Approaching');
    expect(imminentIndex).toBeGreaterThan(-1);
    expect(approachingIndex).toBeGreaterThan(imminentIndex);
  });
});
