import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RatingBadge } from './RatingBadge';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('RatingBadge', () => {
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

  it('renders OVR with grade in a compact, screen-reader labelled badge', async () => {
    await act(async () => {
      root.render(<RatingBadge value={72} grade="A" />);
    });

    expect(container.textContent).toContain('OVR');
    expect(container.textContent).toContain('72');
    expect(container.textContent).toContain('A');
    expect(container.querySelector('[aria-label="OVR 72, grade A"]')).toBeTruthy();
  });

  it('can label non-OVR decision grades without changing the visual grammar', async () => {
    await act(async () => {
      root.render(<RatingBadge label="Grade" value={61} />);
    });

    expect(container.textContent).toContain('Grade');
    expect(container.textContent).toContain('61');
    expect(container.querySelector('[aria-label="Grade 61"]')).toBeTruthy();
  });
});
