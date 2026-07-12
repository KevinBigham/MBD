import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  REVISED_CHAPTER_ORDER,
  createRevisedOnboardingState,
  type OnboardingFlowState,
} from '@mbd/sim-core';
import type { RevisedOnboardingData } from '@/workers/sim.worker.onboarding';
import RevisedOnboardingFlowContent from './RevisedOnboardingFlowContent';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function completedFlowState(): OnboardingFlowState {
  return {
    ...createRevisedOnboardingState(),
    currentChapter: REVISED_CHAPTER_ORDER.length - 1,
    isComplete: true,
    selectedAGMId: 'marcus_chen',
  } as OnboardingFlowState;
}

function onboardingData(): RevisedOnboardingData {
  return {
    script: {
      agm: {
        id: 'marcus_chen',
        name: 'Marcus Chen',
      },
      chapters: {},
      farewell: [{ speaker: 'agm', text: 'The office is ready.', tone: 'confident' }],
    },
    scoutingSlate: { candidates: [] },
  } as unknown as RevisedOnboardingData;
}

describe('RevisedOnboardingFlowContent', () => {
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

  it('renders the completed flow shell and delegates front-office entry', async () => {
    const onEnterFrontOffice = vi.fn();

    await act(async () => {
      root.render(
        <RevisedOnboardingFlowContent
          agmPanel={<aside>AGM guidance</aside>}
          currentChapter={REVISED_CHAPTER_ORDER.at(-1)!}
          currentScript={null}
          data={onboardingData()}
          error={null}
          flowState={completedFlowState()}
          onChoice={vi.fn()}
          onEnterFrontOffice={onEnterFrontOffice}
          onRosterAdvance={vi.fn()}
          onScoutingHire={vi.fn()}
          onStaffHires={vi.fn()}
          mutationBlocked={false}
          submitting={false}
        />,
      );
    });

    expect(container.textContent).toContain('Front Office Ready');
    expect(container.textContent).toContain('Revised onboarding complete');
    expect(container.textContent).toContain('AGM guidance');

    const button = Array.from(container.querySelectorAll('button'))
      .find((candidate) => candidate.textContent?.includes('Enter the Front Office'));
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onEnterFrontOffice).toHaveBeenCalledTimes(1);
  });
});
