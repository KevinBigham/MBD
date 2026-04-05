import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import DepthChartDnD, { sortPositionGroups, type PositionGroup } from './DepthChartDnD';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const makeGroup = (position: string, count: number): PositionGroup => ({
  position,
  players: Array.from({ length: count }, (_, i) => ({
    id: `${position}-${i + 1}`,
    firstName: `${position}Player${i + 1}`,
    lastName: `Last${i + 1}`,
    position,
    displayRating: 50 + i * 5,
    letterGrade: 'B',
  })),
});

describe('sortPositionGroups', () => {
  it('sorts by standard baseball position order', () => {
    const groups = [makeGroup('RF', 1), makeGroup('C', 1), makeGroup('SP', 1), makeGroup('SS', 1)];
    const sorted = sortPositionGroups(groups);
    expect(sorted.map((g) => g.position)).toEqual(['C', 'SS', 'RF', 'SP']);
  });

  it('puts unknown positions at the end', () => {
    const groups = [makeGroup('UNKNOWN', 1), makeGroup('C', 1)];
    const sorted = sortPositionGroups(groups);
    expect(sorted.map((g) => g.position)).toEqual(['C', 'UNKNOWN']);
  });
});

describe('DepthChartDnD', () => {
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

  it('renders position group headings', async () => {
    const groups = [makeGroup('SS', 2), makeGroup('CF', 1)];
    await act(async () => { root.render(<DepthChartDnD groups={groups} />); });
    expect(container.textContent).toContain('SS');
    expect(container.textContent).toContain('CF');
  });

  it('renders players within each group', async () => {
    const groups = [makeGroup('1B', 2)];
    await act(async () => { root.render(<DepthChartDnD groups={groups} />); });
    expect(container.textContent).toContain('1BPlayer1 Last1');
    expect(container.textContent).toContain('1BPlayer2 Last2');
  });

  it('shows starter badge for first player in group', async () => {
    const groups = [makeGroup('C', 2)];
    await act(async () => { root.render(<DepthChartDnD groups={groups} />); });
    expect(container.textContent).toContain('STR');
  });

  it('shows empty state when no groups', async () => {
    await act(async () => { root.render(<DepthChartDnD groups={[]} />); });
    expect(container.textContent).toContain('No depth chart');
  });

  it('skips groups with zero players', async () => {
    const groups = [makeGroup('SS', 0), makeGroup('CF', 2)];
    await act(async () => { root.render(<DepthChartDnD groups={groups} />); });
    // SS heading should not appear since 0 players
    const headings = container.querySelectorAll('h4');
    const headingTexts = Array.from(headings).map((h) => h.textContent);
    expect(headingTexts).not.toContain('SS');
    expect(headingTexts).toContain('CF');
  });

  it('renders drag handles for each player', async () => {
    const groups = [makeGroup('2B', 3)];
    await act(async () => { root.render(<DepthChartDnD groups={groups} />); });
    const handles = container.querySelectorAll('[aria-label^="Drag "]');
    expect(handles).toHaveLength(3);
  });
});
