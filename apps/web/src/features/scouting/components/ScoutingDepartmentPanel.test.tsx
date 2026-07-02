import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { ScoutingDepartmentPanel, type ScoutView } from './ScoutingDepartmentPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ScoutingDepartmentPanel', () => {
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

  it('renders scout quality, specialty, and bias cards', async () => {
    const scouts: ScoutView[] = [
      {
        id: 'scout-1',
        name: 'Marta Vega',
        quality: 72,
        specialty: 'international',
        bias: 'tools_lover',
      },
      {
        id: 'scout-2',
        name: 'Eli Stone',
        quality: 48,
        specialty: 'pro',
        bias: 'stat_head',
      },
    ];

    await act(async () => {
      root.render(<ScoutingDepartmentPanel scouts={scouts} />);
    });

    expect(container.textContent).toContain('Your Scouting Department');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('Marta Vega');
    expect(container.textContent).toContain('72');
    expect(container.textContent).toContain('international');
    expect(container.textContent).toContain('tools_lover');
    expect(container.textContent).toContain('Eli Stone');
  });

  it('renders the unavailable state when staff data is missing', async () => {
    await act(async () => {
      root.render(<ScoutingDepartmentPanel scouts={[]} />);
    });

    expect(container.textContent).toContain('Scouting staff data unavailable.');
  });
});
