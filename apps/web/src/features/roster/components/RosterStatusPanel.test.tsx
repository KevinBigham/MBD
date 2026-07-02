import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { TeamChemistry } from '@mbd/contracts';
import { RosterStatusPanel } from './RosterStatusPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const connectedChemistry: TeamChemistry = {
  teamId: 'nym',
  score: 82,
  tier: 'connected',
  trend: 'rising',
  summary: 'The room is connected and buying into the plan.',
  reasons: [
    'Veteran core holding the room together.',
    'Young players are responding to the staff.',
  ],
};

describe('RosterStatusPanel', () => {
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

  it('renders the roster header, action feedback, and clubhouse chemistry summary', async () => {
    await act(async () => {
      root.render(
        <RosterStatusPanel
          activeRosterCount={26}
          actionMessage="That roster move could not be completed."
          chemistry={connectedChemistry}
        />,
      );
    });

    expect(container.textContent).toContain('Roster');
    expect(container.textContent).toContain('26 players on active roster');
    expect(container.textContent).toContain('That roster move could not be completed.');
    expect(container.textContent).toContain('Clubhouse chemistry');
    expect(container.textContent).toContain('82');
    expect(container.textContent).toContain('Connected | Rising');
    expect(container.textContent).toContain('The room is connected and buying into the plan.');
    expect(container.textContent).toContain('Veteran core holding the room together.');
    expect(container.textContent).toContain('Young players are responding to the staff.');
  });

  it('omits optional feedback and chemistry sections when there is no current data', async () => {
    await act(async () => {
      root.render(
        <RosterStatusPanel
          activeRosterCount={0}
          actionMessage={null}
          chemistry={null}
        />,
      );
    });

    expect(container.textContent).toContain('Roster');
    expect(container.textContent).toContain('0 players on active roster');
    expect(container.textContent).not.toContain('That roster move could not be completed.');
    expect(container.textContent).not.toContain('Clubhouse chemistry');
  });
});
