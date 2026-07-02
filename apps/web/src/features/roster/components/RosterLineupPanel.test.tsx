import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { PositionGroup } from './DepthChartDnD';
import type { LineupPlayer } from './LineupBuilder';
import { RosterLineupPanel } from './RosterLineupPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

async function settleLazyChildren() {
  await act(async () => {
    await vi.dynamicImportSettled();
    await Promise.resolve();
  });
}

const lineupPlayers: LineupPlayer[] = [
  {
    id: 'bat-1',
    firstName: 'Tomas',
    lastName: 'Table',
    position: 'CF',
    displayRating: 72,
    letterGrade: 'B',
  },
  {
    id: 'bat-2',
    firstName: 'Diego',
    lastName: 'Drive',
    position: 'SS',
    displayRating: 77,
    letterGrade: 'A',
  },
];

const rotationPlayers: LineupPlayer[] = [
  {
    id: 'sp-1',
    firstName: 'Ace',
    lastName: 'Starter',
    position: 'SP',
    displayRating: 82,
    letterGrade: 'A',
  },
  {
    id: 'sp-2',
    firstName: 'Milo',
    lastName: 'Second',
    position: 'SP',
    displayRating: 74,
    letterGrade: 'B',
  },
];

const depthChartGroups: PositionGroup[] = [
  {
    position: 'C',
    players: [
      {
        id: 'c-1',
        firstName: 'Cal',
        lastName: 'Catcher',
        position: 'C',
        displayRating: 68,
        letterGrade: 'B',
      },
      {
        id: 'c-2',
        firstName: 'Ben',
        lastName: 'Backup',
        position: 'C',
        displayRating: 61,
        letterGrade: 'C',
      },
    ],
  },
];

describe('RosterLineupPanel', () => {
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

  it('renders lineup planning sections and delegates reorder controls', async () => {
    const onLineupReorder = vi.fn();
    const onRotationReorder = vi.fn();
    const onDepthReorder = vi.fn();

    await act(async () => {
      root.render(
        <RosterLineupPanel
          lineupPlayers={lineupPlayers}
          rotationPlayers={rotationPlayers}
          depthChartGroups={depthChartGroups}
          onLineupReorder={onLineupReorder}
          onRotationReorder={onRotationReorder}
          onDepthReorder={onDepthReorder}
        />,
      );
    });
    await settleLazyChildren();

    expect(container.textContent).toContain('Batting Order');
    expect(container.textContent).toContain('Starting Rotation');
    expect(container.textContent).toContain('Positional Depth Chart');
    expect(container.textContent).toContain('Tomas Table');
    expect(container.textContent).toContain('Ace Starter');
    expect(container.textContent).toContain('Cal Catcher');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(3);

    const lineupMoveDown = container.querySelector('[aria-label="Move Tomas Table down"]') as HTMLButtonElement;
    const rotationMoveDown = container.querySelector('[aria-label="Move Ace Starter down"]') as HTMLButtonElement;
    const depthMoveDown = container.querySelector('[aria-label="Move Cal Catcher down"]') as HTMLButtonElement;

    await act(async () => {
      lineupMoveDown.click();
      rotationMoveDown.click();
      depthMoveDown.click();
    });

    expect(onLineupReorder).toHaveBeenCalledWith(['bat-2', 'bat-1']);
    expect(onRotationReorder).toHaveBeenCalledWith(['sp-2', 'sp-1']);
    expect(onDepthReorder).toHaveBeenCalledWith('C', ['c-2', 'c-1']);
  });

  it('renders existing empty states for lineup, rotation, and depth chart data', async () => {
    await act(async () => {
      root.render(
        <RosterLineupPanel
          lineupPlayers={[]}
          rotationPlayers={[]}
          depthChartGroups={[]}
          onLineupReorder={vi.fn()}
          onRotationReorder={vi.fn()}
          onDepthReorder={vi.fn()}
        />,
      );
    });
    await settleLazyChildren();

    expect(container.textContent).toContain('No players available');
    expect(container.textContent).toContain('No starting pitchers available for rotation');
    expect(container.textContent).toContain('No depth chart data available');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(3);
  });
});
