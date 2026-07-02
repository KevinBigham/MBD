import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import PipelineHealthPanel, { type PipelineHealthView } from './PipelineHealthPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const health: PipelineHealthView = {
  score: 78,
  label: 'surging',
  readyNow: 1,
  nextWave: 2,
  longTerm: 3,
  organizationalDepth: 4,
};

describe('PipelineHealthPanel', () => {
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

  it('renders health score, label, depth summary, and quick counters', async () => {
    await act(async () => {
      root.render(<PipelineHealthPanel health={health} />);
      await Promise.resolve();
    });

    const content = container.textContent ?? '';
    expect(content).toContain('Pipeline Health');
    expect(content).toContain('78');
    expect(content).toContain('Surging');
    expect(content).toContain('1 ready / 2 next / 3 long / 4 depth');
    expect(content).toContain('Ready');
    expect(content).toContain('Next');
    expect(content).toContain('Long');
  });

  it('renders the building fallback without pipeline data', async () => {
    await act(async () => {
      root.render(<PipelineHealthPanel health={null} />);
      await Promise.resolve();
    });

    const content = container.textContent ?? '';
    expect(content).toContain('Pipeline Health');
    expect(content).toContain('0');
    expect(content).toContain('Building');
    expect(content).toContain('Prospect depth will populate as the system develops.');
  });
});
