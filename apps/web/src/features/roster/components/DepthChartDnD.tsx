/**
 * DepthChartDnD — Positional depth chart with sortable reordering.
 * Grouped by position, no cross-group dragging.
 * Starter vs backup visual distinction.
 */
import { useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

/* ── types ────────────────────��───────────────────────────── */

export interface DepthChartPlayer {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  displayRating: number;
  letterGrade: string;
}

export interface PositionGroup {
  position: string;
  players: DepthChartPlayer[];
}

interface DepthChartDnDProps {
  groups: PositionGroup[];
  onReorder?: (position: string, orderedIds: string[]) => void;
}

/* ── position order ───────────────────────────────────────── */

const POSITION_ORDER = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CL'] as const;

export function sortPositionGroups(groups: PositionGroup[]): PositionGroup[] {
  const orderMap = new Map<string, number>(POSITION_ORDER.map((pos, i) => [pos, i]));
  return [...groups].sort(
    (a, b) => (orderMap.get(a.position) ?? 99) - (orderMap.get(b.position) ?? 99),
  );
}

/* ── sortable player row ──────��───────────────────────────── */

function SortablePlayer({
  player,
  depth,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  player: DepthChartPlayer;
  depth: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  const isStarter = depth === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded px-2 py-1.5 ${
        isDragging
          ? 'border border-accent-primary bg-dynasty-elevated'
          : isStarter
            ? 'border border-dynasty-border bg-dynasty-surface'
            : 'border border-transparent bg-dynasty-base'
      }`}
      aria-label={`${isStarter ? 'Starter' : `Backup ${depth}`}: ${player.firstName} ${player.lastName}`}
    >
      <button
        className="cursor-grab touch-none text-dynasty-muted hover:text-dynasty-text"
        aria-label={`Drag ${player.firstName} ${player.lastName}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>

      {isStarter && (
        <span className="rounded bg-accent-primary/20 px-1 py-0.5 font-data text-[9px] uppercase text-accent-primary">
          STR
        </span>
      )}

      <span className={`flex-1 truncate font-body text-sm ${isStarter ? 'text-dynasty-text' : 'text-dynasty-muted'}`}>
        {player.firstName} {player.lastName}
      </span>

      <span className="font-data text-xs text-dynasty-muted">
        {player.displayRating}
      </span>

      <div className="flex flex-col gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="text-dynasty-muted hover:text-accent-primary disabled:opacity-30"
          aria-label={`Move ${player.firstName} ${player.lastName} up`}
        >
          <ChevronUp size={10} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="text-dynasty-muted hover:text-accent-primary disabled:opacity-30"
          aria-label={`Move ${player.firstName} ${player.lastName} down`}
        >
          <ChevronDown size={10} />
        </button>
      </div>
    </div>
  );
}

/* ── single position group ────────────────────────────────── */

function PositionGroupPanel({
  group,
  onReorder,
}: {
  group: PositionGroup;
  onReorder?: (position: string, orderedIds: string[]) => void;
}) {
  const [players, setPlayers] = useState(group.players);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const emit = useCallback(
    (newPlayers: DepthChartPlayer[]) => {
      onReorder?.(group.position, newPlayers.map((p) => p.id));
    },
    [group.position, onReorder],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setPlayers((prev) => {
        const oldIdx = prev.findIndex((p) => p.id === active.id);
        const newIdx = prev.findIndex((p) => p.id === over.id);
        const next = arrayMove(prev, oldIdx, newIdx);
        emit(next);
        return next;
      });
    },
    [emit],
  );

  const moveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      setPlayers((prev) => {
        const next = arrayMove(prev, index, index - 1);
        emit(next);
        return next;
      });
    },
    [emit],
  );

  const moveDown = useCallback(
    (index: number) => {
      setPlayers((prev) => {
        if (index >= prev.length - 1) return prev;
        const next = arrayMove(prev, index, index + 1);
        emit(next);
        return next;
      });
    },
    [emit],
  );

  if (players.length === 0) return null;

  return (
    <div className="space-y-1">
      <h4 className="font-heading text-xs uppercase tracking-wider text-dynasty-muted">
        {group.position}
      </h4>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={players.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {players.map((player, i) => (
            <SortablePlayer
              key={player.id}
              player={player}
              depth={i}
              onMoveUp={() => moveUp(i)}
              onMoveDown={() => moveDown(i)}
              isFirst={i === 0}
              isLast={i === players.length - 1}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

/* ── main component ───────────────────────────────────────── */

export default function DepthChartDnD({ groups, onReorder }: DepthChartDnDProps) {
  const sorted = sortPositionGroups(groups);

  if (sorted.length === 0) {
    return (
      <div className="text-center font-body text-sm text-dynasty-muted">
        No depth chart data available
      </div>
    );
  }

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="region"
      aria-label="Depth chart"
      aria-describedby="depth-instructions"
    >
      <p id="depth-instructions" className="sr-only">
        Drag players within each position group to reorder depth, or use the up/down buttons.
      </p>
      {sorted.map((group) => (
        <PositionGroupPanel key={group.position} group={group} onReorder={onReorder} />
      ))}
    </div>
  );
}
