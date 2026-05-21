import { type FC, useState, useCallback, useEffect } from 'react';
import { HelpCircle, X, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PAGE_HELP } from '../lib/pageHelpDefinitions';

interface PageHelpProps {
  pageKey: string;
}

export const PageHelp: FC<PageHelpProps> = ({ pageKey }) => {
  const [open, setOpen] = useState(false);
  const entry = PAGE_HELP[pageKey];

  const handleClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  if (!entry) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-dynasty-muted hover:text-accent-primary transition-colors"
        aria-label={`Help for ${entry.title}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Page help"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-in panel */}
      {open && (
        <div
          className="fixed right-0 top-0 z-40 my-auto h-full max-h-[80vh] w-80 overflow-y-auto border-l border-dynasty-border bg-dynasty-surface shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-label={`${entry.title} help`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-dynasty-border">
            <h2 className="text-dynasty-text font-display text-lg font-semibold">
              {entry.title}
            </h2>
            <button
              onClick={handleClose}
              className="text-dynasty-muted hover:text-dynasty-text transition-colors"
              aria-label="Close help panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-5">
            {/* Description */}
            <p className="text-dynasty-muted text-sm leading-relaxed">
              {entry.description}
            </p>

            {/* Tips */}
            {entry.tips.length > 0 && (
              <div>
                <h3 className="text-accent-primary text-xs font-semibold uppercase tracking-wider mb-2">
                  Tips
                </h3>
                <ul className="space-y-2">
                  {entry.tips.map((tip) => (
                    <li key={tip} className="flex gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-accent-primary shrink-0 mt-0.5" />
                      <span className="text-dynasty-text">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related routes */}
            {entry.relatedRoutes.length > 0 && (
              <div>
                <h3 className="text-accent-primary text-xs font-semibold uppercase tracking-wider mb-2">
                  Related Pages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {entry.relatedRoutes.map((route) => (
                    <Link
                      key={route.path}
                      to={route.path}
                      onClick={handleClose}
                      className="text-sm text-accent-primary hover:text-accent-secondary border border-dynasty-border rounded px-2 py-1 transition-colors"
                    >
                      {route.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
