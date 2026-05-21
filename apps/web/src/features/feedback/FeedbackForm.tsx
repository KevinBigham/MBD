import { useMemo, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import {
  buildFeedbackIssueUrl,
  buildFeedbackMailtoUrl,
  feedbackTypeLabel,
  validateFeedbackDraft,
  type FeedbackDraft,
  type FeedbackType,
} from './feedbackSubmit';

const FEEDBACK_TYPES: FeedbackType[] = ['bug', 'balance', 'idea', 'other'];

export function FeedbackForm() {
  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState('');
  const draft: FeedbackDraft = useMemo(() => ({
    type,
    message,
    contact,
  }), [contact, message, type]);
  const mailtoUrl = useMemo(() => buildFeedbackMailtoUrl(draft), [draft]);

  function handleSubmit() {
    const validation = validateFeedbackDraft(draft);
    if (validation) {
      setStatus(validation);
      return;
    }
    window.open(buildFeedbackIssueUrl(draft), '_blank', 'noopener,noreferrer');
    setStatus('Opened a GitHub issue draft in a new tab.');
  }

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-base/30 p-4">
      <div className="flex items-start gap-3">
        <MessageSquare className="mt-1 h-4 w-4 text-accent-info" />
        <div>
          <h3 className="font-heading text-sm font-semibold text-dynasty-textBright">Feedback</h3>
          <p className="mt-1 font-heading text-xs text-dynasty-muted">
            Send demo notes, balance reads, bugs, or feature ideas through a draft you control.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1">
          <span className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as FeedbackType)}
            className="rounded border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
          >
            {FEEDBACK_TYPES.map((entry) => (
              <option key={entry} value={entry}>{feedbackTypeLabel(entry)}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Report</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            className="min-h-28 rounded border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
            placeholder="What happened, where, and what would you expect instead?"
          />
        </label>

        <label className="grid gap-1">
          <span className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Contact Optional</span>
          <input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            className="rounded border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-text"
            placeholder="Name or email"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="focus-ring inline-flex items-center gap-2 rounded border border-accent-info/40 bg-accent-info/10 px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-accent-info transition-colors hover:bg-accent-info/20"
        >
          <Send className="h-3.5 w-3.5" />
          Open Issue Draft
        </button>
        <a
          href={mailtoUrl}
          className="focus-ring inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-dynasty-text transition-colors hover:bg-dynasty-elevated"
        >
          Email Fallback
        </a>
      </div>

      {status ? (
        <div className="mt-3 rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-xs text-accent-info">
          {status}
        </div>
      ) : null}
    </div>
  );
}
