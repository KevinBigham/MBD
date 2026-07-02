import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import GameAdvisorBody, { type Recommendation } from './GameAdvisorBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('GameAdvisorBody', () => {
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

  async function renderBody(recommendations: Recommendation[]) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <GameAdvisorBody recommendations={recommendations} />
        </MemoryRouter>,
      );
    });
  }

  it('renders nothing when there are no recommendations', async () => {
    await renderBody([]);

    expect(container.textContent).toBe('');
  });

  it('renders recommendations with priority styling, route links, and collapse behavior', async () => {
    await renderBody([
      {
        id: 'roster',
        priority: 'high',
        title: '2 roster compliance issues',
        description: 'Resolve roster violations before simming.',
        route: '/roster',
      },
      {
        id: 'finance',
        priority: 'low',
        title: 'Review your budget',
        description: 'Check payroll before the deadline.',
        route: '/finance',
      },
    ]);

    const text = container.textContent ?? '';
    expect(text).toContain('What should I do?');
    expect(text).toContain('2');
    expect(text).toContain('2 roster compliance issues');
    expect(text).toContain('Resolve roster violations before simming.');
    expect(text).toContain('Review your budget');
    expect(text).toContain('Check payroll before the deadline.');
    expect(container.querySelector('a[href="/roster"]')).not.toBeNull();
    expect(container.querySelector('a[href="/finance"]')).not.toBeNull();
    expect(container.querySelector('.border-accent-danger\\/40')).not.toBeNull();
    expect(container.querySelector('.bg-accent-info')).not.toBeNull();

    const toggle = container.querySelector('button');
    expect(toggle).not.toBeNull();

    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent ?? '').not.toContain('Resolve roster violations before simming.');

    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent ?? '').toContain('Resolve roster violations before simming.');
  });
});
