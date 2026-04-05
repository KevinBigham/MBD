import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { ErrorBoundary } from './ErrorBoundary';
import { logger } from '@/shared/lib/logger';

function CrashRoute(): never {
  throw new Error('Route exploded');
}

describe('ErrorBoundary', () => {
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
    vi.restoreAllMocks();
  });

  it('renders a custom recovery action when a child route crashes', async () => {
    const onRecover = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    await act(async () => {
      root.render(
        <ErrorBoundary
          contextLabel="Trade Page"
          recoveryLabel="Return to Dashboard"
          onRecover={onRecover}
        >
          <CrashRoute />
        </ErrorBoundary>,
      );
    });

    expect(container.textContent).toContain('Something went wrong');
    expect(container.textContent).toContain('Return to Dashboard');

    const recoverButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Return to Dashboard'),
    );

    await act(async () => {
      recoverButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onRecover).toHaveBeenCalledTimes(1);
  });

  it('logs the route context when catching an error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    await act(async () => {
      root.render(
        <ErrorBoundary contextLabel="Roster Page">
          <CrashRoute />
        </ErrorBoundary>,
      );
    });

    expect(loggerSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error in Roster Page:',
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });
});
