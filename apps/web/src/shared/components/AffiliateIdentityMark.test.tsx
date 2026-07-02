import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { AffiliateIdentityMark } from './AffiliateIdentityMark';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('AffiliateIdentityMark', () => {
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

  it('renders a stable fallback mark for partial affiliate DTOs', async () => {
    await act(async () => {
      root.render(<AffiliateIdentityMark level="AAA" />);
    });

    const mark = container.querySelector('svg');

    expect(mark).toBeTruthy();
    expect(mark?.getAttribute('aria-label')).toBe('AAA affiliate mark');
    expect(mark?.getAttribute('data-testid')).toBe('affiliate-mark-affiliate-AAA');
    expect(container.textContent).toBe('A');
  });
});
