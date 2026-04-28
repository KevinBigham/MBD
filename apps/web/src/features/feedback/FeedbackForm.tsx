import { useEffect, useMemo, useState } from 'react';
import { Send, X } from 'lucide-react';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import {
  FEEDBACK_BODY_MAX_LENGTH,
  FEEDBACK_BODY_MIN_LENGTH,
  formatFeedbackType,
  submitFeedbackWithFallback,
  type FeedbackPayload,
  type FeedbackSubmitter,
  type FeedbackType,
} from './feedbackSubmit';

const FEEDBACK_TYPES: FeedbackType[] = ['bug', 'suggestion', 'question'];

interface FeedbackFormProps {
  onClose: () => void;
  submitFeedback?: FeedbackSubmitter;
  autoDismissMs?: number;
}

interface FeedbackErrors {
  type?: string;
  body?: string;
  submit?: string;
}

function validateFeedback(type: string, body: string): FeedbackErrors {
  const errors: FeedbackErrors = {};
  const trimmedBody = body.trim();

  if (!FEEDBACK_TYPES.includes(type as FeedbackType)) {
    errors.type = 'Choose a feedback type.';
  }

  if (
    trimmedBody.length < FEEDBACK_BODY_MIN_LENGTH
    || trimmedBody.length > FEEDBACK_BODY_MAX_LENGTH
  ) {
    errors.body = 'Write 200-500 characters so the report is actionable.';
  }

  return errors;
}

export function FeedbackForm({
  onClose,
  submitFeedback = submitFeedbackWithFallback,
  autoDismissMs = 3000,
}: FeedbackFormProps) {
  const [type, setType] = useState('');
  const [body, setBody] = useState('');
  const [contact, setContact] = useState('');
  const [errors, setErrors] = useState<FeedbackErrors>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent'>('idle');
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  const bodyLength = body.trim().length;
  const canSubmit = status !== 'submitting' && status !== 'sent';

  const payload = useMemo<FeedbackPayload | null>(() => {
    if (!FEEDBACK_TYPES.includes(type as FeedbackType)) {
      return null;
    }

    return {
      type: type as FeedbackType,
      body: body.trim(),
      contact: contact.trim() || undefined,
    };
  }, [body, contact, type]);

  useEffect(() => {
    if (status !== 'sent') {
      return;
    }

    const timeout = window.setTimeout(onClose, autoDismissMs);
    return () => window.clearTimeout(timeout);
  }, [autoDismissMs, onClose, status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canSubmit) {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canSubmit, onClose]);

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    const nextErrors = validateFeedback(type, body);
    if (Object.keys(nextErrors).length > 0 || !payload) {
      setErrors(nextErrors);
      return;
    }

    setStatus('submitting');
    setErrors({});
    try {
      await submitFeedback(payload);
      setStatus('sent');
    } catch {
      setStatus('idle');
      setErrors({ submit: 'Feedback could not be sent. Try again or use your mail client directly.' });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dynasty-base/85 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
    >
      <div
        ref={trapRef}
        tabIndex={-1}
        className="w-full max-w-2xl rounded-lg border border-dynasty-border bg-dynasty-surface p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent-info">
              Player Feedback
            </div>
            <h2 id="feedback-title" className="mt-2 font-heading text-xl font-semibold text-dynasty-textBright">
              Send feedback
            </h2>
            <p className="mt-2 font-heading text-sm leading-6 text-dynasty-muted">
              Report bugs, questions, or friction from the exact thing you are seeing. Only the fields you type are sent.
            </p>
          </div>
          <button
            type="button"
            disabled={status === 'submitting'}
            onClick={onClose}
            aria-label="Close feedback form"
            className="focus-ring rounded border border-dynasty-border p-2 text-dynasty-muted transition-colors hover:bg-dynasty-elevated hover:text-dynasty-text disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {status === 'sent' ? (
          <div className="mt-6 rounded border border-accent-success/40 bg-accent-success/10 px-4 py-3 font-heading text-sm text-accent-success">
            Thanks — sent.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="font-heading text-sm font-semibold text-dynasty-textBright">
                Type
              </span>
              <select
                name="feedback-type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="mt-2 w-full rounded border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
                aria-invalid={Boolean(errors.type)}
              >
                <option value="">Choose one</option>
                {FEEDBACK_TYPES.map((candidate) => (
                  <option key={candidate} value={candidate}>
                    {formatFeedbackType(candidate)}
                  </option>
                ))}
              </select>
              {errors.type ? (
                <span className="mt-2 block font-heading text-xs text-accent-danger">{errors.type}</span>
              ) : null}
            </label>

            <label className="block">
              <span className="font-heading text-sm font-semibold text-dynasty-textBright">
                Details
              </span>
              <textarea
                name="feedback-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={FEEDBACK_BODY_MAX_LENGTH}
                rows={7}
                className="mt-2 w-full resize-none rounded border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm leading-6 text-dynasty-text"
                aria-invalid={Boolean(errors.body)}
                placeholder="What happened? What did you expect? What save state or screen were you on?"
              />
              <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                {errors.body ? (
                  <span className="font-heading text-xs text-accent-danger">{errors.body}</span>
                ) : (
                  <span className="font-heading text-xs text-dynasty-muted">
                    200-500 characters keeps reports actionable.
                  </span>
                )}
                <span className="font-data text-xs text-dynasty-muted">
                  {bodyLength}/{FEEDBACK_BODY_MAX_LENGTH}
                </span>
              </div>
            </label>

            <label className="block">
              <span className="font-heading text-sm font-semibold text-dynasty-textBright">
                How to reach you
              </span>
              <input
                name="feedback-contact"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                className="mt-2 w-full rounded border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
                placeholder="Optional"
              />
            </label>

            {errors.submit ? (
              <div className="rounded border border-accent-danger/40 bg-accent-danger/10 px-3 py-2 font-heading text-sm text-accent-danger">
                {errors.submit}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="focus-ring rounded border border-dynasty-border px-4 py-2 font-heading text-sm text-dynasty-text transition-colors hover:bg-dynasty-elevated"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void handleSubmit()}
                className="focus-ring inline-flex items-center gap-2 rounded bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primaryHover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {status === 'submitting' ? 'Sending' : 'Send Feedback'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
