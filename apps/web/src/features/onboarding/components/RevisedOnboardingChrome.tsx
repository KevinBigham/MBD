import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  ClipboardList,
  Users,
} from 'lucide-react';
import { ChapterProgress } from './ChapterProgress';

interface OnboardingProgressChapter {
  title?: string;
  label?: string;
}

export function OnboardingPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-dynasty-base px-6 py-8 text-dynasty-text">
      <div className="mx-auto max-w-7xl space-y-6">{children}</div>
    </div>
  );
}

export function OnboardingRouteHeader({
  eyebrow,
  title,
  body,
  aside,
}: {
  eyebrow: string;
  title: string;
  body: string;
  aside?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent-warning">
            {eyebrow}
          </div>
          <h1 className="mt-3 font-brand text-4xl text-dynasty-textBright">
            {title}
          </h1>
          <p className="mt-3 max-w-4xl font-heading text-sm leading-6 text-dynasty-muted">
            {body}
          </p>
        </div>
        {aside}
      </div>
    </section>
  );
}

export function OnboardingProgressAside({
  currentChapter,
  totalChapters,
  chapters,
}: {
  currentChapter: number;
  totalChapters: number;
  chapters: ReadonlyArray<OnboardingProgressChapter>;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-base/50 px-4 py-3">
      <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Progress</div>
      <div className="mt-2">
        <ChapterProgress
          currentChapter={currentChapter}
          totalChapters={totalChapters}
          chapters={chapters}
        />
      </div>
    </div>
  );
}

export function OnboardingEmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-8 text-center">
      <BriefcaseBusiness className="mx-auto h-8 w-8 text-accent-warning" />
      <h1 className="mt-4 font-heading text-2xl font-semibold text-dynasty-textBright">{title}</h1>
      <p className="mx-auto mt-3 max-w-2xl font-heading text-sm leading-6 text-dynasty-muted">{body}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function OnboardingErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-accent-danger/40 bg-accent-danger/10 px-4 py-3 font-heading text-sm text-accent-danger">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}

export function OnboardingLoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-dynasty-base text-dynasty-text">
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface px-6 py-5">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-accent-primary" />
          <ClipboardList className="h-5 w-5 text-accent-warning" />
          <span className="font-heading text-sm text-dynasty-muted">{label}</span>
        </div>
      </div>
    </div>
  );
}
