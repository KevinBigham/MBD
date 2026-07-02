// Vitest executes this CSS contract in Node, while the app tsconfig intentionally
// omits Node globals for runtime code.
// @ts-ignore
import { readFileSync } from 'node:fs';
// @ts-ignore
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

declare const process: { cwd(): string };

const css = readFileSync(resolve(process.cwd(), 'src/globals.css'), 'utf8');

const routeCriticalControlFiles = [
  {
    label: 'Dashboard sim controls',
    file: 'src/features/dashboard/components/DashboardSimControlsPanel.tsx',
    controls: ['dashboard-sim-day', 'dashboard-sim-week', 'dashboard-sim-month'],
  },
  {
    label: 'Trade',
    file: 'src/features/trade/components/TradePackageEvaluationCard.tsx',
    controls: ['trade-package-submit', 'trade-package-clear'],
  },
  {
    label: 'Trade multi-team',
    file: 'src/features/trade/components/MultiTeamControlColumn.tsx',
    controls: ['trade-multi-add-condition', 'trade-multi-condition-player', 'trade-multi-evaluate'],
  },
  {
    label: 'Roster',
    file: 'src/features/roster/lib/rosterMlbColumns.tsx',
    controls: ['roster-demote'],
  },
  {
    label: 'Roster minor promotion',
    file: 'src/features/roster/components/RosterMinorLevelTable.tsx',
    controls: ['roster-promote'],
  },
  {
    label: 'Roster minor waiver claims',
    file: 'src/features/roster/components/RosterMinorLeaguesPanel.tsx',
    controls: ['roster-waiver-claim'],
  },
  {
    label: 'Roster compliance',
    file: 'src/features/roster/components/RosterCompliancePanel.tsx',
    controls: ['roster-dfa'],
  },
  {
    label: 'Staff tabs',
    file: 'src/features/staff/components/StaffPageContent.tsx',
    controls: ['staff-view-tab'],
  },
  {
    label: 'Staff current actions',
    file: 'src/features/staff/components/StaffCurrentStaffPanel.tsx',
    controls: ['staff-fire-coach'],
  },
  {
    label: 'Staff market actions',
    file: 'src/features/staff/components/StaffMarketPanel.tsx',
    controls: ['staff-fire-coach', 'staff-hire-coach'],
  },
  {
    label: 'Draft',
    file: 'src/features/draft/components/DraftSummaryPanel.tsx',
    controls: ['draft-bonus-offer'],
  },
  {
    label: 'Draft current pick',
    file: 'src/features/draft/components/DraftCurrentPickPanel.tsx',
    controls: ['draft-scout-look', 'draft-big-board', 'draft-pick-submit'],
  },
  {
    label: 'Players search',
    file: 'src/features/players/components/PlayersPageContent.tsx',
    controls: ['players-search-input'],
  },
  {
    label: 'Player comparison search',
    file: 'src/features/players/components/PlayerComparisonSearchPicker.tsx',
    controls: [
      'player-comparison-search-input',
      'player-comparison-result',
      'player-comparison-change',
    ],
  },
  {
    label: 'Free Agency filters',
    file: 'src/features/free-agency/components/FreeAgencyMarketBoardPanel.tsx',
    controls: ['free-agency-position-filter', 'free-agency-demand-filter', 'free-agency-sort'],
  },
  {
    label: 'League leaders categories',
    file: 'src/features/league/components/LeagueLeadersContentPanel.tsx',
    controls: ['league-leaders-category'],
  },
  {
    label: 'Finance contract filters',
    file: 'src/features/finance/components/FinanceContractTablePanel.tsx',
    controls: ['finance-contract-filter'],
  },
  {
    label: 'Free Agency offer',
    file: 'src/features/free-agency/components/FreeAgencyContractOfferPanel.tsx',
    controls: ['free-agency-offer-contract'],
  },
  {
    label: 'Offseason current phase',
    file: 'src/features/offseason/components/OffseasonCurrentPhasePanel.tsx',
    controls: ['offseason-advance-day', 'offseason-skip-phase'],
  },
  {
    label: 'Offseason qualifying offers',
    file: 'src/features/offseason/components/OffseasonQualifyingOffersPanel.tsx',
    controls: ['offseason-resolve-qos', 'offseason-issue-qo'],
  },
  {
    label: 'Offseason Rule 5',
    file: 'src/features/offseason/components/OffseasonRule5BoardPanel.tsx',
    controls: ['offseason-pass-rule5', 'offseason-draft-rule5'],
  },
  {
    label: 'History',
    file: 'src/features/history/components/HistoryMainTabs.tsx',
    controls: ['history-main-tab'],
  },
  {
    label: 'History season browser',
    file: 'src/features/history/components/SeasonBrowserPanel.tsx',
    controls: ['history-season-select', 'history-compare-select'],
  },
  {
    label: 'Playoffs sim controls',
    file: 'src/features/playoffs/components/PlayoffCurrentSeriesPanel.tsx',
    controls: [
      'playoffs-sim-next-game',
      'playoffs-sim-series',
      'playoffs-sim-round',
      'playoffs-sim-all',
      'playoffs-start-bracket',
    ],
  },
  {
    label: 'Schedule completed games',
    file: 'src/features/schedule/components/ScheduleContentPanel.tsx',
    controls: ['schedule-completed-game'],
  },
  {
    label: 'Scouting view tabs',
    file: 'src/features/scouting/components/ScoutingViewTabs.tsx',
    controls: ['scouting-view-tab'],
  },
  {
    label: 'Pro scouting',
    file: 'src/features/scouting/components/ProScoutingPanel.tsx',
    controls: ['scouting-pro-search-input', 'scouting-pro-search-submit', 'scouting-pro-player-report'],
  },
  {
    label: 'International scouting pool controls',
    file: 'src/features/scouting/components/InternationalScoutingPanel.tsx',
    controls: [
      'scouting-ifa-trade-target',
      'scouting-ifa-trade-amount',
      'scouting-ifa-transfer',
    ],
  },
  {
    label: 'International scouting prospect controls',
    file: 'src/features/scouting/components/InternationalProspectReportPanel.tsx',
    controls: [
      'scouting-ifa-bonus-offer',
      'scouting-ifa-sign',
    ],
  },
  {
    label: 'International scouting board',
    file: 'src/features/scouting/components/IFABoardPanel.tsx',
    controls: ['scouting-ifa-scout'],
  },
  {
    label: 'Settings save data',
    file: 'src/features/settings/components/SettingsSaveDataPanel.tsx',
    controls: [
      'settings-save-refresh',
      'settings-save-export',
      'settings-save-import',
      'settings-save-clear',
      'settings-branch-description',
      'settings-branch-create',
      'settings-branch-delete',
      'settings-slot-save',
      'settings-slot-load',
      'settings-slot-delete',
    ],
  },
  {
    label: 'Settings maintenance',
    file: 'src/features/settings/components/SettingsDiagnosticsPanel.tsx',
    controls: ['settings-maintenance-archive', 'settings-maintenance-prune'],
  },
  {
    label: 'Setup launch actions',
    file: 'src/features/setup/components/SetupPageContent.tsx',
    controls: ['setup-return-dashboard', 'setup-open-wizard'],
  },
  {
    label: 'Setup save hub',
    file: 'src/features/setup/components/SetupSaveHubPanel.tsx',
    controls: [
      'setup-save-refresh',
      'setup-save-continue',
      'setup-save-delete',
      'setup-save-use-slot',
      'setup-save-open-branch',
    ],
  },
  {
    label: 'Setup team picker',
    file: 'src/features/setup/components/SetupTeamPickerPanel.tsx',
    controls: ['setup-team-filter', 'setup-team-select'],
  },
  {
    label: 'Setup dynasty wizard',
    file: 'src/features/setup/components/SetupDynastyWizardPanel.tsx',
    controls: [
      'setup-wizard-start-type',
      'setup-wizard-scenario',
      'setup-wizard-difficulty',
      'setup-wizard-play-mode',
      'setup-wizard-day-one',
      'setup-wizard-gm-name',
      'setup-wizard-back',
      'setup-wizard-submit',
    ],
  },
] as const;

