interface SeasonNarrativePanelProps {
  season: number;
  title: string;
  headline: string;
  recap: string;
  storylines?: string[];
  className?: string;
}

export function SeasonNarrativePanel({
  season,
  title,
  headline,
  recap,
  storylines = [],
  className = '',
}: SeasonNarrativePanelProps) {
  return (
    <section className={`rounded-xl border border-dynasty-border bg-dynasty-surface p-4 ${className}`.trim()}>
      <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-info">
        Season {season}
      </div>
      <h2 className="mt-2 font-heading text-sm font-semibold text-dynasty-textBright">{title}</h2>
      <div className="mt-3 font-brand text-2xl text-dynasty-textBright">{headline}</div>
      <div className="mt-3 font-heading text-sm leading-6 text-dynasty-muted">{recap}</div>
      {storylines.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {storylines.map((storyline) => (
            <span
              key={storyline}
              className="rounded-full border border-dynasty-border px-3 py-1 font-heading text-xs text-dynasty-muted"
            >
              {storyline}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
