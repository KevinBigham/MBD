import type { ReactNode } from 'react';
import { DollarSign } from 'lucide-react';
import FreeAgencyContractOfferPanel from './FreeAgencyContractOfferPanel';
import FreeAgencyMarketBoardPanel, { type PositionFilter } from './FreeAgencyMarketBoardPanel';
import type { FreeAgencyOfferActionsResult } from '../hooks/useFreeAgencyOfferActions';
import type { FreeAgencyRouteDataResult } from '../hooks/useFreeAgencyRouteData';

interface FreeAgencyPageContentProps {
  marketIntelSlot?: ReactNode;
  offerActions: FreeAgencyOfferActionsResult;
  phase: string;
  routeData: FreeAgencyRouteDataResult;
  onPositionFilterChange: (nextFilter: PositionFilter) => void;
}

export default function FreeAgencyPageContent({
  marketIntelSlot,
  offerActions,
  phase,
  routeData,
  onPositionFilterChange,
}: FreeAgencyPageContentProps) {
  const {
    agents,
    demandFilter,
    filteredAgents,
    handleSortKeyChange,
    positionFilter,
    searchQuery,
    setDemandFilter,
    setSearchQuery,
    sortDesc,
    sortKey,
  } = routeData;
  const {
    handleOffer,
    handleSelectPlayer,
    offerBudget,
    offerResult,
    offerSalary,
    offerYears,
    selectedPlayer,
    setOfferSalary,
    setOfferYears,
  } = offerActions;

  if (phase !== 'offseason' && agents.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
            Free Agency
          </h1>
          <p className="mt-1 font-heading text-sm text-dynasty-muted">
            The free agent market opens during the offseason.
          </p>
        </div>
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-8">
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <DollarSign className="h-12 w-12 text-dynasty-muted" />
            <h2 className="font-heading text-lg font-semibold text-dynasty-text">
              Market Closed
            </h2>
            <p className="max-w-md font-heading text-sm text-dynasty-muted">
              Free agency begins after the season ends. Players whose contracts
              expire will enter the open market where all teams can compete to
              sign them.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
            Free Agency
          </h1>
          <p className="mt-1 font-heading text-sm text-dynasty-muted">
            Sign available free agents to strengthen your roster.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FreeAgencyMarketBoardPanel
          agents={filteredAgents}
          positionFilter={positionFilter}
          demandFilter={demandFilter}
          sortKey={sortKey}
          sortDesc={sortDesc}
          searchQuery={searchQuery}
          selectedPlayerId={selectedPlayer?.id ?? null}
          onPositionFilterChange={onPositionFilterChange}
          onDemandFilterChange={setDemandFilter}
          onSortKeyChange={handleSortKeyChange}
          onSearchQueryChange={setSearchQuery}
          onSelectPlayer={handleSelectPlayer}
        />

        <div className="space-y-4">
          <FreeAgencyContractOfferPanel
            selectedPlayer={selectedPlayer}
            offerYears={offerYears}
            offerSalary={offerSalary}
            offerBudget={offerBudget}
            offerResult={offerResult}
            onOfferYearsChange={setOfferYears}
            onOfferSalaryChange={setOfferSalary}
            onSubmitOffer={handleOffer}
          />
        </div>
      </div>

      {marketIntelSlot}
    </div>
  );
}
