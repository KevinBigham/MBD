import { createRef } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SetupPageContent, { type SetupPageContentProps } from './SetupPageContent';

vi.mock('./SetupDynastyWizardPanel', () => ({
  default: ({ onBack, onBeginDynasty }: { onBack: () => void; onBeginDynasty: () => void }) => (
    <section data-testid="setup-dynasty-wizard-panel">
      <button type="button" onClick={onBack}>back to hub</button>
      <button type="button" onClick={onBeginDynasty}>begin dynasty</button>
    </section>
  ),
}));

vi.mock('./SetupSaveHubPanel', () => ({
  default: ({
    onContinueSave,
    onRefresh,
    onUseSlot,
    selectedSlot,
  }: {
    onContinueSave: (save: { id: string }) => void;
    onRefresh: () => void;
    onUseSlot: (slot: number) => void;
    selectedSlot: number;
  }) => (
    <section data-testid="setup-save-hub-panel">
      <span>selected slot {selectedSlot}</span>
      <button type="button" onClick={onRefresh}>refresh saves</button>
      <button type="button" onClick={() => onUseSlot(3)}>use slot</button>
      <button type="button" onClick={() => onContinueSave({ id: 'save-slot-1' })}>continue save</button>
    </section>
  ),
}));

vi.mock('./SetupSeasonPreviewPanel', () => ({
  default: ({ teamId }: { teamId: string }) => (
    <section data-testid="setup-season-preview-panel">preview {teamId}</section>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function buildProps(overrides: Partial<SetupPageContentProps> = {}): SetupPageContentProps {
  return {
    isInitialized: true,
    onOpenWizard: vi.fn(),
    saveHubPanelProps: {
      branchLimit: 3,
      busySlot: null,
      onContinueSave: vi.fn(),
      onDeleteSlot: vi.fn(),
      onRefresh: vi.fn(),
      onUseSlot: vi.fn(),
      saveTree: [],
      selectedSlot: 2,
    },
    status: 'Engine warming up.',
    wizardOpen: true,
    wizardPreviewPanelProps: {
      activePreview: null,
      selectedScenario: null,
      teamId: 'nym',
      wizardMode: 'dynasty',
    },
    wizardPanelProps: {
      busySlot: null,
      dayOneExperience: 'full',
      difficulty: 'standard',
      filters: {
        archetype: 'all',
        farm: 'all',
        market: 'all',
        payroll: 'all',
        timeline: 'all',
      },
      gmName: 'Alex Rivera',
      onBack: vi.fn(),
      onBeginDynasty: vi.fn(),
      onChangeDayOneExperience: vi.fn(),
      onChangeDifficulty: vi.fn(),
      onChangeFilter: vi.fn(),
      onChangeGmName: vi.fn(),
      onChangePlayMode: vi.fn(),
      onChangeWizardMode: vi.fn(),
      onSelectScenario: vi.fn(),
      onSelectTeam: vi.fn(),
      playMode: 'standard',
      previewMap: {},
      scenarioCatalog: [],
      selectedScenario: null,
      selectedScenarioId: null,
      selectedSlot: 2,
      selectedTeamId: 'nym',
      teamOptions: [],
      wizardMode: 'dynasty',
      workerIsReady: true,
      workerStatus: 'ready',
    },
    wizardSectionRef: createRef<HTMLElement>(),
    ...overrides,
  };
}

describe('SetupPageContent', () => {
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
  });

  it('renders the launch header, save hub, status, and delegates primary actions', async () => {
    const onOpenWizard = vi.fn();
    const onRefresh = vi.fn();
    const onUseSlot = vi.fn();
    const onContinueSave = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <SetupPageContent
            {...buildProps({
              onOpenWizard,
              saveHubPanelProps: {
                ...buildProps().saveHubPanelProps,
                onContinueSave,
                onRefresh,
                onUseSlot,
              },
            })}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Mr. Baseball Dynasty');
    expect(container.textContent).toContain('Return to Dashboard');
    expect(container.textContent).toContain('What it is');
    expect(container.textContent).toContain('What it is not');
    expect(container.textContent).toContain('Start with New Dynasty');
    expect(container.textContent).toContain('Engine warming up.');
    expect(container.querySelector('[data-testid="setup-save-hub-panel"]')).toBeTruthy();

    for (const controlId of ['setup-return-dashboard', 'setup-open-wizard']) {
      const control = container.querySelector(`[data-mobile-critical-control="${controlId}"]`);
      expect(control, `Missing ${controlId}`).toBeTruthy();
      expect(control?.getAttribute('class')).toContain('mobile-critical-control');
      expect(control?.getAttribute('class')).toContain('focus-ring');
    }

    for (const label of ['New Dynasty', 'refresh saves', 'use slot', 'continue save']) {
      const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
        candidate.textContent?.includes(label),
      );
      await act(async () => {
        button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }

    expect(onOpenWizard).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onUseSlot).toHaveBeenCalledWith(3);
    expect(onContinueSave).toHaveBeenCalledWith({ id: 'save-slot-1' });
  });

  it('places the wizard and preview only when the route opens setup', async () => {
    const onBack = vi.fn();
    const onBeginDynasty = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <SetupPageContent
            {...buildProps({
              wizardPanelProps: {
                ...buildProps().wizardPanelProps,
                onBack,
                onBeginDynasty,
              },
            })}
          />
        </MemoryRouter>,
      );
    });

    expect(container.querySelector('#new-dynasty-setup')).toBeTruthy();
    expect(container.querySelector('[data-testid="setup-dynasty-wizard-panel"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="setup-season-preview-panel"]')).toBeTruthy();

    for (const label of ['back to hub', 'begin dynasty']) {
      const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
        candidate.textContent?.includes(label),
      );
      await act(async () => {
        button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onBeginDynasty).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <SetupPageContent {...buildProps({ wizardOpen: false })} />
        </MemoryRouter>,
      );
    });

    expect(container.querySelector('#new-dynasty-setup')).toBeNull();
    expect(container.querySelector('[data-testid="setup-dynasty-wizard-panel"]')).toBeNull();
  });
});
