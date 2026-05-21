/**
 * LineupBuilder — Sortable batting order with dnd-kit.
 * 9 lineup slots (+ DH), drag-and-drop reordering with click fallback.
 * Local state only — no worker mutation. GM planning tool.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
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

/* ── types ────────────────────────────────────────────────── */

export interface LineupPlayer {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  displayRating: number;
  letterGrade: string;
}

interface LineupBuilderProps {
  players: LineupPlayer[];
  onReorder?: (orderedIds: string[]) => void;
  ariaLabel?: string;
  emptyLabel?: string;
  instructionsId?: string;
  instructionsText?: string;
  slotLabel?: (slot: number) => string;
}

/* ── sortable item ────���───────────────────────────────────── */

function SortableSlot({
  player,
  slot,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  slotLabel,
}: {
  player: LineupPlayer;
  slot: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  slotLabel: (slot: number) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded px-3 py-2 ${
        isDragging
          ? 'border border-accent-primary bg-dynasty-elevated'
          : 'border border-dynasty-border bg-dynasty-surface'
      }`}
      aria-label={`${slotLabel(slot)}: ${player.firstName} ${player.lastName}`}
    >
      {/* Drag handle */}
      <button
        className="cursor-grab touch-none text-dynasty-muted hover:text-dynasty-text"
        aria-label={`Drag ${player.firstName} ${player.lastName}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      {/* Slot number */}
      <span className="w-5 font-data text-xs text-dynasty-muted">{slot}</span>

      {/* Position badge */}
      <span className="w-8 rounded bg-dynasty-elevated px-1.5 py-0.5 text-center font-data text-[10px] text-dynasty-muted">
        {player.position}
      </span>

      {/* Player name */}
      <span className="flex-1 truncate font-body text-sm text-dynasty-text">
        {player.firstName} {player.lastName}
      </span>

      {/* Rating */}
      <span className="font-data text-xs text-dynasty-muted">
        {player.displayRating} {player.letterGrade}
      </span>

      {/* Click fallback buttons */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="text-dynasty-muted hover:text-accent-primary disabled:opacity-30"
          aria-label={`Move ${player.firstName} ${player.lastName} up`}
        >
          <ChevronUp size={12} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="text-dynasty-muted hover:text-accent-primary disabled:opacity-30"
          aria-label={`Move ${player.firstName} ${player.lastName} down`}
        >
          <ChevronDown size={12} />
        </button>
      </div>
    </div>
  );
}

/* ── main component ────���──────────────────────────────────── */

export default function LineupBuilder({
  players: initialPlayers,
  onReorder,
  ariaLabel = 'Batting order',
  emptyLabel = 'No players available for lineup',
  instructionsId = 'lineup-instructions',
  instructionsText = 'Drag players to reorder, or use the up/down buttons to adjust batting position.',
  slotLabel = (slot) => `Batting ${slot}`,
}: LineupBuilderProps) {
  const [order, setOrder] = useState<LineupPlayer[]>(initialPlayers);
  const initialPlayerKey = useMemo(
    () => initialPlayers.map((player) => player.id).join('|'),
    [initialPlayers],
  );

  useEffect(() => {
    setOrder(initialPlayers);
  }, [initialPlayerKey, initialPlayers]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const emitOrder = useCallback(
    (newOrder: LineupPlayer[]) => {
      onReorder?.(newOrder.map((p) => p.id));
    },
    [onReorder],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setOrder((prev) => {
        const oldIndex = prev.findIndex((p) => p.id === active.id);
        const newIndex = prev.findIndex((p) => p.id === over.id);
        const next = arrayMove(prev, oldIndex, newIndex);
        emitOrder(next);
        return next;
      });
    },
    [emitOrder],
  );

  const moveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      setOrder((prev) => {
        const next = arrayMove(prev, index, index - 1);
        emitOrder(next);
        return next;
      });
    },
    [emitOrder],
  );

  const moveDown = useCallback(
    (index: number) => {
      setOrder((prev) => {
        if (index >= prev.length - 1) return prev;
        const next = arrayMove(prev, index, index + 1);
        emitOrder(next);
        return next;
      });
    },
    [emitOrder],
  );

  if (order.length === 0) {
    return (
      <div className="text-center font-body text-sm text-dynasty-muted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      className="space-y-1"
      role="list"
      aria-label={ariaLabel}
      aria-describedby={instructionsId}
    >
      <p id={instructionsId} className="sr-only">
        {instructionsText}
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {order.map((player, index) => (
            <SortableSlot
              key={player.id}
              player={player}
              slot={index + 1}
              slotLabel={slotLabel}
              onMoveUp={() => moveUp(index)}
              onMoveDown={() => moveDown(index)}
              isFirst={index === 0}
              isLast={index === order.length - 1}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
