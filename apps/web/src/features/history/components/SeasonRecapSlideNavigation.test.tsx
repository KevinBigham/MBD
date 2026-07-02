import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import SeasonRecapSlideNavigation from './SeasonRecapSlideNavigation';
import type { SeasonRecapSlideConfig } from './SeasonRecapModalBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const slides: SeasonRecapSlideConfig[] = [
  {
    id: 'title',
    label: 'Season',
    icon: <span data-testid="season-icon" />,
    shouldShow: () => true,
  },
  {
    id: 'record',
    label: 'Record',
    icon: <span data-testid="record-icon" />,
    shouldShow: () => true,
  },
  {
    id: 'narrative',
    label: 'Story',
    icon: <span data-testid="story-icon" />,
    shouldShow: () => true,
  },
];

describe('SeasonRecapSlideNavigation', () => {
  function renderNavigation(currentIndex: number) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root: Root = createRoot(container);
    const onSelectSlide = vi.fn();
    const onPrevious = vi.fn();
    const onNext = vi.fn();

    act(() => {
      root.render(
        <SeasonRecapSlideNavigation
          slides={slides}
          currentIndex={currentIndex}
          onSelectSlide={onSelectSlide}
          onPrevious={onPrevious}
          onNext={onNext}
        />,
      );
    });

    return {
      container,
      root,
      onSelectSlide,
      onPrevious,
      onNext,
      cleanup: () => {
        act(() => {
          root.unmount();
        });
        container.remove();
      },
    };
  }

  it('renders slide indicators and delegates slide selection', () => {
    const view = renderNavigation(1);

    try {
      const buttons = Array.from(view.container.querySelectorAll('button'));
      expect(
        buttons.some((button) => button.getAttribute('aria-label') === 'Go to Season slide'),
      ).toBe(true);
      expect(
        buttons.some((button) => button.getAttribute('aria-label') === 'Go to Record slide'),
      ).toBe(true);
      expect(view.container.textContent).toContain('2 / 3');

      const storyButton = buttons.find(
        (button) => button.getAttribute('aria-label') === 'Go to Story slide',
      ) as HTMLButtonElement;

      act(() => {
        storyButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(view.onSelectSlide).toHaveBeenCalledWith(2);
    } finally {
      view.cleanup();
    }
  });

  it('hides the back button on the first slide and labels the final action on the last slide', () => {
    const first = renderNavigation(0);

    try {
      expect(first.container.textContent).not.toContain('Back');
      const nextButton = Array.from(first.container.querySelectorAll('button')).find(
        (button) => button.textContent?.includes('Next'),
      ) as HTMLButtonElement;

      act(() => {
        nextButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(first.onNext).toHaveBeenCalledTimes(1);
    } finally {
      first.cleanup();
    }

    const last = renderNavigation(2);

    try {
      expect(last.container.textContent).toContain('Back');
      expect(last.container.textContent).toContain('Close');
      expect(last.container.textContent).not.toContain('Next');

      const backButton = Array.from(last.container.querySelectorAll('button')).find(
        (button) => button.textContent?.includes('Back'),
      ) as HTMLButtonElement;

      act(() => {
        backButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(last.onPrevious).toHaveBeenCalledTimes(1);
    } finally {
      last.cleanup();
    }
  });
});
