import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { Radio } from 'lucide-react';
import { DensePanel } from './DensePanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('DensePanel', () => {
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

  it('renders a compact bordered route panel with header, metadata, and body content', async () => {
    await act(async () => {
      root.render(
        <DensePanel
          title="Draft Ticker"
          subtitle="Round 1 of 20"
          icon={<Radio className="h-4 w-4 text-accent-info" />}
          meta="2 picks shown"
          bodyClassName="max-h-[32rem] overflow-y-auto px-2 py-2"
        >
          <p>New York selected Eli Vega</p>
        </DensePanel>,
      );
    });

    const panel = container.querySelector('section');
    const heading = container.querySelector('h2');
    const body = container.querySelector('[data-testid="dense-panel-body"]');

    expect(panel?.className).toContain('rounded-lg');
    expect(panel?.className).toContain('border-dynasty-border');
    expect(panel?.getAttribute('aria-labelledby')).toBe(heading?.id);
    expect(heading?.textContent).toBe('Draft Ticker');
    expect(container.textContent).toContain('Round 1 of 20');
    expect(container.textContent).toContain('2 picks shown');
    expect(container.textContent).toContain('New York selected Eli Vega');
    expect(body?.className).toContain('max-h-[32rem]');
  });
});
