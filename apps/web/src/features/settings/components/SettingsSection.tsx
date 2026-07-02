import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SettingsSectionProps {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}

export default function SettingsSection(props: SettingsSectionProps) {
  return (
    <section className={`rounded-lg border border-dynasty-border bg-dynasty-surface ${props.className ?? ''}`}>
      <button
        type="button"
        onClick={props.onToggle}
        aria-expanded={props.open}
        className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left"
      >
        <div>
          <h2 className="font-heading text-lg font-semibold text-dynasty-textBright">
            {props.title}
          </h2>
          <p className="mt-2 font-heading text-sm text-dynasty-muted">
            {props.description}
          </p>
        </div>
        {props.open ? (
          <ChevronDown className="mt-1 h-4 w-4 text-dynasty-muted" />
        ) : (
          <ChevronRight className="mt-1 h-4 w-4 text-dynasty-muted" />
        )}
      </button>
      {props.open ? (
        <div className="border-t border-dynasty-border px-6 py-5">
          {props.children}
        </div>
      ) : null}
    </section>
  );
}
