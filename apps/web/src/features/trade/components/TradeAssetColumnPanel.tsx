import { gradeBadgeColor } from '@/shared/lib/grade';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { TradeAssetInventoryView } from '@/workers/sim.worker.trade';
import type { DraftPickAsset, TradeAssetFilter } from './TradeAssetSelectionGrid';

type TradeInventoryPickView = TradeAssetInventoryView['draftPicks'][number];

interface TradeAssetColumnPanelProps {
  accentClassName: string;
  draftPicks: TradeInventoryPickView[];
  emptyDraftPickMessage: string;
  filter: TradeAssetFilter;
  filteredRoster: PlayerDTO[];
  ifaAmount: string;
  ifaDisabled: boolean;
  ifaInputName: string;
  ifaRemaining: number;
  ifaTitle: string;
  onChangeFilter: (filter: TradeAssetFilter) => void;
  onChangeIFAAmount: (amount: string) => void;
  onTogglePick: (asset: DraftPickAsset) => void;
  onTogglePlayer: (playerId: string) => void;
  rosterCount: number;
  selectedPickAssets: DraftPickAsset[];
  selectedPlayerIds: string[];
  title: string;
  tradeMarketOpen: boolean;
}

function assetFilterLabel(filter: TradeAssetFilter): string {
  switch (filter) {
    case 'mlb':
      return 'MLB';
    case 'prospects':
      return 'Prospects';
    case 'pitchers':
      return 'Pitchers';
    case 'hitters':
      return 'Hitters';
    case 'selected':
      return 'Selected';
    case 'all':
      return 'All';
  }
}

function draftPickKey(asset: DraftPickAsset): string {
  return `draft:${asset.season}:${asset.round}:${asset.originalTeamId}`;
}

function PlayerRow({
  player,
  selected,
  disabled,
  onClick,
}: {
  player: PlayerDTO;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={() => {
        if (!disabled) onClick();
      }}
      className={`border-b border-dynasty-border/50 text-sm transition-colors ${
        disabled ? 'cursor-default opacity-60' : 'cursor-pointer'
      } ${selected ? 'bg-accent-primary/15' : disabled ? '' : 'hover:bg-dynasty-elevated'}`}
    >
      <td className="px-3 py-1.5 font-heading font-medium text-dynasty-text">
        {player.firstName} {player.lastName}
      </td>
      <td className="px-2 py-1.5 font-data text-dynasty-muted">{player.position}</td>
      <td className="px-2 py-1.5 text-right font-data text-dynasty-text">{player.displayRating}</td>
      <td className="px-2 py-1.5 text-center">
        <span className={`inline-block w-6 rounded text-center font-data text-xs font-bold ${gradeBadgeColor(player.letterGrade)}`}>
          {player.letterGrade}
        </span>
      </td>
      <td className="px-2 py-1.5 text-right font-data text-dynasty-muted">{player.age}</td>
    </tr>
  );
}

function AssetFilterBar({
  value,
  onChange,
  selectedCount,
}: {
  value: TradeAssetFilter;
  onChange: (filter: TradeAssetFilter) => void;
  selectedCount: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(['all', 'mlb', 'prospects', 'pitchers', 'hitters', 'selected'] as TradeAssetFilter[]).map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          className={`rounded border px-2 py-1 font-heading text-[10px] uppercase tracking-wide transition-colors ${
            value === filter
              ? 'border-accent-info/50 bg-accent-info/10 text-accent-info'
              : 'border-dynasty-border text-dynasty-muted hover:border-accent-info/40 hover:text-accent-info'
          }`}
        >
          {assetFilterLabel(filter)}
          {filter === 'selected' ? ` · ${selectedCount}` : ''}
        </button>
      ))}
    </div>
  );
}

function DraftPickButton({
  accentClassName,
  disabledReason,
  onToggle,
  pick,
  selected,
  tradeMarketOpen,
}: {
  accentClassName: string;
  disabledReason: string;
  onToggle: (asset: DraftPickAsset) => void;
  pick: TradeInventoryPickView;
  selected: boolean;
  tradeMarketOpen: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(pick.asset)}
      disabled={!tradeMarketOpen}
      title={!tradeMarketOpen ? disabledReason : pick.detail}
      className={`rounded border px-2 py-1 text-left font-data text-xs transition-colors ${
        selected
          ? accentClassName
          : 'border-dynasty-border bg-dynasty-surface text-dynasty-text'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {pick.label} · {pick.detail}
    </button>
  );
}

export default function TradeAssetColumnPanel({
  accentClassName,
  draftPicks,
  emptyDraftPickMessage,
  filter,
  filteredRoster,
  ifaAmount,
  ifaDisabled,
  ifaInputName,
  ifaRemaining,
  ifaTitle,
  onChangeFilter,
  onChangeIFAAmount,
  onTogglePick,
  onTogglePlayer,
  rosterCount,
  selectedPickAssets,
  selectedPlayerIds,
  title,
  tradeMarketOpen,
}: TradeAssetColumnPanelProps) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated">
      <div className="space-y-3 border-b border-dynasty-border px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-heading text-sm font-semibold text-dynasty-text">{title}</h3>
          <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            {filteredRoster.length}/{rosterCount}
          </div>
        </div>
        <AssetFilterBar
          value={filter}
          onChange={onChangeFilter}
          selectedCount={selectedPlayerIds.length}
        />
      </div>
      <div className="max-h-[22rem] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-dynasty-elevated">
            <tr className="border-b border-dynasty-border text-xs text-dynasty-muted">
              <th className="px-3 py-2 text-left font-heading">Player</th>
              <th className="px-2 py-2 text-left font-heading">POS</th>
              <th className="px-2 py-2 text-right font-data">OVR</th>
              <th className="px-2 py-2 text-center font-heading">GRD</th>
              <th className="px-2 py-2 text-right font-data">AGE</th>
            </tr>
          </thead>
          <tbody>
            {filteredRoster.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                selected={selectedPlayerIds.includes(player.id)}
                disabled={!tradeMarketOpen}
                onClick={() => onTogglePlayer(player.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 border-t border-dynasty-border px-4 py-3">
        <div>
          <p className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Draft Picks</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {draftPicks.length === 0 ? (
              <span className="font-heading text-xs text-dynasty-muted">{emptyDraftPickMessage}</span>
            ) : (
              draftPicks.map((pick) => (
                <DraftPickButton
                  key={pick.key}
                  accentClassName={accentClassName}
                  disabledReason={ifaTitle}
                  onToggle={onTogglePick}
                  pick={pick}
                  selected={selectedPickAssets.some((asset) => draftPickKey(asset) === pick.key)}
                  tradeMarketOpen={tradeMarketOpen}
                />
              ))
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">IFA Pool Space</p>
            <span className="font-data text-[11px] text-dynasty-muted">Remaining ${ifaRemaining.toFixed(2)}M</span>
          </div>
          <input
            name={ifaInputName}
            type="number"
            min="0"
            max={ifaRemaining.toFixed(2)}
            step="0.1"
            value={ifaAmount}
            disabled={ifaDisabled}
            title={ifaTitle}
            onInput={(event) => onChangeIFAAmount((event.target as HTMLInputElement).value)}
            onChange={(event) => onChangeIFAAmount(event.target.value)}
            className="mt-2 w-full rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-data text-sm text-dynasty-text focus:border-accent-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="0.0"
          />
        </div>
      </div>
    </div>
  );
}
