import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import CareerRetrospectiveAwardsShelf, {
  type CareerRetrospectiveAwardsShelfView,
} from './CareerRetrospectiveAwardsShelf';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('CareerRetrospectiveAwardsShelf', () => {
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

  async function renderShelf(shelf: CareerRetrospectiveAwardsShelfView) {
    await act(async () => {
      root.render(<CareerRetrospectiveAwardsShelf shelf={shelf} />);
    });
  }

  it('renders the full award shelf with total and category counts', async () => {
    await renderShelf({
      mvp: 2,
      cyYoung: 1,
      rookieOfTheYear: 1,
      goldGlove: 4,
      silverSlugger: 3,
      allStar: 11,
      other: 0,
      total: 22,
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Awards Shelf');
    expect(text).toContain('Total');
    expect(text).toContain('22');
    expect(text).toContain('MVP');
    expect(text).toContain('Cy Young');
    expect(text).toContain('ROY');
    expect(text).toContain('Gold Glove');
    expect(text).toContain('Silver Slugger');
    expect(text).toContain('All-Star');
  });

  it('keeps zero-count award categories visible for stable dashboard layout', async () => {
    await renderShelf({
      mvp: 0,
      cyYoung: 0,
      rookieOfTheYear: 0,
      goldGlove: 0,
      silverSlugger: 0,
      allStar: 0,
      other: 0,
      total: 0,
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Awards Shelf');
    expect(text).toContain('Total');
    expect(text).toContain('MVP');
    expect(text).toContain('Cy Young');
    expect(text).toContain('All-Star');
  });
});
