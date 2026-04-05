import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { EmptyStatePanel } from './EmptyStatePanel';

describe('EmptyStatePanel', () => {
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

  it('renders title and description', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <EmptyStatePanel title="No data" description="Nothing here yet." />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('No data');
    expect(container.textContent).toContain('Nothing here yet.');
  });

  it('renders a link CTA when actionHref is provided', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <EmptyStatePanel
            title="Empty"
            description="Try something."
            actionLabel="Go somewhere"
            actionHref="/MBD/roster"
          />
        </MemoryRouter>,
      );
    });

    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('Go somewhere');
    expect(link?.getAttribute('href')).toBe('/MBD/roster');
  });

  it('renders a button CTA when onAction is provided', async () => {
    const onAction = vi.fn();
    await act(async () => {
      root.render(
        <MemoryRouter>
          <EmptyStatePanel
            title="Empty"
            description="Click to act."
            actionLabel="Do it"
            onAction={onAction}
          />
        </MemoryRouter>,
      );
    });

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain('Do it');

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render CTA when actionLabel is missing', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <EmptyStatePanel title="Empty" description="No action." />
        </MemoryRouter>,
      );
    });

    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });
});
