import type { SeasonRecapData } from './SeasonRecapModalBody';

interface SeasonRecapLeadersSlideProps {
  data: SeasonRecapData;
}

export default function SeasonRecapLeadersSlide({ data }: SeasonRecapLeadersSlideProps) {
  const leaders = [
    { cat: 'HR', leader: data.statLeaders.hr },
    { cat: 'RBI', leader: data.statLeaders.rbi },
    { cat: 'AVG', leader: data.statLeaders.avg },
    { cat: 'ERA', leader: data.statLeaders.era },
    { cat: 'K', leader: data.statLeaders.k },
    { cat: 'W', leader: data.statLeaders.w },
  ].filter((entry): entry is { cat: string; leader: { name: string; value: string } } => entry.leader != null);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="font-data text-[11px] uppercase tracking-[0.2em] text-dynasty-muted">Team Leaders</div>
      </div>
      <div className="mx-auto grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-3">
        {leaders.map(({ cat, leader }) => (
          <div
            key={cat}
            className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3 text-center"
          >
            <div className="font-data text-[10px] uppercase tracking-[0.18em] text-accent-primary">{cat}</div>
            <div className="mt-1 font-data text-xl font-bold text-dynasty-textBright">{leader.value}</div>
            <div className="mt-0.5 truncate font-heading text-xs text-dynasty-text">{leader.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
