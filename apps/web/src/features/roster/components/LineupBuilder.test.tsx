import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import LineupBuilder, { type LineupPlayer } from './LineupBuilder';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const makePlayers = (count: number): LineupPlayer[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    firstName: `First${i + 1}`,
    lastName: `Last${i + 1}`,
    position: ['CF', 'SS', '1B', 'RF', '3B', 'LF', 'C', '2B', 'DH'][i % 9]!,
    displayRating: 50 + i,
    letterGrade: 'B',
  }));

describe('LineupBuilder', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    container.remove();
  });

  it('renders all lineup slots with player names', async () => {
    const players = makePlayers(9);
    await act(async () => { root.render(<LineupBuilder players={players} />); });
    for (const p of players) {
      expect(container.textContent).toContain(`${p.firstName} ${p.lastName}`);
    }
  });

  it('shows empty state when no players', async () => {
    await act(async () => { root.render(<LineupBuilder players={[]} />); });
    expect(container.textContent).toContain('No players available');
  });

  it('renders drag handles for each slot', async () => {
    const players = makePlayers(3);
    await act(async () => { root.render(<LineupBuilder players={players} />); });
    const handles = container.querySelectorAll('[aria-label^="Drag "]');
    expect(handles).toHaveLength(3);
  });

  it('renders click fallback up/down buttons for each slot', async () => {
    const players = makePlayers(3);
    await act(async () => { root.render(<LineupBuilder players={players} />); });
    const upButtons = container.querySelectorAll('[aria-label*="up"]');
    const downButtons = container.querySelectorAll('[aria-label*="down"]');
    expect(upButtons).toHaveLength(3);
    expect(downButtons).toHaveLength(3);
  });

  it('disables up button for first slot and down for last', async () => {
    const players = makePlayers(3);
    await act(async () => { root.render(<LineupBuilder players={players} />); });
    const firstUp = container.querySelector(`[aria-label="Move First1 Last1 up"]`) as HTMLButtonElement;
    const lastDown = container.querySelector(`[aria-label="Move First3 Last3 down"]`) as HTMLButtonElement;
    expect(firstUp?.disabled).toBe(true);
    expect(lastDown?.disabled).toBe(true);
  });

  it('calls onReorder when move-down is clicked', async () => {
    const players = makePlayers(3);
    const onReorder = vi.fn();
    await act(async () => { root.render(<LineupBuilder players={players} onReorder={onReorder} />); });
    const firstDown = container.querySelector(`[aria-label="Move First1 Last1 down"]`) as HTMLButtonElement;
    await act(async () => { firstDown.click(); });
    expect(onReorder).toHaveBeenCalledWith(['p2', 'p1', 'p3']);
  });

  it('displays position badges', async () => {
    const players = makePlayers(2);
    await act(async () => { root.render(<LineupBuilder players={players} />); });
    expect(container.textContent).toContain(players[0]!.position);
    expect(container.textContent).toContain(players[1]!.position);
  });

  it('displays rating and grade', async () => {
    const players = makePlayers(1);
    await act(async () => { root.render(<LineupBuilder players={players} />); });
    expect(container.textContent).toContain(`${players[0]!.displayRating} ${players[0]!.letterGrade}`);
  });

  it('renders a11y instructions', async () => {
    const players = makePlayers(2);
    await act(async () => { root.render(<LineupBuilder players={players} />); });
    const instructions = container.querySelector('#lineup-instructions');
    expect(instructions).not.toBeNull();
    expect(instructions?.textContent).toContain('Drag players to reorder');
  });
});
