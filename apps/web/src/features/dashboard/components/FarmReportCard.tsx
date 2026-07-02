import { Sprout } from 'lucide-react';
import FarmReportCardBody, { type FarmMoveView, type ProspectView } from './FarmReportCardBody';

interface FarmReportCardProps {
  prospects: ProspectView[];
  recentMoves: FarmMoveView[];
}

export default function FarmReportCard({ prospects, recentMoves }: FarmReportCardProps) {
  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <Sprout className="h-4 w-4 text-accent-success" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Farm Report</h2>
      </div>

      <FarmReportCardBody prospects={prospects} recentMoves={recentMoves} />
    </section>
  );
}
