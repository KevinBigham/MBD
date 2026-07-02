import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { DraftRoomHeaderPanel } from './DraftRoomHeaderPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('DraftRoomHeaderPanel', () => {
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

  it('renders draft-room status, on-clock context, progress, and watch action', async () => {
    const onWatchDraft = vi.fn();

    await act(async () => {
      root.render(
        <DraftRoomHeaderPanel
          draftStatus="in_progress"
          loading={false}
          onWatchDraft={onWatchDraft}
          progressLabel="Round 1 of 20 - Pick 3 of 600"
          status="Draft In Progress"
          userOnClock
          watching={false}
        />,
      );
    });

    expect(container.textContent).toContain('Draft Room');
    expect(container.textContent).toContain('Draft In Progress');
    expect(container.textContent).toContain('You Are On The Clock');
    expect(container.textContent).toContain('Round 1 of 20 - Pick 3 of 600');

    const watchButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Watch Draft',
    ) as HTMLButtonElement;
    await act(async () => {
      watchButton.click();
    });

    expect(onWatchDraft).toHaveBeenCalledTimes(1);
  });

  it('disables watch controls while watching or after completion', async () => {
    const onWatchDraft = vi.fn();

    await act(async () => {
      root.render(
        <DraftRoomHeaderPanel
          draftStatus="complete"
          loading={false}
          onWatchDraft={onWatchDraft}
          progressLabel="Round 20 of 20 - Pick 600 of 600"
          status="Draft Complete"
          userOnClock={false}
          watching
        />,
      );
    });

    const watchButton = container.querySelector('button') as HTMLButtonElement;
    expect(container.textContent).toContain('Watching Draft');
    expect(watchButton.disabled).toBe(true);
  });
});
