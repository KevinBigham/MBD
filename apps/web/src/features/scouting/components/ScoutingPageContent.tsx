import { ScoutConflictsTab } from './ScoutConflictsTab';
import InternationalScoutingPanel, {
  type ScoutingTradeTarget,
} from './InternationalScoutingPanel';
import ProScoutingPanel, { type ScoutReportView } from './ProScoutingPanel';
import { ScoutingDepartmentPanel, type ScoutView } from './ScoutingDepartmentPanel';
import {
  ScoutingFrontOfficeContextPanel,
  type ScoutingOwnerStateView,
} from './ScoutingFrontOfficeContextPanel';
import ScoutingViewTabs, { type ScoutingView } from './ScoutingViewTabs';
import type { IFAPoolView, IFAProspectView, IFAReportView, PlayerDTO } from '@/workers/sim.worker.helpers';
import type { TeamChemistry } from '@mbd/contracts';

export interface ScoutingPageContentProps {
  actionMessage: string | null;
  activeView: ScoutingView;
  chemistry: TeamChemistry | null;
  ifaBonus: string;
  ifaLoading: boolean;
  ifaPool: IFAPoolView | null;
  ifaReport: IFAReportView | null;
  loading: boolean;
  onChangeIFABonus: (bonus: string) => void;
  onChangeSearchQuery: (query: string) => void;
  onChangeTradeAmount: (amount: string) => void;
  onChangeTradeTarget: (teamId: string) => void;
  onChangeView: (view: ScoutingView) => void;
  onScoutPlayer: (player: PlayerDTO) => void | Promise<void>;
  onScoutProspect: (prospect: IFAProspectView) => void | Promise<void>;
  onSearch: () => void | Promise<void>;
  onSignProspect: () => void | Promise<void>;
  onTradePoolSpace: () => void | Promise<void>;
  ownerState: ScoutingOwnerStateView | null;
  recentReports: ScoutReportView[];
  scoutReport: ScoutReportView | null;
  scouts: ScoutView[];
  searchQuery: string;
  searchResults: PlayerDTO[];
  tradeAmount: string;
  tradeTarget: string;
  tradeTargets: ScoutingTradeTarget[];
}

export default function ScoutingPageContent({
  actionMessage,
  activeView,
  chemistry,
  ifaBonus,
  ifaLoading,
  ifaPool,
  ifaReport,
  loading,
  onChangeIFABonus,
  onChangeSearchQuery,
  onChangeTradeAmount,
  onChangeTradeTarget,
  onChangeView,
  onScoutPlayer,
  onScoutProspect,
  onSearch,
  onSignProspect,
  onTradePoolSpace,
  ownerState,
  recentReports,
  scoutReport,
  scouts,
  searchQuery,
  searchResults,
  tradeAmount,
  tradeTarget,
  tradeTargets,
}: ScoutingPageContentProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">Scouting</h1>
        <p className="mt-1 font-heading text-sm text-dynasty-muted">
          Evaluate pro talent, manage the international market, and turn better information into better decisions.
        </p>
      </div>

      <ScoutingViewTabs activeView={activeView} onChangeView={onChangeView} />

      <ScoutingFrontOfficeContextPanel chemistry={chemistry} ownerState={ownerState} />

      <ScoutingDepartmentPanel scouts={scouts} />

      {activeView === 'conflicts' ? null : activeView === 'pro' ? (
        <ProScoutingPanel
          loading={loading}
          onChangeSearchQuery={onChangeSearchQuery}
          onScoutPlayer={onScoutPlayer}
          onSearch={onSearch}
          recentReports={recentReports}
          scoutReport={scoutReport}
          searchQuery={searchQuery}
          searchResults={searchResults}
        />
      ) : (
        <InternationalScoutingPanel
          actionMessage={actionMessage}
          ifaBonus={ifaBonus}
          ifaLoading={ifaLoading}
          ifaPool={ifaPool}
          ifaReport={ifaReport}
          onChangeIFABonus={onChangeIFABonus}
          onChangeTradeAmount={onChangeTradeAmount}
          onChangeTradeTarget={onChangeTradeTarget}
          onScoutProspect={onScoutProspect}
          onSignProspect={onSignProspect}
          onTradePoolSpace={onTradePoolSpace}
          tradeAmount={tradeAmount}
          tradeTarget={tradeTarget}
          tradeTargets={tradeTargets}
        />
      )}

      {activeView === 'conflicts' && <ScoutConflictsTab />}
    </div>
  );
}
