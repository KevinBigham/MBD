import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import DynastyEndedPanel from './DynastyEndedPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('DynastyEndedPanel', () => {
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

  it('renders the route-provided dynasty end reason', async () => {
    await act(async () => {
      root.render(<DynastyEndedPanel endReason="Ownership fired the front office after a 70-win season." />);
    });

    expect(container.textContent).toContain('Dynasty Ended');
    expect(container.textContent).toContain('Ownership fired the front office after a 70-win season.');
  });

  it('falls back when ownership did not provide a reason', async () => {
    await act(async () => {
      root.render(<DynastyEndedPanel endReason={null} />);
    });

    expect(container.textContent).toContain('Ownership ended this front office run.');
  });
});
