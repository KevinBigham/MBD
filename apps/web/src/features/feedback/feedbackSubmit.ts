export type FeedbackType = 'bug' | 'balance' | 'idea' | 'other';

export interface FeedbackDraft {
  type: FeedbackType;
  message: string;
  contact?: string;
}

const FEEDBACK_ISSUE_URL = 'https://github.com/KevinBigham/MBD/issues/new';
const FEEDBACK_MAILTO = 'mailto:';

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: 'Bug report',
  balance: 'Balance note',
  idea: 'Feature idea',
  other: 'General feedback',
};

export function feedbackTypeLabel(type: FeedbackType): string {
  return TYPE_LABELS[type] ?? TYPE_LABELS.other;
}

export function validateFeedbackDraft(draft: FeedbackDraft): string | null {
  if (draft.message.trim().length < 12) {
    return 'Add a little more detail before opening the draft.';
  }
  return null;
}

function feedbackBody(draft: FeedbackDraft): string {
  const lines = [
    `Type: ${feedbackTypeLabel(draft.type)}`,
    '',
    'Report:',
    draft.message.trim(),
  ];
  const contact = draft.contact?.trim();
  if (contact) {
    lines.push('', `Contact: ${contact}`);
  }
  return lines.join('\n');
}

export function buildFeedbackIssueUrl(draft: FeedbackDraft): string {
  const params = new URLSearchParams({
    title: `[${feedbackTypeLabel(draft.type)}] Demo feedback`,
    body: feedbackBody(draft),
  });
  return `${FEEDBACK_ISSUE_URL}?${params.toString()}`;
}

export function buildFeedbackMailtoUrl(draft: FeedbackDraft): string {
  const params = new URLSearchParams({
    subject: `[Mr. Baseball Dynasty] ${feedbackTypeLabel(draft.type)}`,
    body: feedbackBody(draft),
  });
  return `${FEEDBACK_MAILTO}?${params.toString()}`;
}
