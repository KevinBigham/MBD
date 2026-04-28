import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { FeedbackForm } from '../FeedbackForm';
import { createMailtoFeedbackSubmitter } from '../feedbackSubmit';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const VALID_BODY = [
  'The standings panel is clear, but the modal close behavior felt hard to discover on mobile.',
  'I expected the same escape hatch on every report surface after advancing several weeks.',
  'This is reproducible from a new save after opening the pennant race panel twice.',
].join(' ');

function setFieldValue(
  field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string,
) {
  const valueSetter = Object.getOwnPropertyDescriptor(field.constructor.prototype, 'value')?.set;
  valueSetter?.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('FeedbackForm', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('validates feedback type and body before submitting', async () => {
    const submitFeedback = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      root.render(
        <FeedbackForm
          onClose={vi.fn()}
          submitFeedback={submitFeedback}
        />,
      );
    });

    const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Send Feedback'),
    );

    await act(async () => {
      submitButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Choose a feedback type.');
    expect(container.textContent).toContain('Write 200-500 characters so the report is actionable.');
    expect(submitFeedback).not.toHaveBeenCalled();
  });

  it('opens the mailto fallback with explicit form fields only', async () => {
    const openMailto = vi.fn();
    const submitFeedback = createMailtoFeedbackSubmitter({
      openMailto,
      to: 'feedback@example.test',
    });

    await act(async () => {
      root.render(
        <FeedbackForm
          onClose={vi.fn()}
          submitFeedback={submitFeedback}
        />,
      );
    });

    const typeSelect = container.querySelector('select[name="feedback-type"]') as HTMLSelectElement;
    const bodyField = container.querySelector('textarea[name="feedback-body"]') as HTMLTextAreaElement;

    await act(async () => {
      setFieldValue(typeSelect, 'bug');
      setFieldValue(bodyField, VALID_BODY);
    });

    const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Send Feedback'),
    );

    await act(async () => {
      submitButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(openMailto).toHaveBeenCalledTimes(1);
    const href = decodeURIComponent(openMailto.mock.calls[0]?.[0] ?? '');
    expect(href).toContain('mailto:feedback@example.test');
    expect(href).toContain('MBD Feedback: bug');
    expect(href).toContain('Type: bug');
    expect(href).toContain(VALID_BODY);
    expect(href).not.toContain('Reach me:');
    expect(href).not.toContain(window.location.href);
    expect(href).not.toContain(navigator.userAgent);
    expect(href).not.toContain('fingerprint');
  });

  it('includes optional contact only when the user types it', async () => {
    const openMailto = vi.fn();
    const submitFeedback = createMailtoFeedbackSubmitter({
      openMailto,
      to: 'feedback@example.test',
    });

    await act(async () => {
      root.render(
        <FeedbackForm
          onClose={vi.fn()}
          submitFeedback={submitFeedback}
        />,
      );
    });

    await act(async () => {
      setFieldValue(container.querySelector('select[name="feedback-type"]') as HTMLSelectElement, 'question');
      setFieldValue(container.querySelector('textarea[name="feedback-body"]') as HTMLTextAreaElement, VALID_BODY);
      setFieldValue(container.querySelector('input[name="feedback-contact"]') as HTMLInputElement, 'tester@example.test');
    });

    const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Send Feedback'),
    );

    await act(async () => {
      submitButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const href = decodeURIComponent(openMailto.mock.calls[0]?.[0] ?? '');
    expect(href).toContain('Type: question');
    expect(href).toContain('Reach me: tester@example.test');
  });

  it('shows success and auto-dismisses after submit', async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <FeedbackForm
          autoDismissMs={3000}
          onClose={onClose}
          submitFeedback={vi.fn().mockResolvedValue(undefined)}
        />,
      );
    });

    await act(async () => {
      setFieldValue(container.querySelector('select[name="feedback-type"]') as HTMLSelectElement, 'suggestion');
      setFieldValue(container.querySelector('textarea[name="feedback-body"]') as HTMLTextAreaElement, VALID_BODY);
    });

    const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Send Feedback'),
    );

    await act(async () => {
      submitButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Thanks — sent.');
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
