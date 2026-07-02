import type { SeasonRecapData } from './SeasonRecapModalBody';

interface SeasonRecapNarrativeSlideProps {
  data: SeasonRecapData;
}

export default function SeasonRecapNarrativeSlide({ data }: SeasonRecapNarrativeSlideProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="font-data text-[11px] uppercase tracking-[0.2em] text-dynasty-muted">The Story</div>
      <p className="mt-4 max-w-lg font-heading text-lg leading-relaxed text-dynasty-text">
        {data.narrative}
      </p>
      {data.storylines.length > 0 && (
        <div className="mt-6 space-y-2">
          {data.storylines.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-primary" />
              <span className="font-heading text-sm text-dynasty-muted">{line}</span>
            </div>
          ))}
        </div>
      )}
      {data.fanSentiment != null && (
        <div className="mt-6 rounded-lg border border-dynasty-border bg-dynasty-elevated px-6 py-3">
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Fan Sentiment</div>
          <div className={`mt-1 font-data text-2xl font-bold ${data.fanSentiment >= 60 ? 'text-accent-success' : data.fanSentiment >= 40 ? 'text-accent-warning' : 'text-accent-danger'}`}>
            {data.fanSentiment}
          </div>
        </div>
      )}
    </div>
  );
}
