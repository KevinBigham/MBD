import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { Award, DollarSign, FileText } from 'lucide-react';
import { OffseasonPhaseTrackerPanel, type OffseasonPhaseStepView } from './OffseasonPhaseTrackerPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const phases: OffseasonPhaseStepView[] = [
  { id: 'season_review', label: 'Season Review', icon: Award },
  { id: 'arbitration', label: 'Arbitration', icon: DollarSign },
  { id: 'extensions', label: 'Extensions', icon: FileText },
];

describe('OffseasonPhaseTrackerPanel', () => {
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

  it('renders completed, active, and upcoming phase steps', async () => {
    await act(async () => {
      root.render(<OffseasonPhaseTrackerPanel phases={phases} currentPhaseIndex={1} />);
    });

    expect(container.textContent).toContain('Season Review');
    expect(container.textContent).toContain('Arbitration');
    expect(container.textContent).toContain('Extensions');
    expect(container.innerHTML).toContain('text-accent-success');
    expect(container.innerHTML).toContain('text-accent-primary');
    expect(container.innerHTML).toContain('text-dynasty-muted');
  });
});
