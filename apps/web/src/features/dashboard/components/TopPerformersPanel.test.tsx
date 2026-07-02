import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import TopPerformersPanel, { type DashboardTopPerformer } from './TopPerformersPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const performers: DashboardTopPerformer[] = [
  {
    playerId: 'player-ace',
    name: 'Marco Silva',
    position: 'RF',
    label: 'Hot bat',
    sparklineValues: [1.2, 1.4, 1.8],
    statLine: '.321 AVG / 8 HR last 30',
  },
  {
    playerId: 'player-arm',
    name: 'Eli Stone',
    position: 'SP',
    label: 'Rotation anchor',
    sparklineValues: [3.1],
    statLine: '2.84 ERA / 42 K',
  },
];

describe('TopPerformersPanel', () => {
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

  it('renders player performance cards with links and stat lines', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <TopPerformersPanel performers={performers} />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Top Performers');
    expect(container.textContent).toContain('Marco Silva');
    expect(container.textContent).toContain('RF · Hot bat');
    expect(container.textContent).toContain('.321 AVG / 8 HR last 30');
    expect(container.textContent).toContain('Eli Stone');
    expect(container.textContent).toContain('SP · Rotation anchor');
    expect(container.textContent).toContain('2.84 ERA / 42 K');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);

    const links = Array.from(container.querySelectorAll('a')).map((link) => link.getAttribute('href'));
    expect(links).toContain('/players/player-ace');
    expect(links).toContain('/players/player-arm');
  });

  it('renders nothing when no performers are available', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <TopPerformersPanel performers={[]} />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toBe('');
  });
});
