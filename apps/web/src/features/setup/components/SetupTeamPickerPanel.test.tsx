import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SetupTeamPickerPanel, {
  type SetupTeamPickerFilters,
  type SetupPreview,
  type SetupTeamOption,
} from './SetupTeamPickerPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const teamOptions = [
  { id: 'nym', label: 'New York Tycoons' },
  { id: 'kc', label: 'Kansas City BBQ Fountains' },
] as const satisfies readonly SetupTeamOption[];

const tycoonsPreview = {
  teamId: 'nym',
  teamName: 'New York Tycoons',
  division: 'AL_EAST',
  archetype: 'Empire Under Pressure',
  franchiseHook: "The sport's loudest market wants October immediately.",
  whyNow: 'The roster can win now if the room is aligned.',
  marketSize: 'large',
  timeline: 'Win now',
  payrollTier: 'Premier',
  farmSystemRating: 'B+',
  strengths: ['middle-of-order thump', 'rotation depth'],
  weaknesses: ['bullpen stability', 'prospect pipeline'],
  teamIdentityBlurb: 'Big-market expectations with enough prospects to support a push.',
  projectedRecord: '88-74',
  topPlayers: [
    { playerId: 'p-judge', name: 'Aaron Judge', position: 'RF', overall: 78 },
  ],
  divisionRivals: [
    { teamId: 'bos', teamName: 'Boston Noreasters' },
  ],
} as const satisfies SetupPreview;

const fountainsPreview = {
  ...tycoonsPreview,
  teamId: 'kc',
  teamName: 'Kansas City BBQ Fountains',
  archetype: 'Budget Contender',
  franchiseHook: 'A lean club needs every surplus win it can find.',
  marketSize: 'small',
  timeline: 'Rebuild',
  payrollTier: 'Lean',
  farmSystemRating: 'A-',
  strengths: ['pitching pipeline'],
  weaknesses: ['thin power bats'],
  projectedRecord: '74-88',
} as const satisfies SetupPreview;

function defaultFilters(): SetupTeamPickerFilters {
  return {
    archetype: 'all',
    farm: 'all',
    market: 'all',
    payroll: 'all',
    timeline: 'all',
  };
}

function selectByLabel(container: HTMLElement, label: string): HTMLSelectElement {
  const match = querySelectByLabel(container, label);
  expect(match, `Missing select label "${label}"`).toBeTruthy();
  return match!;
}

function querySelectByLabel(container: HTMLElement, label: string): HTMLSelectElement | null {
  const labels = Array.from(container.querySelectorAll('label'));
  const match = labels.find((candidate) => candidate.textContent?.includes(label));
  return match?.querySelector('select') ?? null;
}

function expectMobileCriticalControls(container: HTMLElement, controlId: string, expectedCount: number): void {
  const controls = Array.from(container.querySelectorAll(`[data-mobile-critical-control="${controlId}"]`));

  expect(controls).toHaveLength(expectedCount);
  for (const control of controls) {
    expect(control.getAttribute('class')).toContain('mobile-critical-control');
    expect(control.getAttribute('class')).toContain('focus-ring');
  }
}

describe('SetupTeamPickerPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders loaded dynasty team previews and delegates filter/team changes', async () => {
    const onChangeFilter = vi.fn();
    const onSelectTeam = vi.fn();

    await act(async () => {
      root.render(
        <SetupTeamPickerPanel
          filters={defaultFilters()}
          onChangeFilter={onChangeFilter}
          onSelectTeam={onSelectTeam}
          previewMap={{
            kc: fountainsPreview,
            nym: tycoonsPreview,
          }}
          selectedTeamId="nym"
          teamOptions={teamOptions}
        />,
      );
    });

    expect(container.textContent).toContain('2/2 clubs');
    expect(container.textContent).toContain('New York Tycoons');
    expect(container.textContent).toContain('Empire Under Pressure');
    expect(container.textContent).toContain('88-74');
    expect(container.textContent).toContain('middle-of-order thump');
    expect(container.textContent).toContain('Kansas City BBQ Fountains');
    expect(container.textContent).toContain('74-88');
    expect(selectByLabel(container, 'Timeline').textContent).toContain('Win now');
    expect(selectByLabel(container, 'Market').textContent).toContain('Small');
    expectMobileCriticalControls(container, 'setup-team-filter', 5);
    expectMobileCriticalControls(container, 'setup-team-select', 2);

    const setSelectValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    const timelineSelect = selectByLabel(container, 'Timeline');
    const kcButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Kansas City BBQ Fountains'),
    );

    await act(async () => {
      setSelectValue?.call(timelineSelect, 'Rebuild');
      timelineSelect.dispatchEvent(new Event('change', { bubbles: true }));
      kcButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onChangeFilter).toHaveBeenCalledWith('timeline', 'Rebuild');
    expect(onSelectTeam).toHaveBeenCalledWith('kc');
  });

  it('filters preview cards and renders the empty state when nothing matches', async () => {
    const filters = {
      ...defaultFilters(),
      market: 'medium',
    };

    await act(async () => {
      root.render(
        <SetupTeamPickerPanel
          filters={filters}
          onChangeFilter={vi.fn()}
          onSelectTeam={vi.fn()}
          previewMap={{
            kc: fountainsPreview,
            nym: tycoonsPreview,
          }}
          selectedTeamId="nym"
          teamOptions={teamOptions}
        />,
      );
    });

    expect(container.textContent).toContain('0/2 clubs');
    expect(container.textContent).toContain('No clubs match the current filters.');
    expect(container.textContent).not.toContain('New York Tycoons');
    expect(container.textContent).not.toContain('Kansas City BBQ Fountains');
  });

  it('hides loaded filters that only have one real option', async () => {
    await act(async () => {
      root.render(
        <SetupTeamPickerPanel
          filters={defaultFilters()}
          onChangeFilter={vi.fn()}
          onSelectTeam={vi.fn()}
          previewMap={{
            kc: {
              ...fountainsPreview,
              farmSystemRating: tycoonsPreview.farmSystemRating,
              marketSize: tycoonsPreview.marketSize,
              payrollTier: tycoonsPreview.payrollTier,
              timeline: tycoonsPreview.timeline,
            },
            nym: tycoonsPreview,
          }}
          selectedTeamId="nym"
          teamOptions={teamOptions}
        />,
      );
    });

    expect(querySelectByLabel(container, 'Timeline')).toBeNull();
    expect(querySelectByLabel(container, 'Market')).toBeNull();
    expect(querySelectByLabel(container, 'Payroll')).toBeNull();
    expect(querySelectByLabel(container, 'Farm')).toBeNull();
    expect(querySelectByLabel(container, 'Archetype')).toBeTruthy();
    expectMobileCriticalControls(container, 'setup-team-filter', 1);
  });
});
