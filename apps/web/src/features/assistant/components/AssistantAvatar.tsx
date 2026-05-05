export type AssistantExpression = 'neutral' | 'excited' | 'warning' | 'success' | 'thinking';

export interface AssistantAvatarProps {
  expression: AssistantExpression;
  pulse?: boolean;
}

function expressionClasses(expression: AssistantExpression): string {
  if (expression === 'warning') return 'border-accent-warning/70 text-accent-warning shadow-[0_0_20px_rgba(245,158,11,0.18)]';
  if (expression === 'success') return 'border-accent-success/70 text-accent-success shadow-[0_0_20px_rgba(34,197,94,0.18)]';
  if (expression === 'excited') return 'border-accent-primary/70 text-accent-primary shadow-[0_0_20px_rgba(249,115,22,0.2)]';
  if (expression === 'thinking') return 'border-accent-info/70 text-accent-info shadow-[0_0_20px_rgba(59,130,246,0.18)]';
  return 'border-dynasty-border text-dynasty-text';
}

function eyebrowPath(expression: AssistantExpression): string {
  if (expression === 'warning') return 'M16 18l6-2M30 16l6 2';
  if (expression === 'success' || expression === 'excited') return 'M16 16l6 1M30 17l6-1';
  if (expression === 'thinking') return 'M16 17l6-1M30 16l6 1';
  return 'M16 17h6M30 17h6';
}

function mouthPath(expression: AssistantExpression): string {
  if (expression === 'warning') return 'M21 33h10';
  if (expression === 'success' || expression === 'excited') return 'M20 31c3 4 10 4 13 0';
  if (expression === 'thinking') return 'M22 32c3 1 7 1 10-1';
  return 'M22 32c3 2 7 2 10 0';
}

export function AssistantAvatar({ expression, pulse = false }: AssistantAvatarProps) {
  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-dynasty-elevated ${expressionClasses(expression)} motion-safe:animate-assistant-enter ${pulse ? 'motion-safe:animate-assistant-pulse' : ''}`}
      aria-label={`Mack Mercer expression: ${expression}`}
      role="img"
    >
      <svg
        viewBox="0 0 52 52"
        className="h-10 w-10"
        aria-hidden="true"
      >
        <circle cx="26" cy="26" r="23" fill="currentColor" opacity="0.1" />
        <path d="M14 39c2-8 7-12 12-12s10 4 12 12" fill="currentColor" opacity="0.12" />
        <path d="M15 20c1-7 6-12 12-12 5 0 9 3 11 8-5 0-9 1-13 4-4-1-7-1-10 0z" fill="currentColor" opacity="0.28" />
        <circle cx="20" cy="24" r="2" fill="currentColor" />
        <circle cx="32" cy="24" r="2" fill="currentColor" />
        <path d={eyebrowPath(expression)} stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d={mouthPath(expression)} stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M13 38h26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        {expression === 'thinking' ? (
          <path d="M38 12h5M41 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        ) : null}
        {expression === 'success' ? (
          <path d="M38 13l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
      </svg>
    </div>
  );
}
