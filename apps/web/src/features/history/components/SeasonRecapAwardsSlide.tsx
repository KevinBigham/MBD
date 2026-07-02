import { Trophy } from 'lucide-react';
import type { SeasonRecapData } from './SeasonRecapModalBody';

interface SeasonRecapAwardsSlideProps {
  data: SeasonRecapData;
}

export default function SeasonRecapAwardsSlide({ data }: SeasonRecapAwardsSlideProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="font-data text-[11px] uppercase tracking-[0.2em] text-dynasty-muted">Hardware</div>
      </div>
      <div className="mx-auto max-w-md space-y-3">
        {data.awards.map((award, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10">
              <Trophy className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="font-heading text-sm font-semibold text-dynasty-textBright">{award.award}</div>
              <div className="font-data text-xs text-dynasty-text">{award.playerName}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
