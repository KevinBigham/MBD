import { HeartPulse } from 'lucide-react';
import RosterHealthCardBody, { type FatigueWarningView } from './RosterHealthCardBody';

interface RosterHealthCardProps {
  injuredCount: number;
  nextReturnDays: number | null;
  fatigueWarnings: FatigueWarningView[];
}

export default function RosterHealthCard({
  injuredCount,
  nextReturnDays,
  fatigueWarnings,
}: RosterHealthCardProps) {
  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <HeartPulse className="h-4 w-4 text-accent-danger" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Roster Health</h2>
      </div>

      <RosterHealthCardBody
        fatigueWarnings={fatigueWarnings}
        injuredCount={injuredCount}
        nextReturnDays={nextReturnDays}
      />
    </section>
  );
}
