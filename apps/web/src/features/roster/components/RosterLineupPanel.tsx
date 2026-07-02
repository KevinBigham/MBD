import { Suspense, lazy } from 'react';
import { Skeleton } from '@mbd/ui';
import { GripVertical } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import type { PositionGroup } from './DepthChartDnD';
import type { LineupPlayer } from './LineupBuilder';

const LineupBuilder = lazy(() => import('./LineupBuilder'));
const DepthChartDnD = lazy(() => import('./DepthChartDnD'));

interface RosterLineupPanelProps {
  lineupPlayers: LineupPlayer[];
  rotationPlayers: LineupPlayer[];
  depthChartGroups: PositionGroup[];
  onLineupReorder: (orderedIds: string[]) => void;
  onRotationReorder: (orderedIds: string[]) => void;
  onDepthReorder: (position: string, orderedIds: string[]) => void;
}

export function RosterLineupPanel({
  lineupPlayers,
  rotationPlayers,
  depthChartGroups,
  onLineupReorder,
  onRotationReorder,
  onDepthReorder,
}: RosterLineupPanelProps) {
  return (
    <div className="space-y-6" data-testid="lineup-tab">
      <DensePanel
        title="Batting Order"
        icon={<GripVertical className="h-4 w-4 text-accent-primary" />}
      >
        <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
          <LineupBuilder
            players={lineupPlayers}
            onReorder={onLineupReorder}
          />
        </Suspense>
      </DensePanel>

      <DensePanel title="Starting Rotation">
        <Suspense fallback={<Skeleton className="h-72 rounded-lg" />}>
          <LineupBuilder
            players={rotationPlayers}
            onReorder={onRotationReorder}
            ariaLabel="Starting rotation"
            emptyLabel="No starting pitchers available for rotation"
            instructionsId="rotation-instructions"
            instructionsText="Drag pitchers to reorder the rotation, or use the up/down buttons."
            slotLabel={(slot) => `Rotation ${slot}`}
          />
        </Suspense>
      </DensePanel>

      <DensePanel title="Positional Depth Chart">
        <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
          <DepthChartDnD
            groups={depthChartGroups}
            onReorder={onDepthReorder}
          />
        </Suspense>
      </DensePanel>
    </div>
  );
}
