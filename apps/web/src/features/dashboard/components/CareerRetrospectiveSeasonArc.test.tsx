import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import CareerRetrospectiveSeasonArc from './CareerRetrospectiveSeasonArc';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('CareerRetrospectiveSeasonArc', () => {
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

  async function renderArc() {
    await act(async () => {
      root.render(
        <CareerRetrospectiveSeasonArc
          history={[
            { season: 2024, winPct: 0.48 },
            { season: 2025, winPct: 0.52 },
            { season: 2026, winPct: 0.61 },
            { season: 2027, winPct: 0.55 },
          ]}
        />,
      );
    });
  }

  it('renders the career season arc with stable first, latest, peak, and low labels', async () => {
    await renderArc();

    const strip = container.querySelector('[data-testid="season-winpct-strip"]');
    expect(strip).not.toBeNull();
    const text = strip?.textContent ?? '';
    expect(text).toContain('Season Arc');
    expect(text).toContain('4 seasons');
    expect(text).toContain('S2024');
    expect(text).toContain('S2027');
    expect(text).toContain('Peak');
    expect(text).toContain('Low');
    expect(text).toContain('.610');
    expect(text).toContain('.480');
  });
});
