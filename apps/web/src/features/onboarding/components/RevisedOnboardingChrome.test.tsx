import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OnboardingEmptyState,
  OnboardingErrorBanner,
  OnboardingLoadingState,
  OnboardingPageShell,
  OnboardingProgressAside,
  OnboardingRouteHeader,
} from './RevisedOnboardingChrome';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const chapters = [
  { label: 'Choose Your Assistant' },
  { label: "The Owner's Office" },
  { label: 'Know Your Roster' },
];

describe('RevisedOnboardingChrome', () => {
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
    vi.clearAllMocks();
  });

  it('renders route shell, header copy, and progress aside from route-provided props', async () => {
    await act(async () => {
      root.render(
        <OnboardingPageShell>
          <OnboardingRouteHeader
            eyebrow="Revised Day One"
            title="The Owner's Office"
            body="The owner is setting the mandate."
            aside={(
              <OnboardingProgressAside
                currentChapter={1}
                totalChapters={chapters.length}
                chapters={chapters}
              />
            )}
          />
        </OnboardingPageShell>,
      );
    });

    expect(container.textContent).toContain('Revised Day One');
    expect(container.textContent).toContain("The Owner's Office");
    expect(container.textContent).toContain('The owner is setting the mandate.');
    expect(container.textContent).toContain('Progress');
    expect(container.querySelectorAll('[title]').length).toBe(3);
  });

  it('renders loading, error, and empty-save states while delegating empty-state action', async () => {
    const onAction = vi.fn();

    await act(async () => {
      root.render(
        <>
          <OnboardingLoadingState label="Loading AGM candidates..." />
          <OnboardingErrorBanner message="AGM API unavailable" />
          <OnboardingEmptyState
            title="No active save selected"
            body="Revised onboarding needs an active save slot."
            actionLabel="Return to Save Hub"
            onAction={onAction}
          />
        </>,
      );
    });

    expect(container.textContent).toContain('Loading AGM candidates...');
    expect(container.textContent).toContain('AGM API unavailable');
    expect(container.textContent).toContain('No active save selected');
    expect(container.textContent).toContain('Return to Save Hub');

    const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes('Return to Save Hub'),
    );
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
