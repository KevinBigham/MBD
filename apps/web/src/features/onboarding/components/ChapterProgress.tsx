import { CHAPTER_ORDER } from '@mbd/sim-core';

interface ChapterProgressProps {
  currentChapter: number;
  totalChapters?: number;
}

export function ChapterProgress({ currentChapter, totalChapters = 8 }: ChapterProgressProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: totalChapters }, (_, idx) => {
        const chapter = CHAPTER_ORDER[idx];
        const isComplete = idx < currentChapter;
        const isCurrent = idx === currentChapter;

        return (
          <div key={idx} className="flex items-center gap-1">
            {/* Dot */}
            <div
              className={`flex h-2.5 w-2.5 items-center justify-center rounded-full transition-all duration-300 ${
                isComplete
                  ? 'bg-accent-primary'
                  : isCurrent
                    ? 'bg-accent-primary ring-2 ring-accent-primary/30 ring-offset-1 ring-offset-dynasty-bg'
                    : 'bg-dynasty-border'
              }`}
              title={chapter?.title ?? `Chapter ${idx + 1}`}
            />
            {/* Connector line (except after last) */}
            {idx < totalChapters - 1 && (
              <div
                className={`h-px w-4 transition-colors duration-300 ${
                  isComplete ? 'bg-accent-primary' : 'bg-dynasty-border'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
