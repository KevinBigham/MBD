import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsAboutPanel from './SettingsAboutPanel';

const tourState = vi.hoisted(() => ({
  completed: false,
  restartTour: vi.fn(),
}));

vi.mock('@/shared/components/TourProvider', () => ({
  useTour: () => ({
    restartTour: tourState.restartTour,
    completed: tourState.completed,
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('SettingsAboutPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    tourState.completed = false;
    tourState.restartTour.mockReset();
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

  it('renders build context and delegates tutorial restart', async () => {
    await act(async () => {
      root.render(<SettingsAboutPanel />);
    });

    expect(container.textContent).toContain('Mr. Baseball Dynasty v1.0.0');
    expect(container.textContent).toContain('deterministic pure-rand simulation');

    const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes('Start Tutorial Tour'),
    );
    expect(button).toBeDefined();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(tourState.restartTour).toHaveBeenCalledTimes(1);
  });

  it('labels the tutorial action as replay once the tour is complete', async () => {
    tourState.completed = true;

    await act(async () => {
      root.render(<SettingsAboutPanel />);
    });

    expect(container.textContent).toContain('Replay Tutorial Tour');
  });
});
