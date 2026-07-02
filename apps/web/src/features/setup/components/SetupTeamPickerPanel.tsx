import { TeamLogo } from '@/shared/components/TeamLogo';
import { humanizeLabel } from '@/shared/lib/labels';

export type TeamPreviewFilter = string;

export interface SetupPreview {
  teamId: string;
  teamName: string;
  division: string;
  archetype: string;
  franchiseHook: string;
  whyNow: string;
  marketSize: 'large' | 'medium' | 'small';
  timeline: string;
  payrollTier: string;
  farmSystemRating: string;
  strengths: string[];
  weaknesses: string[];
  teamIdentityBlurb: string;
  projectedRecord: string;
  topPlayers: Array<{
    playerId: string;
    name: string;
    position: string;
    overall: number;
  }>;
  divisionRivals: Array<{
    teamId: string;
    teamName: string;
  }>;
}

export interface SetupTeamOption {
  id: string;
  label: string;
}

export interface SetupTeamPickerFilters {
  archetype: TeamPreviewFilter;
  farm: TeamPreviewFilter;
  market: TeamPreviewFilter;
  payroll: TeamPreviewFilter;
  timeline: TeamPreviewFilter;
}

export interface SetupTeamPickerPanelProps {
  filters: SetupTeamPickerFilters;
  onChangeFilter: (filter: keyof SetupTeamPickerFilters, value: string) => void;
  onSelectTeam: (teamId: string) => void;
  previewMap: Record<string, SetupPreview>;
  selectedTeamId: string;
  teamOptions: readonly SetupTeamOption[];
}

function uniquePreviewOptions(
  previews: SetupPreview[],
  key: keyof Pick<SetupPreview, 'timeline' | 'marketSize' | 'payrollTier' | 'farmSystemRating' | 'archetype'>,
): string[] {
  return Array.from(new Set(previews.map((preview) => String(preview[key])).filter(Boolean))).sort();
}

function TeamFilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">{label}</span>
      <select
        value={value}
        data-mobile-critical-control="setup-team-filter"
        onChange={(event) => onChange(event.target.value)}
        className="mobile-critical-control focus-ring rounded border border-dynasty-border bg-dynasty-base px-2 py-2 font-heading text-xs text-dynasty-text"
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {humanizeLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function SetupTeamPickerPanel({
  filters,
  onChangeFilter,
  onSelectTeam,
  previewMap,
  selectedTeamId,
  teamOptions,
}: SetupTeamPickerPanelProps) {
  const loadedPreviews = Object.values(previewMap);
  const filterConfigs = [
    {
      key: 'timeline' as const,
      label: 'Timeline',
      options: uniquePreviewOptions(loadedPreviews, 'timeline'),
    },
    {
      key: 'market' as const,
      label: 'Market',
      options: uniquePreviewOptions(loadedPreviews, 'marketSize'),
    },
    {
      key: 'payroll' as const,
      label: 'Payroll',
      options: uniquePreviewOptions(loadedPreviews, 'payrollTier'),
    },
    {
      key: 'farm' as const,
      label: 'Farm',
      options: uniquePreviewOptions(loadedPreviews, 'farmSystemRating'),
    },
    {
      key: 'archetype' as const,
      label: 'Archetype',
      options: uniquePreviewOptions(loadedPreviews, 'archetype'),
    },
  ].filter((config) =>
    loadedPreviews.length === 0
    || config.options.length > 1
    || filters[config.key] !== 'all',
  );
  const filteredTeamOptions = teamOptions.filter((option) => {
    const teamPreview = previewMap[option.id];
    if (!teamPreview) {
      return true;
    }
    return (filters.timeline === 'all' || teamPreview.timeline === filters.timeline)
      && (filters.market === 'all' || teamPreview.marketSize === filters.market)
      && (filters.payroll === 'all' || teamPreview.payrollTier === filters.payroll)
      && (filters.farm === 'all' || teamPreview.farmSystemRating === filters.farm)
      && (filters.archetype === 'all' || teamPreview.archetype === filters.archetype);
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-heading text-sm text-dynasty-textBright">Team</span>
        <span className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
          {filteredTeamOptions.length}/{teamOptions.length} clubs
        </span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {filterConfigs.map((config) => (
          <TeamFilterSelect
            key={config.key}
            label={config.label}
            value={filters[config.key]}
            options={config.options}
            onChange={(value) => onChangeFilter(config.key, value)}
          />
        ))}
      </div>
      <div className="mt-3 grid max-h-[34rem] gap-3 overflow-y-auto pr-1">
        {filteredTeamOptions.map((option) => {
          const teamPreview = previewMap[option.id];
          const selected = option.id === selectedTeamId;
          return (
            <button
              key={option.id}
              type="button"
              data-mobile-critical-control="setup-team-select"
              onClick={() => onSelectTeam(option.id)}
              className={`mobile-critical-control focus-ring rounded-xl border px-4 py-4 text-left transition-colors ${
                selected
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-dynasty-border bg-dynasty-base hover:bg-dynasty-elevated'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <TeamLogo teamId={option.id} size="lg" />
                  <div>
                    <div className="font-heading text-sm text-dynasty-textBright">
                      {teamPreview?.teamName ?? option.label}
                    </div>
                    <div className="mt-1 font-data text-[10px] uppercase tracking-[0.18em] text-accent-warning">
                      {teamPreview?.archetype ?? 'Loading Franchise'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-brand text-2xl text-dynasty-textBright">
                    {teamPreview?.projectedRecord ?? '--'}
                  </div>
                  <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
                    {teamPreview?.timeline ?? 'Calculating'}
                  </div>
                </div>
              </div>
              <p className="mt-3 font-heading text-xs leading-5 text-dynasty-muted">
                {teamPreview?.franchiseHook ?? 'Building front-office dossier...'}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Strengths</div>
                  <div className="mt-1 font-heading text-xs text-dynasty-text">
                    {(teamPreview?.strengths ?? ['Loading']).join(' · ')}
                  </div>
                </div>
                <div>
                  <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Weaknesses</div>
                  <div className="mt-1 font-heading text-xs text-dynasty-text">
                    {(teamPreview?.weaknesses ?? ['Loading']).join(' · ')}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                <span>{teamPreview?.marketSize ?? '--'} market</span>
                <span>{teamPreview?.payrollTier ?? '--'} payroll</span>
                <span>{teamPreview?.farmSystemRating ?? '--'} farm</span>
              </div>
            </button>
          );
        })}
        {filteredTeamOptions.length === 0 ? (
          <div className="rounded-xl border border-dynasty-border bg-dynasty-base px-4 py-6 text-center font-heading text-sm text-dynasty-muted">
            No clubs match the current filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}
