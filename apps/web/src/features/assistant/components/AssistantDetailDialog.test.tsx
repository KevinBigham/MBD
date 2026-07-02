import { act, type ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { AssistantDetailDialog } from './AssistantDetailDialog';
import type { AssistantAction, AssistantGuidance, AssistantStoryCallback } from '../data/assistantGuidance';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const guidance: AssistantGuidance = {
  routeKey: 'trade',
  title: 'Price the player and the situation',
  pagePurpose: 'Use the trade room to weigh fit, leverage, timing, and roster risk.',
  whenToUse: 'Open it before the deadline or when an offer needs a second read.',
  decision: 'Decide whether the roster hole is worth the outgoing talent.',
  ratingsFocus: 'OVR starts the value conversation, but age and role decide the move.',
  suggestedAction: {
    label: 'Review one trade target',
    route: '/trade',
    reason: 'A concrete target keeps the market scan focused.',
  },
  deeperStrategy: 'Compare leverage, payroll, and playoff odds before adding years.',
  mobileTip: 'Use one compact section at a time on mobile.',
};

const nextAction: AssistantAction = {
  label: 'Audit deadline value',
  route: '/trade',
  reason: 'Deadline context changes the same package.',
};

const story: AssistantStoryCallback = {
  id: 'ticker-trade-1',
  tone: 'warning',
  title: 'Trade market is heating up',
  body: 'League rivals are calling about late-inning relief.',
};

function avatar() {
  return (
    <span aria-hidden="true">
      <MessageCircle />
    </span>
  );
}

describe('AssistantDetailDialog', () => {
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

  async function renderDialog(overrides: Partial<ComponentProps<typeof AssistantDetailDialog>> = {}) {
    const props: ComponentProps<typeof AssistantDetailDialog> = {
      avatar: avatar(),
      guidance,
      nextAction,
      story,
      mode: 'newcomer',
      ratingsOpen: false,
      strategyOpen: false,
      onClose: vi.fn(),
      onComplete: vi.fn(),
      onReplay: vi.fn(),
      onToggleMode: vi.fn(),
      onToggleRatings: vi.fn(),
      onToggleStrategy: vi.fn(),
      ...overrides,
    };

    await act(async () => {
      root.render(
        <MemoryRouter>
          <AssistantDetailDialog {...props} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    return props;
  }

  async function flushFocusTrap() {
    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 60);
      });
    });
  }

  it('renders the route guidance, story callback, and contextual action as a modal dialog', async () => {
    const props = await renderDialog();

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain('Price the player and the situation');
    expect(dialog.textContent).toContain('League rivals are calling about late-inning relief.');
    expect(dialog.textContent).toContain('Audit deadline value');
    expect(container.querySelector('a[href="/trade"]')?.textContent).toContain('Deadline context changes the same package.');

    const ratingsButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent?.includes('Explain ratings')
    ));
    await act(async () => {
      ratingsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(props.onToggleRatings).toHaveBeenCalledTimes(1);

    const actionLink = container.querySelector('a[href="/trade"]') as HTMLAnchorElement;
    await act(async () => {
      actionLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(props.onClose).toHaveBeenCalledWith(false);
  });

  it('traps focus and delegates Escape, replay, completion, and mode controls', async () => {
    const props = await renderDialog();
    await flushFocusTrap();

    const closeButton = container.querySelector('button[aria-label="Close Assistant"]') as HTMLButtonElement;
    expect(document.activeElement).toBe(closeButton);

    const modeButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent?.includes('Hardcore mode')
    )) as HTMLButtonElement;
    modeButton.focus();

    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      document.dispatchEvent(tabEvent);
    });
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(closeButton);

    const replayButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent?.includes('Replay')
    ));
    await act(async () => {
      replayButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(props.onReplay).toHaveBeenCalledTimes(1);

    const completeButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent?.includes('Got it')
    ));
    await act(async () => {
      completeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(props.onComplete).toHaveBeenCalledTimes(1);

    await act(async () => {
      modeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(props.onToggleMode).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledWith();
  });
});
