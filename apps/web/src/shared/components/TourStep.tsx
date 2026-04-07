/**
 * TourStep — Renders a single step of the guided tutorial tour.
 * Shows a spotlight cutout around the target element (if any) with a
 * positioned popover card. Centered modal for steps with no target.
 */

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { TourStepConfig, TourPlacement } from '../lib/tourDefinition.js';

interface TourStepProps {
  step: TourStepConfig;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

const SPOTLIGHT_PADDING = 8;
const CARD_GAP = 12;
const CARD_WIDTH = 360;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getTargetRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function buildClipPath(rect: Rect): string {
  const x1 = rect.left - SPOTLIGHT_PADDING;
  const y1 = rect.top - SPOTLIGHT_PADDING;
  const x2 = rect.left + rect.width + SPOTLIGHT_PADDING;
  const y2 = rect.top + rect.height + SPOTLIGHT_PADDING;
  const r = 8; // border-radius for the cutout

  // Full-screen polygon with a rounded-rect hole
  return `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
    ${x1 + r}px ${y1}px,
    ${x2 - r}px ${y1}px,
    ${x2}px ${y1 + r}px,
    ${x2}px ${y2 - r}px,
    ${x2 - r}px ${y2}px,
    ${x1 + r}px ${y2}px,
    ${x1}px ${y2 - r}px,
    ${x1}px ${y1 + r}px,
    ${x1 + r}px ${y1}px
  )`;
}

function computeCardPosition(
  targetRect: Rect | null,
  placement: TourPlacement | undefined,
): React.CSSProperties {
  if (!targetRect) {
    // Centered
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const p = placement ?? 'bottom';

  let top = 0;
  let left = 0;

  switch (p) {
    case 'bottom':
      top = targetRect.top + targetRect.height + SPOTLIGHT_PADDING + CARD_GAP;
      left = targetRect.left + targetRect.width / 2 - CARD_WIDTH / 2;
      break;
    case 'top':
      top = targetRect.top - SPOTLIGHT_PADDING - CARD_GAP - 200; // estimate card height
      left = targetRect.left + targetRect.width / 2 - CARD_WIDTH / 2;
      break;
    case 'right':
      top = targetRect.top + targetRect.height / 2 - 100;
      left = targetRect.left + targetRect.width + SPOTLIGHT_PADDING + CARD_GAP;
      break;
    case 'left':
      top = targetRect.top + targetRect.height / 2 - 100;
      left = targetRect.left - SPOTLIGHT_PADDING - CARD_GAP - CARD_WIDTH;
      break;
  }

  // Clamp to viewport
  left = Math.max(16, Math.min(left, vw - CARD_WIDTH - 16));
  top = Math.max(16, Math.min(top, vh - 250));

  return { top: `${top}px`, left: `${left}px` };
}

export function TourStep({ step, stepIndex, totalSteps, onNext, onPrev, onSkip }: TourStepProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  // Find and track the target element
  useLayoutEffect(() => {
    if (!step.targetSelector) {
      setTargetRect(null);
      setReady(true);
      return;
    }

    let attempts = 0;
    const maxAttempts = 30; // ~500ms at 60fps

    function tryFind() {
      const rect = getTargetRect(step.targetSelector!);
      if (rect) {
        setTargetRect(rect);
        setReady(true);
      } else if (attempts < maxAttempts) {
        attempts++;
        requestAnimationFrame(tryFind);
      } else {
        // Target not found — show centered
        setTargetRect(null);
        setReady(true);
      }
    }

    setReady(false);
    requestAnimationFrame(tryFind);
  }, [step.targetSelector, step.id]);

  // Recalculate on resize/scroll
  useEffect(() => {
    if (!step.targetSelector) return;

    function update() {
      const rect = getTargetRect(step.targetSelector!);
      if (rect) setTargetRect(rect);
    }

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step.targetSelector]);

  // Focus the card for keyboard navigation
  useEffect(() => {
    if (ready && cardRef.current) {
      cardRef.current.focus();
    }
  }, [ready, step.id]);

  // Keyboard handlers
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (isLast) onSkip();
        else onNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!isFirst) onPrev();
      }
    },
    [isFirst, isLast, onNext, onPrev, onSkip],
  );

  if (!ready) return null;

  const cardStyle = computeCardPosition(targetRect, step.placement);

  return (
    <div className="fixed inset-0 z-[60]" onKeyDown={handleKeyDown}>
      {/* Backdrop with spotlight cutout */}
      <div
        className="absolute inset-0 bg-black/60 transition-[clip-path] duration-200"
        style={targetRect ? { clipPath: buildClipPath(targetRect) } : undefined}
        onClick={onSkip}
        aria-hidden="true"
      />

      {/* Popover card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-label={`Tutorial step ${stepIndex + 1} of ${totalSteps}: ${step.title}`}
        tabIndex={-1}
        className="absolute rounded-lg border border-dynasty-border bg-dynasty-surface p-5 shadow-xl outline-none"
        style={{ ...cardStyle, width: `${CARD_WIDTH}px` }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-data text-[10px] uppercase tracking-[0.18em] text-accent-primary">
              Step {stepIndex + 1} of {totalSteps}
            </div>
            <h3 className="mt-1 font-heading text-base font-semibold text-dynasty-textBright">
              {step.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="focus-ring rounded p-1 text-dynasty-muted transition-colors hover:text-dynasty-text"
            aria-label="Skip tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <p className="mt-3 font-heading text-sm leading-relaxed text-dynasty-text">
          {step.description}
        </p>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            {!isFirst && (
              <button
                type="button"
                onClick={onPrev}
                className="focus-ring flex items-center gap-1 rounded px-2 py-1.5 font-heading text-xs text-dynasty-muted transition-colors hover:text-dynasty-text"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={isLast ? onSkip : onNext}
            className="focus-ring flex items-center gap-1 rounded bg-accent-primary px-4 py-1.5 font-heading text-xs font-semibold text-white transition-colors hover:bg-accent-primary/80"
          >
            {isLast ? 'Start Playing' : 'Next'}
            {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
