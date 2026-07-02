import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { RevisedChapterScript } from '@mbd/sim-core';
import RevisedOnboardingChapterPanel from './RevisedOnboardingChapterPanel';
import type { RevisedOnboardingData } from '@/workers/sim.worker.onboarding';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type PanelProps = Parameters<typeof RevisedOnboardingChapterPanel>[0];

function scriptLine(text: string) {
  return {
    speaker: 'agm',
    text,
    tone: 'confident',
  };
}

function createChapterScript(id: string, label: string): RevisedChapterScript {
  return {
    chapter: {
      id,
      label,
      hasChoice: true,
      isHiring: false,
      order: 1,
    },
    intro: [scriptLine(`${label} intro`)],
    reaction: [scriptLine(`${label} reaction`)],
    assessmentData: null,
    transition: null,
    choiceReactions: {},
    candidateIds: [],
  } as unknown as RevisedChapterScript;
}

function createOnboardingData(): RevisedOnboardingData {
  return {
    script: {
      agm: {
        id: 'marcus_chen',
        name: 'Marcus Chen',
      },
      farewell: [scriptLine('The office is staffed and the plan is live.')],
      staffOpinions: {},
      scoutOpinions: {},
    },
    chapterData: {
      owner: {
        seasonGoalOptions: [
          { id: 'playoff', label: 'Playoff Berth', description: 'Reach October with flexibility.' },
          { id: 'compete', label: 'Compete', description: 'Stay relevant deep into the season.' },
        ],
      },
      farm: {
        developmentOptions: [
          { id: 'balanced', label: 'Balanced Development', description: 'Promote when tools and production agree.' },
        ],
      },
      financial: {
        spendingOptions: [
          { id: 'balanced', label: 'Balanced', description: 'Spend with intent and protect flexibility.' },
        ],
      },
      strategy: {
        strategyOptions: [
          { id: 'buyer', label: 'Buyer', description: 'Convert flexibility into help.' },
        ],
      },
      press: {
        openingStatementOptions: [
          { id: 'confident', label: 'Confident', statement: 'We expect this club to play in October.' },
        ],
      },
    },
    staffSlate: {
      managerCandidates: [],
      pitchingCoachCandidates: [],
      hittingCoachCandidates: [],
    },
    scoutingSlate: {
      candidates: [],
    },
  } as unknown as RevisedOnboardingData;
}

describe('RevisedOnboardingChapterPanel', () => {
  let container: HTMLDivElement;
  let root: Root;
  let props: PanelProps;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    props = {
      chapterId: 'owners_office',
      data: createOnboardingData(),
      isComplete: false,
      isSubmitting: false,
      script: createChapterScript('owners_office', "The Owner's Office"),
      onChoice: vi.fn(),
      onEnterFrontOffice: vi.fn(),
      onRosterAdvance: vi.fn(),
      onScoutingHire: vi.fn(),
      onStaffHires: vi.fn(),
    };
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function renderPanel(overrides: Partial<PanelProps> = {}) {
    await act(async () => {
      root.render(<RevisedOnboardingChapterPanel {...props} {...overrides} />);
      await Promise.resolve();
    });
  }

  function getButton(label: string): HTMLButtonElement {
    const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes(label));
    expect(button).toBeTruthy();
    return button as HTMLButtonElement;
  }

  it('renders owner choices and delegates the selected mandate', async () => {
    await renderPanel();

    expect(container.textContent).toContain("The Owner's Office intro");
    expect(container.textContent).toContain('Choose the season mandate');
    expect(container.textContent).toContain('Playoff Berth');

    await act(async () => {
      getButton('Playoff Berth').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onChoice).toHaveBeenCalledWith('seasonGoal', 'playoff');
  });

  it('renders the roster-review advance action', async () => {
    await renderPanel({
      chapterId: 'roster_review',
      script: createChapterScript('roster_review', 'Know Your Roster'),
    });

    expect(container.textContent).toContain('Know Your Roster intro');

    await act(async () => {
      getButton('Continue Roster Review').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onRosterAdvance).toHaveBeenCalledTimes(1);
  });

  it('renders completion summary and delegates final entry', async () => {
    await renderPanel({ isComplete: true });

    expect(container.textContent).toContain('Revised onboarding complete');
    expect(container.textContent).toContain('The office is staffed and the plan is live.');
    expect(container.textContent).toContain('Marcus Chen');

    await act(async () => {
      getButton('Enter the Front Office').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onEnterFrontOffice).toHaveBeenCalledTimes(1);
  });
});
