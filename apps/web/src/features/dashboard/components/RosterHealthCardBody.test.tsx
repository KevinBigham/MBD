import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import RosterHealthCardBody from './RosterHealthCardBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('RosterHealthCardBody', () => {
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

  async function renderBody({
    fatigueWarnings = [],
    injuredCount = 0,
    nextReturnDays = null,
  }: Partial<Parameters<typeof RosterHealthCardBody>[0]> = {}) {
    await act(async () => {
      root.render(
        <RosterHealthCardBody
          fatigueWarnings={fatigueWarnings}
          injuredCount={injuredCount}
          nextReturnDays={nextReturnDays}
        />,
      );
    });
  }

  it('renders active injuries, next return timing, fatigue count, and warning rows', async () => {
    await renderBody({
      injuredCount: 2,
      nextReturnDays: 4,
      fatigueWarnings: [
        {
          playerId: 'p-ace',
          name: 'Ace Starter',
          position: 'SP',
          fatigueScore: 84.5,
          summary: '118 pitches in last turn',
        },
      ],
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Active injuries');
    expect(text).toContain('2');
    expect(text).toContain('4 days until the next return.');
    expect(text).toContain('Fatigue watch');
    expect(text).toContain('1');
    expect(text).toContain('Ace Starter');
    expect(text).toContain('84.5');
    expect(text).toContain('SP · 118 pitches in last turn');
  });

  it('renders healthy roster copy and empty fatigue fallback', async () => {
    await renderBody();

    const text = container.textContent ?? '';
    expect(text).toContain('Active injuries');
    expect(text).toContain('0');
    expect(text).toContain('No players are currently on the shelf.');
    expect(text).toContain('Fatigue watch');
    expect(text).toContain('No fatigue warnings are flashing right now.');
  });
});
