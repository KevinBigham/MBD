import { type FC, useEffect, useRef } from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsPanelProps {
  open: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  label: string;
  shortcuts: Shortcut[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: 'Simulation',
    shortcuts: [
      { keys: ['Space'], description: 'Sim Day' },
      { keys: ['Shift', 'Space'], description: 'Sim Week' },
      { keys: ['Ctrl/Cmd', 'Space'], description: 'Sim Month' },
    ],
  },
  {
    label: 'Navigation',
    shortcuts: [
      { keys: ['Cmd/Ctrl', 'K'], description: 'Command Palette' },
      { keys: ['Cmd/Ctrl', '/'], description: 'This Panel' },
    ],
  },
  {
    label: 'General',
    shortcuts: [
      { keys: ['Escape'], description: 'Close Modal' },
      { keys: ['Arrow Keys'], description: 'Navigate Tour' },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="bg-dynasty-elevated border border-dynasty-border rounded px-1.5 py-0.5 font-data text-xs">
      {children}
    </kbd>
  );
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const KeyboardShortcutsPanel: FC<KeyboardShortcutsPanelProps> = ({
  open,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    closeButtonRef.current?.focus();

    const getFocusableElements = () => Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
    ).filter((element) => element.offsetParent !== null || element === document.activeElement);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements();
      const firstElement = focusableElements[0] ?? dialogRef.current;
      const lastElement = focusableElements[focusableElements.length - 1] ?? dialogRef.current;

      if (!firstElement || !lastElement) {
        return;
      }

      if (e.shiftKey) {
        if (document.activeElement === firstElement || !dialogRef.current?.contains(document.activeElement)) {
          e.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (document.activeElement === lastElement || !dialogRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        firstElement.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-title"
        tabIndex={-1}
        className="relative w-full max-w-md bg-dynasty-surface border border-dynasty-border rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dynasty-border">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-accent-primary" />
            <h2
              id="keyboard-shortcuts-title"
              className="text-dynasty-text font-display text-lg font-semibold"
            >
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center text-dynasty-muted transition-colors hover:text-dynasty-text"
            aria-label="Close keyboard shortcuts panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="text-accent-primary text-xs font-semibold uppercase tracking-wider mb-2">
                {group.label}
              </h3>
              <ul className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <li
                    key={shortcut.description}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={key} className="flex items-center gap-1">
                          {i > 0 && (
                            <span className="text-dynasty-muted text-xs">+</span>
                          )}
                          <Kbd>{key}</Kbd>
                        </span>
                      ))}
                    </div>
                    <span className="text-dynasty-muted text-sm">
                      {shortcut.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
