import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import type { ChoiceReaction, DialogueLine } from '@mbd/sim-core';
import { TypewriterText } from './TypewriterText';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChoiceOption {
  id: string;
  label: string;
  description: string;
}

interface ChoiceSelectorProps {
  options: ChoiceOption[];
  selectedId: string | null;
  reaction: ChoiceReaction | null;
  onSelect: (choiceId: string) => void;
  onReactionComplete: () => void;
}

// ---------------------------------------------------------------------------
// Agreement animations
// ---------------------------------------------------------------------------

const AGREEMENT_STYLES: Record<string, {
  border: string;
  bg: string;
  icon: React.ReactNode | null;
  animation: string;
}> = {
  strongly_agree: {
    border: 'border-accent-primary shadow-[0_0_12px_rgba(255,165,0,0.3)]',
    bg: 'bg-accent-primary/5',
    icon: <Check className="h-4 w-4 text-accent-primary" />,
    animation: '',
  },
  agree: {
    border: 'border-accent-success/40',
    bg: 'bg-accent-success/5',
    icon: <Check className="h-4 w-4 text-accent-success/60" />,
    animation: 'motion-safe:animate-[subtleShift_300ms_ease-in-out]',
  },
  neutral: {
    border: 'border-dynasty-border',
    bg: '',
    icon: null,
    animation: '',
  },
  disagree: {
    border: 'border-accent-danger/40',
    bg: 'bg-accent-danger/10',
    icon: <X className="h-4 w-4 text-accent-danger/60" />,
    animation: '',
  },
  strongly_disagree: {
    border: 'border-accent-danger shadow-[0_0_8px_rgba(239,68,68,0.2)]',
    bg: 'bg-accent-danger/10',
    icon: <AlertTriangle className="h-4 w-4 text-accent-danger" />,
    animation: 'motion-safe:animate-[shake_200ms_ease-in-out]',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChoiceSelector({
  options,
  selectedId,
  reaction,
  onSelect,
  onReactionComplete,
}: ChoiceSelectorProps) {
  const [showReaction, setShowReaction] = useState(false);

  // Show reaction after a brief delay when selection happens
  useEffect(() => {
    if (selectedId && reaction) {
      const timer = setTimeout(() => setShowReaction(true), 200);
      return () => clearTimeout(timer);
    }
    setShowReaction(false);
  }, [selectedId, reaction]);

  return (
    <div className="space-y-3">
      {/* Choice cards */}
      <div className="grid gap-2">
        {options.map((option) => {
          const isSelected = selectedId === option.id;
          const agreementStyle = isSelected && reaction
            ? AGREEMENT_STYLES[reaction.agreement] ?? AGREEMENT_STYLES.neutral
            : null;

          return (
            <button
              key={option.id}
              type="button"
              disabled={selectedId != null}
              onClick={() => onSelect(option.id)}
              className={`group relative w-full rounded-lg border p-3 text-left transition-all duration-200 ${
                isSelected && agreementStyle
                  ? `${agreementStyle.border} ${agreementStyle.bg} ${agreementStyle.animation}`
                  : isSelected
                    ? 'border-accent-primary bg-accent-primary/5'
                    : selectedId != null
                      ? 'border-dynasty-border/50 opacity-40'
                      : 'border-dynasty-border hover:border-dynasty-text/30 hover:bg-dynasty-surface/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-heading text-sm font-medium text-dynasty-text">
                    {option.label}
                  </span>
                  <p className="mt-0.5 font-data text-xs text-dynasty-muted">
                    {option.description}
                  </p>
                </div>
                {isSelected && agreementStyle?.icon && (
                  <div className="flex-shrink-0 pt-0.5">
                    {agreementStyle.icon}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* AGM reaction dialogue */}
      {showReaction && reaction && (
        <div className="mt-3 rounded-lg border border-dynasty-border/50 bg-dynasty-surface/30 p-3">
          <TypewriterText
            lines={reaction.dialogueLines}
            onComplete={onReactionComplete}
          />
          {reaction.recommendation && (
            <p className="mt-2 font-data text-[11px] text-dynasty-muted">
              {reaction.recommendation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
