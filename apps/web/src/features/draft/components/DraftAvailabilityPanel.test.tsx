import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { DraftAvailabilityPanel } from './DraftAvailabilityPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('DraftAvailabilityPanel', () => {
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

  it('renders the non-offseason unavailable state with page help', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <DraftAvailabilityPanel
            error={null}
            loading={false}
            onStartDraft={vi.fn()}
            season={4}
            status="Draft Unavailable"
            variant="unavailable"
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Draft Room');
    expect(container.textContent).toContain('Season 4 Amateur Draft');
    expect(container.textContent).toContain('Draft Available During Offseason');
    expect(container.textContent).toContain('The draft room opens after the regular season and playoffs are finished.');
    expect(container.querySelector('button[aria-label="Help for Draft for value and timeline"]')).toBeTruthy();
  });

  it('renders the start-draft state and delegates the start action', async () => {
    const onStartDraft = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <DraftAvailabilityPanel
            error="Draft system unavailable."
            loading={false}
            onStartDraft={onStartDraft}
            season={5}
            status="Draft Available"
            variant="available"
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Season 5 Amateur Draft');
    expect(container.textContent).toContain('Draft Available');
    expect(container.textContent).toContain('Start the draft to load the class');
    expect(container.textContent).toContain('Draft system unavailable.');

    const startButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start Draft'),
    );
    expect(startButton?.disabled).toBe(false);

    await act(async () => {
      startButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onStartDraft).toHaveBeenCalledTimes(1);
  });

  it('disables the start-draft action while loading', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <DraftAvailabilityPanel
            error={null}
            loading={true}
            onStartDraft={vi.fn()}
            season={5}
            status="Draft Available"
            variant="available"
          />
        </MemoryRouter>,
      );
    });

    const startButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Preparing Draft...'),
    );
    expect(startButton?.disabled).toBe(true);
  });
});
