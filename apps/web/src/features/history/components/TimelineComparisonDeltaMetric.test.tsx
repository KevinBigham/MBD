import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TimelineComparisonDeltaMetric from './TimelineComparisonDeltaMetric';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('TimelineComparisonDeltaMetric', () => {
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

  it('renders positive deltas with success tone and suffixes', async () => {
    await act(async () => {
      root.render(
        <TimelineComparisonDeltaMetric
          label="Record"
          parentValue="90-72 (.556)"
          branchValue="96-66 (.593)"
          delta={6}
          suffix="W"
        />,
      );
    });

    expect(container.textContent).toContain('Record');
    expect(container.textContent).toContain('Main');
    expect(container.textContent).toContain('90-72 (.556)');
    expect(container.textContent).toContain('+6W');
    expect(container.textContent).toContain('Branch');
    expect(container.textContent).toContain('96-66 (.593)');
    const successValue = Array.from(container.querySelectorAll('.text-accent-success')).find((element) =>
      element.textContent?.includes('+6W'),
    );
    expect(successValue?.textContent).toContain('+6W');
  });

  it('inverts standing rank deltas before rendering tone and value', async () => {
    await act(async () => {
      root.render(
        <TimelineComparisonDeltaMetric
          label="Division Rank"
          parentValue="1st"
          branchValue="3rd"
          delta={2}
          invertColor
        />,
      );
    });

    expect(container.textContent).toContain('Division Rank');
    expect(container.textContent).toContain('1st');
    expect(container.textContent).toContain('3rd');
    const dangerValue = Array.from(container.querySelectorAll('.text-accent-danger')).find((element) =>
      element.textContent?.includes('-2'),
    );
    expect(dangerValue?.textContent).toContain('-2');
  });
});