function readSource(file: string): string {
  return readFileSync(resolve(process.cwd(), file), 'utf8');
}

function expectMobileCriticalControl(source: string, controlId: string): void {
  const marker = `data-mobile-critical-control="${controlId}"`;
  let markerIndex = source.indexOf(marker);

  if (markerIndex < 0) {
    const controlIndex = source.indexOf(`'${controlId}'`);
    const attributeIndex = source.lastIndexOf('data-mobile-critical-control={', controlIndex);
    const controlIsLocalToAttribute =
      controlIndex >= 0 && attributeIndex >= 0 && controlIndex - attributeIndex < 200;
    markerIndex = controlIsLocalToAttribute ? attributeIndex : -1;
  }

  expect(markerIndex, `${marker} is missing`).toBeGreaterThanOrEqual(0);
  const localSource = source.slice(Math.max(0, markerIndex - 500), markerIndex + 500);
  expect(localSource, `${marker} must use mobile-critical-control`).toContain('mobile-critical-control');
}

describe('mobile touch target CSS contract', () => {
  it('enforces 44px mobile tap targets without disabling zoom', () => {
    expect(css).toContain('@media (max-width: 767px)');
    expect(css).toMatch(/min-height:\s*44px/);
    expect(css).toMatch(/min-width:\s*44px/);
    expect(css).toMatch(/touch-action:\s*manipulation/);
    expect(css).not.toContain('user-scalable=no');
  });

  it('keeps form controls at the iOS-safe 16px font floor on mobile', () => {
    expect(css).toMatch(/input:not\(\[type='range'\]\),\s+select:enabled,\s+textarea:enabled/);
    expect(css).toMatch(/font-size:\s*16px/);
  });

  it('provides a reusable mobile-critical control utility for route workflows', () => {
    expect(css).toMatch(/\.mobile-critical-control\s*{[^}]*min-height:\s*44px/s);
    expect(css).toMatch(/\.mobile-critical-control\s*{[^}]*min-width:\s*44px/s);
    expect(css).toMatch(/\.mobile-critical-control\s*{[^}]*touch-action:\s*manipulation/s);
    expect(css).toMatch(/@media\s*\(max-width:\s*767px\)\s*{[\s\S]*\.mobile-critical-control\s*{[^}]*width:\s*100%/);
  });

  it('marks route-critical controls on Dashboard, Trade, Roster, Staff, Draft, Players, League, Finance, Free Agency, Offseason, History, Playoffs, Schedule, Scouting, Settings, and Setup', () => {
    for (const route of routeCriticalControlFiles) {
      const source = readSource(route.file);
      for (const controlId of route.controls) {
        expectMobileCriticalControl(source, controlId);
      }
    }
  });
});
