import type { GameRecapView } from './gameDayBroadcast';
import GameRecapCardBody from './GameRecapCardBody';

interface GameRecapCardProps {
  recap: GameRecapView;
  selected: boolean;
  onSelect: (gameIndex: number) => void;
}

export default function GameRecapCard({
  recap,
  selected,
  onSelect,
}: GameRecapCardProps) {
  return (
    <button
      type="button"
      onClick={() => {
        onSelect(recap.gameIndex);
      }}
      className={`w-full rounded-xl border bg-dynasty-elevated p-4 text-left transition-colors ${
        selected
          ? 'border-accent-primary/50 bg-accent-primary/10'
          : 'border-dynasty-border hover:border-accent-info/40 hover:bg-dynasty-surface'
      }`}
    >
      <GameRecapCardBody recap={recap} selected={selected} />
    </button>
  );
}
