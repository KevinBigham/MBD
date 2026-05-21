import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { FeedbackForm } from '../FeedbackForm';
import { buildFeedbackIssueUrl, buildFeedbackMailtoUrl } from '../feedbackSubmit';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('feedbackSubmit', () => {
  it('builds issue and mailto drafts from explicit user input only', () => {
    const draft = {
      type: 'bug' as const,
      message: 'Trade Center resume button did not load the active offer.',
      contact: 'Kevin',
    };

    const issueUrl = buildFeedbackIssueUrl(draft);
    const mailtoUrl = buildFeedbackMailtoUrl(draft);

    expect(issueUrl).toContain('github.com/KevinBigham/MBD/issues/new');
    expect(decodeURIComponent(issueUrl).replaceAll('+', ' ')).toContain('Trade Center resume button');
    expect(mailtoUrl).toContain('mailto:');
    expect(decodeURIComponent(mailtoUrl).replaceAll('+', ' ')).toContain('Contact: Kevin');
  });
});

describe('FeedbackForm', () => {
  let container: HTMLDivElement;
  let root: Root;
  let openSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    openSpy = vi.fn();
    Object.defineProperty(window, 'open', {
      value: openSpy,
      configurable: true,
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('validates short reports before opening a draft', async () => {
    await act(async () => {
      root.render(<FeedbackForm />);
    });

    const button = Array.from(container.querySelectorAll('button')).find((entry) =>
      entry.textContent?.includes('Open Issue Draft'));
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(openSpy).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Add a little more detail');
  });

  it('opens a GitHub issue draft and keeps a mailto fallback link current', async () => {
    await act(async () => {
      root.render(<FeedbackForm />);
    });

    const textarea = container.querySelector('textarea');
    const contact = container.querySelector('input');
    expect(textarea).toBeTruthy();
    expect(contact).toBeTruthy();

    await act(async () => {
      if (textarea instanceof HTMLTextAreaElement) {
        const setTextAreaValue = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          'value',
        )?.set;
        setTextAreaValue?.call(textarea, 'The milestone ticker showed the wrong career total after simming a week.');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (contact instanceof HTMLInputElement) {
        const setInputValue = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )?.set;
        setInputValue?.call(contact, 'demo@example.com');
        contact.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    const mailto = container.querySelector('a[href^="mailto:"]');
    expect(decodeURIComponent(mailto?.getAttribute('href') ?? '').replaceAll('+', ' ')).toContain('demo@example.com');

    const button = Array.from(container.querySelectorAll('button')).find((entry) =>
      entry.textContent?.includes('Open Issue Draft'));
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0]?.[0]).toContain('github.com/KevinBigham/MBD/issues/new');
    expect(container.textContent).toContain('Opened a GitHub issue draft');
  });
});
