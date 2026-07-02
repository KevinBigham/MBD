import { DensePanel } from '@/shared/components/DensePanel';
import { ResponsiveTable, type ColumnDef } from '@/shared/components/ResponsiveTable';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import { RosterCompliancePanel, type DFACandidateView, type RosterComplianceView } from './RosterCompliancePanel';

interface RosterMlbControlPanelProps {
  compliance: RosterComplianceView | null;
  busyAction: string | null;
  hitters: PlayerDTO[];
  pitchers: PlayerDTO[];
  hitterColumns: ColumnDef<PlayerDTO>[];
  pitcherColumns: ColumnDef<PlayerDTO>[];
  onRequestDfa: (candidate: DFACandidateView) => void;
}

export function RosterMlbControlPanel({
  compliance,
  busyAction,
  hitters,
  pitchers,
  hitterColumns,
  pitcherColumns,
  onRequestDfa,
}: RosterMlbControlPanelProps) {
  return (
    <div className="space-y-6">
      {compliance ? (
        <RosterCompliancePanel
          compliance={compliance}
          busyAction={busyAction}
          onRequestDfa={onRequestDfa}
        />
      ) : null}

      <DensePanel
        title={`Position Players (${hitters.length})`}
        bodyClassName="p-3 md:p-0"
      >
        <ResponsiveTable
          data={hitters}
          columns={hitterColumns}
          keyExtractor={(player) => player.id}
          emptyMessage="No position players on the active roster."
        />
      </DensePanel>

      <DensePanel
        title={`Pitchers (${pitchers.length})`}
        bodyClassName="p-3 md:p-0"
      >
        <ResponsiveTable
          data={pitchers}
          columns={pitcherColumns}
          keyExtractor={(player) => player.id}
          emptyMessage="No pitchers on the active roster."
        />
      </DensePanel>
    </div>
  );
}
