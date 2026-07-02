/**
 * PressConferenceModal — Interactive press conference where the player
 * chooses a response that affects team morale and owner satisfaction.
 */

import { useState, useEffect } from 'react';
import { Mic, Shield, MessageCircle, ArrowRight, X } from 'lucide-react';
import { getAudioEngine } from '@/shared/lib/audio';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';

interface PressConferenceResponse {
  id: string;
  label: string;
  tone: 'confident' | 'measured' | 'deflect';
  quote: string;
  moraleDelta: number;
  ownerDelta: number;
}

interface InteractivePressConference {
  id: string;
  topic: string;
  question: string;
  ownerTone: 'supportive' | 'neutral' | 'impatient';
  teamId: string;
  season: number;
  day: number;
  responses: PressConferenceResponse[];
}

interface PressConferenceModalProps {
  conference: InteractivePressConference;
  onRespond: (conferenceId: string, responseId: string) => Promise<void>;
  onDismiss: () => void;
}

function toneIcon(tone: string) {
  switch (tone) {
    case 'confident': return <Mic className="h-4 w-4" />;
    case 'measured': return <Shield className="h-4 w-4" />;
    case 'deflect': return <MessageCircle className="h-4 w-4" />;
    default: return <Mic className="h-4 w-4" />;
  }
}

function toneBorderClass(tone: string, selected: boolean): string {
  if (!selected) return 'border-dynasty-border hover:border-dynasty-muted';
  switch (tone) {
    case 'confident': return 'border-accent-success ring-1 ring-accent-success/30';
    case 'measured': return 'border-accent-info ring-1 ring-accent-info/30';
    case 'deflect': return 'border-accent-warning ring-1 ring-accent-warning/30';
    default: return 'border-accent-primary ring-1 ring-accent-primary/30';
  }
}

function toneAccentClass(tone: string): string {
  switch (tone) {
    case 'confident': return 'text-accent-success';
    case 'measured': return 'text-accent-info';
    case 'deflect': return 'text-accent-warning';
    default: return 'text-accent-primary';
  }
}

function deltaLabel(value: number, label: string): string {
  if (value === 0) return `${label}: no change`;
  return `${label}: ${value > 0 ? '+' : ''}${value}`;
}

function ownerToneLabel(tone: string): string {
  switch (tone) {
    case 'supportive': return 'The room is relaxed. Owner seems pleased.';
    case 'impatient': return 'The room is tense. Owner patience is wearing thin.';
    default: return 'The media is watching. Choose your words carefully.';
  }
}

export function PressConferenceModal({ conference, onRespond, onDismiss }: PressConferenceModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ tone: string; moraleDelta: number; ownerDelta: number } | null>(null);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    getAudioEngine().playEffect('press_conference');
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss, submitting]);

  const handleSelect = (responseId: string) => {
    if (submitting || result) return;
    getAudioEngine().playEffect('tab_switch');
    setSelectedId(responseId);
  };

  const handleSubmit = async () => {
    if (!selectedId || submitting || result) return;
    setSubmitting(true);
    getAudioEngine().playEffect('button_click');
    try {
      await onRespond(conference.id, selectedId);
      const response = conference.responses.find((r) => r.id === selectedId);
      if (response) {
        setResult({ tone: response.tone, moraleDelta: response.moraleDelta, ownerDelta: response.ownerDelta });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="press-conference-modal-title"
    >
      <div
        ref={trapRef}
        tabIndex={-1}
        className="w-full max-w-xl rounded-xl border border-dynasty-border bg-dynasty-surface shadow-2xl"
      >
        {/* Header */}
        <div className="border-b border-dynasty-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-primary/20 text-accent-primary">
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <h2
                  id="press-conference-modal-title"
                  className="font-brand text-xl tracking-wide text-dynasty-textBright"
                >
                  Press Conference
                </h2>
                <p className="mt-0.5 font-data text-xs text-dynasty-muted">
                  Season {conference.season} &middot; Day {conference.day}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              disabled={submitting}
              className="rounded-lg p-2 text-dynasty-muted transition-colors hover:bg-dynasty-elevated hover:text-dynasty-text disabled:opacity-40"
              aria-label="Close press conference"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Question */}
        <div className="px-6 py-4">
          <p className="font-data text-xs italic text-dynasty-muted">{ownerToneLabel(conference.ownerTone)}</p>
          <p className="mt-3 font-heading text-sm leading-relaxed text-dynasty-text">{conference.question}</p>
        </div>

        {/* Responses */}
        {!result ? (
          <div className="space-y-3 px-6 pb-4">
            {conference.responses.map((response) => {
              const isSelected = selectedId === response.id;
              return (
                <button
                  key={response.id}
                  type="button"
                  onClick={() => handleSelect(response.id)}
                  disabled={submitting}
                  className={`w-full rounded-lg border bg-dynasty-elevated/50 p-4 text-left transition-all ${toneBorderClass(response.tone, isSelected)}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={toneAccentClass(response.tone)}>{toneIcon(response.tone)}</span>
                    <span className="font-heading text-sm font-medium text-dynasty-textBright">{response.label}</span>
                    <span className={`ml-auto rounded border px-2 py-0.5 font-data text-[10px] uppercase ${toneAccentClass(response.tone)} border-current/30`}>
                      {response.tone}
                    </span>
                  </div>
                  <p className="mt-2 pl-7 font-data text-xs italic text-dynasty-muted">
                    &ldquo;{response.quote}&rdquo;
                  </p>
                  {isSelected && (
                    <div className="mt-2 flex gap-4 pl-7">
                      <span className={`font-data text-[10px] ${response.moraleDelta >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                        {deltaLabel(response.moraleDelta, 'Morale')}
                      </span>
                      <span className={`font-data text-[10px] ${response.ownerDelta >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                        {deltaLabel(response.ownerDelta, 'Owner')}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="px-6 pb-4">
            <div className="rounded-lg border border-accent-primary/30 bg-accent-primary/5 p-4">
              <div className="font-heading text-sm font-semibold text-dynasty-textBright">Response delivered.</div>
              <div className="mt-2 flex gap-4">
                <span className={`font-data text-xs ${result.moraleDelta >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                  Team Morale {result.moraleDelta >= 0 ? '+' : ''}{result.moraleDelta}
                </span>
                <span className={`font-data text-xs ${result.ownerDelta >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                  Owner Satisfaction {result.ownerDelta >= 0 ? '+' : ''}{result.ownerDelta}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-dynasty-border px-6 py-3">
          {!result ? (
            <>
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-md border border-dynasty-border px-4 py-2 font-heading text-xs text-dynasty-muted transition-colors hover:text-dynasty-text"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!selectedId || submitting}
                className="flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-xs font-semibold text-white transition-opacity disabled:opacity-40"
              >
                Deliver Response
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md bg-accent-primary px-4 py-2 font-heading text-xs font-semibold text-white"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
