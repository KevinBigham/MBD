export type FeedbackType = 'bug' | 'suggestion' | 'question';

export interface FeedbackPayload {
  type: FeedbackType;
  body: string;
  contact?: string;
}

export type FeedbackSubmitter = (payload: FeedbackPayload) => Promise<void>;

export const FEEDBACK_BODY_MIN_LENGTH = 200;
export const FEEDBACK_BODY_MAX_LENGTH = 500;
export const DEFAULT_FEEDBACK_EMAIL = 'feedback@mrbaseballdynasty.com';

export function formatFeedbackType(value: FeedbackType): string {
  if (value === 'bug') return 'Bug';
  if (value === 'suggestion') return 'Suggestion';
  return 'Question';
}

export function buildMailtoFeedbackHref(
  payload: FeedbackPayload,
  to = DEFAULT_FEEDBACK_EMAIL,
): string {
  const bodyLines = [
    `Type: ${payload.type}`,
    '',
    'Report:',
    payload.body.trim(),
  ];

  const contact = payload.contact?.trim();
  if (contact) {
    bodyLines.push('', `Reach me: ${contact}`);
  }

  const subject = encodeURIComponent(`MBD Feedback: ${payload.type}`);
  const body = encodeURIComponent(bodyLines.join('\n'));

  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export function createMailtoFeedbackSubmitter(options: {
  openMailto: (href: string) => void;
  to?: string;
}): FeedbackSubmitter {
  return async (payload) => {
    options.openMailto(buildMailtoFeedbackHref(payload, options.to));
  };
}

export const submitFeedbackWithFallback: FeedbackSubmitter = createMailtoFeedbackSubmitter({
  openMailto: (href) => {
    window.location.href = href;
  },
});
