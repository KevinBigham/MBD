import type { TradeAsset } from '@mbd/contracts';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { TradeAssetInventoryView } from '@/workers/sim.worker.trade';
import TradeAssetColumnPanel from './TradeAssetColumnPanel';
import type {
  TradeFinancialTermsByPlayerId,
  TradeFinancialTermsInput,
} from '../lib/tradeBuilderTransforms';

export type DraftPickAsset = Extract<TradeAsset, { type: 'draft_pick' }>;
export type TradeAssetFilter = 'all' | 'mlb' | 'prospects' | 'pitchers' | 'hitters' | 'selected';

interface TradeAssetSelectionGridProps {
  disabledReason: string;
  filteredTargetRoster: PlayerDTO[];
  filteredYourRoster: PlayerDTO[];
  offering: string[];
  offeringIFAAmount: string;
  offeringPicks: DraftPickAsset[];
  offeringFinancialTerms?: TradeFinancialTermsByPlayerId;
  onChangeOfferingFilter: (filter: TradeAssetFilter) => void;
  onChangeOfferingIFAAmount: (amount: string) => void;
  onChangeOfferingFinancialTerm?: (playerId: string, field: keyof TradeFinancialTermsInput, value: string) => void;
  onChangeRequestingFilter: (filter: TradeAssetFilter) => void;
  onChangeRequestingIFAAmount: (amount: string) => void;
  onChangeRequestingFinancialTerm?: (playerId: string, field: keyof TradeFinancialTermsInput, value: string) => void;
  onToggleOfferingPick: (asset: DraftPickAsset) => void;
  onToggleOfferingPlayer: (playerId: string) => void;
  onToggleRequestingPick: (asset: DraftPickAsset) => void;
  onToggleRequestingPlayer: (playerId: string) => void;
  requesting: string[];
  requestingIFAAmount: string;
  requestingPicks: DraftPickAsset[];
  requestingFinancialTerms?: TradeFinancialTermsByPlayerId;
  selectedTeam: string;
  targetAssetFilter: TradeAssetFilter;
  targetInventory: TradeAssetInventoryView;
  targetRosterCount: number;
  targetRoster?: PlayerDTO[];
  tradeMarketOpen: boolean;
  yourAssetFilter: TradeAssetFilter;
  yourInventory: TradeAssetInventoryView;
  yourRosterCount: number;
  yourRoster?: PlayerDTO[];
}

export default function TradeAssetSelectionGrid({
  disabledReason,
  filteredTargetRoster,
  filteredYourRoster,
  offering,
  offeringIFAAmount,
  offeringPicks,
  offeringFinancialTerms = {},
  onChangeOfferingFilter,
  onChangeOfferingIFAAmount,
  onChangeOfferingFinancialTerm = () => {},
  onChangeRequestingFilter,
  onChangeRequestingIFAAmount,
  onChangeRequestingFinancialTerm = () => {},
  onToggleOfferingPick,
  onToggleOfferingPlayer,
  onToggleRequestingPick,
  onToggleRequestingPlayer,
  requesting,
  requestingIFAAmount,
  requestingPicks,
  requestingFinancialTerms = {},
  selectedTeam,
  targetAssetFilter,
  targetInventory,
  targetRosterCount,
  targetRoster = filteredTargetRoster,
  tradeMarketOpen,
  yourAssetFilter,
  yourInventory,
  yourRosterCount,
  yourRoster = filteredYourRoster,
}: TradeAssetSelectionGridProps) {
  const offeringIFATitle = !tradeMarketOpen ? disabledReason : 'Offer international pool space';
  const requestingIFATitle = !tradeMarketOpen
    ? disabledReason
    : !selectedTeam
      ? 'Select a team first.'
      : 'Request international pool space';

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <TradeAssetColumnPanel
        accentClassName="border-accent-primary bg-accent-primary/15 text-accent-primary"
        draftPicks={yourInventory.draftPicks}
        emptyDraftPickMessage="No current or next-year picks available."
        filter={yourAssetFilter}
        filteredRoster={filteredYourRoster}
        ifaAmount={offeringIFAAmount}
        ifaDisabled={!tradeMarketOpen}
        ifaInputName="offering-ifa-pool"
        ifaRemaining={yourInventory.ifaRemaining}
        ifaTitle={offeringIFATitle}
        onChangeFilter={onChangeOfferingFilter}
        onChangeIFAAmount={onChangeOfferingIFAAmount}
        financialTermsByPlayerId={offeringFinancialTerms}
        onChangeFinancialTerm={onChangeOfferingFinancialTerm}
        onTogglePick={onToggleOfferingPick}
        onTogglePlayer={onToggleOfferingPlayer}
        playerFinancials={yourInventory.playerFinancials}
        rosterCount={yourRosterCount}
        selectedPickAssets={offeringPicks}
        selectedPlayerIds={offering}
        selectedPlayers={yourRoster.filter((player) => offering.includes(player.id))}
        title="Your Assets"
        tradeMarketOpen={tradeMarketOpen}
      />

      <TradeAssetColumnPanel
        accentClassName="border-accent-info bg-accent-info/15 text-accent-info"
        draftPicks={selectedTeam ? targetInventory.draftPicks : []}
        emptyDraftPickMessage={selectedTeam ? 'No current or next-year picks available.' : 'Select a team to inspect its pick inventory.'}
        filter={targetAssetFilter}
        filteredRoster={filteredTargetRoster}
        ifaAmount={requestingIFAAmount}
        ifaDisabled={!tradeMarketOpen || !selectedTeam}
        ifaInputName="requesting-ifa-pool"
        ifaRemaining={targetInventory.ifaRemaining}
        ifaTitle={requestingIFATitle}
        onChangeFilter={onChangeRequestingFilter}
        onChangeIFAAmount={onChangeRequestingIFAAmount}
        financialTermsByPlayerId={requestingFinancialTerms}
        onChangeFinancialTerm={onChangeRequestingFinancialTerm}
        onTogglePick={onToggleRequestingPick}
        onTogglePlayer={onToggleRequestingPlayer}
        playerFinancials={targetInventory.playerFinancials}
        rosterCount={targetRosterCount}
        selectedPickAssets={requestingPicks}
        selectedPlayerIds={requesting}
        selectedPlayers={targetRoster.filter((player) => requesting.includes(player.id))}
        title="Target Roster"
        tradeMarketOpen={tradeMarketOpen}
      />
    </div>
  );
}
