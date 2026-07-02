/**
 * ContextualHelp — A help icon button that shows a brief page explanation
 * in a dismissible popover. Helps new players understand what each page does.
 */

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

export interface ContextualHelpProps {
  /** Short title for the help card */
  title: string;
  /** 1-3 sentence explanation of what this page does */
  description: string;
  /** Optional list of key actions available on this page */
  actions?: readonly string[];
  /** Optional keyboard shortcuts relevant to this page */
  shortcuts?: readonly { key: string; description: string }[];
}

export function ContextualHelp({ title, description, actions, shortcuts }: ContextualHelpProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  return (
    <div className="relative inline-block" data-tour="contextual-help">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="focus-ring rounded-full p-1 text-dynasty-muted transition-colors hover:bg-dynasty-elevated hover:text-dynasty-text"
        aria-label={`Help: ${title}`}
        aria-expanded={open}
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`Help: ${title}`}
          className="absolute right-0 top-8 z-50 w-72 rounded-lg border border-dynasty-border bg-dynasty-surface p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading text-sm font-semibold text-dynasty-textBright">{title}</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-dynasty-muted transition-colors hover:text-dynasty-text"
              aria-label="Close help"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-2 font-data text-xs leading-relaxed text-dynasty-muted">{description}</p>
          {actions && actions.length > 0 && (
            <div className="mt-3 border-t border-dynasty-border pt-2">
              <div className="font-heading text-[10px] uppercase tracking-wider text-dynasty-muted">Key Actions</div>
              <ul className="mt-1 space-y-1">
                {actions.map((action) => (
                  <li key={action} className="flex items-center gap-1.5 font-data text-xs text-dynasty-text">
                    <span className="h-1 w-1 rounded-full bg-accent-primary" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {shortcuts && shortcuts.length > 0 && (
            <div className="mt-3 border-t border-dynasty-border pt-2">
              <div className="font-heading text-[10px] uppercase tracking-wider text-dynasty-muted">Keyboard Shortcuts</div>
              <div className="mt-1 space-y-1">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between gap-2">
                    <span className="font-data text-xs text-dynasty-text">{shortcut.description}</span>
                    <kbd className="rounded border border-dynasty-border bg-dynasty-elevated px-1.5 py-0.5 font-data text-[10px] text-dynasty-muted">{shortcut.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
