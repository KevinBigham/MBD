import { Trophy } from 'lucide-react';
import type { SeasonRecapData } from './SeasonRecapModalBody';

interface SeasonRecapTitleSlideProps {
  data: SeasonRecapData;
}

export default function SeasonRecapTitleSlide({ data }: SeasonRecapTitleSlideProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="font-data text-[11px] uppercase tracking-[0.2em] text-accent-primary">
        Year in Review
      </div>
      <h2 className="mt-3 font-brand text-5xl tracking-wide text-dynasty-textBright md:text-6xl">
        Season {data.season}
      </h2>
      <p className="mt-4 font-heading text-lg text-dynasty-text">{data.teamName}</p>
      {data.isChampion && (
        <div className="mt-4 flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <span className="font-heading text-sm font-semibold text-amber-400">World Series Champions</span>
        </div>
      )}
    </div>
  );
}
