import type { ComponentProps } from 'react';
import { RosterActionConfirmationModal } from './RosterActionConfirmationModal';
import { RosterContractsPanel } from './RosterContractsPanel';
import { RosterExtensionNegotiationModal } from './RosterExtensionNegotiationModal';
import { RosterLineupPanel } from './RosterLineupPanel';
import { RosterMinorLeaguesPanel } from './RosterMinorLeaguesPanel';
import { RosterMlbControlPanel } from './RosterMlbControlPanel';
import { RosterStatusPanel } from './RosterStatusPanel';
import RosterTabs, { type RosterTab } from './RosterTabs';

export interface RosterPageContentProps {
  activeTab: RosterTab;
  statusPanelProps: ComponentProps<typeof RosterStatusPanel>;
  mlbControlPanelProps: ComponentProps<typeof RosterMlbControlPanel>;
  minorsPanelProps: ComponentProps<typeof RosterMinorLeaguesPanel>;
  contractsPanelProps: ComponentProps<typeof RosterContractsPanel>;
  actionConfirmationModalProps: ComponentProps<typeof RosterActionConfirmationModal> | null;
  extensionNegotiationModalProps: ComponentProps<typeof RosterExtensionNegotiationModal> | null;
  lineupPanelProps: ComponentProps<typeof RosterLineupPanel>;
  onChangeTab: (tab: RosterTab) => void;
}

export default function RosterPageContent({
  activeTab,
  statusPanelProps,
  mlbControlPanelProps,
  minorsPanelProps,
  contractsPanelProps,
  actionConfirmationModalProps,
  extensionNegotiationModalProps,
  lineupPanelProps,
  onChangeTab,
}: RosterPageContentProps) {
  return (
    <div className="space-y-6">
      <RosterStatusPanel {...statusPanelProps} />

      <RosterTabs activeTab={activeTab} onChangeTab={onChangeTab} />

      {activeTab === 'mlb' && (
        <RosterMlbControlPanel {...mlbControlPanelProps} />
      )}

      {activeTab === 'minors' && (
        <RosterMinorLeaguesPanel {...minorsPanelProps} />
      )}

      {activeTab === 'contracts' && (
        <RosterContractsPanel {...contractsPanelProps} />
      )}

      {actionConfirmationModalProps ? (
        <RosterActionConfirmationModal {...actionConfirmationModalProps} />
      ) : null}

      {extensionNegotiationModalProps ? (
        <RosterExtensionNegotiationModal {...extensionNegotiationModalProps} />
      ) : null}

      {activeTab === 'lineup' && (
        <RosterLineupPanel {...lineupPanelProps} />
      )}
    </div>
  );
}
