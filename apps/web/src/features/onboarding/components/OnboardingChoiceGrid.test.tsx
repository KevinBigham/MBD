import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { OnboardingChoiceGrid } from './OnboardingChoiceGrid';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const options = [
  { id: 'win_now', label: 'Win Now', description: 'Push this roster into October immediately.' },
  { id: 'patient', label: 'Patient Build', description: 'Protect the farm and build the next core.' },
];

describe('OnboardingChoiceGrid', () => {
  let container: HTMLDivElement;
  let root: Root;
  let onSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    onSelect = vi.fn();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function renderGrid(disabled = false) {
    await act(async () => {
      root.render(
        <OnboardingChoiceGrid
          title="Choose the front-office posture"
          options={options}
          onSelect={onSelect}
          disabled={disabled}
        />,
      );
      await Promise.resolve();
    });
  }

  function getButton(label: string): HTMLButtonElement {
    const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes(label));
    expect(button).toBeTruthy();
    return button as HTMLButtonElement;
  }

  it('renders option copy and delegates the selected id', async () => {
    await renderGrid();

    expect(container.textContent).toContain('Choose the front-office posture');
    expect(container.textContent).toContain('Win Now');
    expect(container.textContent).toContain('Protect the farm and build the next core.');

    await act(async () => {
      getButton('Win Now').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledWith('win_now');
  });

  it('disables every choice while onboarding submission is busy', async () => {
    await renderGrid(true);

    expect(getButton('Win Now').disabled).toBe(true);
    expect(getButton('Patient Build').disabled).toBe(true);
  });
});
