import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { FeedbackForm } from './FeedbackForm';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Send feedback about Mr. Baseball Dynasty"
        onClick={() => setOpen(true)}
        className="focus-ring inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-1.5 font-heading text-xs text-dynasty-text transition-colors hover:bg-dynasty-elevated"
      >
        <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
        Send Feedback
      </button>
      {open ? <FeedbackForm onClose={() => setOpen(false)} /> : null}
    </>
  );
}
