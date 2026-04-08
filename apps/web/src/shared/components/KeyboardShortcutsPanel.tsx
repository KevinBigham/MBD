import { type FC } from 'react';
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

export const KeyboardShortcutsPanel: FC<KeyboardShortcutsPanelProps> = ({
  open,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-dynasty-surface border border-dynasty-border rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dynasty-border">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-accent-primary" />
            <h2 className="text-dynasty-text font-display text-lg font-semibold">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-dynasty-muted hover:text-dynasty-text transition-colors"
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
