import { useEffect, useRef, useState, useCallback } from 'react';
import type { DialogueLine } from '@mbd/sim-core';

const CHAR_DELAY_MS = 60;

interface TypewriterTextProps {
  lines: DialogueLine[];
  onComplete?: () => void;
}

/**
 * Renders dialogue lines with a typewriter effect.
 * First line types at 60ms/char; subsequent lines appear instantly.
 * Click anywhere to skip to fully revealed text.
 */
export function TypewriterText({ lines, onComplete }: TypewriterTextProps) {
  const [revealedLines, setRevealedLines] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLinesRef = useRef(lines);

  // Reset when lines change
  useEffect(() => {
    if (prevLinesRef.current !== lines) {
      prevLinesRef.current = lines;
      setRevealedLines(0);
      setCharIndex(0);
      setSkipped(false);
    }
  }, [lines]);

  // Typewriter timer for first line
  useEffect(() => {
    if (skipped || lines.length === 0) return;
    if (revealedLines > 0) return; // Only animate first line

    const firstLine = lines[0];
    if (!firstLine) return;
    const text = firstLine.text;

    if (charIndex >= text.length) {
      // First line done, reveal the rest instantly
      setRevealedLines(lines.length);
      onComplete?.();
      return;
    }

    timerRef.current = setTimeout(() => {
      setCharIndex((i) => i + 1);
    }, CHAR_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [charIndex, revealedLines, skipped, lines, onComplete]);

  const handleSkip = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSkipped(true);
    setRevealedLines(lines.length);
    setCharIndex(lines[0]?.text.length ?? 0);
    onComplete?.();
  }, [lines, onComplete]);

  if (lines.length === 0) return null;

  const isFullyRevealed = skipped || revealedLines >= lines.length;

  return (
    <div
      className="space-y-3 cursor-pointer"
      onClick={!isFullyRevealed ? handleSkip : undefined}
      title={!isFullyRevealed ? 'Click to skip' : undefined}
    >
      {lines.map((line, idx) => {
        const isFirstLine = idx === 0;
        const shouldShow = isFullyRevealed || (isFirstLine && revealedLines === 0) || idx < revealedLines;
        if (!shouldShow) return null;

        const displayText = isFirstLine && !skipped && revealedLines === 0
          ? line.text.slice(0, charIndex)
          : line.text;

        return (
          <DialogueLineView
            key={`${idx}-${line.text.slice(0, 20)}`}
            line={line}
            displayText={displayText}
            showCursor={isFirstLine && !skipped && revealedLines === 0 && charIndex < line.text.length}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialogue line renderer with tone styling
// ---------------------------------------------------------------------------

const TONE_CLASSES: Record<string, string> = {
  informative: 'text-dynasty-text',
  encouraging: 'text-accent-success',
  cautionary: 'text-accent-warning',
  excited: 'text-accent-success',
  concerned: 'text-accent-warning',
  humorous: 'italic text-dynasty-text',
  serious: 'text-dynasty-text font-medium',
  philosophical: 'italic text-dynasty-muted',
};

function DialogueLineView({
  line,
  displayText,
  showCursor,
}: {
  line: DialogueLine;
  displayText: string;
  showCursor: boolean;
}) {
  const toneClass = TONE_CLASSES[line.tone] ?? 'text-dynasty-text';

  // Highlight emphasis text if present
  let content: React.ReactNode = displayText;
  if (line.emphasis && displayText.includes(line.emphasis)) {
    const parts = displayText.split(line.emphasis);
    content = (
      <>
        {parts[0]}
        <span className="font-semibold text-accent-primary">{line.emphasis}</span>
        {parts.slice(1).join(line.emphasis)}
      </>
    );
  } else if (line.referencedPlayerName && displayText.includes(line.referencedPlayerName)) {
    const parts = displayText.split(line.referencedPlayerName);
    content = (
      <>
        {parts[0]}
        <span className="font-medium text-accent-primary">{line.referencedPlayerName}</span>
        {parts.slice(1).join(line.referencedPlayerName)}
      </>
    );
  }

  return (
    <p className={`font-heading text-sm leading-relaxed ${toneClass}`}>
      {content}
      {showCursor && (
        <span className="inline-block w-[2px] h-4 ml-0.5 bg-accent-primary align-text-bottom motion-safe:animate-pulse" />
      )}
    </p>
  );
}
