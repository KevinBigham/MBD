import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useState } from 'react';
import {
  StatsDefinitionLibraryPanel,
  type CategoryFilter,
  type StatDefinition,
} from './StatsDefinitionLibraryPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const definitions: StatDefinition[] = [
  {
    key: 'war',
    name: 'Wins Above Replacement',
    abbreviation: 'WAR',
    category: 'universal',
    formula: 'Runs above replacement converted to wins.',
    description: 'A single number for total player value.',
    excellent: '6.0+',
    good: '3.0 - 5.9',
    average: '1.0 - 2.9',
    poor: 'Below 1.0',
    invertedScale: false,
  },
  {
    key: 'woba',
    name: 'Weighted On-Base Average',
    abbreviation: 'wOBA',
    category: 'batting',
    formula: 'Weighted offensive events divided by plate appearances.',
    description: 'Weights each offensive event by run value.',
    excellent: '.370+',
    good: '.340 - .369',
    average: '.310 - .339',
    poor: 'Below .310',
    invertedScale: false,
  },
  {
    key: 'fip',
    name: 'Fielding Independent Pitching',
    abbreviation: 'FIP',
    category: 'pitching',
    formula: 'Pitcher-controlled outcomes plus a constant.',
    description: 'Evaluates a pitcher without balls-in-play noise.',
    excellent: 'Below 3.00',
    good: '3.00 - 3.49',
    average: '3.50 - 4.19',
    poor: '4.20+',
    invertedScale: true,
  },
];

function Harness() {
  const [filter, setFilter] = useState<CategoryFilter>('all');

  return (
    <StatsDefinitionLibraryPanel
      definitions={definitions}
      filter={filter}
      onFilterChange={setFilter}
    />
  );
}

describe('StatsDefinitionLibraryPanel', () => {
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

  it('renders stat filter counts and quality-scale cards', async () => {
    await act(async () => {
      root.render(<Harness />);
    });

    expect(container.textContent).toContain('All Stats');
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('Universal');
    expect(container.textContent).toContain('Batting');
    expect(container.textContent).toContain('Pitching');
    expect(container.textContent).toContain('WAR');
    expect(container.textContent).toContain('Weighted On-Base Average');
    expect(container.textContent).toContain('FIP');
    expect(container.textContent).toContain('Quality Scale');
    expect(container.textContent).toContain('Below 3.00');
  });

  it('filters rendered stat cards through the selected category', async () => {
    await act(async () => {
      root.render(<Harness />);
    });

    const pitchingFilter = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Pitching'),
    );

    await act(async () => {
      pitchingFilter?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Fielding Independent Pitching');
    expect(container.textContent).not.toContain('Weighted On-Base Average');
    expect(container.textContent).not.toContain('Wins Above Replacement');
  });
});
